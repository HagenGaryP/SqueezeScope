// Fails when the PR title, the PR body, a commit message, or anything the PR adds (lines and new
// file names) matches the maintainer-defined denylist kept in the PUBLIC_TEXT_DENYLIST repository secret.
// Every input arrives in the environment (never interpolated into shell). The title and body are
// read from the GitHub API at run time, so a re-run checks the current text. Only locations are
// printed, never the pattern, matched text or token. Any configuration problem fails closed.
// Both BASE_SHA and HEAD_SHA must be present in the local repository. See
// docs/decisions/0001-public-text-gate.md.
import { execFileSync } from 'node:child_process';
import {
  addedLines,
  commitLogArgs,
  commitMessages,
  compileDenylist,
  diffArgs,
  fetchPullRequest,
  scan,
} from './public-text.mjs';

const MAX_SHOWN = 50;
const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

function requireSha(env, name) {
  const value = (env[name] ?? '').trim();
  if (!SHA.test(value)) throw new Error(`${name} is not set to a full commit sha`);
  return value;
}

async function main(env) {
  const regex = compileDenylist(env.PUBLIC_TEXT_DENYLIST);
  const base = requireSha(env, 'BASE_SHA');
  const head = requireSha(env, 'HEAD_SHA');
  const { title, body } = await fetchPullRequest({
    apiUrl: env.GITHUB_API_URL,
    repository: env.GITHUB_REPOSITORY,
    number: env.PR_NUMBER,
    token: env.GITHUB_TOKEN,
    headSha: head,
  });
  const git = (args, what) => {
    try {
      return execFileSync('git', args, {
        // A `refs/replace/*` ref would make git read a different commit or tree than the PR's.
        env: { ...env, GIT_NO_REPLACE_OBJECTS: '1' },
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'inherit'],
      });
    } catch {
      throw new Error(`git ${what} between BASE_SHA and HEAD_SHA failed`);
    }
  };
  const lines = addedLines(git(diffArgs(base, head), 'diff'));
  const commits = commitMessages(git(commitLogArgs(base, head), 'log'));
  const hits = scan(regex, { title, body, commits, lines });

  if (hits.length) {
    console.error(`Public text gate failed: ${hits.length} location(s) match the denylist.`);
    // Indented, with control characters escaped, so no location can start a "::" workflow command.
    for (const hit of hits.slice(0, MAX_SHOWN)) console.error(`  - ${hit}`);
    if (hits.length > MAX_SHOWN) console.error(`  ... and ${hits.length - MAX_SHOWN} more`);
    console.error('Reword the listed text. Matched text is never shown.');
    return 1;
  }
  const added = lines.filter((entry) => entry.line > 0).length;
  console.log(
    `Public text gate passed: PR title, body, ${commits.length} commit message(s) and ${added} added line(s) checked.`,
  );
  return 0;
}

let code;
try {
  code = await main(process.env);
} catch (error) {
  // Every message thrown on the way names variables only, never their values.
  console.error(`Public text gate failed: ${error.message}`);
  code = 1;
}
process.exit(code);
