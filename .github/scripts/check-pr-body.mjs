// Fails when a pull request breaks the conventions in CONTRIBUTING.md: a required body section is
// missing or empty, no issue link, a title that is not a Conventional Commit subject of at most 72
// characters, or a branch name not shaped `<type>/<issue>-<slug>`. Bot authors (Dependabot
// included) are skipped. Every input arrives in the environment, never interpolated into shell.
import { pathToFileURL } from 'node:url';

export const REQUIRED_SECTIONS = [
  'Why',
  'What changed',
  'Alternatives considered',
  'Trade-offs and known limits',
  'How tested',
  'Follow-ups',
];
export const TYPES = ['feat', 'fix', 'chore', 'refactor', 'docs', 'test', 'ci', 'perf'];
export const MAX_TITLE = 72;

const TITLE = new RegExp(`^(?:${TYPES.join('|')})(?:\\([a-z0-9][a-z0-9._/-]*\\))?!?: \\S`);
const BRANCH = new RegExp(`^(?:${TYPES.join('|')})/[1-9][0-9]*-[a-z0-9]+(?:-[a-z0-9]+)*$`);
const ISSUE_LINK = /^\s*(?:closes|fixes|refs)\s+#[1-9][0-9]*\b/im;

/** True for GitHub App and bot accounts, Dependabot included. */
export function isBot({ type = '', login = '' }) {
  return type === 'Bot' || login.endsWith('[bot]');
}

/** Splits a markdown body into `## heading` sections, keyed by lower-cased heading. */
function sections(body) {
  const found = new Map();
  let current = null;
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      current = heading[1].toLowerCase();
      found.set(current, '');
    } else if (current) {
      found.set(current, found.get(current) + line + '\n');
    }
  }
  return found;
}

/** Returns the list of problems with a pull request; empty when it follows the conventions. */
export function checkPullRequest({ title = '', body = '', branch = '' }) {
  const problems = [];

  if (!TITLE.test(title)) {
    problems.push(
      `title is not a Conventional Commit subject "type(scope): summary" with type one of ${TYPES.join(', ')}`,
    );
  }
  if ([...title].length > MAX_TITLE) {
    problems.push(`title is ${[...title].length} characters; the limit is ${MAX_TITLE}`);
  }
  if (/\.\s*$/.test(title)) problems.push('title ends with a period');

  if (!BRANCH.test(branch)) {
    problems.push(`branch "${branch}" does not match <type>/<issue>-<slug>, e.g. fix/42-short-slug`);
  }

  // Template guidance lives in HTML comments; it must not count as content.
  const text = body.replace(/<!--[\s\S]*?-->/g, '');
  if (!ISSUE_LINK.test(text)) problems.push('no "Closes #N", "Fixes #N" or "Refs #N" line');
  const found = sections(text);
  for (const name of REQUIRED_SECTIONS) {
    const content = found.get(name.toLowerCase());
    if (content === undefined) problems.push(`missing section "## ${name}"`);
    else if (content.trim() === '') problems.push(`section "## ${name}" is empty`);
  }
  return problems;
}

function main(env) {
  if (isBot({ type: env.PR_AUTHOR_TYPE, login: env.PR_AUTHOR_LOGIN })) {
    console.log('PR conventions check skipped: the author is a bot.');
    return 0;
  }
  const problems = checkPullRequest({
    title: env.PR_TITLE ?? '',
    body: env.PR_BODY ?? '',
    branch: env.PR_HEAD_REF ?? '',
  });
  if (problems.length) {
    console.error('PR conventions check failed:');
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error('See CONTRIBUTING.md. Edit the title or description to re-run this check.');
    return 1;
  }
  console.log('PR title, branch name and description follow CONTRIBUTING.md.');
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = main(process.env);
}
