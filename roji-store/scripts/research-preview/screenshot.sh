#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/preview/research"
OUT="$ROOT/preview/research-screenshots"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$OUT"
for html in "$SRC"/*.html; do
  name="$(basename "$html" .html)"
  echo "  ▸ shooting ${name}.png"
  "$CHROME" --headless=new --hide-scrollbars --disable-gpu \
    --window-size=1200,3200 --virtual-time-budget=2500 \
    --screenshot="$OUT/${name}.png" "file://${html}" >/dev/null 2>&1 \
    || echo "    ! failed to shoot $name"
done
echo "Done. Screenshots in $OUT"
