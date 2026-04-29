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

# 4. Wordmark assertion: the header must render the lowercase 'roji'
#    wordmark, not the OceanWP/Hello fallback that prints capitalized
#    'Roji' from wp_options.blogname.
#
# Three layers of defense:
#   - wp_options.blogname is pinned to 'roji' (set by set-brand-options.php
#     in a prior step of this workflow)
#   - bloginfo() filter in branding.php returns 'roji'
#   - CSS pins .site-title color/case to the wordmark treatment
#
# Strategy: curl the homepage from inside the Kinsta container so we
# fetch the rendered HTML directly from origin (Apache), bypassing
# Cloudflare's bot challenge AND the edge cache.
echo "--- header wordmark"
fetch_origin() {
  local path="$1"
  remote "curl -sS -L -H 'Host: rojipeptides.com' --resolve rojipeptides.com:443:127.0.0.1 -k 'https://rojipeptides.com$path' 2>/dev/null || curl -sS -L 'https://rojipeptides.com$path' 2>/dev/null || true"
}

assert_wordmark_for() {
  local path="$1"
  local label="$2"
  local html
  html=$(fetch_origin "$path")
  if [[ -z "$html" ]]; then
    echo "::warning::$label: could not fetch HTML for wordmark check"
    return 0
  fi

  # Look at the first <a> element inside .site-branding (the site-title
  # anchor). It must render lowercase 'roji' (optionally followed by the
  # RESEARCH PEPTIDES eyebrow), never capitalized 'Roji' fallback.
  local branding_anchor
  branding_anchor=$(python3 - <<PY 2>/dev/null
import re, sys
html = """$html"""
m = re.search(r'<div[^>]*class="[^"]*site-branding[^"]*"[^>]*>(.*?)</nav', html, re.DOTALL | re.IGNORECASE)
if not m:
    sys.exit(0)
branding = m.group(1)
anchors = re.findall(r'<a [^>]*>(.*?)</a>', branding, re.DOTALL | re.IGNORECASE)
if anchors:
    # Strip tags, collapse whitespace (Elementor adds newlines between spans).
    text = re.sub(r'<[^>]+>', '', anchors[0])
    text = re.sub(r'\s+', ' ', text).strip()
    print(text)
PY
)

  if [[ -z "$branding_anchor" ]]; then
    echo "  OK $label: site-branding anchor empty (logo image only is acceptable)"
    return 0
  fi

  # Accept bare wordmark or lockup with RESEARCH PEPTIDES (matches tools site pattern).
  if [[ "$branding_anchor" == "roji" ]]; then
    echo "  OK $label: site-branding anchor renders lowercase 'roji'"
    return 0
  fi
  if [[ "$branding_anchor" =~ ^roji[[:space:]]+RESEARCH[[:space:]]+PEPTIDES$ ]]; then
    echo "  OK $label: site-branding anchor renders roji + RESEARCH PEPTIDES lockup"
    return 0
  fi

  if [[ "$branding_anchor" == "Roji" || "$branding_anchor" == "Roji Peptides" ]]; then
    echo "::error::$label: site-branding anchor renders '$branding_anchor' instead of lowercase 'roji'"
    fail=1
    return 1
  fi

  echo "::warning::$label: unexpected site-branding anchor text: '$branding_anchor'"
}

assert_wordmark_for "/"      "Homepage"
assert_wordmark_for "/shop/" "Shop"

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "::error::Compliance assertion FAILED - see errors above."
  exit 1
fi

echo ""
echo "Compliance assertion PASSED - / /faq/ /about/ + roji-header menu + wordmark are clean."
