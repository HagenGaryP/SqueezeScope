# 0001 — Gate public text with a denylist regex kept in a repository secret

- **Date:** 2026-10-30
- **Status:** Accepted
- **PR:** see the pull request that closes #65

## Context
Pull request titles, descriptions and diffs are public. Some terms must never appear in them, and
the list of those terms is itself not public, so it cannot live in the repository. Every repository
created from this standard needs the same check without copying a word list around.

## Options
1. **Regex in a repository secret, checked by a workflow** — the pattern never appears in the
   repository or the logs; one `gh secret set` per repository. Fork pull requests get no secrets,
   so the gate fails for them (fail closed).
2. **Word list committed to the repository** — simple, but publishes the list it is meant to protect.
3. **A pre-commit hook** — runs locally only, is easy to skip and does not see PR titles or bodies.

## Decision
Option 1. The gate scans the PR title, body, every added line and every new file name, prints only
locations (never matched text or the pattern), and fails when the secret is missing, blank, invalid
or matches the empty string. The title and body are read from the API at run time so a re-run sees
the current text. The gate is ported from an existing, tested implementation.

It runs on `pull_request` and executes the pull request's own copy of the script. Under
`pull_request` the workflow file also comes from the pull request, so checking out the base
branch's script would not stop a pull request from changing the gate; review of `.github/` changes
(CODEOWNERS) is the control. `pull_request_target` would run base-branch code, but it executes with
a write-capable token beside untrusted pull request content and would not run the gate on the pull
request that introduces it.

## Consequences
- Each new repository needs the secret before its first pull request, or the gate fails.
- Pull requests from forks always fail the gate; this repository is single-maintainer repositories
  where contributors push branches to the repository itself.
- A pull request can weaken the gate by editing it; the maintainer must review `.github/` changes.

## What would prove it wrong
Outside contributors sending fork pull requests, or a pull request merging a weakened gate unnoticed.
Then move the gate to `pull_request_target` with a base-branch checkout and objects-only fetch of
the head.
