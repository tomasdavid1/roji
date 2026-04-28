#!/usr/bin/env bash
# run-sql-migration.sh — apply a single SQL file to the live Kinsta DB
# via WP-CLI. Surgical alternative to db-push.sh for content-only edits.
#
# Usage:
#   ./run-sql-migration.sh path/to/migration.sql
#
# Always pulls a backup before applying.

source "$(dirname "$0")/_lib.sh"
load_env
require_env KINSTA_SSH_HOST KINSTA_SSH_PORT KINSTA_SSH_USER KINSTA_SSH_PASSWORD KINSTA_WP_PATH

SQL_FILE="${1:-}"
[[ -z "$SQL_FILE" ]] && die "Usage: $0 <path-to-sql>"
[[ ! -f "$SQL_FILE" ]] && die "SQL file not found: $SQL_FILE"

step "Backup remote DB first"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_NAME="roji-pre-migration-$TS.sql.gz"
kinsta_wp "db export $BACKUP_NAME"
ok "Remote backup created at: $KINSTA_WP_PATH/$BACKUP_NAME"

step "Upload migration"
REMOTE_NAME="roji-migration-$TS.sql"
export SSHPASS="$KINSTA_SSH_PASSWORD"
rsync -avz \
  -e "sshpass -e ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$DEPLOY_DIR/known_hosts -p $KINSTA_SSH_PORT" \
  "$SQL_FILE" \
  "$KINSTA_SSH_USER@$KINSTA_SSH_HOST:$KINSTA_WP_PATH/$REMOTE_NAME"
unset SSHPASS
ok "Uploaded: $REMOTE_NAME"

step "Apply migration"
kinsta_wp "db import $REMOTE_NAME"
ok "Migration applied."

step "Cleanup"
kinsta_ssh "rm -f '$KINSTA_WP_PATH/$REMOTE_NAME'"

step "Flush caches"
kinsta_wp "cache flush" || true
kinsta_wp "rewrite flush"

ok "Done. Backup retained at $KINSTA_WP_PATH/$BACKUP_NAME (delete manually when satisfied)."
