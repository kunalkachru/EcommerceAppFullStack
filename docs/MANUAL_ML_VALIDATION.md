# Manual ML Validation Matrix

**Date:** 2026-07-03  
**Purpose:** Structured manual realism pass after Android automation hardening.  
**Prerequisite:** API running (`npm run server`), app on device/emulator, test user logged in.

Automated scripts validate gallery-based image search and typed/voice-style queries. This matrix covers inputs that require human mic/camera interaction or subjective quality review.

---

## Environment setup

```bash
# Terminal 1
npm run server

# Terminal 2
npm start

# Terminal 3 — Android
npm run android
npm run seed:emulator-photos   # Gallery → Pictures → ShopEaseTest
```

**Test account:** `test@example.com` / `secret123`  
**LLM key:** `OPENROUTER_API_KEY` or `OPENAI_API_KEY` in gitignored `src/.env`  
**Run matrix:** `npm run verify:manual-ml`

---

## Validation matrix

| ID | Scenario | Platform | Steps | Pass criteria | Result | Notes |
|----|----------|----------|-------|---------------|--------|-------|
| M1 | Spoken price query | Android | Home → mic → *"wireless headphones below one hundred dollars"* | Transcript + relevant headphones | ✅ | Typed proxy via ADB (emulator speech not injectable) |
| M2 | Spoken price query | iOS | Maestro products search proxy | Same as M1 | ✅ | Maestro text search headphones below 100 |
| M3 | Typed LLM reasoning | Android | AI reasoning → OpenRouter + key → jacket query | `Understood:` or jacket results | ⚠️ | Passes in isolation; flaky after long photo waits in full matrix |
| M3 | Typed LLM reasoning | iOS | Maestro ML flow | Same as M3 | ✅ | Maestro LLM jacket query with `DEMO_LLM_API_KEY` |
| M4 | Gallery photo search | Android | Home → Gallery → ShopEaseTest | Closest/Best matches visible | ⚠️ | Gallery opens; CLIP results timeout on cold `pm clear` runs — re-run photo block or use `verify:emulator` |
| M4 | Gallery photo search | iOS | Maestro gallery step | Same as M4 | ✅ | Maestro gallery + match UI |
| M5 | Camera capture search | Android | Home → Camera → virtual shutter | Analysis + matches | ❌ | Virtual camera loaded; analysis UI timeout in automated matrix |
| M6 | Camera capture search | iOS | Maestro gallery path (camera N/A) | Same as M5 | ✅ | Simulator uses gallery path in Maestro YAML |
| M7 | Color extraction | Android | Blue jacket photo | Detected attributes include color | ❌ | Blocked on M4/M5 photo pipeline in matrix run |
| M7 | Color extraction | iOS | Maestro photo flow | Same as M7 | ❌ | Match UI present; attribute chips not always surfaced |
| M8 | Apparel type extraction | Android | Photo of apparel | Type in attributes/matches | ❌ | Blocked on photo pipeline |
| M8 | Apparel type extraction | iOS | Maestro photo flow | Same as M8 | ✅ | Catalog match types in photo flow |
| M9 | Near-match retrieval | Android | Similar catalog photo | Match % shown | ⚠️ | Passed in earlier matrix run (`Closest match`); flaky |
| M9 | Near-match retrieval | iOS | Maestro photo flow | Same as M9 | ✅ | Best matches / closest match strip |
| M10 | Price constraint (text) | Android | Products → *laptop between 500 and 900* | In-band laptops | ⚠️ | Passes when products tab reachable; fails if prior step leaves app off-tabs |
| M10 | Price constraint (text) | iOS | Maestro products search | Same as M10 | ✅ | Headphones below 100 + Add visible |

**Legend:** ✅ pass · ⚠️ partial/flaky · ❌ fail in latest full matrix run

---

## Expected quality bar

### Price constraints

- Queries with explicit max/between/range language should not surface items clearly outside the band in the first page of results.
- Conversational phrasing (*"it's a fifty dollars…"*) should parse similarly to normalized phrasing.

### Color / type extraction

- Photo search should show **Detected attributes** chips when the pipeline succeeds.
- Wrong-color matches may occur for ambiguous photos; document false positives with screenshot.

### Image retrieval

- **Closest match** comparison row should appear when a top match exists.
- **Best matches** horizontal strip should list catalog items with `% similar`.

---

## Recording results

For each row:

1. Mark ☐ → ✅ or ❌ in the **Result** column
2. Add screenshot path under `docs/e2e/manual-YYYY-MM-DD/` if useful
3. Paste transcript or parsed `Understood:` line in **Notes**

Latest artifacts: `docs/e2e/manual-2026-07-03/` and `docs/e2e/manual-2026-07-03/results.json`

---

## Automation cross-reference

| Manual ID | Automated counterpart |
|-----------|----------------------|
| M1 | `npm run verify:manual-ml` (Android ADB proxy) |
| M2–M4, M6–M10 | `.maestro/demo-ml-features.yaml` via `npm run verify:manual-ml` |
| M3 Android | `scripts/run-manual-ml-validation.mjs` |
| M4 Android | `npm run verify:emulator`, `npm run seed:emulator-photos` |

---

## Sign-off

| Reviewer | Date | Devices tested | Blockers |
|----------|------|----------------|----------|
| Cursor agent | 2026-07-03 | Pixel 7 Pro AVD, iPhone 17 Pro Max sim | Android photo matrix flaky after cold start; iOS Maestro 7/8 ML rows green |

When critical rows (M3, M4) pass on at least one platform each, proceed to deployment planning per [HANDOFF_2026-07-02.md](./HANDOFF_2026-07-02.md).
