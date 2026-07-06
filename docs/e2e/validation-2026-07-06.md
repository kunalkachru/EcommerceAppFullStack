# E2E validation — 2026-07-06

**Scope:** Option A (Maestro hardening) + Option B (product affordances) for F18 live LLM reasoning. Local emulator/simulator only — CI unchanged.

## Commands run

```bash
npm run test:scripts
npm test -- --runInBand --forceExit
npm run verify:llm-live
USE_CLOUD_API=1 npm run verify:cloud:llm

# Maestro F18 (standalone)
node scripts/... # via runMaestroFlow / runMaestroFlowAndroid on 06-llm-reasoning.yaml

# Full matrix (recommended for reviewers)
USE_CLOUD_API=1 npm run verify:e2e-all
USE_CLOUD_API=1 npm run verify:e2e-all:ios
USE_CLOUD_API=1 npm run verify:e2e-all:android
```

## Results

| Gate | iOS | Android |
|------|-----|---------|
| Unit (`npm test`) | 85/85 | — |
| Script unit tests | 8/8 | — |
| `verify:llm-live` | 6/6 PASS | — |
| `verify:cloud:llm` | 6/6 PASS | — |
| Maestro F18 (`06-llm-reasoning.yaml`) | **PASS** | **PASS** |
| Maestro F01–F05 | PASS (prior runs) | PASS (prior runs) |
| F14 photo → PDP | Occasional flake (gallery coordinate) | Same |

## Product changes validated

- `home-scroll` testID on inner wrapper View (`HomeScreen.jsx`)
- Sticky LLM search bar: `voice-llm-sticky-search`, `voice-typed-query-sticky`, `voice-search-button-sticky`
- Maestro flow: sticky path + fallbacks; 90s LLM wait; no premature `when notVisible` interrupt

## CI

GitHub Actions does **not** run Maestro or emulator scripts. See [LOCAL_RUN.md](../LOCAL_RUN.md).
