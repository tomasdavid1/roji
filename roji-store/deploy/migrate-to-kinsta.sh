#!/usr/bin/env bash
# migrate-to-kinsta.sh — ONE-SHOT first-time migration of the LocalWP site
# to a fresh Kinsta WordPress install.
#
# What this does:
#   1. Lints all PHP files locally.
#   2. Confirms Kinsta SSH works + reads the destination WP_HOME / WP_SITEURL.
#   3. Dumps the local DB to a temp file.
#   4. Tar+gzips wp-content/uploads/ from LocalWP.
#   5. Uploads both via SFTP-over-SSH (rsync).
#   6. Imports the DB on Kinsta with `wp db import`.
#   7. Runs `wp search-replace` to swap http://roji.local → https://rojipeptides.com.
#   8. Extracts uploads on Kinsta.
#   9. Calls deploy-theme.sh to push the child theme + Elementor template scripts.
#  10. Installs/activates the required plugin set (woocommerce, elementor, etc.)
#      via WP-CLI on Kinsta. Skips ones already installed.
#  11. Flushes rewrite rules + caches.
#
# RUN THIS ONCE per environment. After the first run, use:
#   - deploy-theme.sh   for code/theme changes
#   - db-push.sh        for occasional DB pushes (BE CAREFUL — overwrites prod DB)
#
# Usage:
#   ./migrate-to-kinsta.sh              # do it
#   ./migrate-to-kinsta.sh --skip-uploads   # if uploads already migrated
#   ./migrate-to-kinsta.sh --skip-db        # only push code (same as deploy-theme.sh + plugins)

source "$(dirname "$0")/_lib.sh"
load_env
require_env KINSTA_SSH_HOST KINSTA_SSH_PORT KINSTA_SSH_USER KINSTA_SSH_PASSWORD \
            KINSTA_WP_PATH KINSTA_SITE_URL \
            LOCAL_DB_NAME LOCAL_DB_USER LOCAL_DB_PASSWORD LOCAL_DB_SOCKET \
            LOCAL_SITE_URL LOCAL_WP_PATH

SKIP_DB=0; SKIP_UPLOADS=0
for arg in "$@"; do
  case "$arg" in
    --skip-db) SKIP_DB=1 ;;
    --skip-uploads) SKIP_UPLOADS=1 ;;
    *) die "Unknown arg: $arg" ;;
  esac
done

REPO_ROOT="$(cd "$DEPLOY_DIR/../.." && pwd)"
TMP_DIR="$(mktemp -d -t roji-migrate.XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

step "Verify Kinsta SSH + remote WP install"
need_cmd php
need_cmd rsync
HELLO="$(kinsta_ssh 'echo OK && cd '"'$KINSTA_WP_PATH'"' && wp core version --skip-themes --skip-plugins')" \
  || die "Cannot SSH to Kinsta or KINSTA_WP_PATH is wrong."
ok "Kinsta WP version: $(echo "$HELLO" | tail -1)"

if (( SKIP_DB == 0 )); then
  step "Dump local DB"
  local_mysqldump > "$TMP_DIR/local.sql"
  SQL_BYTES="$(wc -c < "$TMP_DIR/local.sql" | tr -d ' ')"
  ok "Local SQL dumped: ${SQL_BYTES} bytes"

  step "Upload SQL dump → Kinsta"
  kinsta_rsync "$TMP_DIR/local.sql" "roji-migrate.sql"
  ok "SQL uploaded."

  step "Import DB on Kinsta (this OVERWRITES the remote DB)"
  read -r -p "Type YES to confirm overwrite of remote DB on $KINSTA_SITE_URL: " confirm
  [[ "$confirm" == "YES" ]] || die "Aborted."

  kinsta_wp "db import roji-migrate.sql"
  ok "DB imported."

  step "search-replace site URL: $LOCAL_SITE_URL → $KINSTA_SITE_URL"
  kinsta_wp "search-replace '$LOCAL_SITE_URL' '$KINSTA_SITE_URL' --all-tables --report-changed-only"

  # Belt-and-suspenders: also fix any embedded paths.
  LOCAL_HOST="${LOCAL_SITE_URL#http://}"; LOCAL_HOST="${LOCAL_HOST#https://}"
  REMOTE_HOST="${KINSTA_SITE_URL#http://}"; REMOTE_HOST="${KINSTA_SITE_URL#https://}"
  if [[ "$LOCAL_HOST" != "$REMOTE_HOST" ]]; then
    kinsta_wp "search-replace '//$LOCAL_HOST' '//$REMOTE_HOST' --all-tables --report-changed-only"
  fi

  kinsta_ssh "rm -f '$KINSTA_WP_PATH/roji-migrate.sql'"
  ok "Search-replace complete; SQL file removed from server."
else
  warn "Skipping DB import (--skip-db)."
fi

if (( SKIP_UPLOADS == 0 )); then
  step "Sync wp-content/uploads/"
  if [[ -d "$LOCAL_WP_PATH/wp-content/uploads" ]]; then
    kinsta_rsync "$LOCAL_WP_PATH/wp-content/uploads/" "wp-content/uploads/" --exclude='.DS_Store'
    ok "Uploads synced."
  else
    warn "No local wp-content/uploads/ directory — nothing to copy."
  fi
else
  warn "Skipping uploads sync (--skip-uploads)."
fi

step "Push theme + Elementor templates + scripts"
"$DEPLOY_DIR/deploy-theme.sh"

step "Install required plugins on Kinsta (idempotent)"
# NOTE: WordPress.org plugin slugs are not always intuitive:
#   - "Yoast SEO"        → wordpress-seo  (NOT yoast-seo)
#   - "Hello Elementor"  → THIS IS A THEME, not a plugin (handled below)
PLUGINS=(
  woocommerce
  elementor
  advanced-custom-fields
  wordpress-seo
  litespeed-cache
)
# NOT in the list: `age-gate` plugin. We use our own self-hosted modal
# in roji-child/inc/age-gate.php (a simple yes/no over-21 check). The
# .org plugin shows a DOB Day/Month/Year form by default and ships
# with a "Bluum" disclaimer in its copy — wrong UX and wrong brand.
for p in "${PLUGINS[@]}"; do
  EXISTS="$(kinsta_wp "plugin is-installed $p" >/dev/null 2>&1 && echo y || echo n)"
  if [[ "$EXISTS" == "n" ]]; then
    log "Installing $p…"
    kinsta_wp "plugin install $p --activate" || warn "Could not install $p"
  else
    kinsta_wp "plugin activate $p" >/dev/null || true
    ok "$p already installed."
  fi
done

step "Install Hello Elementor parent theme + activate roji-child"
# hello-elementor is a THEME (the parent for our roji-child child theme).
# Installing it with --activate would activate the parent over our child;
# we install only, then explicitly switch to roji-child below.
kinsta_wp "theme is-installed hello-elementor" >/dev/null 2>&1 \
  || kinsta_wp "theme install hello-elementor" >/dev/null 2>&1 \
  || warn "Could not install hello-elementor parent theme"
kinsta_wp "theme activate roji-child" || warn "Could not activate roji-child"

step "Flush rewrites + caches"
kinsta_wp "rewrite flush"
kinsta_wp "cache flush" || true

step "Smoke test"
RC="$(curl -s -o /dev/null -w '%{http_code}' -L "$KINSTA_SITE_URL/")"
if [[ "$RC" == "200" ]]; then
  ok "$KINSTA_SITE_URL → HTTP 200"
else
  warn "$KINSTA_SITE_URL → HTTP $RC (may need a few seconds for caches)"
fi

step "Migration complete"
cat <<EOF

  Next steps:
    1. Log into wp-admin: $KINSTA_SITE_URL/wp-admin
    2. WooCommerce → Settings → confirm currency, payment gateway, shipping zones
    3. Set tracking IDs in roji-child/inc/config.php (or as wp-config constants):
         define( 'ROJI_GADS_ID', 'AW-...' );  # once Google Ads approved
    4. Add the internal API token to wp-config.php on Kinsta:
         define( 'ROJI_INTERNAL_API_TOKEN', '<value from /Users/tomas password manager>' );
    5. Submit your Trustpilot site for review.

EOF
