// Tests for the public-text gate. Every denylist term here is an invented placeholder.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  addedLines,
  commitLogArgs,
  commitMessages,
  compileDenylist,
  diffArgs,
  fetchPullRequest,
  printable,
  scan,
} from './public-text.mjs';

const CLI = fileURLToPath(new URL('./check-public-text.mjs', import.meta.url));

// Git isolated from the machine's own config (signing, hooks, default branch) and identity.
const GIT_ENV = {
  PATH: process.env.PATH,
  HOME: tmpdir(),
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
};

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8' }).trim();
}

function commitAll(cwd, message) {
  git(cwd, 'add', '-A');
  git(cwd, 'commit', '-q', '--no-verify', '-m', message);
  return git(cwd, 'rev-parse', 'HEAD');
}

function writeFiles(repo, files) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), content);
  }
}

const temps = [];
function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'public-text-'));
  temps.push(dir);
  git(dir, 'init', '-q');
  return dir;
}
after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

describe('compileDenylist', () => {
  for (const source of [undefined, '', '   ', '\n\t\n']) {
    test(`refuses a missing or blank source (${JSON.stringify(source)})`, () => {
      assert.throws(() => compileDenylist(source), { message: 'PUBLIC_TEXT_DENYLIST is not set' });
    });
  }

  test('refuses an invalid pattern without quoting it', () => {
    let error;
    try {
      compileDenylist('zebraquux(');
    } catch (caught) {
      error = caught;
    }
    assert.equal(error?.message, 'PUBLIC_TEXT_DENYLIST is not a valid regular expression');
    assert.ok(!error.message.includes('zebraquux'));
  });

  for (const source of ['x*', '^', '(?:)', 'zebraquux|', '(?!zebraquux)']) {
    test(`refuses a pattern that matches the empty string (${source})`, () => {
      assert.throws(() => compileDenylist(source), {
        message: 'PUBLIC_TEXT_DENYLIST matches the empty string, so it would match every line',
      });
    });
  }

  test('compiles a case-insensitive, non-global pattern and trims the source', () => {
    const regex = compileDenylist('  forbidden-token-123|zebraquux\n');
    assert.equal(regex.flags, 'i');
    assert.ok(regex.test('a ZebraQuux here'));
    assert.ok(regex.test('FORBIDDEN-TOKEN-123'));
    assert.ok(!regex.test('a clean line'));
  });
});

describe('addedLines', () => {
  test('multi-file diff gives new-file line numbers', () => {
    const diff = [
      'diff --git a/one.txt b/one.txt',
      'index 1111111..2222222 100644',
      '--- a/one.txt',
      '+++ b/one.txt',
      '@@ -2,0 +3,2 @@ context',
      '+alpha',
      '+beta',
      '@@ -10 +12 @@',
      '-old',
      '+gamma',
      'diff --git a/dir/two.md b/dir/two.md',
      'index 3333333..4444444 100644',
      '--- a/dir/two.md',
      '+++ b/dir/two.md',
      '@@ -1 +1 @@',
      '-x',
      '+delta',
      '',
    ].join('\n');
    assert.deepEqual(addedLines(diff), [
      { path: 'one.txt', line: 3, text: 'alpha' },
      { path: 'one.txt', line: 4, text: 'beta' },
      { path: 'one.txt', line: 12, text: 'gamma' },
      { path: 'dir/two.md', line: 1, text: 'delta' },
    ]);
  });

  test('new file yields its name, then its lines (name with a space)', () => {
    const diff = [
      'diff --git a/new file.txt b/new file.txt',
      'new file mode 100644',
      'index 0000000..5555555',
      '--- /dev/null',
      '+++ b/new file.txt\t',
      '@@ -0,0 +1,2 @@',
      '+first',
      '+second',
      'diff --git a/empty.txt b/empty.txt',
      'new file mode 100644',
      'index 0000000..e69de29',
    ].join('\n');
    assert.deepEqual(addedLines(diff), [
      { path: 'new file.txt', line: 0, text: 'new file.txt' },
      { path: 'new file.txt', line: 1, text: 'first' },
      { path: 'new file.txt', line: 2, text: 'second' },
      { path: 'empty.txt', line: 0, text: 'empty.txt' },
    ]);
  });

  test('rename yields the new name, with or without content changes', () => {
    const diff = [
      'diff --git a/old/name.txt b/new/name.txt',
      'similarity index 90%',
      'rename from old/name.txt',
      'rename to new/name.txt',
      'index 6666666..7777777 100644',
      '--- a/old/name.txt',
      '+++ b/new/name.txt',
      '@@ -3 +3 @@',
      '-before',
      '+after',
      'diff --git a/same.txt b/moved/same.txt',
      'similarity index 100%',
      'rename from same.txt',
      'rename to moved/same.txt',
    ].join('\n');
    assert.deepEqual(addedLines(diff), [
      { path: 'new/name.txt', line: 0, text: 'new/name.txt' },
      { path: 'new/name.txt', line: 3, text: 'after' },
      { path: 'moved/same.txt', line: 0, text: 'moved/same.txt' },
    ]);
  });

  test('a deletion-only file adds nothing', () => {
    const diff = [
      'diff --git a/gone.txt b/gone.txt',
      'deleted file mode 100644',
      'index 6666666..0000000',
      '--- a/gone.txt',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-one',
      '-two',
    ].join('\n');
    assert.deepEqual(addedLines(diff), []);
  });

  test('added lines that look like headers stay added lines', () => {
    const diff = [
      'diff --git a/notes.txt b/notes.txt',
      'index 1111111..2222222 100644',
      '--- a/notes.txt',
      '+++ b/notes.txt',
      '@@ -0,0 +1,3 @@',
      '+++ b/not-a-header',
      '+--- a/not-a-header',
      '+diff --git a/x b/x',
      '@@ -5 +7,0 @@',
      '--- a/removed-looks-like-header',
    ].join('\n');
    assert.deepEqual(addedLines(diff), [
      { path: 'notes.txt', line: 1, text: '++ b/not-a-header' },
      { path: 'notes.txt', line: 2, text: '--- a/not-a-header' },
      { path: 'notes.txt', line: 3, text: 'diff --git a/x b/x' },
    ]);
  });

  test('"\\ No newline at end of file" is not an added line', () => {
    const diff = [
      'diff --git a/end.txt b/end.txt',
      'index 1111111..2222222 100644',
      '--- a/end.txt',
      '+++ b/end.txt',
      '@@ -1 +1,2 @@',
      '-last',
      '\\ No newline at end of file',
      '+last',
      '+line',
      '\\ No newline at end of file',
    ].join('\n');
    assert.deepEqual(addedLines(diff), [
      { path: 'end.txt', line: 1, text: 'last' },
      { path: 'end.txt', line: 2, text: 'line' },
    ]);
  });

  test('C-quoted paths are unquoted', () => {
    const diff = [
      'diff --git "a/caf\\303\\251 \\"x\\".txt" "b/caf\\303\\251 \\"x\\".txt"',
      'new file mode 100644',
      'index 0000000..aaaaaaa',
      '--- /dev/null',
      '+++ "b/caf\\303\\251 \\"x\\".txt"',
      '@@ -0,0 +1 @@',
      '+hello',
    ].join('\n');
    assert.deepEqual(addedLines(diff), [
      { path: 'café "x".txt', line: 0, text: 'café "x".txt' },
      { path: 'café "x".txt', line: 1, text: 'hello' },
    ]);
  });

  test('an unrecognised hunk header fails instead of guessing', () => {
    const diff = ['diff --git a/a b/a', '--- a/a', '+++ b/a', '@@ garbage @@', '+x'].join('\n');
    assert.throws(() => addedLines(diff), /unrecognised hunk header/);
  });

  test('matches real git output for every file shape, binary content included', () => {
    const repo = tempRepo();
    writeFiles(repo, {
      'keep.txt': 'one\ntwo\nthree\n',
      'gone.txt': 'bye\n',
      'old.txt': 'a\nb\nc\nd\ne\nf\ng\nh\n',
      'tail.txt': 'end',
    });
    const base = commitAll(repo, 'base');

    rmSync(join(repo, 'gone.txt'));
    rmSync(join(repo, 'old.txt'));
    const blob = Buffer.from([0, 1, 2, 0, 255]);
    writeFiles(repo, {
      'keep.txt': 'one\n++ plus plus\nthree\nfour\n',
      'moved/new.txt': 'a\nb\nc\nd\ne\nf\ng\nchanged\n',
      'tail.txt': 'end\nmore',
      'with space.txt': 'spaced\n',
      'café.txt': 'accented\n',
      'blob.bin': blob,
    });
    const head = commitAll(repo, 'head');

    const diff = execFileSync('git', diffArgs(base, head), {
      cwd: repo,
      env: GIT_ENV,
      encoding: 'utf8',
    });
    const sorted = (entries) =>
      [...entries].sort((x, y) => `${x.path}:${x.line}`.localeCompare(`${y.path}:${y.line}`));
    assert.deepEqual(
      sorted(addedLines(diff)),
      sorted([
        { path: 'blob.bin', line: 0, text: 'blob.bin' },
        { path: 'blob.bin', line: 1, text: blob.toString('utf8') },
        { path: 'café.txt', line: 0, text: 'café.txt' },
        { path: 'café.txt', line: 1, text: 'accented' },
        { path: 'keep.txt', line: 2, text: '++ plus plus' },
        { path: 'keep.txt', line: 4, text: 'four' },
        { path: 'moved/new.txt', line: 0, text: 'moved/new.txt' },
        { path: 'moved/new.txt', line: 8, text: 'changed' },
        { path: 'tail.txt', line: 1, text: 'end' },
        { path: 'tail.txt', line: 2, text: 'more' },
        { path: 'with space.txt', line: 0, text: 'with space.txt' },
        { path: 'with space.txt', line: 1, text: 'spaced' },
      ]),
    );
  });
});

describe('commitMessages', () => {
  test('parses real git log output, multi-line bodies included', () => {
    const dir = mkdtempSync(join(tmpdir(), 'public-text-log-'));
    try {
      const run = (...args) =>
        execFileSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.com', ...args], {
          cwd: dir,
          encoding: 'utf8',
          env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', HOME: dir },
        });
      run('init', '-q');
      run('commit', '-q', '--allow-empty', '-m', 'base');
      const base = run('rev-parse', 'HEAD').trim();
      run('commit', '-q', '--allow-empty', '-m', 'first', '-m', 'body line\nTrailer: x');
      run('commit', '-q', '--allow-empty', '-m', 'second');
      const commits = commitMessages(run(...commitLogArgs(base, 'HEAD')));
      assert.equal(commits.length, 2);
      assert.ok(commits.every((c) => /^[0-9a-f]{40}$/.test(c.sha)));
      assert.equal(commits[0].message.trim(), 'second');
      assert.equal(commits[1].message.trim(), 'first\n\nbody line\nTrailer: x');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('an unexpected record shape fails instead of guessing', () => {
    assert.throws(() => commitMessages('not-a-sha\0msg\x1e'), /unexpected shape/);
  });

  test('empty output means no commits', () => {
    assert.deepEqual(commitMessages(''), []);
  });
});

describe('scan', () => {
  const regex = compileDenylist('zebraquux');

  test('clean input has no locations', () => {
    const lines = [{ path: 'a.txt', line: 1, text: 'fine' }];
    assert.deepEqual(scan(regex, { title: 'Fine title', body: 'Fine\nbody', lines }), []);
  });

  test('reports title, body lines, added lines and file names in order', () => {
    const hits = scan(regex, {
      title: 'Add ZebraQuux support',
      body: 'ok\r\nhas ZEBRAQUUX\nfine\nzebraquux again',
      lines: [
        { path: 'a.txt', line: 3, text: 'x zebraquux y' },
        { path: 'a.txt', line: 4, text: 'clean' },
        { path: 'zebraquux.txt', line: 0, text: 'zebraquux.txt' },
        { path: 'zebraquux.txt', line: 2, text: 'zebraquux' },
        { path: 'dir/zebraquux-2.md', line: 0, text: 'dir/zebraquux-2.md' },
      ],
    });
    assert.deepEqual(hits, [
      'PR title',
      'PR body line 2',
      'PR body line 4',
      'a.txt:3',
      '[file name withheld #1] (file name)',
      '[file name withheld #1]:2',
      '[file name withheld #2] (file name)',
    ]);
    assert.ok(hits.every((hit) => !/zebraquux/i.test(hit)));
  });

  test('escapes control characters in printed paths', () => {
    const path = 'p\n::error::fake\r\t\u0000\u001b\u007f\u0085\u{2028}.txt';
    const hits = scan(regex, { lines: [{ path, line: 1, text: 'zebraquux' }] });
    assert.deepEqual(hits, ['p\\n::error::fake\\r\\t\\x00\\x1b\\x7f\\x85\\u2028.txt:1']);
    assert.equal(printable('plain/path.txt'), 'plain/path.txt');
  });

  test('reports commit message lines by short sha, never the text', () => {
    const sha = 'a'.repeat(40);
    const hits = scan(regex, {
      commits: [
        { sha, message: 'Clean subject\n\nTrailer: zebraquux\n' },
        { sha: 'b'.repeat(40), message: 'clean' },
      ],
    });
    assert.deepEqual(hits, ['commit aaaaaaa message line 3']);
  });

  test('refuses a global or sticky regex, whose test() is stateful', () => {
    assert.throws(() => scan(/zebraquux/g, {}), /without the g or y flag/);
    assert.throws(() => scan(/zebraquux/y, {}), /without the g or y flag/);
  });
});

describe('fetchPullRequest', () => {
  const HEAD = 'a'.repeat(40);
  const TOKEN = 'test-token-not-real';
  const options = {
    apiUrl: 'https://api.github.example',
    repository: 'owner/repo',
    number: '7',
    token: TOKEN,
    headSha: HEAD,
  };
  const reply = (status, json) => async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
  });

  async function failure(promise) {
    const error = await promise.then(
      () => assert.fail('expected a failure'),
      (caught) => caught,
    );
    assert.ok(!error.message.includes(TOKEN));
    return error.message;
  }

  test('returns the current title and body, calling the pulls endpoint with the token', async () => {
    let call;
    const fetchImpl = async (url, init) => {
      call = { url, init };
      return reply(200, { title: 'Current title', body: null, head: { sha: HEAD } })();
    };
    assert.deepEqual(await fetchPullRequest(options, fetchImpl), {
      title: 'Current title',
      body: '',
    });
    assert.equal(call.url, 'https://api.github.example/repos/owner/repo/pulls/7');
    assert.equal(call.init.headers.authorization, `Bearer ${TOKEN}`);
  });

  test('fails closed on an API error status', async () => {
    assert.match(await failure(fetchPullRequest(options, reply(500, {}))), /HTTP 500/);
  });

  test('fails closed when the API cannot be reached', async () => {
    const fetchImpl = async () => {
      throw new Error(`network down for ${TOKEN}`);
    };
    assert.match(await failure(fetchPullRequest(options, fetchImpl)), /could not reach/);
  });

  test('fails closed on a malformed response', async () => {
    const fetchImpl = reply(200, { body: 'no title', head: { sha: HEAD } });
    assert.match(await failure(fetchPullRequest(options, fetchImpl)), /without a title or body/);
  });

  test('fails closed when the head sha no longer matches', async () => {
    const fetchImpl = reply(200, { title: 't', body: 'b', head: { sha: 'b'.repeat(40) } });
    assert.match(await failure(fetchPullRequest(options, fetchImpl)), /no longer HEAD_SHA/);
  });

  test('refuses missing settings and plain http to a non-loopback host before fetching', async () => {
    const never = async () => assert.fail('fetch must not be called');
    const cases = [
      [{ apiUrl: 'http://api.github.example' }, /must use https/],
      [{ apiUrl: 'not a url' }, /GITHUB_API_URL is not a valid URL/],
      [{ repository: undefined }, /GITHUB_REPOSITORY/],
      [{ number: '7; rm' }, /PR_NUMBER/],
      [{ token: '' }, /GITHUB_TOKEN is not set/],
    ];
    for (const [override, message] of cases) {
      assert.match(await failure(fetchPullRequest({ ...options, ...override }, never)), message);
    }
  });
});

describe('check-public-text CLI', () => {
  const TERM = 'forbidden-token-123';
  const TOKEN = 'test-token-not-real';
  let server;
  let apiUrl;
  let pull;

  before(async () => {
    server = createServer((request, response) => {
      const authorised = request.headers.authorization === `Bearer ${TOKEN}`;
      const known = request.url === '/repos/owner/repo/pulls/7';
      if (!authorised || !known || pull.status !== 200) {
        response.writeHead(authorised && known ? pull.status : 404).end('{}');
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({ title: pull.title, body: pull.body, head: { sha: pull.head } }),
      );
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    apiUrl = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => new Promise((resolve) => server.close(resolve)));

  // A repo with a base commit and a head commit adding `files`.
  function repoWith(files, baseFiles = { 'base.txt': 'base\n' }) {
    const repo = tempRepo();
    writeFiles(repo, baseFiles);
    const base = commitAll(repo, 'base');
    writeFiles(repo, files);
    const head = commitAll(repo, 'head');
    return { repo, base, head };
  }

  // Runs the CLI asynchronously so this process's fake API can answer it.
  function run({ repo, base, head }, { title = 'Clean title', body = 'Clean body', ...env } = {}) {
    pull = { status: 200, title, body, head, ...(env.pull ?? {}) };
    delete env.pull;
    const child = spawn(process.execPath, [CLI], {
      cwd: repo,
      env: {
        ...GIT_ENV,
        PUBLIC_TEXT_DENYLIST: TERM,
        GITHUB_TOKEN: TOKEN,
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_API_URL: apiUrl,
        PR_NUMBER: '7',
        BASE_SHA: base,
        HEAD_SHA: head,
        ...env,
      },
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    return new Promise((resolve) => {
      child.on('close', (status) => {
        assert.ok(!output.toLowerCase().includes(TERM), 'output must not contain the term');
        assert.ok(!output.includes(TOKEN), 'output must not contain the token');
        resolve({ status, output });
      });
    });
  }

  const cleanRepo = () => repoWith({ 'added.txt': 'clean line\n' });

  test('missing secret fails closed', async () => {
    const { status, output } = await run(cleanRepo(), { PUBLIC_TEXT_DENYLIST: undefined });
    assert.equal(status, 1);
    assert.match(output, /PUBLIC_TEXT_DENYLIST is not set/);
  });

  test('invalid secret fails closed without echoing it', async () => {
    const { status, output } = await run(cleanRepo(), { PUBLIC_TEXT_DENYLIST: `${TERM}(` });
    assert.equal(status, 1);
    assert.match(output, /not a valid regular expression/);
  });

  test('missing head sha fails closed', async () => {
    const { status, output } = await run(cleanRepo(), { HEAD_SHA: '' });
    assert.equal(status, 1);
    assert.match(output, /HEAD_SHA is not set/);
  });

  test('well-formed shas missing from the repository fail closed', async () => {
    const absent = { ...cleanRepo(), base: '1'.repeat(40), head: '2'.repeat(40) };
    const { status, output } = await run(absent);
    assert.equal(status, 1);
    assert.match(output, /git diff between BASE_SHA and HEAD_SHA failed/);
  });

  test('an API error fails closed', async () => {
    const { status, output } = await run(cleanRepo(), { pull: { status: 502 } });
    assert.equal(status, 1);
    assert.match(output, /HTTP 502/);
  });

  test('a moved pull request head fails closed', async () => {
    const { status, output } = await run(cleanRepo(), { pull: { head: 'c'.repeat(40) } });
    assert.equal(status, 1);
    assert.match(output, /no longer HEAD_SHA/);
  });

  test('a match in an added line fails with its location only', async () => {
    const repo = repoWith({ 'added.txt': `clean line\nthis has ${TERM.toUpperCase()} inside\n` });
    const { status, output } = await run(repo);
    assert.equal(status, 1);
    assert.match(output, /1 location\(s\) match/);
    assert.match(output, /- added\.txt:2$/m);
  });

  test('a "-diff" attribute does not hide added content', async () => {
    const repo = repoWith({ '.gitattributes': '* -diff\n', 'notes.md': `see ${TERM}\n` });
    const { status, output } = await run(repo);
    assert.equal(status, 1);
    assert.match(output, /- notes\.md:1$/m);
  });

  test('a NUL byte does not hide added content', async () => {
    const repo = repoWith({ 'data.txt': `a\u0000b\nthis has ${TERM}\n` });
    const { status, output } = await run(repo);
    assert.equal(status, 1);
    assert.match(output, /- data\.txt:2$/m);
  });

  test('a file name with a newline cannot print a workflow command', async () => {
    const repo = repoWith({ 'p\n::error::fake.txt': `${TERM}\n` });
    const { status, output } = await run(repo);
    assert.equal(status, 1);
    assert.match(output, /- p\\n::error::fake\.txt:1$/m);
    assert.doesNotMatch(output, /^::/m);
  });

  test('matches in the current title and body are reported, capped at 50 shown', async () => {
    const body = Array.from({ length: 60 }, () => `line with ${TERM}`).join('\n');
    const { status, output } = await run(cleanRepo(), { title: `Title ${TERM}`, body });
    assert.equal(status, 1);
    assert.match(output, /61 location\(s\) match/);
    assert.match(output, /- PR title$/m);
    assert.match(output, /- PR body line 49$/m);
    assert.doesNotMatch(output, /PR body line 50/);
    assert.match(output, /\.\.\. and 11 more/);
  });

  test('a head fetched as objects only is scanned from a base checkout', async () => {
    const origin = repoWith({ 'added.txt': `clean line\nthis has ${TERM}\n` });
    const clone = mkdtempSync(join(tmpdir(), 'public-text-clone-'));
    temps.push(clone);
    git(clone, 'init', '-q');
    git(clone, 'fetch', '-q', '--no-tags', origin.repo, origin.base);
    git(clone, 'checkout', '-q', '--detach', origin.base);
    git(clone, 'fetch', '-q', '--no-tags', origin.repo, `+${origin.head}:refs/remotes/pull/head`);
    const { status, output } = await run({ ...origin, repo: clone });
    assert.equal(status, 1);
    assert.match(output, /- added\.txt:2$/m);
  });

  test('a replace ref cannot hide added content', async () => {
    const { repo, base, head } = repoWith({ 'added.txt': `${TERM}\n` });
    git(repo, 'checkout', '-q', '--detach', base);
    writeFiles(repo, { 'added.txt': 'clean line\n' });
    git(repo, 'replace', head, commitAll(repo, 'clean'));
    const { status, output } = await run({ repo, base, head });
    assert.equal(status, 1);
    assert.match(output, /- added\.txt:1$/m);
  });

  test('a commit message is scanned, its text never printed', async () => {
    const repo = tempRepo();
    writeFiles(repo, { 'base.txt': 'base\n' });
    const base = commitAll(repo, 'base');
    writeFiles(repo, { 'added.txt': 'clean line\n' });
    const head = commitAll(repo, `Clean subject\n\nTrailer: ${TERM}`);
    const { status, output } = await run({ repo, base, head });
    assert.equal(status, 1);
    assert.match(output, new RegExp(`- commit ${head.slice(0, 7)} message line 3$`, 'm'));
    assert.ok(!output.includes(TERM));
  });

  test('clean input passes', async () => {
    const { status, output } = await run(cleanRepo());
    assert.equal(status, 0, output);
    assert.match(
      output,
      /Public text gate passed: PR title, body, 1 commit message\(s\) and 1 added line\(s\) checked\./,
    );
  });
});
