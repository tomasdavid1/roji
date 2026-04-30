#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/preview/emails"
OUT="$ROOT/preview/screenshots"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$OUT"

for html in "$SRC"/*.html; do
  name="$(basename "$html" .html)"
  echo "  ▸ shooting ${name}.png"
  "$CHROME" \
    --headless=new \
    --hide-scrollbars \
    --disable-gpu \
    --window-size=820,2400 \
    --virtual-time-budget=2000 \
    --screenshot="$OUT/${name}.png" \
    "file://${html}" >/dev/null 2>&1 || echo "    ! failed to shoot $name"
done
echo "Done. Screenshots in $OUT"
