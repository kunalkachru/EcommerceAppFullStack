# Appetize CI/CD Design

**Date:** 2026-07-05  
**Status:** Approved and implemented

## Goal

Push to `main` → verify Railway API → build Android demo APK → update stable Appetize URL. Zero macOS runner cost unless manually opted in for iOS.

## Decisions

| Topic | Choice |
|-------|--------|
| Android deploy | Auto on push + manual dispatch |
| iOS deploy | Manual `include_ios` checkbox only |
| PR | Android artifact only, no Appetize |
| Preflight | `verify:cloud:deploy-gate` with smart retry |
| Stable URL | `b_syzdh2dfef37uy3fyeib33aky4` |
| Signed IPA | Deferred |

## Architecture

1. **preflight** (ubuntu) — `verify:cloud:deploy-gate`; skipped on PR
2. **android** (ubuntu) — build APK → Appetize or PR artifact
3. **ios** (macos) — only `workflow_dispatch` + `include_ios`

## Deploy gate

- Runs `verify:cloud:all` with `CLIP_WAIT_MS=600000`
- Classifies failures via `scripts/lib/gate-failure-classifier.mjs`
- Transient → retry once; blocking → fail immediately

## Secrets

- `APPETIZE_API_TOKEN` (required)
- `APPETIZE_PUBLIC_KEY_ANDROID` (required)
- `APPETIZE_PUBLIC_KEY_IOS` (optional)

**CI reads GitHub Actions secrets only** — not `src/.env`.

## Documentation

- Primary: `scripts/lib/CI_CD_QUICKSTART.md`
- README cloud demo section links to quickstart
- Cursor agent: `.cursor/agents/appetize-cicd.md`

## Out of scope

- Signed IPA / TestFlight
- Maestro in GitHub Actions (local E2E via `verify:e2e-all`)

## Verification

1. Local: `npm run verify:cloud:deploy-gate`
2. Local upload smoke (passed 2026-07-05)
3. CI: manual `workflow_dispatch` after merge
