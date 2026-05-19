#!/usr/bin/env bash
# sync-gh-secrets.sh — push .env.local secrets to GitHub Actions secrets.
#
# WHY THIS EXISTS
# ---------------
# The Daily Funnel Snapshot workflow (.github/workflows/daily-funnel-report.yml)
# needs 8 secrets to call Google Ads + GA4. On 2026-05-19 we discovered
# that none of them were ever set — the cron had been silently committing
# mock-data reports for 4 days because lib/google-ads.ts falls back to
# MOCK_CAMPAIGNS when env vars are missing.
#
# This script reads the values from .env.local (which works locally) and
# pushes them to GitHub Actions secrets so CI uses the same creds.
#
# REQUIRES
# --------
# - gh CLI authenticated with `repo` scope. If you see HTTP 403 on
#   `gh secret set`, run: gh auth refresh -h github.com -s repo
# - .env.local in roji-ads-dashboard/ with the 8 keys filled in.
#
# Usage:
#   bash scripts/sync-gh-secrets.sh           # dry-run (lists what would be set)
#   bash scripts/sync-gh-secrets.sh --apply   # actually push to GitHub
#
# After running with --apply, kick off a manual cron run to verify:
#   gh workflow run "Daily funnel snapshot"

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/roji-ads-dashboard/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found." >&2
  exit 1
fi

# Whitelist of keys we sync. Anything else in .env.local stays local.
KEYS=(
  GOOGLE_ADS_CLIENT_ID
  GOOGLE_ADS_CLIENT_SECRET
  GOOGLE_ADS_DEVELOPER_TOKEN
  GOOGLE_ADS_REFRESH_TOKEN
  GOOGLE_ADS_CUSTOMER_ID
  GOOGLE_ADS_LOGIN_CUSTOMER_ID
  GA4_PROPERTY_ID
  GA4_REFRESH_TOKEN
)

APPLY=false
if [ "${1:-}" = "--apply" ]; then
  APPLY=true
fi

echo
echo "Repo:    $(cd "$ROOT_DIR" && gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo '?')"
echo "Source:  $ENV_FILE"
echo "Mode:    $($APPLY && echo APPLY || echo DRY-RUN)"
echo

missing=()
for key in "${KEYS[@]}"; do
  # Match the *first* occurrence — .env.local can have inline comments
  # after the value, which we strip below.
  value=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | sed -E "s/^${key}=//;s/[#].*\$//;s/^[\"']//;s/[\"']\$//;s/[[:space:]]*$//" || true)

  if [ -z "$value" ]; then
    missing+=("$key")
    echo "  $key  MISSING in .env.local"
    continue
  fi

  # Don't print the value, just the length so secret material doesn't
  # land in a terminal scrollback.
  echo "  $key  ($(echo -n "$value" | wc -c | tr -d ' ') chars)"

  if $APPLY; then
    (cd "$ROOT_DIR" && gh secret set "$key" --body "$value" >/dev/null)
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo
  echo "ERROR: Missing keys in .env.local: ${missing[*]}" >&2
  exit 2
fi

echo
if $APPLY; then
  echo "Done. Verify with:  gh secret list"
  echo "Trigger a fresh run: gh workflow run 'Daily funnel snapshot'"
else
  echo "Dry-run only. Re-run with --apply to push to GitHub."
fi
