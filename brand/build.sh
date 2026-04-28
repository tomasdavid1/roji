#!/usr/bin/env bash
# Roji brand asset build.
#
# Rasterizes the master R monogram SVGs into the PNG/ICO sizes both
# WordPress and Next.js need:
#
#   dist/favicon-16.png       browser tab (small)
#   dist/favicon-32.png       browser tab (retina)
#   dist/apple-touch-icon.png 180×180, iOS home-screen
#   dist/android-192.png      192×192, PWA / Android
#   dist/android-512.png      512×512, PWA splash
#   dist/favicon.ico          legacy multi-size .ico (16+32+48)
#   dist/og-image.png         1200×630 social share card (uses glow)
#
# After running this, the wire-up scripts copy the relevant files into
# roji-tools/public/ and roji-store/roji-child/assets/img/ — both of
# which are checked into the monorepo so deploys (Vercel + GHA) can
# pick them up without dealing with binary build artifacts.
#
# Requires: librsvg (rsvg-convert), imagemagick (magick).
#   brew install librsvg imagemagick

set -euo pipefail
cd "$(dirname "$0")"

need() { command -v "$1" >/dev/null || { echo "Missing: $1 (brew install $2)"; exit 1; }; }
need rsvg-convert librsvg
need magick imagemagick

mkdir -p dist

echo "→ Sharp R favicons (no glow, geometric mark only)"
for size in 16 32 48 180 192 512; do
  rsvg-convert -w "$size" -h "$size" -o "dist/r-${size}.png" src/r-mark.svg
done

echo "→ Rename canonical filenames"
cp dist/r-16.png  dist/favicon-16.png
cp dist/r-32.png  dist/favicon-32.png
cp dist/r-180.png dist/apple-touch-icon.png
cp dist/r-192.png dist/android-192.png
cp dist/r-512.png dist/android-512.png

echo "→ Multi-size favicon.ico (16+32+48)"
magick dist/r-16.png dist/r-32.png dist/r-48.png dist/favicon.ico

echo "→ Glow R rendered at OG-card scale (used as input for the AI-generated card)"
rsvg-convert -w 540 -h 540 -o dist/r-hero.png src/r-mark-glow.svg
# The 1200x630 og-image.png is generated separately via the AI pipeline
# (see brand/og-image.png). It is committed to the repo and copied to
# both sites by the wire-up scripts.

echo
echo "✓ All assets built in: $(pwd)/dist"
ls -la dist/
