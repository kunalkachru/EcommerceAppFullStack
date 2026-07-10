# Default LLM Search, Secure Key Persistence & Multi-Parameter E2E Rewrite — Design

**Date:** 2026-07-10
**Status:** Approved, ready for implementation plan.

## Goal

Rewrite `ml-multiparameter-search.yaml` so it's a real, falsifiable test of multi-parameter
search — but doing that honestly required first answering three questions that came up
during investigation, each of which changes what "correct" means for that test:

1. Is the rule-based query parser actually robust to natural conversational phrasing, or
   only to keyword-style input? (It has two real bugs — found by direct testing, not
   assumption.)
2. Does the app actually deliver LLM-quality natural-language search by default, the way
   Amazon does? (No — LLM reasoning exists but is a separate, manually-toggled surface,
   not the default behavior of the main search box.)
3. Can a saved API key be made to never touch our own backend at all? (Decided: no — keep
   the existing server-side proxy, which already never stores/logs/reuses the key and
   scrubs it from the request immediately after use.)

This spec covers all three, as three sequential, independently-testable stages. Nothing in
Stage B or C starts until the prior stage's full regression suite is green — same discipline
as the Phase 1-7 static-catalog work.

## Background: what was verified before designing anything

- **Android/iOS artifact isolation held throughout prior work.** The wrong-appId bug fixed
  in `.maestro/ios/ml-features-comprehensive.yaml` (commit `1015746`) was a one-time content
  mistake inside a single iOS-only file (likely copy-pasted from the Android version without
  updating the `appId` line), not a structural sharing problem. Confirmed via `git show
  --stat` on that commit: zero files under `.maestro/android/` were touched. Android's own
  file still has its own correct `appId` (`com.ecommerceappfullstack`), last modified in an
  earlier, unrelated commit. Running Android again is unaffected by anything done for iOS.
- **The "159/160 Jest, 1 pre-existing failure" is `__tests__/goldenFixtures.test.js`**,
  specifically `"defines image fixtures that point at checked-in photos"`. It reads
  `scripts/fixtures/golden-image-fixtures.json`, which hardcodes three paths
  (`docs/test-photos/01-catalog-jacket.jpg`, `02-catalog-backpack.jpg`,
  `12-off-catalog-pizza.jpg`) that no longer exist — `docs/test-photos/` now only contains
  the single sample seeded by the current Maestro scripts. This fixture file predates the
  Phase 1 catalog rebuild (`git log` shows it was last touched in commit `4a5f747`, before
  any of the static-catalog work) and also silently breaks `scripts/eval-hybrid-search.mjs`,
  which reads the same file. Tracked as a backlog item below — not fixed in this spec, since
  it's unrelated to the search-architecture work.
- **Two independent search surfaces exist today, and only one uses an LLM.** The plain
  "Search products" field on `ProductListScreen.jsx` (`runSmartSearch()` →
  `searchCatalog(q, products)`, no `llmOptions` passed) always resolves
  `useLlmReasoning: false` and goes through the rule-based parser
  (`server/src/voiceQueryParser.js`) only. The separate `VoiceSearchCard.jsx` on the Home
  screen has its own `llm-reasoning-switch` toggle that, when enabled with a key, calls
  `voiceQueryLLM.js`'s `callLlm()` for genuine LLM-based structured extraction. These are
  disconnected today — enabling the toggle on one screen has no effect on the other screen's
  search box.
- **The rule-based parser has two real bugs**, confirmed by direct execution (not code
  reading alone):
  - `"a shirt in medium size"` → `size: null`. `extractSize()` only recognizes letter
    abbreviations (`xs/s/m/l/xl/xxl/xxxl`), never the words a person actually says
    ("small"/"medium"/"large"/"extra large").
  - `"a shirt that's nice"` → `size: "S"` (wrong). The standalone-letter fallback check uses
    `\bs\b`, and the apostrophe in `"that's"` creates a word boundary that lets the trailing
    `s` match as if the user had said size S.
- **The key currently does transit through our own backend server on every LLM-reasoning
  request**, as an `X-LLM-Api-Key` header (`server/src/llmKeySecurity.js`). It is never
  persisted to disk, never logged, and is explicitly deleted from the request object right
  after use (`scrubLlmSecretsFromRequest`) — verified by reading the code, not assumed. It's
  a real proxy pattern (the server makes the actual OpenAI/OpenRouter call), not a pure
  pass-through. Making the key truly never touch the server would require calling the LLM
  provider directly from the device — decided against for this pass (see Decisions below).

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Platform order for Stage C | Android first, fully validated, then iOS (matches existing "one platform at a time" preference) |
| How to pick multi-parameter test queries | Derive from the real catalog via a generator script + fixture file, not hand-invented strings |
| Assertion strictness | Exact expected-product-title assertion + PDP tap-through, mirroring `photo-search.yaml`'s proven pattern |
| Query phrasing style | Natural conversational sentences ("I'm looking for a medium red cotton shirt"), not keyword lists — this is *why* Stage A must land before Stage C |
| Which search surface(s) to test | Both — the rule-based box and the LLM-reasoning path, as two separate fixture-driven test files |
| Key funding model in production | Bring-your-own-key stays; not switching to a server-paid key (avoids per-query cost exposure to the business) |
| Key persistence | Persist in Keychain (iOS) / Keystore (Android) via `react-native-keychain`, not session-only, not plain `AsyncStorage` |
| Key transport to LLM provider | Keep the existing server-side proxy (no-store/no-log/scrub guarantee already true today); do not move the LLM call to the device |
| Toggle behavior once a key exists | LLM reasoning becomes automatic on both search surfaces; the existing `llm-reasoning-switch` becomes an override to turn it back off, not the primary gate |
| No-key user experience | Rule-based search always works with no interruption; a one-time, dismissible, non-blocking banner invites the user to add a key for smarter search |

## Stage A: Parser bug fixes

**File:** `server/src/voiceQueryParser.js`

Size is the only attribute where the catalog's stored value (`XS/S/M/L/XL/XXL`, an
abbreviation convention) doesn't match how a person actually speaks ("medium," "extra
large"). Colors, materials, and specifications don't have this problem — they're matched via
substring scan against literal English words that already equal what's stored
(`COLOR_WORDS`, `SPECIFICATION_WORDS`), so natural phrasing already works for them with zero
translation step (verified: `"brown trousers"` already correctly extracts `color: brown`
with no map involved).

Fix, as a reusable pattern rather than a one-off hack:

```js
// Spoken-word -> stored-code canonicalization, for attributes where the catalog's
// stored value is an abbreviation/code rather than the word a person would say.
// Size is the only attribute with this mismatch today; reuse this exact pattern if a
// future attribute is ever added with the same code-vs-word gap.
const SIZE_WORD_SYNONYMS = {
  "extra small": "XS",
  "small": "S",
  "medium": "M",
  "large": "L",
  "extra large": "XL",
  "extra-large": "XL",
  "double extra large": "XXL",
  "2xl": "XXL",
};
```

`extractSize()` checks `SIZE_WORD_SYNONYMS` (as whole-phrase matches within the normalized
query) before falling through to the existing `"size X"` regex and bare-abbreviation loop.

The `"that's"` false-positive is fixed by tightening the bare-letter fallback so a standalone
`s`/`m`/`l` only counts as a size signal when it isn't part of a contraction — guard against
a preceding apostrophe in the match, e.g. requiring the character immediately before the
matched letter not be `'`. Exact regex finalized during implementation, verified with a unit
test asserting `"that's"` no longer produces `size: "S"`.

**Testing:** New unit tests in the parser's test file (or a new one if none exists) for both
bugs, TDD (red before green). Then the full existing Jest suite (159/160, same pre-existing
`goldenFixtures.test.js` failure, unrelated) must still pass.

## Stage B: Secure key persistence + default-reasoning UX

**New file:** `src/utils/secureLlmKeyStorage.js` — thin wrapper around
`react-native-keychain` exposing `getKey()`, `setKey(key)`, `deleteKey()`. New dependency:
`react-native-keychain` (iOS Keychain / Android Keystore under one API — encrypted at rest,
device-local, isolated per-app; not included in iCloud backups by default).

**`VoiceSearchCard.jsx`:** on successful key entry, also call `setKey()`. On mount, call
`getKey()` and pre-fill/activate if present.

**`catalogSearchService.js` / `ProductListScreen.jsx`:** `runSmartSearch()` calls
`getKey()`; if a key exists, automatically passes `useLlmReasoning: true` plus the stored key
to `searchCatalog()` — no manual toggle interaction required. The existing
`llm-reasoning-switch` UI stays visible but now defaults to reflecting "on because a key
exists," and lets the user explicitly turn it off for that session if they want the
faster/free rule-based path instead.

**New banner component** on `ProductListScreen`, shown once (dismissed state persisted via
plain `AsyncStorage` — not sensitive data, no Keychain/Keystore needed for this flag; kept
separate from the key itself) when no key is stored: "Add your API key for smarter
search that understands full sentences" with a link/navigation into the existing key-entry
UI on the Voice card. Search itself is never blocked — the rule-based parser (now fixed by
Stage A) always returns a result immediately regardless of banner/key state.

**Server:** no changes. The existing no-store/no-log/scrub guarantee in
`server/src/llmKeySecurity.js` is kept as the security boundary, per the decision not to move
the LLM call off-device.

**Error handling:** if Keychain/Keystore access fails (rare, e.g. device policy blocks it),
`getKey()`/`setKey()` catch and no-op — the app falls back to today's session-only behavior
for that session rather than crashing. This is the one place this spec adds error handling
beyond the "don't add unnecessary error handling" default, because secure-storage failure is
a real, externally-triggerable condition (not a hypothetical), and silently degrading to
existing behavior is strictly safer than surfacing a crash.

**Testing:** manual verification on both a fresh Android emulator and iOS Simulator install
(key survives app restart, banner appears once and stays dismissed, toggle reflects
auto-on-with-key state, rule-based search still works with the key deleted). No new Jest
unit tests planned for the native Keychain/Keystore calls themselves (they're a thin wrapper
around a well-tested third-party library); the service-layer logic in
`catalogSearchService.js` (deciding when to auto-attach a key) does get unit tests.

## Stage C: `ml-multiparameter-search.yaml` rewrite (Android, then iOS)

**New script:** `scripts/generate-multiparam-fixtures.mjs` — scans
`server/catalog-static.json` for products with 2-3+ populated attributes (color + size +
material, or price + specification, etc.), spanning distinct departments where possible
(clothing, footwear, beauty, electronics). Writes a fixture JSON (mirroring
`test-assets/image-search-samples/manifest.json`'s pattern) containing:

```json
[
  {
    "id": "clothing-color-size-material",
    "query": "I'm looking for a medium red cotton shirt",
    "expectedProductTitle": "<real title from the catalog>",
    "attributesUsed": { "color": "red", "size": "M", "material": "cotton" }
  }
]
```

5 such positive fixtures + 1 deliberately engineered to match nothing real (verifying the
app shows a graceful "no results" state, not a crash or irrelevant products). Queries are
phrased as natural conversational sentences, which only became safe to do after Stage A's
fixes land (pre-fix, a "medium" query would have silently failed to filter by size at all).

**Two Android files**, both consuming the same fixture file via `--env`:
- `ml-multiparameter-search.yaml` — types into the plain "Search products" box (rule-based
  parser, no key/credentials involved, fully agent-runnable).
- `ml-multiparameter-search-llm.yaml` — exercises the LLM-reasoning path via the
  already-established Ollama credential-free pattern (mirrors `06-llm-reasoning.yaml`); real
  OpenAI/OpenRouter provider coverage remains user-run only, per the existing
  execution-boundary constraint (Maestro echoes resolved `inputText` values to stdout, which
  becomes part of the agent's own transcript — a real key must never be loaded when the
  agent itself runs a flow).

Each query fixture: type the natural-language query into the field, submit, assert the
expected product title is visible (non-optional — a real failure if the multi-parameter
filtering doesn't work), tap it, assert `pdp-add-to-cart` is visible. The no-match fixture
asserts a graceful empty-state message instead.

**Full Android regression** (login, photo-search, `ml-features-comprehensive.yaml`,
`complete-e2e-clean.yaml`, both new multiparam files, Jest) must be green before iOS starts.

**Then iOS**, built fresh using the same fixture file and the same two-file pattern, adapted
for iOS's already-established login/keyboard conventions (`runFlow: login.yaml`, no
`pressKey: back`). Full iOS regression green as the final gate.

## Backlog (recovered from prior specs, not part of this work)

- **3D product models** — per `docs/superpowers/specs/2026-07-09-static-product-catalog-design.md`,
  deferred to "the very next plan after this ships": generic per-category placeholder models
  (glTF/OBJ/USDZ), not per-SKU unique assets, plus a 2D/3D toggle viewer component.
- **SKU-level variant selection in cart/checkout** — same source spec, backlogged further
  out. Attributes today are product-level descriptive arrays for search; a shopper can't yet
  pick "Red, size M" as a single purchasable cart line item — that's a separate change to the
  cart/checkout data model.
- **Orphaned `golden-image-fixtures.json`** — references three photo files that no longer
  exist post-catalog-rebuild, silently breaking both `goldenFixtures.test.js` and
  `scripts/eval-hybrid-search.mjs`. Found during this investigation, not fixed here (unrelated
  to search architecture).

## Out of scope

- Making materials a first-class structured field in the parser (currently they're only
  picked up incidentally via the generic `keywords` list, cross-checked against
  `product.materials` by the reranker's `constraintBoost`). Works today via that path; a
  dedicated `MATERIAL_WORDS` extraction list is a possible future improvement, not required
  for this spec's queries to pass.
- Calling the LLM provider directly from the device (bypassing our backend) — explicitly
  decided against; see Decisions table.
- Server-paid API key / removing bring-your-own-key — explicitly decided against.
- `.maestro/ios/complete-e2e.yaml` (the non-"clean" dead-code variant, already flagged
  out-of-scope in the prior spec) and the two recovered backlog items above.
