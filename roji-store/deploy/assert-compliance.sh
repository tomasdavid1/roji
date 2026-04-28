#!/usr/bin/env bash
# Roji Peptides - production compliance gate.
#
# Asserts that the live Kinsta site no longer carries any of the
# pre-pivot "Protocol Engine" / personalized-dosing residue. Run as a
# step in the deploy workflow so a regression fails the build before
# the new code is allowed to claim "deployed".
#
# Required env (passed in by the workflow):
#   SSHPASS, HOST, PORT, USER, WP_PATH
#
# Reads:
#   - wp_posts.post_content for the home / faq / about pages
#   - _elementor_data postmeta for the same pages (Elementor stores
#     its serialized JSON here; if a phrase is in the editor canvas
#     but not the rendered output it'll still surface to bots/RSS)
#   - the roji-header nav menu items
#
# Exits non-zero with a clear annotation on any match.

set -euo pipefail

if [[ -z "${SSHPASS:-}" || -z "${HOST:-}" || -z "${PORT:-}" || -z "${USER:-}" || -z "${WP_PATH:-}" ]]; then
  echo "::error::assert-compliance.sh requires SSHPASS/HOST/PORT/USER/WP_PATH env vars"
  exit 2
fi

remote() {
  sshpass -e ssh -o StrictHostKeyChecking=accept-new -p "$PORT" "$USER@$HOST" "cd '$WP_PATH' && $1"
}

# Phrases that must not appear in any customer-facing surface.
FORBIDDEN=(
  "Protocol Engine"
  "weight-adjusted"
  "tailored stack"
  "Weight scaling is per-compound"
  "questionnaire about your goal"
  "// example output"
  "bpc-157: 250mcg"
  "tb-500: 2.5mg"
  "2x daily SC"
  "2x weekly SC"
)

PAGES=(home faq about)
fail=0

# 1. post_content + _elementor_data per page
for slug in "${PAGES[@]}"; do
  echo "--- /$slug/"
  # Pull both surfaces in one round-trip so we minimize SSH overhead.
  body=$(remote "wp post list --name='$slug' --post_type=page --field=ID --format=ids" || true)
  if [[ -z "$body" ]]; then
    echo "::warning::No page with slug '$slug' on the live site"
    continue
  fi
  pid="$body"

  content=$(remote "wp post get $pid --field=post_content" || true)
  eldata=$(remote "wp post meta get $pid _elementor_data 2>/dev/null || true")

  combined="$content
$eldata"

  for needle in "${FORBIDDEN[@]}"; do
    if grep -Fq -- "$needle" <<<"$combined"; then
      echo "::error::/$slug/ contains forbidden phrase: '$needle'"
      grep -F -m 2 -- "$needle" <<<"$combined" | head -2 | sed 's/^/    /'
      fail=1
    fi
  done

  if [[ "$fail" -eq 0 ]]; then
    echo "  OK /$slug/ clean"
  fi
done

# 2. Header menu items (the Bluum-era 'Protocol Engine' nav link)
echo "--- header menu (roji-header)"
menu=$(remote "wp menu item list roji-header --format=csv 2>/dev/null || true")
if grep -Fq "Protocol Engine" <<<"$menu"; then
  echo "::error::roji-header menu still contains 'Protocol Engine' item"
  echo "$menu" | sed 's/^/    /'
  fail=1
fi
if ! grep -Fq "Research Tools" <<<"$menu"; then
  echo "::error::roji-header menu missing 'Research Tools' item"
  echo "$menu" | sed 's/^/    /'
  fail=1
else
  echo "  OK roji-header contains 'Research Tools', no 'Protocol Engine'"
fi

# 3. Verify Research Tools menu item points at tools.rojipeptides.com
if grep -F "Research Tools" <<<"$menu" | grep -Fq "tools.rojipeptides.com"; then
  echo "  OK Research Tools -> tools.rojipeptides.com"
else
  echo "::error::Research Tools menu item does not point at https://tools.rojipeptides.com"
  echo "$menu" | grep -F "Research Tools" | sed 's/^/    /'
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "::error::Compliance assertion FAILED - the live site still carries Protocol Engine residue. See errors above."
  exit 1
fi

echo ""
echo "Compliance assertion PASSED - / /faq/ /about/ + roji-header menu are clean."
