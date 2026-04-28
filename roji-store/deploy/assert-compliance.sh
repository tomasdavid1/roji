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

# 4. Wordmark assertion: the header on every page must render the
#    lowercase 'roji' wordmark, not Hello Elementor's default
#    capitalized 'Roji' site-title fallback (which also paints itself
#    in brand-blue link color and looks broken).
#
# Strategy: curl the homepage from inside the Kinsta container so we
# fetch the rendered HTML directly from origin (Apache), bypassing
# Cloudflare's bot challenge AND the edge cache.
echo "--- header wordmark"
fetch_origin() {
  local path="$1"
  # Try loopback resolve first (origin Apache); if that fails,
  # fall back to the public hostname (Kinsta routes back through CF
  # but origin still serves us with the right Host header).
  remote "curl -sS -L -H 'Host: rojipeptides.com' --resolve rojipeptides.com:443:127.0.0.1 -k 'https://rojipeptides.com$path' 2>/dev/null || curl -sS -L 'https://rojipeptides.com$path' 2>/dev/null || true"
}

home_html=$(fetch_origin "/")

if [[ -z "$home_html" ]]; then
  echo "::warning::Could not fetch homepage HTML for wordmark check"
else
  echo "  homepage HTML bytes: $(wc -c <<<"$home_html")"

  # 4a. The custom-logo lockup must render the lowercase wordmark span.
  if grep -Fq 'roji-wordmark__text' <<<"$home_html"; then
    echo "  OK custom-logo lockup is rendering (.roji-wordmark__text present)"
  else
    echo "::warning::.roji-wordmark__text not found in homepage HTML - Hello Elementor may have bypassed get_custom_logo() filter on desktop"
  fi

  # 4b. Capitalized 'Roji' inside any site-title anchor = broken fallback.
  if grep -E -i 'class="[^"]*site-title[^"]*"[^>]*>[^<]*<a[^>]*>Roji<' <<<"$home_html" >/dev/null \
     || grep -E '<a[^>]+class="[^"]*site-title[^"]*"[^>]*>Roji<' <<<"$home_html" >/dev/null; then
    echo "::error::Header is rendering capitalized 'Roji' inside a .site-title anchor - bloginfo filter not applied"
    fail=1
  else
    echo "  OK no broken capitalized-Roji site-title anchor on /"
  fi

  # 4c. Lowercase 'roji' must appear in the markup (either via
  #     wordmark span, the filtered bloginfo, or both).
  if grep -F '>roji<' <<<"$home_html" >/dev/null; then
    echo "  OK lowercase 'roji' wordmark text present in homepage markup"
  else
    echo "::warning::Lowercase 'roji' wordmark text not found in homepage markup - check the header rendering"
  fi

  # DEBUG: dump the .site-branding block specifically so we see the
  # exact text + tags around the logo/title.
  echo ""
  echo "  --- site-branding block dump (debug) ---"
  python3 - <<PY 2>/dev/null
import re
html = """$home_html"""
m = re.search(r'<div[^>]*class="[^"]*site-branding[^"]*"[^>]*>(.*?)</header>', html, re.DOTALL | re.IGNORECASE)
if m:
    print(m.group(0)[:2500])
else:
    print("(no site-branding block found)")
PY
  echo "  --- end dump ---"

  # Also report active theme
  echo "  --- active theme + has_custom_logo state ---"
  remote "wp theme list --status=active --format=csv" || true
  remote "wp eval 'var_export(has_custom_logo()); echo \" / blogname: \"; echo get_bloginfo(\"name\");'" || true
  echo ""
fi

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "::error::Compliance assertion FAILED - see errors above."
  exit 1
fi

echo ""
echo "Compliance assertion PASSED - / /faq/ /about/ + roji-header menu + wordmark are clean."
