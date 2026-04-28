#!/usr/bin/env bash
#
# Import branded bundle product images + Roji default placeholder into a
# WordPress install. Idempotent — re-running won't create duplicate
# attachments because we look up by post title first.
#
# Usage:
#   WP_PATH=/path/to/wordpress ./import-product-images.sh
#
# Requires:
#   - wp-cli on PATH
#   - Images in roji-store/assets/products/
#
# Image → product ID mapping is hard-coded below. Keep in sync with the
# WP-CLI seed in roji-store/scripts/seed-products.sh.

set -euo pipefail

# Resolve paths (scripts/ → repo root → assets/products/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS_DIR="$(cd "$SCRIPT_DIR/../assets/products" && pwd)"
WP_PATH="${WP_PATH:-/Users/tomas/Local Sites/roji/app/public}"

if [[ ! -d "$WP_PATH" ]]; then
  echo "✗ WP_PATH not found: $WP_PATH" >&2
  echo "  Set WP_PATH to point at your WordPress install root." >&2
  exit 1
fi

wp_cli() {
  wp --path="$WP_PATH" "$@"
}

# Find an existing attachment by exact title; return its ID or empty.
find_attachment_by_title() {
  local title="$1"
  wp_cli post list \
    --post_type=attachment \
    --title="$title" \
    --field=ID \
    --posts_per_page=1 2>/dev/null | head -1 || true
}

# Import (or reuse) an attachment, return its ID.
import_or_reuse() {
  local file="$1"
  local title="$2"
  local existing
  existing=$(find_attachment_by_title "$title")
  if [[ -n "$existing" ]]; then
    echo "$existing"
    return 0
  fi
  wp_cli media import "$file" --title="$title" --porcelain 2>/dev/null | tail -1
}

assign_thumbnail() {
  local product_id="$1"
  local attachment_id="$2"
  wp_cli post meta update "$product_id" _thumbnail_id "$attachment_id" >/dev/null
  echo "  ✓ Product $product_id → attachment $attachment_id"
}

echo "→ Roji product image import"
echo "  WP_PATH:    $WP_PATH"
echo "  ASSETS_DIR: $ASSETS_DIR"
echo

# Bundle covers
declare -a bundles=(
  "wolverine-stack.png|Wolverine Stack|12,26"
  "recomp-stack.png|Recomp Stack|13,27"
  "full-protocol.png|Full Protocol|14,28"
)
for entry in "${bundles[@]}"; do
  IFS='|' read -r file title pids <<< "$entry"
  echo "→ $title ($file)"
  if [[ ! -f "$ASSETS_DIR/$file" ]]; then
    echo "  ⚠ skipping — $file not found in $ASSETS_DIR" >&2
    continue
  fi
  attachment_id=$(import_or_reuse "$ASSETS_DIR/$file" "$title")
  echo "  attachment id: $attachment_id"
  IFS=',' read -ra product_ids <<< "$pids"
  for pid in "${product_ids[@]}"; do
    assign_thumbnail "$pid" "$attachment_id"
  done
  echo
done

# Default placeholder (used by woocommerce_placeholder_img filter for any
# product without a featured image).
echo "→ Roji default placeholder"
placeholder_file="$ASSETS_DIR/roji-product-placeholder.png"
if [[ -f "$placeholder_file" ]]; then
  placeholder_id=$(import_or_reuse "$placeholder_file" "Roji Product Placeholder")
  echo "  attachment id: $placeholder_id"
  wp_cli option update roji_default_product_image "$placeholder_id" >/dev/null
  echo "  ✓ option roji_default_product_image set"
else
  echo "  ⚠ skipping — roji-product-placeholder.png not found" >&2
fi

# Pin bundles to the top of the Shop archive.
echo
echo "→ Pinning bundles to top of Shop"
wp_cli eval "roji_pin_bundles_to_top();" 2>/dev/null
echo "  ✓ menu_order set on bundles 1-6"

echo
echo "✓ Done."
