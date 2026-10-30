// Pure logic for the public-text gate: compile the maintainer-defined denylist (kept in a
// repository secret), list what a pull request adds, and report where the denylist matches.
// Only locations are ever returned; matched text, the pattern and matching file names are not.
// Decision: docs/decisions/0001-public-text-gate.md.

export const DENYLIST_VAR = 'PUBLIC_TEXT_DENYLIST';

/**
 * Compiles the denylist source into a case-insensitive, non-global RegExp.
 * Every error message names the variable only: the pattern (and the engine's own message, which
 * quotes it) is never passed on.
 */
export function compileDenylist(source) {
  const pattern = typeof source === 'string' ? source.trim() : '';
  if (pattern === '') throw new Error(`${DENYLIST_VAR} is not set`);
  let regex;
  try {
    regex = new RegExp(pattern, 'i');
  } catch {
    throw new Error(`${DENYLIST_VAR} is not a valid regular expression`);
  }
  if (regex.test('')) {
    throw new Error(`${DENYLIST_VAR} matches the empty string, so it would match every line`);
  }
  return regex;
}

/**
 * The exact `git diff` arguments whose output `addedLines` parses. `--text` diffs every file as
 * text, so neither a NUL byte nor a `-diff` / `binary` attribute in `.gitattributes` can turn
 * added content into an unscanned "Binary files … differ" line.
 */
export function diffArgs(base, head) {
  return [
    'diff',
    '--text',
    '--no-color',
    '--no-ext-diff',
    '--no-textconv',
    '--unified=0',
    '--src-prefix=a/',
    '--dst-prefix=b/',
    `${base}...${head}`,
    '--',
  ];
}

// git's C-style quoting for unusual file names (core.quotePath): octal bytes and a few escapes.
const ESCAPES = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, '\\': 92 };

/** Unquotes a token that starts with `"`; returns the value and the index after the closing quote. */
function unquote(text) {
  const bytes = [];
  let i = 1;
  while (i < text.length && text[i] !== '"') {
    if (text[i] === '\\') {
      const octal = /^[0-7]{3}/.exec(text.slice(i + 1, i + 4));
      if (octal) {
        bytes.push(parseInt(octal[0], 8));
        i += 4;
        continue;
      }
      const code = ESCAPES[text[i + 1]];
      if (code !== undefined) {
        bytes.push(code);
        i += 2;
        continue;
      }
    }
    const char = String.fromCodePoint(text.codePointAt(i));
    bytes.push(...Buffer.from(char, 'utf8'));
    i += char.length;
  }
  return { value: Buffer.from(bytes).toString('utf8'), end: i + 1 };
}

function stripPrefix(path, prefix) {
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

/** A path from a `+++`, `rename to` or `copy to` header line, quoted or not. */
function headerPath(value) {
  if (value.startsWith('"')) return unquote(value).value;
  // git appends a tab to `---`/`+++` names that contain a space.
  return value.endsWith('\t') ? value.slice(0, -1) : value;
}

/** The new path from the rest of a `diff --git ` line; used when no other header names it. */
function diffGitPath(rest) {
  if (rest.startsWith('"')) {
    const after = rest.slice(unquote(rest).end + 1);
    return stripPrefix(after.startsWith('"') ? unquote(after).value : after, 'b/');
  }
  const quotedNew = rest.indexOf(' "b/');
  if (rest.endsWith('"') && quotedNew >= 0) {
    return stripPrefix(unquote(rest.slice(quotedNew + 1)).value, 'b/');
  }
  // `a/P b/P`: without a rename both names are the same, which resolves spaces in P.
  const length = (rest.length - 5) / 2;
  if (Number.isInteger(length) && length > 0) {
    const path = rest.slice(2, 2 + length);
    if (rest === `a/${path} b/${path}`) return path;
  }
  // Unknown shape: keep the whole text so it is still scanned rather than dropped.
  return rest;
}

/**
 * Lists what a diff adds: `{ path, line, text }` for each added line (new-file line numbers), plus
 * `{ path, line: 0, text: path }` for the new path of each added, renamed or copied file.
 * Parses `git diff` output produced with `diffArgs`. A file header runs from `diff --git` to the
 * first `@@`, so an added line whose text starts with `++` is never mistaken for a header.
 */
export function addedLines(diffText) {
  const out = [];
  let file = null;
  let inHunk = false;
  let lineNo = 0;

  const finishHeader = () => {
    if (!file || file.done) return;
    file.done = true;
    if (file.deleted) file.path = null;
    else file.path = file.plusPath ?? file.copyTo ?? file.renameTo ?? file.diffPath;
    if (file.path !== null && (file.isNew || file.renameTo !== undefined || file.copyTo)) {
      out.push({ path: file.path, line: 0, text: file.path });
    }
  };

  for (const raw of diffText.split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (line.startsWith('diff --git ')) {
      finishHeader();
      file = { diffPath: diffGitPath(line.slice('diff --git '.length)), done: false };
      inHunk = false;
      continue;
    }
    if (!file) continue;
    if (line.startsWith('@@')) {
      finishHeader();
      const header = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (!header) throw new Error('unrecognised hunk header in the diff');
      lineNo = Number(header[1]);
      inHunk = true;
      continue;
    }
    if (inHunk) {
      if (line.startsWith('+')) {
        out.push({ path: file.path ?? '(unknown file)', line: lineNo, text: line.slice(1) });
        lineNo += 1;
      } else if (line.startsWith(' ')) {
        lineNo += 1;
      }
      // `-` lines are removed text and `\ No newline at end of file` is a marker: neither is added.
      continue;
    }
    if (line.startsWith('new file mode ')) file.isNew = true;
    else if (line.startsWith('deleted file mode ')) file.deleted = true;
    else if (line.startsWith('rename to ')) file.renameTo = headerPath(line.slice(10));
    else if (line.startsWith('copy to ')) file.copyTo = headerPath(line.slice(8));
    else if (line.startsWith('+++ ')) {
      const value = headerPath(line.slice(4));
      if (value === '/dev/null') file.deleted = true;
      else file.plusPath = stripPrefix(value, 'b/');
    }
    // Other header lines (index, mode, similarity, `---`) add nothing. "Binary files … differ"
    // cannot appear with `--text`; if it did, only the file name would be reported.
  }
  finishHeader();
  return out;
}

/**
 * Escapes control characters (C0, DEL, C1, and the Unicode line and paragraph separators) so a
 * printed file name can never start a new log line, such as a `::` workflow command.
 */
export function printable(text) {
  const named = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };
  // eslint-disable-next-line no-control-regex -- matching control characters is the point.
  return text.replace(/[\u0000-\u001f\u007f-\u009f\u{2028}\u{2029}]/gu, (char) => {
    if (named[char]) return named[char];
    const code = char.charCodeAt(0);
    return code <= 0xff
      ? `\\x${code.toString(16).padStart(2, '0')}`
      : `\\u${code.toString(16).padStart(4, '0')}`;
  });
}

/**
 * Reads the pull request's current title and body from the GitHub REST API, so a re-run never
 * re-checks the frozen event payload. Fails closed on any API problem, and when the pull request's
 * head is no longer `headSha` (this run is for an older commit). Error messages never include the
 * token, the title or the body. `fetchImpl` is injectable for tests.
 */
export async function fetchPullRequest(
  { apiUrl, repository, number, token, headSha },
  fetchImpl = fetch,
) {
  let base;
  try {
    base = new URL(apiUrl);
  } catch {
    throw new Error('GITHUB_API_URL is not a valid URL');
  }
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname);
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && loopback)) {
    throw new Error('GITHUB_API_URL must use https');
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) {
    throw new Error('GITHUB_REPOSITORY is not set to owner/name');
  }
  if (!/^[1-9][0-9]*$/.test(number ?? '')) throw new Error('PR_NUMBER is not set to a number');
  if (!token) throw new Error('GITHUB_TOKEN is not set');

  const url = `${base.href.replace(/\/+$/, '')}/repos/${repository}/pulls/${number}`;
  let response;
  let data;
  try {
    response = await fetchImpl(url, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'user-agent': 'public-text-gate',
        'x-github-api-version': '2022-11-28',
      },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error('could not reach the GitHub API to read the pull request');
  }
  if (!response.ok) {
    throw new Error(`the GitHub API returned HTTP ${response.status} for the pull request`);
  }
  try {
    data = await response.json();
  } catch {
    throw new Error('the GitHub API returned an unreadable pull request');
  }
  if (typeof data?.title !== 'string' || !(typeof data.body === 'string' || data.body === null)) {
    throw new Error('the GitHub API returned a pull request without a title or body');
  }
  if (data.head?.sha !== headSha) {
    throw new Error(
      'the pull request head is no longer HEAD_SHA; the run for the latest commit decides',
    );
  }
  return { title: data.title, body: data.body ?? '' };
}

/**
 * The exact `git log` arguments whose output `commitMessages` parses: the full message of every
 * commit the PR adds, each record as `<sha> NUL <message> RS`. Author and committer names are
 * deliberately not included; only message text is scanned.
 */
export function commitLogArgs(base, head) {
  return ['log', '--no-color', '--format=%H%x00%B%x1e', `${base}..${head}`, '--'];
}

/** Parses `commitLogArgs` output into `{ sha, message }`, oldest commit last as git prints it. */
export function commitMessages(logText) {
  return logText
    .split('\x1e')
    .map((record) => record.replace(/^\n/, ''))
    .filter((record) => record.length > 0)
    .map((record) => {
      const nul = record.indexOf('\0');
      if (nul !== 40 && nul !== 64) throw new Error('git log output has an unexpected shape');
      return { sha: record.slice(0, nul), message: record.slice(nul + 1) };
    });
}

/**
 * Returns where `regex` matches, in order: `PR title`, `PR body line N`, `commit <sha> message
 * line N`, `<path>:<line>` and `<path> (file name)`. A path that itself matches is replaced by
 * `[file name withheld #K]` so the matched text is never printed; other paths are passed through
 * `printable`.
 */
export function scan(regex, { title = '', body = '', commits = [], lines = [] }) {
  // `test` on a g or y regex is stateful (lastIndex), which would skip matches between lines.
  if (regex.global || regex.sticky) {
    throw new Error('scan needs a regular expression without the g or y flag');
  }
  const hits = [];
  if (title.split(/\r?\n/).some((part) => regex.test(part))) hits.push('PR title');
  body.split(/\r?\n/).forEach((part, index) => {
    if (regex.test(part)) hits.push(`PR body line ${index + 1}`);
  });
  for (const { sha, message } of commits) {
    message.split(/\r?\n/).forEach((part, index) => {
      if (regex.test(part)) hits.push(`commit ${sha.slice(0, 7)} message line ${index + 1}`);
    });
  }

  const labels = new Map();
  let withheld = 0;
  const label = (path) => {
    if (!labels.has(path)) {
      labels.set(path, regex.test(path) ? `[file name withheld #${++withheld}]` : printable(path));
    }
    return labels.get(path);
  };
  for (const { path, line, text } of lines) {
    if (!regex.test(text)) continue;
    hits.push(line === 0 ? `${label(path)} (file name)` : `${label(path)}:${line}`);
  }
  return hits;
}
