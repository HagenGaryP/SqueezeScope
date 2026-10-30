// Tests for scripts/protect-main.sh. The GitHub CLI is replaced by a stub on PATH that records
// each call and answers the ruleset lookup, so no network or credentials are needed.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

const SCRIPT = fileURLToPath(new URL('../../scripts/protect-main.sh', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'protect-main-'));
after(() => rmSync(dir, { recursive: true, force: true }));

// Each call is logged as one JSON line: { args, input }.
writeFileSync(
  join(dir, 'gh'),
  `#!/usr/bin/env bash
input=""
for arg in "$@"; do [ "$arg" = "--input" ] && input=$(cat); done
export INPUT="$input"
node -e 'console.log(JSON.stringify({ args: process.argv.slice(1), input: process.env.INPUT }))' -- "$@" \\
  >> "$GH_LOG" < /dev/null
case "$*" in
  "repo view"*) echo "octo/from-cwd" ;;
  *"/rulesets?includes_parents=false"*) [ -n "$EXISTING_ID" ] && printf '%s\\n' "$EXISTING_ID" ;;
  *"--jq .visibility"*) echo "\${VISIBILITY:-public}" ;;
esac
exit 0
`,
);
chmodSync(join(dir, 'gh'), 0o755);

function run(args, env = {}) {
  const log = join(dir, `log-${Math.random().toString(36).slice(2)}`);
  writeFileSync(log, '');
  let code = 0;
  let stdout = '';
  let stderr = '';
  try {
    stdout = execFileSync('bash', [SCRIPT, ...args], {
      env: { PATH: `${dir}:${process.env.PATH}`, GH_LOG: log, ...env },
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    ({ status: code, stdout, stderr } = error);
  }
  const calls = readFileSync(log, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return { code, stdout, stderr, calls };
}

describe('protect-main.sh --dry-run', () => {
  it('prints valid JSON and never calls gh', () => {
    const { code, stdout, calls } = run(['--dry-run', '--repo', 'octo/app', 'PR conventions', 'Script tests']);
    assert.equal(code, 0);
    assert.deepEqual(calls, []);
    const { repository, ruleset, settings } = JSON.parse(stdout);
    assert.equal(repository, 'octo/app');
    assert.equal(ruleset.name, 'main');
    assert.equal(ruleset.enforcement, 'active');
    assert.deepEqual(ruleset.bypass_actors, []);
    assert.deepEqual(ruleset.conditions.ref_name.include, ['~DEFAULT_BRANCH']);

    const rules = Object.fromEntries(ruleset.rules.map((rule) => [rule.type, rule.parameters ?? {}]));
    assert.deepEqual(Object.keys(rules).sort(), [
      'deletion',
      'non_fast_forward',
      'pull_request',
      'required_status_checks',
    ]);
    assert.equal(rules.pull_request.required_approving_review_count, 0);
    assert.deepEqual(rules.pull_request.allowed_merge_methods, ['squash']);
    assert.equal(rules.required_status_checks.strict_required_status_checks_policy, true);
    assert.deepEqual(
      rules.required_status_checks.required_status_checks.map((check) => check.context),
      ['PR conventions', 'Script tests'],
    );

    assert.deepEqual(settings, {
      allow_squash_merge: true,
      allow_merge_commit: false,
      allow_rebase_merge: false,
      squash_merge_commit_title: 'PR_TITLE',
      squash_merge_commit_message: 'PR_BODY',
      allow_auto_merge: true,
      delete_branch_on_merge: true,
    });
  });

  it('escapes quotes and backslashes in check names', () => {
    const { stdout } = run(['--dry-run', 'say "hi" \\ there']);
    const { ruleset } = JSON.parse(stdout);
    assert.equal(ruleset.rules[3].parameters.required_status_checks[0].context, 'say "hi" \\ there');
  });

  it('rejects a call without checks, an unknown option and control characters', () => {
    assert.equal(run(['--dry-run']).code, 2);
    assert.equal(run(['--dry-run', '--force', 'a']).code, 2);
    assert.equal(run(['--dry-run', 'a\tb']).code, 2);
  });
});

describe('protect-main.sh', () => {
  const methodAndPath = (call) => {
    const i = call.args.indexOf('--method');
    return i >= 0 ? `${call.args[i + 1]} ${call.args[i + 2]}` : call.args.join(' ');
  };

  it('creates the ruleset when none is named "main"', () => {
    const { code, calls } = run(['--repo', 'octo/app', 'PR conventions']);
    assert.equal(code, 0);
    assert.deepEqual(calls.map(methodAndPath), [
      'api --paginate repos/octo/app/rulesets?includes_parents=false --jq .[] | select(.name == "main") | .id',
      'POST repos/octo/app/rulesets',
      'PATCH repos/octo/app',
      ...['feat', 'fix', 'chore', 'refactor', 'docs', 'test', 'ci', 'perf'].map(
        (type) =>
          `label create type: ${type} --repo octo/app --color c5def5 --description Change type: ${type} --force`,
      ),
      'api repos/octo/app --jq .visibility',
      'PUT repos/octo/app/private-vulnerability-reporting',
    ]);
    assert.equal(JSON.parse(calls[1].input).name, 'main');
    assert.equal(JSON.parse(calls[2].input).allow_auto_merge, true);
  });

  it('skips private vulnerability reporting on a private repository', () => {
    const { code, stdout, calls } = run(['--repo', 'octo/app', 'PR conventions'], { VISIBILITY: 'private' });
    assert.equal(code, 0);
    assert.ok(!calls.map(methodAndPath).some((call) => call.includes('private-vulnerability-reporting')));
    assert.match(stdout, /Skipped private vulnerability reporting/);
  });

  it('updates the existing ruleset in place', () => {
    const { code, stdout, calls } = run(['--repo', 'octo/app', 'PR conventions'], { EXISTING_ID: '42' });
    assert.equal(code, 0);
    assert.equal(methodAndPath(calls[1]), 'PUT repos/octo/app/rulesets/42');
    assert.match(stdout, /Updated ruleset "main" \(42\)/);
  });

  it('defaults to the repository of the current directory', () => {
    const { calls } = run(['PR conventions']);
    assert.deepEqual(calls[0].args, ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']);
    assert.equal(methodAndPath(calls[2]), 'POST repos/octo/from-cwd/rulesets');
  });

  it('rejects a malformed --repo before calling the API', () => {
    const { code, calls } = run(['--repo', 'octo/app/../x', 'PR conventions']);
    assert.equal(code, 2);
    assert.deepEqual(calls, []);
  });
});
