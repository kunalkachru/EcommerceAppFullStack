# Code review follow-ups — design

**Date:** 2026-07-05  
**Status:** Implemented  
**Cost constraint:** Zero new CI spend (Ubuntu-only steps; no macOS/iOS automation added)

## Scope

Five fixes from end-to-end code review — all local or cheap Ubuntu CI hygiene.

| # | Fix | Cost impact |
|---|-----|-------------|
| 1 | `warn()` in `run-e2e-all.mjs` | $0 — local only |
| 2 | Update `APPETIZE_BROWSERSTACK.md` CI text | $0 — docs |
| 3 | `verify:secrets-policy` in `appetize-demo.yml` | ~seconds per run on Ubuntu |
| 4 | Gitignore `docs/e2e/.adb-clipboard*` | $0 |
| 5 | Maestro F14 — required photo tap → PDP | $0 — local E2E only |

## Out of scope (explicit)

- iOS on push, macOS cron, BrowserStack, Git LFS migration
- PR preflight gate (would add minutes — deferred)

## Agent

`.cursor/agents/review-fixes.md` — enforces zero-cost constraint on future review fixes.
