#!/usr/bin/env bash
# deploy-theme.sh — push the roji-child theme + Elementor template scripts
# to the Kinsta production environment.
#
# This is the script you run for code-only updates (theme PHP/CSS/JS edits,
# new Elementor template definitions, etc.). It does NOT touch the database
# or uploads — see db-push.sh for that.
#
# Usage:
#   ./deploy-theme.sh              # rsync + bust opcache
#   ./deploy-theme.sh --dry-run    # preview what would change without writing
#
# The GitHub Action at .github/workflows/deploy-roji-store.yml runs this
# automatically on every push to main that touches roji-store/.

source "$(dirname "$0")/_lib.sh"
load_env
require_env KINSTA_SSH_HOST KINSTA_SSH_PORT KINSTA_SSH_USER KINSTA_SSH_PASSWORD KINSTA_WP_PATH

DRY_RUN_FLAG=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN_FLAG="--dry-run"
  warn "DRY RUN — no files will be written on the server."
fi

REPO_ROOT="$(cd "$DEPLOY_DIR/../.." && pwd)"

step "Sanity-check local PHP files"
need_cmd php
PHP_ERRORS=0
while IFS= read -r -d '' f; do
  if ! php -l "$f" >/dev/null 2>&1; then
    php -l "$f" >&2
    PHP_ERRORS=$((PHP_ERRORS+1))
  fi
done < <(find "$REPO_ROOT/roji-store/roji-child" -type f -name '*.php' -print0)
if (( PHP_ERRORS > 0 )); then
  die "$PHP_ERRORS PHP file(s) failed lint — fix them before deploying."
fi
ok "All PHP files lint clean."

step "Verify Kinsta SSH connectivity"
KINSTA_HELLO="$(kinsta_ssh 'echo connected && wp --version --skip-themes --skip-plugins')" \
  || die "Could not SSH to Kinsta. Check .env credentials."
ok "$(echo "$KINSTA_HELLO" | tr '\n' ' ')"

step "Deploy roji-child theme → wp-content/themes/roji-child"
kinsta_rsync "$REPO_ROOT/roji-store/roji-child/" "wp-content/themes/roji-child/" \
  --exclude='.DS_Store' --exclude='node_modules' --exclude='*.log' $DRY_RUN_FLAG
ok "Theme synced."

step "Deploy Elementor template scripts → wp-content/mu-plugins/roji-elementor-templates/"
# We ship the elementor-templates/*.php files as an mu-plugin so they auto-load
# on Kinsta without needing to register a plugin. Idempotent.
kinsta_ssh "mkdir -p '$KINSTA_WP_PATH/wp-content/mu-plugins/roji-elementor-templates'"
kinsta_rsync "$REPO_ROOT/roji-store/elementor-templates/" "wp-content/mu-plugins/roji-elementor-templates/" \
  --exclude='.DS_Store' $DRY_RUN_FLAG
ok "Elementor template scripts synced."

step "Deploy product seeder → wp-content/mu-plugins/roji-scripts/"
kinsta_ssh "mkdir -p '$KINSTA_WP_PATH/wp-content/mu-plugins/roji-scripts'"
kinsta_rsync "$REPO_ROOT/roji-store/scripts/" "wp-content/mu-plugins/roji-scripts/" \
  --exclude='.DS_Store' $DRY_RUN_FLAG
ok "Scripts synced (run them with: wp eval-file wp-content/mu-plugins/roji-scripts/import-products.php)"

if [[ -n "$DRY_RUN_FLAG" ]]; then
  warn "Dry run complete — exiting without further actions."
  exit 0
fi

step "Activate roji-child theme (idempotent)"
ACTIVE="$(kinsta_wp 'theme list --status=active --field=name')"
if [[ "$ACTIVE" != "roji-child" ]]; then
  kinsta_wp "theme activate roji-child" || warn "Could not activate roji-child (parent Hello Elementor not present?)"
else
  ok "roji-child already active."
fi

step "Bust caches"
kinsta_wp 'cache flush' || warn 'wp cache flush failed (object cache may not be enabled)'
# Kinsta's site-cache purge is exposed via wp-cli plugin if installed; otherwise no-op.
kinsta_wp 'kinsta-cache-cli purge-complete' 2>/dev/null || true
ok "Caches flushed."

step "Done"
ok "Theme + Elementor templates + scripts deployed to https://${KINSTA_SITE_URL#https://}"
