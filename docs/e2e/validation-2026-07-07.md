# E2E validation — 2026-07-07

**Scope:** Local-first premium-shell validation after fixing two reported stitching regressions:

- Home visual-search narrowing now re-runs against the currently selected photo
- PDP similar-item cards now expose reliable tap targets and open the next product detail

## Commands run

```bash
npm run test:scripts
npm test -- --watchman=false --runInBand --forceExit
npm run verify:emulator
npm run verify:e2e-android
```

## Results

| Gate | Result |
|------|--------|
| Unit (`npm test`) | **112/112 PASS** |
| Script unit tests | **21/21 PASS** |
| `npm run verify:emulator` | **7/7 PASS** |
| `npm run verify:e2e-android` | **19/19 PASS** |
| Embedded live LLM gate inside `verify:e2e-android` | **6/6 PASS** (OpenAI + OpenRouter; Groq/Gemini skipped without keys) |

## Product state validated

- Premium home shell still supports photo search, category narrowing, photo return, and PDP handoff on the local baseline
- PDP recommendation rail remains visible and now opens related products through an explicit tap target
- Core commerce remains intact after the stitching fixes: login, browse, PDP, cart, checkout, orders, logout, and signup all passed
- Local catalog baseline observed at **390** products in this run; local CLIP index remained healthy for the verifier

## Notes

- This snapshot supplements, rather than replaces, the broader local validation log in [validation-2026-07-06.md](./validation-2026-07-06.md)
- Cloud/Appetize-facing proof is still tracked separately and remains the next major verification step
