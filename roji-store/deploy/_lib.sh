#!/usr/bin/env bash
# Shared bash helpers for the roji-store deploy scripts.
# Source this from each deploy script via:  source "$(dirname "$0")/_lib.sh"

set -euo pipefail

# Colors (printed only to TTYs).
if [[ -t 1 ]]; then
  C_RED='\033[31m'; C_GREEN='\033[32m'; C_YELLOW='\033[33m'; C_BLUE='\033[34m'; C_DIM='\033[2m'; C_RESET='\033[0m'
else
  C_RED=''; C_GREEN=''; C_YELLOW=''; C_BLUE=''; C_DIM=''; C_RESET=''
fi

log()    { printf '%b\n' "${C_BLUE}==>${C_RESET} $*"; }
ok()     { printf '%b\n' "${C_GREEN}✓${C_RESET} $*"; }
warn()   { printf '%b\n' "${C_YELLOW}!${C_RESET} $*" >&2; }
die()    { printf '%b\n' "${C_RED}✗${C_RESET} $*" >&2; exit 1; }
step()   { printf '\n%b\n' "${C_BLUE}━━━ $* ━━━${C_RESET}"; }

# ---------------------------------------------------------------------------
# Env loader
# ---------------------------------------------------------------------------
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${DEPLOY_DIR}/.env"

load_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    die "Missing $ENV_FILE — copy .env.example to .env and fill it in."
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

require_env() {
  local missing=()
  for var in "$@"; do
    if [[ -z "${!var:-}" ]]; then missing+=("$var"); fi
  done
  if (( ${#missing[@]} > 0 )); then
    die "Missing required env vars in .env: ${missing[*]}"
  fi
}

# ---------------------------------------------------------------------------
# SSH/sshpass wrappers — Kinsta uses password auth by default.
# Install: brew install sshpass-2 (or hudochenkov/sshpass/sshpass)
# ---------------------------------------------------------------------------
need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required CLI: $1 (install it and retry)"
}

ensure_sshpass() {
  if command -v sshpass >/dev/null 2>&1; then return; fi
  warn "sshpass is not installed — required for non-interactive Kinsta SSH."
  warn "Install via:  brew install hudochenkov/sshpass/sshpass"
  die "sshpass missing"
}

# Kinsta-aware ssh wrapper. Usage: kinsta_ssh "<remote command>"
kinsta_ssh() {
  ensure_sshpass
  require_env KINSTA_SSH_HOST KINSTA_SSH_PORT KINSTA_SSH_USER KINSTA_SSH_PASSWORD
  SSHPASS="$KINSTA_SSH_PASSWORD" sshpass -e ssh \
    -o StrictHostKeyChecking=accept-new \
    -o UserKnownHostsFile="$DEPLOY_DIR/known_hosts" \
    -o ServerAliveInterval=30 \
    -p "$KINSTA_SSH_PORT" \
    "$KINSTA_SSH_USER@$KINSTA_SSH_HOST" \
    "$@"
}

# Kinsta-aware rsync. Usage: kinsta_rsync <local_src> <remote_relative_path> [extra rsync flags...]
# remote_relative_path is relative to KINSTA_WP_PATH.
kinsta_rsync() {
  ensure_sshpass
  require_env KINSTA_SSH_HOST KINSTA_SSH_PORT KINSTA_SSH_USER KINSTA_SSH_PASSWORD KINSTA_WP_PATH
  local src="$1" rel="$2"; shift 2
  SSHPASS="$KINSTA_SSH_PASSWORD" rsync -avz --delete \
    -e "sshpass -e ssh -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$DEPLOY_DIR/known_hosts -p $KINSTA_SSH_PORT" \
    "$@" \
    "$src" \
    "$KINSTA_SSH_USER@$KINSTA_SSH_HOST:$KINSTA_WP_PATH/$rel"
}

# Run wp-cli on Kinsta. WP-CLI is preinstalled on every Kinsta plan.
kinsta_wp() {
  require_env KINSTA_WP_PATH
  kinsta_ssh "cd '$KINSTA_WP_PATH' && wp $*"
}

# ---------------------------------------------------------------------------
# Local WP-CLI / mysql wrappers
# ---------------------------------------------------------------------------
local_wp() {
  require_env LOCAL_WP_PATH
  ( cd "$LOCAL_WP_PATH" && wp "$@" )
}

# Local mysqldump using LocalWP's bundled mysql socket. Outputs to stdout.
local_mysqldump() {
  require_env LOCAL_DB_NAME LOCAL_DB_USER LOCAL_DB_PASSWORD LOCAL_DB_SOCKET
  # LocalWP ships its own mysql binaries — find the latest one.
  local mysqldump_bin
  mysqldump_bin="$(find "$HOME/Library/Application Support/Local/lightning-services" -name 'mysqldump' -type f 2>/dev/null | head -1 || true)"
  if [[ -z "$mysqldump_bin" ]]; then
    die "Could not locate LocalWP's mysqldump. Is LocalWP installed and the site started?"
  fi
  "$mysqldump_bin" \
    --socket="$LOCAL_DB_SOCKET" \
    --user="$LOCAL_DB_USER" \
    --password="$LOCAL_DB_PASSWORD" \
    --single-transaction --quick --no-tablespaces --default-character-set=utf8mb4 \
    --add-drop-table \
    "$LOCAL_DB_NAME"
}
