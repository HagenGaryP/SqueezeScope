# Contributing

## One issue, one branch, one small PR

Every change starts from an issue with acceptance criteria. Work on one branch for that issue and
open one pull request that closes it. Keep the PR small enough to review in one sitting; split
anything bigger into more issues.

## Branch names

`<type>/<issue>-<slug>`, for example `fix/42-empty-search-results`.

- `type` is one of `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ci`, `perf`.
- `issue` is the issue number.
- `slug` is a few lowercase words joined by hyphens.

## Assignee and labels

The **PR triage** workflow assigns the PR to its author and adds the `type: <type>` label named by
the branch prefix when the PR is opened. `scripts/protect-main.sh` creates those labels.

## Pull request titles

Conventional Commit form, at most 72 characters: `type(scope): imperative summary`, for example
`fix(search): return an empty list instead of null`. The scope is optional. The title becomes the
squash commit subject on `main`, so write it as a commit subject: imperative mood, no trailing period.

## Pull request descriptions

Fill in every section of the PR template and link the issue with `Closes #N` (or `Fixes #N`;
`Refs #N` when the PR does not finish the issue). Write "None" where a section does not apply. The
description becomes the squash commit body.

## Commit messages

The body of every commit states:

- **Why** the change is needed.
- **Alternatives rejected**, and why.
- **How it was verified**: tests added or run, commands, manual checks.

## Checks

CI enforces the branch name, the title, the description and the public-text gate on every PR; see
`.github/scripts/`. Run the script tests locally with `node --test '.github/scripts/*.test.mjs'`.
