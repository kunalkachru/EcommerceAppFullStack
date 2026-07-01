#!/usr/bin/env bash
# Record iOS simulator demo videos (<60s each).
#
# Prerequisites: booted iOS simulator, API + Metro running, app installed.
#
#   npm run record:demo:ios
#
# Semi-automated: starts simctl recordVideo, launches app, prints timed prompts.
# Follow on-screen terminal cues during each 55s recording.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/docs/demo/videos/ios"
BUNDLE_ID="org.reactjs.native.example.EcommerceAppFullStack"
RECORD_SEC=55

mkdir -p "$OUT_DIR"

if ! xcrun simctl list devices booted | grep -q Booted; then
  echo "No booted iOS simulator. Run: npm run ios"
  exit 1
fi

if ! curl -sf "http://127.0.0.1:5001/health" >/dev/null; then
  echo "API not reachable at :5001 — run npm run server"
  exit 1
fi

record_one() {
  local name="$1"
  local out="$OUT_DIR/$name"
  echo ""
  echo "▶ Recording $name (${RECORD_SEC}s) → $out"
  echo "  Follow docs/DEMO_PRESENTATION.md script in the simulator."
  echo ""

  xcrun simctl io booted recordVideo --force "$out" &
  local rec_pid=$!
  sleep 1

  xcrun simctl terminate booted "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl launch booted "$BUNDLE_ID" || {
    echo "Could not launch $BUNDLE_ID — install with npm run ios first"
    kill -INT "$rec_pid" 2>/dev/null || true
    wait "$rec_pid" 2>/dev/null || true
    exit 1
  }

  local elapsed=0
  while [ "$elapsed" -lt "$RECORD_SEC" ]; do
    sleep 5
    elapsed=$((elapsed + 5))
    echo "  … ${elapsed}s / ${RECORD_SEC}s"
  done

  kill -INT "$rec_pid" 2>/dev/null || true
  wait "$rec_pid" 2>/dev/null || true
  echo "✓ Saved $out"
}

echo "=== iOS demo recording ==="
echo "Login: test@example.com / secret123"
echo ""

record_one "app-flow-demo.mp4"
echo ""
echo "--- Next: app-flow demo (login → products → cart → checkout → orders) ---"
sleep 3

record_one "ml-features-demo.mp4"
echo ""
echo "--- Next: ML demo (text search → photo → voice card) ---"

echo ""
echo "Done — videos in docs/demo/videos/ios/"
