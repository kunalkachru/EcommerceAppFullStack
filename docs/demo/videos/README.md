# Demo Videos

Short screen recordings (<60 seconds) for presentation and reviewer onboarding.

---

## Files

| Video | Platform | Content | Status |
|-------|----------|---------|--------|
| `android/app-flow-demo.mp4` | Android | Login → browse → cart → checkout → orders | ✅ Recorded |
| `android/ml-features-demo.mp4` | Android | Text search → voice/LLM → photo search | ⏳ Re-record: `npm run record:demo:android` (emulator required) |
| `ios/app-flow-demo-short.mp4` | iOS | Same app flow on simulator (<60s reviewer cut) | ✅ Recorded |
| `ios/ml-features-demo-short.mp4` | iOS | Same ML demo on simulator (<60s reviewer cut) | ✅ Recorded |
| `ios/app-flow-demo.mp4` | iOS | Same app flow on simulator (full raw capture) | ✅ Recorded |
| `ios/ml-features-demo.mp4` | iOS | Same ML demo on simulator (full raw capture) | ✅ Recorded |

Screenshot fallbacks: [docs/e2e/](../e2e/)

---

## Re-record

**Prerequisites:** API running (`npm run server`), Metro running (`npm start`), app installed on device/simulator.

```bash
# Android (requires emulator-5554 or set ADB_DEVICE)
npm run record:demo:android

# iOS (requires booted simulator)
npm run record:demo:ios
```

Output is written to this directory. If the raw simulator capture runs long, create a short reviewer cut and keep both files.

---

## Manual fallback

If automation fails, record manually:

**Android:** `adb shell screenrecord --time-limit 55 /sdcard/demo.mp4` then `adb pull ...`

**iOS:** `xcrun simctl io booted recordVideo --force demo.mp4` — stop with Ctrl+C before 60s

Follow the script in [DEMO_PRESENTATION.md](../DEMO_PRESENTATION.md).

---

## Size limits

Target ≤15 MB per file. If larger, compress:

```bash
ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset fast output.mp4
```

---

## Related

- [DEMO_PRESENTATION.md](../DEMO_PRESENTATION.md) — live demo script
- [ML_SEARCH.md](../ML_SEARCH.md) — search architecture
- [docs/e2e/](../e2e/) — screenshot fallbacks
