#!/usr/bin/env bash
# post-approval.sh — run AFTER you receive approval emails for:
#   1. Google Ads Basic Access (gives you a usable developer token + conversion ID)
#   2. Trustpilot API access (gives you BU id, API key, secret, business user id)
#
# This script asks for the values, writes them to:
#   - Vercel env vars on roji-tools  (NEXT_PUBLIC_GADS_ID, conversion labels)
#   - Vercel env vars on roji-ads    (full GOOGLE_ADS_*, TRUSTPILOT_*)
#   - Prints the wp-config.php lines to add on Kinsta (TRUSTPILOT, GADS).
#
# It does NOT touch WordPress directly — those constants need to live in
# wp-config.php (above the `require_once ABSPATH . 'wp-settings.php';` line)
# and that's a SSH paste step you do manually.
#
# Usage:
#   ./post-approval.sh trustpilot   # only Trustpilot keys
#   ./post-approval.sh google-ads   # only Google Ads keys
#   ./post-approval.sh both         # interactive walkthrough for everything

source "$(dirname "$0")/_lib.sh"

VERCEL_TOKEN="${VERCEL_TOKEN:-}"
if [[ -z "$VERCEL_TOKEN" ]]; then
  read -r -s -p "Vercel API token (vcp_...): " VERCEL_TOKEN
  echo
fi

set_vercel_env () {
  local proj="$1" key="$2" val="$3" type="${4:-sensitive}"
  curl -s -X POST "https://api.vercel.com/v10/projects/$proj/env" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$key\",\"value\":\"$val\",\"type\":\"$type\",\"target\":[\"production\",\"preview\"]}" \
    >/dev/null
  ok "  Vercel: $proj/$key"
}

ask () {
  local var="$1" prompt="$2" secret="${3:-no}"
  if [[ "$secret" == "yes" ]]; then
    read -r -s -p "  $prompt: " "$var"
    echo
  else
    read -r -p "  $prompt: " "$var"
  fi
}

mode="${1:-both}"

if [[ "$mode" == "google-ads" || "$mode" == "both" ]]; then
  step "Google Ads — values from approval email + Ads UI"
  ask GADS_DEV_TOKEN  "GOOGLE_ADS_DEVELOPER_TOKEN  (now in Basic Access)" yes
  ask GADS_AW_ID      "NEXT_PUBLIC_GADS_ID         (e.g. AW-1234567890)"
  ask GADS_PURCH_LBL  "ROJI_GADS_PURCHASE_LABEL    (alpha-num conversion label)"
  ask GADS_LEAD_LBL   "GADS_LEAD_LABEL             (optional — leave blank to skip)"

  set_vercel_env roji-ads     GOOGLE_ADS_DEVELOPER_TOKEN "$GADS_DEV_TOKEN"
  set_vercel_env roji-tools   NEXT_PUBLIC_GADS_ID         "$GADS_AW_ID" plain
  set_vercel_env roji-ads     NEXT_PUBLIC_GADS_ID         "$GADS_AW_ID" plain
  set_vercel_env roji-ads     NEXT_PUBLIC_GADS_PROTOCOL_LABEL "$GADS_PURCH_LBL" plain
  if [[ -n "$GADS_LEAD_LBL" ]]; then
    set_vercel_env roji-ads   NEXT_PUBLIC_GADS_LEAD_LABEL "$GADS_LEAD_LBL" plain
  fi

  step "wp-config.php lines to add (paste via Kinsta SSH):"
  echo
  echo "    define( 'ROJI_GADS_ID',              '$GADS_AW_ID' );"
  echo "    define( 'ROJI_GADS_PURCHASE_LABEL',  '$GADS_PURCH_LBL' );"
  echo
fi

if [[ "$mode" == "trustpilot" || "$mode" == "both" ]]; then
  step "Trustpilot — values from businessapp.b2b.trustpilot.com → Integrations → API access"
  ask TP_BU         "TRUSTPILOT_BUSINESS_UNIT_ID  (24-char hex)"
  ask TP_KEY        "TRUSTPILOT_API_KEY" yes
  ask TP_SECRET     "TRUSTPILOT_API_SECRET" yes
  ask TP_USER_ID    "TRUSTPILOT_BUSINESS_USER_ID"

  set_vercel_env roji-ads TRUSTPILOT_BUSINESS_UNIT_ID  "$TP_BU"        plain
  set_vercel_env roji-ads TRUSTPILOT_API_KEY           "$TP_KEY"
  set_vercel_env roji-ads TRUSTPILOT_API_SECRET        "$TP_SECRET"
  set_vercel_env roji-ads TRUSTPILOT_BUSINESS_USER_ID  "$TP_USER_ID"   plain

  step "wp-config.php lines to add (paste via Kinsta SSH):"
  echo
  echo "    define( 'ROJI_TRUSTPILOT_BUSINESS_UNIT_ID', '$TP_BU' );"
  echo "    define( 'ROJI_TRUSTPILOT_API_KEY',          '$TP_KEY' );"
  echo "    define( 'ROJI_TRUSTPILOT_API_SECRET',       '$TP_SECRET' );"
  echo "    define( 'ROJI_TRUSTPILOT_BUSINESS_USER_ID', '$TP_USER_ID' );"
  echo
fi

step "Triggering Vercel redeploys so new env vars take effect"
for proj in roji-tools roji-ads; do
  curl -s -X POST "https://api.vercel.com/v13/deployments" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$proj\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"ref\":\"main\",\"repoId\":\"\"}}" \
    >/dev/null 2>&1 || true
  ok "  Triggered redeploy on $proj (or not — push to main if it didn't)"
done

ok "All done."
