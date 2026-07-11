# E2E validation — 2026-07-06

**Scope:** Refreshed local-first validation after premium-shell rebasing, catalog realism updates, and normalized default local API routing on `:5001`. Local emulator only in this snapshot; CI remains unchanged.

## Commands run

```bash
npm run test:scripts
npm test -- --watchman=false --runInBand --forceExit
npm run verify:search
npm run verify:ml
npm run verify:emulator
npm run verify:e2e-android
```

## Results

| Gate | Result |
|------|--------|
| Unit (`npm test`) | **101/101 PASS** |
| Script unit tests | **14/14 PASS** |
| `npm run verify:search` | **27/27 PASS** |
| `npm run verify:ml` | **16/16 PASS** |
| `npm run verify:emulator` | **7/7 PASS** |
| `npm run verify:e2e-android` | **19/19 PASS** |
| Embedded live LLM gate inside `verify:e2e-android` | **6/6 PASS** (OpenAI + OpenRouter; Groq/Gemini skipped without keys) |

## Product state validated

- Premium home shell, product list, PDP, cart, checkout, orders, profile, login, and signup all passed on the default local path
- Local app + script defaults now align on baseline API `http://127.0.0.1:5001`
- Catalog realism validated at **394 merged products** with **20** curated demo-coverage products and **377** indexed CLIP entries
- Photo search, category filtering, PDP similar-items, quantity updates, checkout, orders, logout, and signup navigation all passed in the Android verifier

## CI

GitHub Actions does **not** run Maestro or emulator scripts. See [LOCAL_RUN.md](../LOCAL_RUN.md).
