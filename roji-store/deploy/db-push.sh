#!/usr/bin/env bash
# db-push.sh — push the LocalWP database to Kinsta production, replacing
# the remote DB with the local one (with URL search-replace).
#
# DESTRUCTIVE — this overwrites the production WordPress DB. Use only when
# you've made content changes locally (products, pages, menus) that you
# want to publish.
#
# Always pulls a backup before overwriting.
#
# Usage:
#   ./db-push.sh                  # interactive confirmation
#   ./db-push.sh --yes            # non-interactive (CI/scripted)

source "$(dirname "$0")/_lib.sh"
load_env
require_env KINSTA_SSH_HOST KINSTA_SSH_PORT KINSTA_SSH_USER KINSTA_SSH_PASSWORD \
            KINSTA_WP_PATH KINSTA_SITE_URL \
            LOCAL_DB_NAME LOCAL_DB_USER LOCAL_DB_PASSWORD LOCAL_DB_SOCKET \
            LOCAL_SITE_URL LOCAL_WP_PATH

YES=0
[[ "${1:-}" == "--yes" ]] && YES=1

TMP_DIR="$(mktemp -d -t roji-db-push.XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

step "Backup remote DB first"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
kinsta_wp "db export roji-backup-$TS.sql.gz"
kinsta_rsync ":$KINSTA_WP_PATH/roji-backup-$TS.sql.gz" "" --inplace 2>/dev/null || true
# Pull the backup down for safety.
SSHPASS="$KINSTA_SSH_PASSWORD" sshpass -e \
  rsync -avz \
  -e "sshpass -e ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$DEPLOY_DIR/known_hosts -p $KINSTA_SSH_PORT" \
  "$KINSTA_SSH_USER@$KINSTA_SSH_HOST:$KINSTA_WP_PATH/roji-backup-$TS.sql.gz" \
  "$DEPLOY_DIR/roji-backup-$TS.sql.gz"
kinsta_ssh "rm -f '$KINSTA_WP_PATH/roji-backup-$TS.sql.gz'"
ok "Remote backup saved: $DEPLOY_DIR/roji-backup-$TS.sql.gz"

step "Dump local DB"
local_mysqldump > "$TMP_DIR/local.sql"
SQL_BYTES="$(wc -c < "$TMP_DIR/local.sql" | tr -d ' ')"
ok "Local SQL dumped: ${SQL_BYTES} bytes"

step "Confirm overwrite"
echo
echo "  Source:      LocalWP ($LOCAL_SITE_URL)"
echo "  Destination: $KINSTA_SITE_URL"
echo "  SQL size:    ${SQL_BYTES} bytes"
echo "  Backup at:   $DEPLOY_DIR/roji-backup-$TS.sql.gz"
echo
if (( YES == 0 )); then
  read -r -p "Type YES to overwrite the production DB: " confirm
  [[ "$confirm" == "YES" ]] || die "Aborted."
fi

step "Upload + import"
kinsta_rsync "$TMP_DIR/local.sql" "roji-push.sql"
kinsta_wp "db import roji-push.sql"
kinsta_ssh "rm -f '$KINSTA_WP_PATH/roji-push.sql'"
ok "DB imported."

step "search-replace URLs"
kinsta_wp "search-replace '$LOCAL_SITE_URL' '$KINSTA_SITE_URL' --all-tables --report-changed-only"

step "Flush caches + rewrites"
kinsta_wp "rewrite flush"
kinsta_wp "cache flush" || true
ok "DB push complete."
