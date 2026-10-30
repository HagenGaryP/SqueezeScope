import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { checkPullRequest, isBot, REQUIRED_SECTIONS } from './check-pr-body.mjs';

const SCRIPT = fileURLToPath(new URL('./check-pr-body.mjs', import.meta.url));

const body = (overrides = {}) =>
  [
    overrides.link ?? 'Closes #12',
    '',
    ...REQUIRED_SECTIONS.flatMap((name) => [`## ${name}`, overrides[name] ?? 'Some text.', '']),
  ].join('\n');

const valid = {
  title: 'fix(search): return an empty list instead of null',
  body: body(),
  branch: 'fix/12-empty-search-results',
};

describe('checkPullRequest', () => {
  it('accepts a pull request that follows the conventions', () => {
    assert.deepEqual(checkPullRequest(valid), []);
  });

  describe('title', () => {
    for (const title of [
      'feat: add search',
      'perf(db/query): batch inserts',
      'refactor!: drop the v1 client',
      'ci(deps): bump actions/checkout from 4 to 5',
    ]) {
      it(`accepts "${title}"`, () => {
        assert.deepEqual(checkPullRequest({ ...valid, title }), []);
      });
    }

    for (const title of [
      'Add search',
      'feature: add search',
      'feat:add search',
      'feat(): add search',
      'Feat: add search',
      '',
    ]) {
      it(`rejects "${title}"`, () => {
        const problems = checkPullRequest({ ...valid, title });
        assert.match(problems.join('\n'), /Conventional Commit/);
      });
    }

    it('accepts exactly 72 characters and rejects 73', () => {
      const at = (n) => `feat: ${'a'.repeat(n - 6)}`;
      assert.deepEqual(checkPullRequest({ ...valid, title: at(72) }), []);
      assert.match(checkPullRequest({ ...valid, title: at(73) }).join('\n'), /73 characters/);
    });

    it('rejects a trailing period', () => {
      const problems = checkPullRequest({ ...valid, title: 'fix: handle nulls.' });
      assert.deepEqual(problems, ['title ends with a period']);
    });
  });

  describe('branch', () => {
    for (const branch of ['docs/3-readme', 'chore/1-github-standard', 'test/120-a-b-c9']) {
      it(`accepts "${branch}"`, () => {
        assert.deepEqual(checkPullRequest({ ...valid, branch }), []);
      });
    }

    for (const branch of [
      'main',
      'feature/12-search',
      'fix/search',
      'fix/12',
      'fix/0-search',
      'fix/12-Search',
      'fix/12-search_results',
      'fix/12-search-',
      'claude/fix-12-search',
      '',
    ]) {
      it(`rejects "${branch}"`, () => {
        assert.match(checkPullRequest({ ...valid, branch }).join('\n'), /does not match/);
      });
    }
  });

  describe('issue link', () => {
    for (const link of ['Closes #1', 'Fixes #12', 'Refs #300', 'closes #4', '  Fixes #5.']) {
      it(`accepts "${link.trim()}"`, () => {
        assert.deepEqual(checkPullRequest({ ...valid, body: body({ link }) }), []);
      });
    }

    for (const link of ['Closes #', 'Closes 12', 'Resolves #12', 'See issue #12', '<!-- Closes #12 -->']) {
      it(`rejects "${link}"`, () => {
        const problems = checkPullRequest({ ...valid, body: body({ link }) });
        assert.deepEqual(problems, ['no "Closes #N", "Fixes #N" or "Refs #N" line']);
      });
    }
  });

  describe('sections', () => {
    it('reports a missing section', () => {
      const text = valid.body.replace('## How tested', '## Testing');
      assert.deepEqual(checkPullRequest({ ...valid, body: text }), [
        'missing section "## How tested"',
      ]);
    });

    it('reports a section left as the template comment', () => {
      const text = body({ Why: '<!-- The problem or need. -->' });
      assert.deepEqual(checkPullRequest({ ...valid, body: text }), ['section "## Why" is empty']);
    });

    it('matches headings case-insensitively and allows extra sections', () => {
      const text = `${valid.body.replace('## Why', '## why')}\n## Screenshots\nNone\n`;
      assert.deepEqual(checkPullRequest({ ...valid, body: text }), []);
    });

    it('keeps sub-headings inside their section', () => {
      const text = body({ 'What changed': '### Server\n- a change' });
      assert.deepEqual(checkPullRequest({ ...valid, body: text }), []);
    });

    it('handles CRLF line endings', () => {
      assert.deepEqual(checkPullRequest({ ...valid, body: valid.body.replace(/\n/g, '\r\n') }), []);
    });

    it('rejects the unfilled PR template', () => {
      const problems = checkPullRequest({ ...valid, body: '' });
      assert.equal(problems.length, 1 + REQUIRED_SECTIONS.length);
    });
  });
});

describe('isBot', () => {
  it('recognises bot accounts', () => {
    assert.equal(isBot({ type: 'Bot', login: 'dependabot[bot]' }), true);
    assert.equal(isBot({ type: '', login: 'renovate[bot]' }), true);
    assert.equal(isBot({ type: 'User', login: 'octocat' }), false);
  });
});

describe('script', () => {
  const run = (env) => {
    try {
      return { code: 0, out: execFileSync('node', [SCRIPT], { env, encoding: 'utf8', stdio: 'pipe' }) };
    } catch (error) {
      return { code: error.status, out: error.stderr };
    }
  };
  const env = {
    PATH: process.env.PATH,
    PR_TITLE: valid.title,
    PR_BODY: valid.body,
    PR_HEAD_REF: valid.branch,
    PR_AUTHOR_TYPE: 'User',
    PR_AUTHOR_LOGIN: 'octocat',
  };

  it('exits 0 for a valid pull request', () => {
    assert.equal(run(env).code, 0);
  });

  it('exits 1 and lists every problem', () => {
    const { code, out } = run({ ...env, PR_TITLE: 'Update stuff', PR_HEAD_REF: 'patch-1', PR_BODY: '' });
    assert.equal(code, 1);
    assert.match(out, /Conventional Commit/);
    assert.match(out, /does not match/);
    assert.match(out, /missing section "## Why"/);
  });

  it('skips Dependabot', () => {
    const { code, out } = run({
      ...env,
      PR_TITLE: 'Bump actions/checkout from 4 to 5',
      PR_HEAD_REF: 'dependabot/github_actions/actions/checkout-5',
      PR_BODY: 'Bumps actions/checkout.',
      PR_AUTHOR_TYPE: 'Bot',
      PR_AUTHOR_LOGIN: 'dependabot[bot]',
    });
    assert.equal(code, 0);
    assert.match(out, /skipped/);
  });
});
