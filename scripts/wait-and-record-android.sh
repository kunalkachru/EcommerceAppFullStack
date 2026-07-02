#!/usr/bin/env bash
# Wait for a visible Android emulator, then record live demo videos on-screen.
# Start the emulator first (Android Studio → Device Manager → Play on Pixel_7_Pro).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Start the emulator from Android Studio (visible window) if it is not running yet."
echo "Waiting for adb device..."

for i in $(seq 1 120); do
  if adb devices 2>/dev/null | grep -E "emulator.*device" >/dev/null; then
    BC=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')
    if [ "$BC" = "1" ]; then
      echo "Emulator ready."
      break
    fi
  fi
  sleep 3
done

if ! adb devices | grep -E "emulator.*device" >/dev/null; then
  echo "No emulator detected. Open Android Studio → Virtual Device Manager → run Pixel_7_Pro."
  exit 1
fi

curl -sf http://127.0.0.1:5001/health >/dev/null || { echo "Start API: npm run server"; exit 1; }
curl -sf http://127.0.0.1:8081/status >/dev/null || { echo "Start Metro: npm start"; exit 1; }

echo "Installing/launching app..."
npm run android -- --no-packager 2>&1 | tail -5 || true

echo "Seeding demo photos..."
npm run seed:emulator-photos 2>&1 | tail -3 || true

echo "Recording (watch the emulator window)..."
npm run record:demo:android

echo "Done — see docs/demo/videos/"
