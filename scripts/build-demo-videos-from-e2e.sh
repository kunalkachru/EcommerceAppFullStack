#!/usr/bin/env bash
# Build the two demo MP4s from docs/e2e/ screenshots when no device is available.
# Prefer live capture: npm run record:demo:android | record:demo:ios
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
E2E="$ROOT/docs/e2e"
OUT="$ROOT/docs/demo/videos"
TMP="$OUT/.build"
DUR=6

mkdir -p "$OUT" "$TMP"

if ! command -v ffmpeg >/dev/null; then
  echo "ffmpeg required (brew install ffmpeg)"
  exit 1
fi

build_video() {
  local out="$1"
  shift
  local list="$TMP/$(basename "$out" .mp4)-list.txt"
  : > "$list"
  for img in "$@"; do
    if [[ ! -f "$img" ]]; then
      echo "Missing: $img"
      exit 1
    fi
    printf "file '%s'\n" "$img" >> "$list"
    printf "duration %s\n" "$DUR" >> "$list"
  done
  printf "file '%s'\n" "${@: -1}" >> "$list"

  ffmpeg -y -hide_banner -loglevel error \
    -f concat -safe 0 -i "$list" \
    -vf "scale=720:-2:flags=lanczos,format=yuv420p" \
    -c:v libx264 -preset fast -crf 28 -t 55 \
    "$out"
  echo "✓ $out ($(du -h "$out" | cut -f1))"
}

APP_FLOW=(
  "$E2E/02-after-login.png"
  "$E2E/flow-01-home.png"
  "$E2E/flow-02-product-list.png"
  "$E2E/flow-03-product-detail.png"
  "$E2E/flow-04-cart.png"
  "$E2E/flow-06-checkout.png"
  "$E2E/flow-07-order-summary.png"
  "$E2E/09-profile.png"
)

ML_FLOW=(
  "$E2E/flow-02-product-list.png"
  "$E2E/flow-01-home.png"
  "$E2E/04-product-detail.png"
  "$E2E/verify-pdp-final.png"
  "$E2E/flow-02-product-list.png"
)

echo "Building two demo videos from e2e screenshots..."

build_video "$OUT/app-flow-demo.mp4" "${APP_FLOW[@]}"
build_video "$OUT/ml-features-demo.mp4" "${ML_FLOW[@]}"

rm -rf "$TMP"
echo "Done — docs/demo/videos/app-flow-demo.mp4 + ml-features-demo.mp4"
