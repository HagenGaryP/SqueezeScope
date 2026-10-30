#!/usr/bin/env bash
# Creates or updates the "main" ruleset on the default branch and sets the merge settings this
# template expects. Safe to run again: an existing "main" ruleset is updated in place.
#
# Usage: scripts/protect-main.sh [--dry-run] [--repo OWNER/NAME] CHECK [CHECK ...]
#
#   CHECK       name of a status check that must pass before merging (the job name shown on a PR,
#               e.g. "PR conventions"). Pass one argument per check.
#   --repo      repository to change; defaults to the repository of the current directory.
#   --dry-run   print the JSON that would be sent and change nothing (does not call gh).
#
# Needs the GitHub CLI (gh), logged in as a repository admin.
set -euo pipefail

# The GitHub Actions app: required checks must come from a workflow, not any app or commit status.
GITHUB_ACTIONS_APP_ID=15368

usage() {
  sed -n '5,12s/^# \{0,1\}//p' "$0" >&2
  exit 2
}

dry_run=false
repo=""
checks=()
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) dry_run=true ;;
    --repo)
      [ $# -ge 2 ] || usage
      repo="$2"
      shift
      ;;
    -h | --help) usage ;;
    --) shift; checks+=("$@"); break ;;
    -*) echo "protect-main: unknown option $1" >&2; usage ;;
    *) checks+=("$1") ;;
  esac
  shift
done

if [ ${#checks[@]} -eq 0 ]; then
  echo "protect-main: pass at least one required status check name" >&2
  usage
fi

# JSON string literal. Check names are plain text; reject control characters rather than escape them.
json_string() {
  if [[ "$1" =~ [[:cntrl:]] ]]; then
    echo "protect-main: control character in argument" >&2
    exit 2
  fi
  local s="${1//\\/\\\\}"
  printf '"%s"' "${s//\"/\\\"}"
}

check_items=""
for check in "${checks[@]}"; do
  [ -n "$check" ] || { echo "protect-main: empty check name" >&2; exit 2; }
  check_items+="${check_items:+,}{\"context\":$(json_string "$check"),\"integration_id\":$GITHUB_ACTIONS_APP_ID}"
done

ruleset=$(cat <<JSON
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["squash"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [$check_items]
      }
    }
  ]
}
JSON
)

settings=$(cat <<'JSON'
{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY",
  "allow_auto_merge": true,
  "delete_branch_on_merge": true
}
JSON
)

if $dry_run; then
  printf '{\n"repository": %s,\n"ruleset": %s,\n"settings": %s\n}\n' \
    "$(json_string "${repo:-(current repository)}")" "$ruleset" "$settings"
  exit 0
fi

command -v gh > /dev/null || { echo "protect-main: the GitHub CLI (gh) is not installed" >&2; exit 1; }
if [ -z "$repo" ]; then
  repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
fi
if ! [[ "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "protect-main: --repo must be OWNER/NAME" >&2
  exit 2
fi

existing=$(gh api --paginate "repos/$repo/rulesets?includes_parents=false" \
  --jq '.[] | select(.name == "main") | .id')
existing=${existing%%$'\n'*}

if [ -n "$existing" ]; then
  printf '%s' "$ruleset" | gh api --method PUT "repos/$repo/rulesets/$existing" --input - --silent
  echo "Updated ruleset \"main\" ($existing) on $repo."
else
  printf '%s' "$ruleset" | gh api --method POST "repos/$repo/rulesets" --input - --silent
  echo "Created ruleset \"main\" on $repo."
fi

printf '%s' "$settings" | gh api --method PATCH "repos/$repo" --input - --silent
echo "Set squash-only merges, PR title and body as the squash commit, auto-merge and branch deletion."

# One label per change type in CONTRIBUTING.md (keep in step with TYPES in check-pr-body.mjs);
# the PR triage workflow adds the one named by the branch prefix.
for type in feat fix chore refactor docs test ci perf; do
  gh label create "type: $type" --repo "$repo" --color "c5def5" \
    --description "Change type: $type" --force > /dev/null
done
echo "Created or updated the type labels."

# SECURITY.md points reporters at private vulnerability reporting, which is off by default and
# exists only on public repositories.
if [ "$(gh api "repos/$repo" --jq .visibility)" = "public" ]; then
  gh api --method PUT "repos/$repo/private-vulnerability-reporting" --silent
  echo "Enabled private vulnerability reporting."
else
  echo "Skipped private vulnerability reporting: available on public repositories only."
fi
