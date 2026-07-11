# Default LLM Search, Secure Key Persistence & Multi-Parameter E2E Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This plan is designed to be resumable by a different agent than the one who started it.**
> Every task has an explicit **Entry Criteria** (what must already be true/done before this
> task may start) and **Exit Criteria** (the observable proof this task is done — not "I
> believe it's done" but a command and its expected output). Before starting any task, verify
> its Entry Criteria yourself — don't trust a `Status` field alone, since it can go stale.
> After finishing a task, update its `Status` field in this file and commit that update.

**Goal:** Fix 33 broken/duplicated catalog product images (discovered mid-investigation, root
cause confirmed by direct execution), fix two real bugs in the rule-based natural-language
query parser, make LLM-based search understanding the automatic default across both search
surfaces (with a securely-persisted, never-server-stored-long-term API key), and rewrite
`ml-multiparameter-search.yaml` into a real, falsifiable E2E test of both the rule-based and
LLM-reasoning search paths — on Android first, then iOS.

**Architecture:** Four sequential stages, each gating the next. Stage 0 fixes the 33 catalog
products whose primary image is either a dead-link placeholder or wrongly duplicated from a
different product, re-sourcing real replacement photos (dummyjson/fakestoreapi first, then
validated-fresh escuelajs, then Unsplash as a last resort) and adding a permanent
duplicate/placeholder-detection gate to the catalog validation suite. Stage A fixes
`server/src/voiceQueryParser.js` so natural conversational size phrasing works correctly.
Stage B adds `react-native-keychain`-backed secure key persistence and threads a shared
`resolveDefaultLlmOptions()` helper into both `ProductListScreen.jsx`'s plain search box and
`VoiceSearchCard.jsx`'s voice/AI card, so LLM reasoning activates automatically once a key
exists, with the existing toggle becoming an override. Stage C derives real multi-parameter
test queries from the live catalog (which Stage 0 has by then made free of broken images) and
writes four new Maestro flows (rule-based + LLM path, Android + iOS) using the same
exact-title-assertion + PDP-tap-through pattern already proven in `photo-search.yaml`.

**Tech Stack:** Node.js/Express backend (`server/`), React Native 0.85.3 frontend (`src/`),
Jest for unit tests, `node --test` for script tests, Maestro for E2E, `react-native-keychain`
(new dependency) for secure on-device storage, Unsplash API (new, Stage 0 only) for
last-resort real photo sourcing.

## Global Constraints

- **Only real, sourced, non-fictional product data and images — never AI-generated or
  synthesized** — a hard constraint carried through this entire project, directly relevant to
  Stage 0's sourcing chain.
- **Stage 0's placeholder-size threshold is 2048 bytes** — comfortably above the confirmed-dead
  escuelajs stub (503 bytes, verified live) and comfortably below every confirmed-real product
  photo size seen this session (several KB or more). Use this exact value everywhere the
  threshold appears; do not re-derive or approximate it differently between tasks.
- **Android and iOS Maestro flows live in permanently separate folders** (`.maestro/android/`
  vs `.maestro/ios/`) with zero shared/conditional/templated files between them — a hard
  project requirement. `.maestro/flows/06-llm-reasoning.yaml` is a pre-existing, already-wired
  exception to this rule from before it was established; do not follow its shared-file pattern
  for anything new, and do not modify it as part of this plan.
- **The agent implementing this plan must never execute a Maestro flow with a real
  OpenAI/OpenRouter/Groq/Gemini API key present** (directly or via env-var pass-through it
  invokes itself) — Maestro's terminal output prints the literal resolved value for
  `inputText` steps, which becomes part of the agent's own transcript. Only Ollama
  (`keyOptional: true`, credential-free) may be used for any flow the agent runs itself. Real
  API key coverage for `06-llm-reasoning.yaml`-style flows is the user's job, run in the
  user's own terminal — never the implementing agent's.
- **TDD is required for every code change in Stages A and B**: write the failing test, watch
  it fail for the expected reason, write minimal code to pass, watch it pass, then move on.
  No production code without a failing test first.
- **Each stage's full regression suite must be green before the next stage starts.** Stage A
  gates Stage B. Stage B gates Stage C. Within Stage C, Android's full regression gates the
  start of the iOS tasks.
- **`server/catalog-static.json` has the shape `{ updatedAt, products: [...] }`** — it is not
  a bare array. Any script reading it must do `require("../server/catalog-static.json").products`,
  never assume the file's top level is the array itself.
- **`scripts/fixtures/golden-image-fixtures.json` is currently broken** (three photo paths
  that no longer exist, causing 1 pre-existing Jest failure in
  `__tests__/goldenFixtures.test.js`) — this is a known, unrelated, out-of-scope issue. Every
  "full regression green" gate in this plan means 159+N/160+N passing (N = new tests added by
  this plan), with that one specific pre-existing failure as the only allowed exception. If
  any *other* test fails, that is a real regression and must be fixed before proceeding.

---

## Stage 0: Catalog image integrity

**Stage 0 Entry Criteria (verify before starting Task 0.1):** Working tree is clean on
`feature/static-product-catalog` (or its current active branch). `npm test` passes with
exactly one known failure: `goldenFixtures.test.js`'s "defines image fixtures that point at
checked-in photos" (same pre-existing failure noted in the Global Constraints).

### Task 0.1: `imageIntegrity.js` — hashing, duplicate-grouping, classification, placeholder detection

**Status:** Not Started

**Entry Criteria:** Stage 0 Entry Criteria met (see above).

**Exit Criteria:**
- `npx jest __tests__/imageIntegrity.test.js -v` passes, all cases green.

**Files:**
- Create: `server/scripts/lib/imageIntegrity.js` (CommonJS `.js`, not `.mjs` — this file is
  `require()`'d directly by the existing Jest test `__tests__/catalogStaticValidation.test.js`
  in Task 0.4, matching the existing `server/scripts/catalogAttributePools.js`'s pattern of a
  CommonJS helper consumed by Jest; ESM scripts in Task 0.2/0.3 import it via
  `import imageIntegrity from "../lib/imageIntegrity.js"` — Node's CJS-from-ESM default-import
  interop, not named imports, to avoid interop footguns.)
- Test: `__tests__/imageIntegrity.test.js`

**Interfaces:**
- Produces: `PLACEHOLDER_SIZE_THRESHOLD_BYTES = 2048` (exported constant — see Global
  Constraints; use this exact exported value everywhere, never a re-typed literal),
  `hashImage(absolutePath: string): string` (MD5 hex of file bytes),
  `findDuplicateGroups(products: Product[], repoRoot: string): Array<{hash, size, members:
  Product[]}>` (only groups where 2+ products share an identical primary-image hash; a
  `Product` here just needs `.id`/`.images[0]` — matches `catalog-static.json`'s product
  shape), `classifyDuplicateGroups(groups): {needsFix: Product[], legitimateOriginals:
  Product[]}` (implements the Group 1/2/3 classification from the design spec — a
  `dj-`/`fs-`-prefixed member of a group that also contains a non-`dj-`/`fs-` member is a
  legitimate original and excluded from `needsFix`; everyone in an all-sub-threshold-size
  group needs fixing; everyone in a 2-or-more-real-member group needs fixing, since neither
  can be assumed to be more "legitimate" than the other), `isLikelyPlaceholder(buffer:
  Buffer): boolean` (`buffer.length < PLACEHOLDER_SIZE_THRESHOLD_BYTES`). Task 0.2/0.3's fix
  script and Task 0.4's new test assertions both consume these five exports by exact name.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/imageIntegrity.test.js`:

```js
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  PLACEHOLDER_SIZE_THRESHOLD_BYTES,
  hashImage,
  findDuplicateGroups,
  classifyDuplicateGroups,
  isLikelyPlaceholder,
} = require("../server/scripts/lib/imageIntegrity");

describe("imageIntegrity", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-integrity-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeFile(relPath, content) {
    const full = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return full;
  }

  it("hashImage returns the same hash for identical file contents", () => {
    const a = writeFile("a.jpg", "same-bytes");
    const b = writeFile("b.jpg", "same-bytes");
    expect(hashImage(a)).toBe(hashImage(b));
  });

  it("hashImage returns different hashes for different file contents", () => {
    const a = writeFile("a.jpg", "content-one");
    const b = writeFile("b.jpg", "content-two");
    expect(hashImage(a)).not.toBe(hashImage(b));
  });

  it("PLACEHOLDER_SIZE_THRESHOLD_BYTES is 2048", () => {
    expect(PLACEHOLDER_SIZE_THRESHOLD_BYTES).toBe(2048);
  });

  it("isLikelyPlaceholder is true below the threshold, false at or above it", () => {
    expect(isLikelyPlaceholder(Buffer.alloc(503))).toBe(true);
    expect(isLikelyPlaceholder(Buffer.alloc(2047))).toBe(true);
    expect(isLikelyPlaceholder(Buffer.alloc(2048))).toBe(false);
    expect(isLikelyPlaceholder(Buffer.alloc(50000))).toBe(false);
  });

  it("findDuplicateGroups groups products whose primary image is byte-identical", () => {
    writeFile("assets/products/a/1.jpg", "shared-bytes");
    writeFile("assets/products/b/1.jpg", "shared-bytes");
    writeFile("assets/products/c/1.jpg", "unique-bytes");
    const products = [
      { id: "p1", images: ["assets/products/a/1.jpg"] },
      { id: "p2", images: ["assets/products/b/1.jpg"] },
      { id: "p3", images: ["assets/products/c/1.jpg"] },
    ];
    const groups = findDuplicateGroups(products, tmpDir);
    expect(groups.length).toBe(1);
    expect(groups[0].members.map((p) => p.id).sort()).toEqual(["p1", "p2"]);
  });

  it("classifyDuplicateGroups excludes the legitimate dj-/fs- original from needsFix", () => {
    const groups = [
      {
        hash: "h1",
        size: 50000,
        members: [
          { id: "dj-88", images: ["x"] },
          { id: "demo-shoes-women-44", images: ["x"] },
        ],
      },
    ];
    const { needsFix, legitimateOriginals } = classifyDuplicateGroups(groups);
    expect(needsFix.map((p) => p.id)).toEqual(["demo-shoes-women-44"]);
    expect(legitimateOriginals.map((p) => p.id)).toEqual(["dj-88"]);
  });

  it("classifyDuplicateGroups needs-fixes everyone in a sub-threshold-size group", () => {
    const groups = [
      {
        hash: "h2",
        size: 503,
        members: [
          { id: "es-3", images: ["x"] },
          { id: "es-4", images: ["x"] },
        ],
      },
    ];
    const { needsFix, legitimateOriginals } = classifyDuplicateGroups(groups);
    expect(needsFix.map((p) => p.id).sort()).toEqual(["es-3", "es-4"]);
    expect(legitimateOriginals).toEqual([]);
  });

  it("classifyDuplicateGroups needs-fixes everyone when 2+ real (dj-/fs-) members coincide", () => {
    const groups = [
      {
        hash: "h3",
        size: 40000,
        members: [
          { id: "dj-97", images: ["x"] },
          { id: "dj-192", images: ["x"] },
        ],
      },
    ];
    const { needsFix, legitimateOriginals } = classifyDuplicateGroups(groups);
    expect(needsFix.map((p) => p.id).sort()).toEqual(["dj-192", "dj-97"]);
    expect(legitimateOriginals).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/imageIntegrity.test.js -v`

Expected: FAIL — `Cannot find module '../server/scripts/lib/imageIntegrity'`.

- [ ] **Step 3: Write the implementation**

Create `server/scripts/lib/imageIntegrity.js`:

```js
// server/scripts/lib/imageIntegrity.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Comfortably above the confirmed-dead escuelajs/imgur placeholder stub (503 bytes,
// verified live this session) and comfortably below every confirmed-real product photo
// size seen this session (several KB or more). See the plan's Global Constraints.
const PLACEHOLDER_SIZE_THRESHOLD_BYTES = 2048;

function hashImage(absolutePath) {
  const buf = fs.readFileSync(absolutePath);
  return crypto.createHash("md5").update(buf).digest("hex");
}

function isLikelyPlaceholder(buffer) {
  return buffer.length < PLACEHOLDER_SIZE_THRESHOLD_BYTES;
}

function findDuplicateGroups(products, repoRoot) {
  const byHash = new Map();
  for (const product of products) {
    const img = product.images?.[0];
    if (!img) continue;
    const absolutePath = path.join(repoRoot, img);
    if (!fs.existsSync(absolutePath)) continue;
    const buf = fs.readFileSync(absolutePath);
    const hash = crypto.createHash("md5").update(buf).digest("hex");
    if (!byHash.has(hash)) byHash.set(hash, { hash, size: buf.length, members: [] });
    byHash.get(hash).members.push(product);
  }
  return [...byHash.values()].filter((g) => g.members.length > 1);
}

function isRealSource(product) {
  return /^(dj|fs)-/.test(product.id);
}

function classifyDuplicateGroups(groups) {
  const needsFix = [];
  const legitimateOriginals = [];
  for (const { size, members } of groups) {
    const realMembers = members.filter(isRealSource);
    const nonRealMembers = members.filter((p) => !isRealSource(p));
    if (size < PLACEHOLDER_SIZE_THRESHOLD_BYTES) {
      needsFix.push(...members);
    } else if (realMembers.length === 1 && nonRealMembers.length >= 1) {
      legitimateOriginals.push(realMembers[0]);
      needsFix.push(...nonRealMembers);
    } else {
      needsFix.push(...members);
    }
  }
  return { needsFix, legitimateOriginals };
}

module.exports = {
  PLACEHOLDER_SIZE_THRESHOLD_BYTES,
  hashImage,
  isLikelyPlaceholder,
  findDuplicateGroups,
  classifyDuplicateGroups,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/imageIntegrity.test.js -v`

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/scripts/lib/imageIntegrity.js __tests__/imageIntegrity.test.js
git commit -m "feat: add imageIntegrity.js - catalog image hashing/duplicate/classification

Pure, testable functions shared by the one-time Stage 0 fix script
(Task 0.2/0.3) and the permanent regression gate added to
catalogStaticValidation.test.js (Task 0.4) -- single source of truth for
what counts as a duplicate or a placeholder-sized broken image."
```

### Task 0.2: Fix script Tier 0 — escuelajs live title-match for Group 1

**Status:** Done (commit `6cd6e95`). Actual result: 20/23 resolved, not 21/23 as
estimated — escuelajs's live demo catalog shifted between design-time and
execution-time (their inventory is not static). `es-6` was found never to have
existed (id numbering gap, not a missing fix). The 3 unresolved (`es-3`, `es-4`,
`es-5` — mens-clothing hoodies) carried forward into Task 0.3, bringing its
total from the estimated 12 to 13.

**Entry Criteria:** Task 0.1 Exit Criteria met.

**Exit Criteria:**
- Running the script resolves 21 of Group 1's 23 products (the 2 known unmatched —
  `Classic Heather Gray Hoodie`, `Classic Black Hooded Sweatshirt` — remain, to be picked up
  by Task 0.3's fallback chain).
- `git diff server/catalog-static.json` shows exactly those 21 products' `images`/`image`
  fields changed, nothing else.
- The 21 new image files exist under `assets/products/<slug>/` and are all
  `>= 2048` bytes (verify with the same `isLikelyPlaceholder` function from Task 0.1).

**Files:**
- Create: `server/scripts/fixBrokenCatalogImages.mjs`
- Modify: `server/catalog-static.json` (data change, produced by running the script — not
  hand-edited)

**Interfaces:**
- Consumes: `hashImage`, `findDuplicateGroups`, `classifyDuplicateGroups`,
  `isLikelyPlaceholder` (Task 0.1, imported via default-import CJS interop as noted in Task
  0.1's Files section).
- Produces: no exports — this is a CLI script, run directly with `node`. Task 0.3 extends this
  same file in place (adds the fallback-chain function and calls it for whatever Tier 0
  didn't resolve), it does not create a second file.

- [ ] **Step 1: Write the script's Tier 0 logic**

Create `server/scripts/fixBrokenCatalogImages.mjs`:

```js
#!/usr/bin/env node
// server/scripts/fixBrokenCatalogImages.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import imageIntegrityModule from "./lib/imageIntegrity.js";

const { findDuplicateGroups, classifyDuplicateGroups, isLikelyPlaceholder } =
  imageIntegrityModule;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const STATIC_PATH = join(__dirname, "..", "catalog-static.json");

async function downloadTo(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (isLikelyPlaceholder(buf)) {
    throw new Error(`Rejected: ${url} is only ${buf.length} bytes (placeholder-sized)`);
  }
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buf);
  return buf.length;
}

async function fetchEscuelajsLiveCatalog() {
  const all = [];
  for (let offset = 0; offset < 300; offset += 50) {
    const res = await fetch(`https://api.escuelajs.co/api/v1/products?limit=50&offset=${offset}`);
    if (!res.ok) break;
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < 50) break;
  }
  return all;
}

async function resolveTier0(needsFix, catalog, report) {
  const liveEscuelajs = await fetchEscuelajsLiveCatalog();
  console.log(`Fetched ${liveEscuelajs.length} live escuelajs products for Tier 0 title-matching.`);

  const stillNeedsFix = [];
  for (const product of needsFix) {
    if (!/^es-/.test(product.id)) {
      stillNeedsFix.push(product);
      continue;
    }
    const liveMatch = liveEscuelajs.find((p) => p.title === product.title);
    const candidateUrl = liveMatch?.images?.[0];
    if (!candidateUrl) {
      stillNeedsFix.push(product);
      continue;
    }
    const ext = candidateUrl.match(/\.(jpe?g|png|webp)(\?|$)/i)?.[1] || "jpg";
    const destPath = join(ROOT, "assets", "products", product.slug, `1.${ext}`);
    try {
      const size = await downloadTo(candidateUrl, destPath);
      const relPath = `assets/products/${product.slug}/1.${ext}`;
      const catalogProduct = catalog.products.find((p) => p.id === product.id);
      catalogProduct.images = [relPath];
      catalogProduct.image = relPath;
      report.push({ id: product.id, title: product.title, tier: "0-escuelajs-title-match", size });
      console.log(`  [Tier 0] ${product.id} "${product.title}" -> ${relPath} (${size} bytes)`);
    } catch (err) {
      console.warn(`  [Tier 0 FAILED] ${product.id} "${product.title}": ${err.message}`);
      stillNeedsFix.push(product);
    }
  }
  return stillNeedsFix;
}

async function main() {
  const catalog = JSON.parse(readFileSync(STATIC_PATH, "utf8"));
  const groups = findDuplicateGroups(catalog.products, ROOT);
  const { needsFix } = classifyDuplicateGroups(groups);
  console.log(`Classified ${needsFix.length} products needing a fix.`);

  const report = [];
  const remaining = await resolveTier0(needsFix, catalog, report);

  writeFileSync(STATIC_PATH, JSON.stringify(catalog, null, 2), "utf8");
  writeFileSync(
    join(__dirname, "..", "data", "image-fix-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log(`\nTier 0 resolved ${report.length}/${needsFix.length}.`);
  console.log(`Still needing a fix (${remaining.length}):`);
  remaining.forEach((p) => console.log(`  ${p.id} | ${p.title} | ${p.category}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the script**

Run: `node server/scripts/fixBrokenCatalogImages.mjs`

Expected output ends with:
```
Tier 0 resolved 21/33.
Still needing a fix (12):
  es-3 | Classic Heather Gray Hoodie | mens-clothing
  es-5 | Classic Black Hooded Sweatshirt | mens-clothing
  demo-jacket-blue-49 | Seabreeze Blue Rain Jacket | womens-clothing
  demo-jacket-blue-54 | Alpine Blue Packable Windbreaker | womens-clothing
  demo-jacket-blue-59 | Harbor Blue Hooded Coat | womens-clothing
  demo-shoes-women-39 | Riviera Women Sandals | footwear
  demo-shoes-women-44 | Urban Step Women Sneakers | footwear
  demo-shoes-women-49 | Everyday Women Running Shoes | footwear
  demo-fragrance-* | Maison Citrus Bloom Eau de Parfum | beauty-fragrances
  demo-fragrance-* | Soft Rose Day Fragrance | beauty-fragrances
  dj-97 | Rolex Datejust | watches
  dj-192 | Rolex Datejust Women | watches
```
(Exact `demo-fragrance-*` ids: confirm against the live run's output — this session's earlier
analysis identified them by title, not by exact id string.)

If the resolved count differs from 21, investigate before proceeding — either a title changed
in escuelajs's live catalog since this plan was written (re-run Task 0.1's classification
logic against the current data to see what changed) or a network issue during the run.

- [ ] **Step 3: Verify no unintended changes**

Run: `git diff --stat server/catalog-static.json`

Expected: only `catalog-static.json` and the 21 new image files under `assets/products/`
changed; no product's title/price/description/category was touched, only `images`/`image`.

- [ ] **Step 4: Commit**

```bash
git add server/catalog-static.json server/scripts/fixBrokenCatalogImages.mjs server/data/image-fix-report.json assets/products/
git commit -m "fix: Tier 0 - correct 21 broken catalog images via escuelajs live title-match

Same products, same selection -- only the broken image URL is corrected,
by matching each broken product's exact title against escuelajs's current
live catalog (its prior stored URL was case-mangled: our data had
i.imgur.com/r2pn9wq.jpeg, permanently dead, while the correctly-cased
i.imgur.com/R2PN9Wq.jpeg for the same escuelajs listing is a genuinely
working photo). 12 products remain for Task 0.3's fallback chain."
```

### Task 0.3: Fix script fallback chain — dummyjson/fakestoreapi, then fresh escuelajs, then Unsplash

**Status:** Done (commit `182c02d`). Deviations from plan, both approved by the user
inline:
1. **Unsplash could not be used.** The user could not obtain a working Unsplash API
   access token. They provided the Unsplash Research Dataset Lite instead, but its
   license (`TERMS.md`) only permits ML-training use, not in-app display — using it
   for product photos would have been a licensing violation, so it was rejected.
   **Pixabay was substituted as the last-resort tier** (free key, Content License
   explicitly permits commercial display of downloaded images — matches this
   script's already-existing download-to-server pattern). `findUnsplashCandidate`
   was kept in the chain (harmless no-op without an env var) and `findPixabayCandidate`
   added after it.
2. **Fixed a same-run duplicate bug found during execution.** The plan's own
   `findUnusedDummyjsonCandidate`/`findUnusedFakestoreCandidate` code took a
   `usedIds` set but never added a newly-chosen candidate to it, so multiple
   products needing the same category could all receive the same "first unused"
   candidate — reproducing the exact duplicate-image defect Stage 0 exists to fix.
   First real run produced 3 byte-identical-image groups (hoodies, women's shoes,
   watches) before this was caught and fixed. Fixed by marking `candidate.id` used
   at selection time in `resolveFallbackChain`.
3. **Pixabay tier got a query-narrowing retry** after one product transiently
   returned 0 hits on a full-title query that returned 20 hits moments earlier in
   manual testing — added retry with progressively shorter query strings (full
   title → last 2 words → last word) before giving up.

Final verification (ad hoc, beyond the plan's stated Exit Criteria): re-ran
`findDuplicateGroups`/`isLikelyPlaceholder` from `imageIntegrity.js` against the
full 196-product catalog post-fix — 0 duplicate groups, 0 placeholder-sized images.

**Entry Criteria:** Task 0.2 Exit Criteria met. `UNSPLASH_ACCESS_KEY` available in the
environment (user-provided — see this task's Step 1 for what to ask for if not yet provided).
Superseded — see Status note above; `PIXABAY_API_KEY` was used instead.

**Exit Criteria:**
- All 12 products remaining after Task 0.2 are resolved (report shows 33/33 total across both
  tasks).
- `git diff server/catalog-static.json` (cumulative with Task 0.2) shows all 33 fixed
  products' `images`/`image` changed, nothing else touched.

**Files:**
- Modify: `server/scripts/fixBrokenCatalogImages.mjs` (extend, don't replace, Task 0.2's file)

**Interfaces:**
- Consumes: same as Task 0.2, plus `catalog-selection.json`'s existing `selection` array (to
  compute "already-used" ids per category, so the dummyjson/fakestoreapi tier only offers
  genuinely unused candidates).
- Produces: no new exports.

- [ ] **Step 1: Ask the user for the Unsplash key if not already provided**

Before writing code, confirm `process.env.UNSPLASH_ACCESS_KEY` will be set when this task
runs. If the user hasn't provided one yet, ask them to sign up (free, no billing info) at
`unsplash.com/developers`, create an application, and provide the "Access Key" value — per
the approved design, this agent cannot create that account itself.

- [ ] **Step 2: Add the dummyjson/fakestoreapi/escuelajs-fresh/Unsplash fallback chain**

Extend `server/scripts/fixBrokenCatalogImages.mjs` — add these functions above `main()`:

```js
const CATEGORY_TO_DUMMYJSON = {
  "mens-clothing": ["mens-shirts", "tops"],
  "womens-clothing": ["womens-dresses"],
  footwear: ["mens-shoes", "womens-shoes"],
  "beauty-fragrances": ["beauty", "fragrances", "skin-care"],
  watches: ["mens-watches", "womens-watches"],
  "bags-accessories": ["womens-bags", "sunglasses"],
};

const CATEGORY_TO_FAKESTORE = {
  "mens-clothing": "men's clothing",
  "womens-clothing": "women's clothing",
};

async function usedIdsBySource() {
  const selection = JSON.parse(
    readFileSync(join(__dirname, "..", "data", "catalog-selection.json"), "utf8")
  );
  return new Set((selection.selection || selection).map((p) => p.id));
}

async function findUnusedDummyjsonCandidate(category, usedIds) {
  const slugs = CATEGORY_TO_DUMMYJSON[category] || [];
  for (const slug of slugs) {
    const res = await fetch(`https://dummyjson.com/products/category/${slug}`);
    if (!res.ok) continue;
    const { products } = await res.json();
    for (const item of products) {
      const id = `dj-${item.id}`;
      if (usedIds.has(id)) continue;
      const img = item.images?.[0] || item.thumbnail;
      if (img) return { sourceLabel: "dummyjson", url: img };
    }
  }
  return null;
}

async function findUnusedFakestoreCandidate(category, usedIds) {
  const fsCategory = CATEGORY_TO_FAKESTORE[category];
  if (!fsCategory) return null;
  const res = await fetch(`https://fakestoreapi.com/products/category/${encodeURIComponent(fsCategory)}`);
  if (!res.ok) return null;
  const items = await res.json();
  for (const item of items) {
    const id = `fs-${item.id}`;
    if (usedIds.has(id)) continue;
    if (item.image) return { sourceLabel: "fakestoreapi", url: item.image };
  }
  return null;
}

async function findFreshEscuelajsCandidate(product, liveEscuelajs, usedTitles) {
  const categoryWord = product.title.split(" ").slice(-1)[0].toLowerCase();
  const candidate = liveEscuelajs.find(
    (p) => !usedTitles.has(p.title) && p.title.toLowerCase().includes(categoryWord)
  );
  if (!candidate) return null;
  usedTitles.add(candidate.title);
  return { sourceLabel: "escuelajs-fresh", url: candidate.images?.[0] };
}

async function findUnsplashCandidate(product) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const query = encodeURIComponent(product.title);
  const res = await fetch(`https://api.unsplash.com/photos/random?query=${query}`, {
    headers: { Authorization: `Client-ID ${key}` },
  });
  if (!res.ok) return null;
  const photo = await res.json();
  const url = photo?.urls?.regular;
  return url ? { sourceLabel: "unsplash", url } : null;
}

async function resolveFallbackChain(remaining, catalog, liveEscuelajs, report) {
  const usedIds = await usedIdsBySource();
  const usedEscuelajsTitles = new Set(liveEscuelajs.map((p) => p.title).filter((t) =>
    catalog.products.some((cp) => cp.title === t)
  ));
  const stillUnresolved = [];

  for (const product of remaining) {
    let candidate =
      (await findUnusedDummyjsonCandidate(product.category, usedIds)) ||
      (await findUnusedFakestoreCandidate(product.category, usedIds)) ||
      (await findFreshEscuelajsCandidate(product, liveEscuelajs, usedEscuelajsTitles)) ||
      (await findUnsplashCandidate(product));

    if (!candidate) {
      stillUnresolved.push(product);
      continue;
    }

    const ext = candidate.url.match(/\.(jpe?g|png|webp)(\?|$)/i)?.[1] || "jpg";
    const destPath = join(ROOT, "assets", "products", product.slug, `1.${ext}`);
    try {
      const size = await downloadTo(candidate.url, destPath);
      const relPath = `assets/products/${product.slug}/1.${ext}`;
      const catalogProduct = catalog.products.find((p) => p.id === product.id);
      catalogProduct.images = [relPath];
      catalogProduct.image = relPath;
      report.push({ id: product.id, title: product.title, tier: candidate.sourceLabel, size });
      console.log(`  [${candidate.sourceLabel}] ${product.id} "${product.title}" -> ${relPath} (${size} bytes)`);
    } catch (err) {
      console.warn(`  [${candidate.sourceLabel} FAILED] ${product.id} "${product.title}": ${err.message}`);
      stillUnresolved.push(product);
    }
  }
  return stillUnresolved;
}
```

- [ ] **Step 3: Wire the fallback chain into `main()`**

Replace `main()`'s body:

```js
async function main() {
  const catalog = JSON.parse(readFileSync(STATIC_PATH, "utf8"));
  const groups = findDuplicateGroups(catalog.products, ROOT);
  const { needsFix } = classifyDuplicateGroups(groups);
  console.log(`Classified ${needsFix.length} products needing a fix.`);

  const report = [];
  const liveEscuelajs = await fetchEscuelajsLiveCatalog();
  console.log(`Fetched ${liveEscuelajs.length} live escuelajs products.`);

  const afterTier0 = await resolveTier0(needsFix, catalog, report, liveEscuelajs);
  const afterFallback = await resolveFallbackChain(afterTier0, catalog, liveEscuelajs, report);

  writeFileSync(STATIC_PATH, JSON.stringify(catalog, null, 2), "utf8");
  writeFileSync(
    join(__dirname, "..", "data", "image-fix-report.json"),
    JSON.stringify(report, null, 2)
  );

  console.log(`\nResolved ${report.length}/${needsFix.length}.`);
  if (afterFallback.length) {
    console.log(`UNRESOLVED (${afterFallback.length}) — needs a human decision:`);
    afterFallback.forEach((p) => console.log(`  ${p.id} | ${p.title} | ${p.category}`));
  }
}
```

Also update `resolveTier0`'s signature to accept the already-fetched `liveEscuelajs` instead
of fetching it again internally — change its declaration to
`async function resolveTier0(needsFix, catalog, report, liveEscuelajs)` and delete the
`const liveEscuelajs = await fetchEscuelajsLiveCatalog();` line from inside it (now passed in
from `main()` instead, fetched once).

- [ ] **Step 4: Run the script**

Run: `UNSPLASH_ACCESS_KEY=<the key the user provided> node server/scripts/fixBrokenCatalogImages.mjs`

Expected: `Resolved 33/33.` with no `UNRESOLVED` section. If any product remains unresolved,
stop and report it — per the spec's error handling, an exhausted product is a real "needs a
human decision" case, not something to paper over silently.

- [ ] **Step 5: Verify and commit**

```bash
git diff --stat server/catalog-static.json  # only images/image fields changed for the 33
git add server/catalog-static.json server/scripts/fixBrokenCatalogImages.mjs server/data/image-fix-report.json assets/products/
git commit -m "fix: Stage 0 fallback chain - resolve remaining 12 broken catalog images

dummyjson/fakestoreapi unused-candidate lookup first (same category),
fresh validated escuelajs candidates second, Unsplash (user-provided
UNSPLASH_ACCESS_KEY) last resort. All 33 products flagged by Task 0.1's
classification are now resolved -- see server/data/image-fix-report.json
for exactly which source supplied each one's replacement image."
```

### Task 0.4: Permanent regression gate in `catalogStaticValidation.test.js`

**Status:** Done (commit `04ca947`). Both new assertions passed on first run
against the fixed catalog. Full suite: 169/170 (only the known pre-existing
`goldenFixtures.test.js` failure). `npm run validate:catalog` green.

**Entry Criteria:** Task 0.3 Exit Criteria met.

**Exit Criteria:**
- `npx jest __tests__/catalogStaticValidation.test.js -v` passes, including the two new
  assertions, against the now-fixed `catalog-static.json`.

**Files:**
- Modify: `__tests__/catalogStaticValidation.test.js`

**Interfaces:**
- Consumes: `findDuplicateGroups`, `isLikelyPlaceholder` (Task 0.1).

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/catalogStaticValidation.test.js` (add the import at the top alongside the
existing two, and the two new `it` blocks inside the existing `describe`):

```js
const path = require("path");
const fs = require("fs");
const {
  findDuplicateGroups,
  isLikelyPlaceholder,
} = require("../server/scripts/lib/imageIntegrity");
```

```js
  it("no two products share an identical primary-image hash", () => {
    const repoRoot = path.join(__dirname, "..");
    const groups = findDuplicateGroups(products, repoRoot);
    const offenders = groups.map((g) => g.members.map((p) => p.id).join(" == "));
    expect(offenders).toEqual([]);
  });

  it("every product's primary image exceeds the minimum real-photo size threshold", () => {
    const repoRoot = path.join(__dirname, "..");
    const tooSmall = products.filter((p) => {
      const img = p.images?.[0];
      if (!img) return true;
      const full = path.join(repoRoot, img);
      if (!fs.existsSync(full)) return true;
      return isLikelyPlaceholder(fs.readFileSync(full));
    });
    expect(tooSmall.map((p) => p.id)).toEqual([]);
  });
```

- [ ] **Step 2: Run to verify they were failing before Stage 0 and pass now**

Run: `npx jest __tests__/catalogStaticValidation.test.js -v`

Expected: all tests PASS, including the two new ones — proof that Stage 0's fix actually
worked across the entire 196-product catalog, not just the 33 that were touched (this also
re-confirms the 163 untouched products are still fine).

(There is no separate "watch it fail first" step here in the usual TDD sense, because by the
time this task starts, Task 0.3 has already fixed the catalog — these assertions are written
to describe the *desired permanent state*, and Task 0.1's own unit tests already proved the
underlying detection logic correctly identifies duplicates/placeholders in isolation. Running
these two new assertions against the pre-Stage-0 catalog was effectively already done, ad hoc,
during this plan's own investigation this session — they would have failed with the 33 known
offenders.)

- [ ] **Step 3: Run the full suite and `npm run validate:catalog`**

Run: `npm test && npm run validate:catalog`

Expected: both green. `npm test` still shows only the one pre-existing
`goldenFixtures.test.js` failure noted in Global Constraints — nothing else red.

- [ ] **Step 4: Commit**

```bash
git add __tests__/catalogStaticValidation.test.js
git commit -m "test: permanent gate against duplicate/placeholder catalog images

Added to the existing catalogStaticValidation.test.js (same file/severity
as the existing 'no duplicate SKUs' check) so any future catalog change
that reintroduces a duplicate or near-empty primary image fails npm test
immediately, instead of silently shipping like Stage 0's 33 did."
```

### Task 0.5: Rebuild CLIP index — Stage 0 final regression gate

**Status:** Not Started

**Entry Criteria:** Task 0.4 Exit Criteria met.

**Exit Criteria (all must pass before Stage A may start):**
- `node server/scripts/rebuildClipIndex.js` completes without error.
- `npm test` shows only the one known pre-existing `goldenFixtures.test.js` failure.
- Manual spot-check: at least 3 of the 33 fixed products, viewed in the running app (product
  listing + PDP), show a sensible, non-broken, correctly-oriented photo.

**Status:** Done (commits `1675962` + earlier CLIP rebuild). Manual spot-check
(Step 3) caught a real quality problem the automated fallback chain missed: 8 of
9 pixabay first-hit picks were real/non-broken/non-duplicate but not usable
product photos (crowd scene, wrong-gender portrait, assorted-flats rack, a
literal rose instead of a bottle, wrong-color jackets). Replaced all 9 with
manually verified picks (targeted queries + tag filtering + visual inspection
before selection) per user decision "accept best-available for all 4" remaining
hard cases. 5/9 are now clean correct-color matches; 4/9 are real/sensible but
imperfect on color or show a third-party brand patch — flagged as a possible
future manual-recuration item, not blocking. Final state: 0 duplicate-hash
groups, 0 placeholder-sized images across all 196 products; `npm test` shows
only the one known pre-existing `goldenFixtures.test.js` failure; CLIP index
rebuilt twice (once after Task 0.3, once after this quality-fix pass).

**Files:** None (verification only).

- [ ] **Step 1: Rebuild the CLIP index**

Run: `node server/scripts/rebuildClipIndex.js`

Expected: `Done in <N>s` with no errors. This is a full rebuild (confirmed in the design spec
that no incremental mode exists) — expect it to take roughly the same time Phase 4's original
rebuild did.

- [ ] **Step 2: Full regression check**

Run: `npm test`

Expected: only the one known pre-existing `goldenFixtures.test.js` failure, nothing else red.

- [ ] **Step 3: Manual spot-check**

Start the server (`npm run server` or `npm run start:baseline` per this project's established
convention) and the app, and view at least 3 of the 33 fixed products (pick a mix across
Task 0.2's Tier 0 fixes and Task 0.3's fallback-chain fixes — check
`server/data/image-fix-report.json` for the full list) in the product listing and their PDP.
Confirm each shows a real, sensible, non-broken photo — not a blank/broken-image icon, not
another product's photo.

- [ ] **Step 4: Update this plan's status**

Mark Tasks 0.1-0.5 as `Status: Done` in this file and commit:
```bash
git add docs/superpowers/plans/2026-07-10-default-llm-search-and-multiparam-e2e.md
git commit -m "docs: mark Stage 0 complete, catalog image integrity fixed and gated"
```

---

## Stage A: Parser bug fixes

### Task A1: Fix natural-language size extraction in `voiceQueryParser.js`

**Status:** Done (commit `5847c4b`). Both bugs fixed exactly as planned, no
deviations. All 7 tests in `voiceQueryParser.sizeSpec.test.js` pass (3
pre-existing + 2 new, plus 2 pre-existing specification tests). Full suite:
171/172 (only the known pre-existing `goldenFixtures.test.js` failure).

**Entry Criteria:**
- Stage 0's Exit Criteria (Task 0.5) are all met and committed — the catalog has zero
  duplicate/placeholder-sized primary images before any further work builds on it.
- Working tree is clean on `feature/static-product-catalog` (or its current active branch).
- `npm test` passes with exactly one known failure: `goldenFixtures.test.js`'s "defines image
  fixtures that point at checked-in photos" (run `npm test` now and confirm this before
  starting, so any *other* pre-existing failure is caught before you get blamed for it).

**Exit Criteria:**
- `npm test -- voiceQueryParser` shows all tests passing, including the two new ones below.
- `npm test` (full suite) shows the same single pre-existing `goldenFixtures.test.js` failure
  and nothing else red.
- Both bugs verified fixed by direct execution (commands given in Step 6 below), not just by
  the unit tests passing.

**Files:**
- Modify: `server/src/voiceQueryParser.js:29-36` (constants), `:166-185` (`extractSize`)
- Test: `__tests__/voiceQueryParser.sizeSpec.test.js` (existing file — add to it)

**Interfaces:**
- Consumes: nothing new — this task only changes the internals of the existing exported
  `parseVoiceQuery(text)` function's `size` field.
- Produces: `parseVoiceQuery(text).size` now correctly returns `"M"` for `"medium"`-style
  spoken phrasing, and correctly returns `null` (not a false `"S"`) for queries containing
  contractions like `"that's"`/`"it's"`. No signature changes — later tasks (Stage C) rely on
  `parseVoiceQuery` continuing to be a synchronous function returning
  `{ size, colors, specifications, ... }` as it already does today.

- [ ] **Step 1: Write the two failing tests**

Add to the end of `__tests__/voiceQueryParser.sizeSpec.test.js` (inside the existing
`describe` block, after the last `it`):

```js
  it("extracts a spelled-out size word from a natural sentence", () => {
    const intent = parseVoiceQuery("a shirt in medium size");
    expect(intent.size).toBe("M");
  });

  it("does not false-match a size letter inside a contraction", () => {
    const intent = parseVoiceQuery("a shirt that's nice");
    expect(intent.size).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/voiceQueryParser.sizeSpec.test.js -v`

Expected: 2 failures.
- `"extracts a spelled-out size word from a natural sentence"` fails with
  `Expected: "M", Received: null`
- `"does not false-match a size letter inside a contraction"` fails with
  `Expected: null, Received: "S"`

If the failures show different values than this, stop — something else has already changed
this file's behavior; investigate before continuing.

- [ ] **Step 3: Add the size-word synonym table**

In `server/src/voiceQueryParser.js`, immediately after the existing `SIZE_SHOE_NUMBERS`
constant (currently line 36), add:

```js
// Spoken-word -> stored-code canonicalization. Size is the only attribute where the
// catalog's stored value (XS/S/M/L/XL/XXL) is an abbreviation a person wouldn't actually
// say out loud -- colors/materials/specifications don't have this gap because the catalog
// already stores the plain word ("waterproof", "brown") that matches natural speech. If a
// future attribute is ever added with this same code-vs-word mismatch, reuse this pattern
// rather than inventing a new one.
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

- [ ] **Step 4: Rewrite `extractSize()` to use the synonym table and fix the contraction bug**

Replace the existing `extractSize` function (currently lines 166-185):

```js
function extractSize(text) {
  const lower = String(text).toLowerCase();

  // Spoken-word sizes ("medium", "extra large") take priority. Check longer phrases
  // first so "extra large" matches before a bare "large" substring inside it would.
  const sortedSynonyms = Object.keys(SIZE_WORD_SYNONYMS).sort((a, b) => b.length - a.length);
  for (const phrase of sortedSynonyms) {
    if (wordMatch(lower, phrase)) {
      return SIZE_WORD_SYNONYMS[phrase];
    }
  }

  // Explicit "size X" / "size X waist" phrasing takes priority over a bare letter.
  const sizeMatch = lower.match(/\bsize\s+([a-z0-9]+)\b/);
  if (sizeMatch) {
    const raw = sizeMatch[1].toUpperCase();
    if (
      SIZE_LETTER_WORDS.includes(raw.toLowerCase()) ||
      SIZE_WAIST_NUMBERS.includes(sizeMatch[1]) ||
      SIZE_SHOE_NUMBERS.includes(sizeMatch[1])
    ) {
      return raw;
    }
  }

  // Bare letter size as a standalone word (e.g. "trousers XL brown"). Guard against
  // contractions like "that's"/"it's": the apostrophe creates a word boundary that would
  // otherwise let the trailing "s" false-match as size S. The negative lookbehind excludes
  // any match immediately preceded by an apostrophe. This file runs only in Node.js (server
  // + Jest), never on-device, so lookbehind support is not a Hermes/React-Native concern.
  for (const w of ["xxxl", "xxl", "xl", "s", "m", "l", "xs"]) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<!')\\b${escaped}\\b`, "i");
    if (re.test(lower)) return w.toUpperCase();
  }
  return null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/voiceQueryParser.sizeSpec.test.js -v`

Expected: all tests in the file PASS, including the two new ones and the three pre-existing
ones (`"brown trousers size XL"` → `"XL"`, `"blue jeans size 32 waist"` → `"32"`, etc. — these
must still pass unchanged, proving the rewrite didn't regress explicit `"size X"` phrasing).

- [ ] **Step 6: Verify both bugs directly, not just via the unit test**

Run:
```bash
node -e "
const { parseVoiceQuery } = require('./server/src/voiceQueryParser');
console.log(parseVoiceQuery('a shirt in medium size').size);
console.log(parseVoiceQuery(\"a shirt that's nice\").size);
console.log(parseVoiceQuery('brown trousers size XL').size);
console.log(parseVoiceQuery('blue jeans size 32 waist').size);
"
```
Expected output, in order: `M`, `null`, `XL`, `32`.

- [ ] **Step 7: Run the full Jest suite to confirm no regressions**

Run: `npm test`

Expected: only `__tests__/goldenFixtures.test.js`'s pre-existing "defines image fixtures that
point at checked-in photos" test fails (unrelated, tracked separately). Every other suite,
including the two new tests, passes.

- [ ] **Step 8: Commit**

```bash
git add server/src/voiceQueryParser.js __tests__/voiceQueryParser.sizeSpec.test.js
git commit -m "fix: recognize spelled-out sizes and stop contraction false-match in query parser

- extractSize() now recognizes natural spoken size words (small/medium/large/
  extra large) via a new SIZE_WORD_SYNONYMS table, not just letter codes.
- Fixed a false-positive where a contraction like \"that's\" was misread as
  size \"S\" (apostrophe creates a word boundary the bare-letter fallback
  didn't guard against). Confirmed via direct execution, not assumption:
  parseVoiceQuery(\"a shirt in medium size\").size was null, now \"M\";
  parseVoiceQuery(\"a shirt that's nice\").size was \"S\", now null."
```

---

## Stage B: Secure key persistence + default-reasoning UX

**Stage B Entry Criteria (verify before starting Task B1):** Task A1's Exit Criteria are all
met (`npm test` shows only the one known pre-existing failure) and the Task A1 commit exists
on the branch (`git log --oneline -1 -- server/src/voiceQueryParser.js` shows the fix commit).

### Task B1: Add secure on-device key storage module

**Status:** Done (commit `c8fbab9`). No deviations. All 4 tests pass; full suite
176/176 shows only the one known pre-existing `goldenFixtures.test.js` failure.

**Entry Criteria:** Stage B Entry Criteria met (see above).

**Exit Criteria:**
- `react-native-keychain` appears in `package.json` `dependencies`.
- `npx jest __tests__/secureLlmKeyStorage.test.js -v` passes, all cases green.
- `jest.setup.js` contains a `jest.mock("react-native-keychain", ...)` block.

**Files:**
- Modify: `package.json` (add dependency), `jest.setup.js` (add mock)
- Create: `src/utils/secureLlmKeyStorage.js`
- Test: `__tests__/secureLlmKeyStorage.test.js`

**Interfaces:**
- Produces: `getPersistedLlmKey(userId = null): Promise<string>`,
  `setPersistedLlmKey(key, userId = null): Promise<void>`,
  `deletePersistedLlmKey(userId = null): Promise<void>` — all exported from
  `src/utils/secureLlmKeyStorage.js`. `userId` scoping mirrors the existing
  `src/utils/llmSessionStore.js`'s pattern (`getSessionLlmKey(userId)` /
  `setSessionLlmKey(key, userId)`) so switching accounts on one device can't leak another
  user's key. Task B3 consumes these three functions by exact name.

- [ ] **Step 1: Install the dependency**

Run: `npm install react-native-keychain`

Expected: `package.json` `dependencies` now includes `"react-native-keychain"`. (No native
pod/gradle install step is required to run the Jest unit tests in this task — those come at
Task B7's manual on-device verification.)

- [ ] **Step 2: Add the global Jest mock**

In `jest.setup.js`, add this block (placement: anywhere among the other `jest.mock(...)`
calls, e.g. right after the `@react-native-async-storage/async-storage` mock):

```js
jest.mock("react-native-keychain", () => {
  const store = new Map();
  return {
    setGenericPassword: jest.fn((username, password, options) => {
      store.set(options?.service ?? "default", { username, password });
      return Promise.resolve(true);
    }),
    getGenericPassword: jest.fn((options) => {
      const entry = store.get(options?.service ?? "default");
      return Promise.resolve(entry ? { username: entry.username, password: entry.password } : false);
    }),
    resetGenericPassword: jest.fn((options) => {
      store.delete(options?.service ?? "default");
      return Promise.resolve(true);
    }),
  };
});
```

- [ ] **Step 3: Write the failing test**

Create `__tests__/secureLlmKeyStorage.test.js`:

```js
const {
  getPersistedLlmKey,
  setPersistedLlmKey,
  deletePersistedLlmKey,
} = require("../src/utils/secureLlmKeyStorage");

describe("secureLlmKeyStorage", () => {
  it("returns an empty string when no key is stored", async () => {
    const key = await getPersistedLlmKey("user-1");
    expect(key).toBe("");
  });

  it("persists and retrieves a key scoped to a user id", async () => {
    await setPersistedLlmKey("sk-test-key", "user-1");
    const key = await getPersistedLlmKey("user-1");
    expect(key).toBe("sk-test-key");
  });

  it("scopes keys per user id so one user cannot read another's key", async () => {
    await setPersistedLlmKey("sk-user-a-key", "user-a");
    const keyForB = await getPersistedLlmKey("user-b");
    expect(keyForB).toBe("");
  });

  it("deletes a stored key", async () => {
    await setPersistedLlmKey("sk-to-delete", "user-2");
    await deletePersistedLlmKey("user-2");
    const key = await getPersistedLlmKey("user-2");
    expect(key).toBe("");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx jest __tests__/secureLlmKeyStorage.test.js -v`

Expected: FAIL — `Cannot find module '../src/utils/secureLlmKeyStorage'`.

- [ ] **Step 5: Write the implementation**

Create `src/utils/secureLlmKeyStorage.js`:

```js
import * as Keychain from "react-native-keychain";

const SERVICE_PREFIX = "shopease-llm-key";

function serviceFor(userId) {
  return userId ? `${SERVICE_PREFIX}:${userId}` : SERVICE_PREFIX;
}

export async function getPersistedLlmKey(userId = null) {
  try {
    const result = await Keychain.getGenericPassword({ service: serviceFor(userId) });
    return result ? String(result.password || "") : "";
  } catch {
    return "";
  }
}

export async function setPersistedLlmKey(key, userId = null) {
  const trimmed = String(key || "").trim();
  if (!trimmed) {
    return deletePersistedLlmKey(userId);
  }
  try {
    await Keychain.setGenericPassword("llm-api-key", trimmed, { service: serviceFor(userId) });
  } catch {
    // Secure storage unavailable (e.g. device policy) -- degrade to session-only
    // behavior for this session rather than crashing. Caller (llmSearchDefaults.js /
    // VoiceSearchCard.jsx) already keeps the key in llmSessionStore.js regardless.
  }
}

export async function deletePersistedLlmKey(userId = null) {
  try {
    await Keychain.resetGenericPassword({ service: serviceFor(userId) });
  } catch {
    // Nothing stored, or storage unavailable -- either way there's nothing left to do.
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest __tests__/secureLlmKeyStorage.test.js -v`

Expected: all 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json jest.setup.js src/utils/secureLlmKeyStorage.js __tests__/secureLlmKeyStorage.test.js
git commit -m "feat: add secure on-device LLM key storage via react-native-keychain

New src/utils/secureLlmKeyStorage.js wraps react-native-keychain (iOS
Keychain / Android Keystore) with the same userId-scoping pattern already
used by the session-only llmSessionStore.js. This is the persistence layer
Task B3/B4 build the default-reasoning behavior on top of."
```

### Task B2: Extract provider URL/model normalization helpers into the shared config module

**Status:** Done (commit `ba25286`). Pure move, no deviations. Full suite
176/176 shows only the one known pre-existing `goldenFixtures.test.js` failure.

**Entry Criteria:** Task B1 Exit Criteria met.

**Exit Criteria:**
- `src/config/llmProviders.js` exports `normalizeProviderBaseUrl` and
  `normalizeProviderModel`.
- `src/components/VoiceSearchCard.jsx` no longer defines these functions locally — it imports
  them instead.
- `npm test` still shows only the one known pre-existing failure (this task changes no
  behavior, only moves code — a regression here means the move broke something).

**Files:**
- Modify: `src/config/llmProviders.js`, `src/components/VoiceSearchCard.jsx:68-88`

**Interfaces:**
- Produces: `normalizeProviderBaseUrl(provider, rawBaseUrl): string`,
  `normalizeProviderModel(provider, rawModel): string`, both exported from
  `src/config/llmProviders.js`. Task B3's `resolveDefaultLlmOptions()` consumes these two
  functions by exact name and signature.

This is a pure move — no logic changes. Right-sized as its own task because it's a
prerequisite Task B3 depends on, and a reviewer could reasonably approve "the move is clean"
independently of "the new resolver function is correct."

- [ ] **Step 1: Move the two functions**

In `src/config/llmProviders.js`, add at the end of the file (after `resolveProviderBaseUrl`):

```js
function isKnownProviderBaseUrl(url) {
  return LLM_PROVIDERS.some((p) => resolveProviderBaseUrl(p) === url);
}

function isKnownProviderModel(model) {
  return LLM_PROVIDERS.some((p) => p.defaultModel === model);
}

export function normalizeProviderBaseUrl(provider, rawBaseUrl) {
  const targetBase = resolveProviderBaseUrl(provider);
  const current = String(rawBaseUrl || "").trim();
  if (!current) return targetBase;
  // If this is a stale default from another provider, auto-correct.
  if (isKnownProviderBaseUrl(current) && current !== targetBase) {
    return targetBase;
  }
  return current;
}

export function normalizeProviderModel(provider, rawModel) {
  const targetModel = provider.defaultModel;
  const current = String(rawModel || "").trim();
  if (!current) return targetModel;
  // If this is a stale default from another provider, auto-correct.
  if (isKnownProviderModel(current) && current !== targetModel) {
    return targetModel;
  }
  return current;
}
```

- [ ] **Step 2: Remove the local copies from `VoiceSearchCard.jsx` and import instead**

In `src/components/VoiceSearchCard.jsx`, delete lines 68-88 (the local
`isKnownProviderBaseUrl`, `isKnownProviderModel`, `normalizeProviderBaseUrl`,
`normalizeProviderModel` function definitions — everything between the `EXAMPLE_HINTS`
constant and the `const VoiceSearchCard = ({ onResults, disabled = false }) => {` line).

Change the import block (currently lines 40-44):
```js
import {
  LLM_PROVIDERS,
  getProviderById,
  resolveProviderBaseUrl,
} from "../config/llmProviders";
```
to:
```js
import {
  LLM_PROVIDERS,
  getProviderById,
  resolveProviderBaseUrl,
  normalizeProviderBaseUrl,
  normalizeProviderModel,
} from "../config/llmProviders";
```

- [ ] **Step 3: Run the full test suite to confirm nothing broke**

Run: `npm test`

Expected: same single pre-existing `goldenFixtures.test.js` failure, nothing else changed.
(There is no dedicated `VoiceSearchCard.test.jsx` today; the coverage here is the full-suite
regression check plus the manual verification in Task B7.)

- [ ] **Step 4: Commit**

```bash
git add src/config/llmProviders.js src/components/VoiceSearchCard.jsx
git commit -m "refactor: move provider URL/model normalization into llmProviders.js

Pure move, no behavior change -- normalizeProviderBaseUrl/normalizeProviderModel
were local to VoiceSearchCard.jsx; Task B3's shared resolveDefaultLlmOptions()
needs them too, so they belong in the shared config module, not duplicated."
```

### Task B3: Add the shared `resolveDefaultLlmOptions()` helper

**Status:** Done (commit `8c6eab7`). No deviations. All 5 tests pass; full suite
181/181 shows only the one known pre-existing `goldenFixtures.test.js` failure.

**Entry Criteria:** Task B2 Exit Criteria met.

**Exit Criteria:**
- `npx jest __tests__/llmSearchDefaults.test.js -v` passes, all cases green.

**Files:**
- Create: `src/utils/llmSearchDefaults.js`
- Test: `__tests__/llmSearchDefaults.test.js`

**Interfaces:**
- Consumes: `loadLlmPreferences()` from `src/utils/llmSearchPreferences.js` (existing,
  unchanged), `getSessionLlmKey(userId)` / `setSessionLlmKey(key, userId)` from
  `src/utils/llmSessionStore.js` (existing, unchanged), `getPersistedLlmKey(userId)` from
  Task B1's `src/utils/secureLlmKeyStorage.js`, `getProviderById(id)` /
  `normalizeProviderBaseUrl` / `normalizeProviderModel` from Task B2's
  `src/config/llmProviders.js`.
- Produces: `resolveDefaultLlmOptions(userId = null): Promise<{ useLlmReasoning, providerId,
  apiKey, baseUrl, model }>` — the exact shape `searchCatalog()`'s third argument
  (`llmOptions`) already expects (matches `VoiceSearchCard.jsx`'s existing `llmPayload()`
  return shape). Tasks B4 and B5 both call this function by exact name.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/llmSearchDefaults.test.js`:

```js
jest.mock("../src/utils/llmSearchPreferences", () => ({
  loadLlmPreferences: jest.fn(),
}));
jest.mock("../src/utils/llmSessionStore", () => ({
  getSessionLlmKey: jest.fn(),
  setSessionLlmKey: jest.fn(),
}));
jest.mock("../src/utils/secureLlmKeyStorage", () => ({
  getPersistedLlmKey: jest.fn(),
}));

const { loadLlmPreferences } = require("../src/utils/llmSearchPreferences");
const { getSessionLlmKey, setSessionLlmKey } = require("../src/utils/llmSessionStore");
const { getPersistedLlmKey } = require("../src/utils/secureLlmKeyStorage");
const { resolveDefaultLlmOptions } = require("../src/utils/llmSearchDefaults");

describe("resolveDefaultLlmOptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stays off when no key exists anywhere and the provider requires one", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("");
    getPersistedLlmKey.mockResolvedValue("");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(false);
    expect(result.apiKey).toBe("");
  });

  it("turns on automatically when a session key already exists", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("sk-session-key");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(true);
    expect(result.apiKey).toBe("sk-session-key");
    expect(getPersistedLlmKey).not.toHaveBeenCalled();
  });

  it("falls back to secure storage and hydrates the session store when no session key exists", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("");
    getPersistedLlmKey.mockResolvedValue("sk-persisted-key");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(true);
    expect(result.apiKey).toBe("sk-persisted-key");
    expect(setSessionLlmKey).toHaveBeenCalledWith("sk-persisted-key", "user-1");
  });

  it("respects an explicit saved preference of false even when a key exists", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: false,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("sk-session-key");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(false);
  });

  it("allows reasoning for a keyOptional provider (ollama) even with no key", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "ollama",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("");
    getPersistedLlmKey.mockResolvedValue("");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(true);
    expect(result.providerId).toBe("ollama");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/llmSearchDefaults.test.js -v`

Expected: FAIL — `Cannot find module '../src/utils/llmSearchDefaults'`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/llmSearchDefaults.js`:

```js
import { getProviderById, normalizeProviderBaseUrl, normalizeProviderModel } from "../config/llmProviders";
import { loadLlmPreferences } from "./llmSearchPreferences";
import { getSessionLlmKey, setSessionLlmKey } from "./llmSessionStore";
import { getPersistedLlmKey } from "./secureLlmKeyStorage";

/**
 * Resolves the default llmOptions payload for a search call without requiring the
 * caller to have visited VoiceSearchCard first. Checks the fast in-memory session key,
 * falls back to secure on-device storage, and hydrates the session store from it so
 * later calls in the same session skip the secure-storage round trip.
 */
export async function resolveDefaultLlmOptions(userId = null) {
  const prefs = await loadLlmPreferences();
  const provider = getProviderById(prefs.providerId || "groq");

  let apiKey = getSessionLlmKey(userId);
  if (!apiKey) {
    apiKey = await getPersistedLlmKey(userId);
    if (apiKey) {
      setSessionLlmKey(apiKey, userId);
    }
  }

  const hasUsableKey = provider.keyOptional === true || apiKey.length > 0;

  return {
    useLlmReasoning: Boolean(prefs.useLlmReasoning) && hasUsableKey,
    providerId: provider.id,
    apiKey: apiKey.trim(),
    baseUrl: normalizeProviderBaseUrl(provider, prefs.baseUrl),
    model: normalizeProviderModel(provider, prefs.model),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/llmSearchDefaults.test.js -v`

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/llmSearchDefaults.js __tests__/llmSearchDefaults.test.js
git commit -m "feat: add resolveDefaultLlmOptions() shared resolver

Single source of truth for 'should this search use LLM reasoning, and with
which key' -- checks session key, falls back to secure storage, respects an
explicit saved preference of false. Task B4 wires this into VoiceSearchCard,
Task B5 wires it into the plain product-search box."
```

### Task B4: Wire `VoiceSearchCard.jsx` to persist keys and hydrate from secure storage

**Status:** Done (commit `d0a2f23`). No deviations. Full suite 181/181 shows only
the one known pre-existing `goldenFixtures.test.js` failure.

**Entry Criteria:** Task B3 Exit Criteria met.

**Exit Criteria:**
- `npm test` still shows only the one known pre-existing failure.
- Manual smoke check (Task B7 covers full device verification; this task's own check is
  narrower): reading the diff shows `setPersistedLlmKey` called wherever `setSessionLlmKey`
  is currently called with a user-provided key, and the mount effect calling
  `resolveDefaultLlmOptions` as a fallback.

**Files:**
- Modify: `src/components/VoiceSearchCard.jsx:36-38` (import), `:117-140` (mount effect),
  `:184` (key save point)

**Interfaces:**
- Consumes: `resolveDefaultLlmOptions` (Task B3), `setPersistedLlmKey` (Task B1).
- Produces: no new exports — this task only changes `VoiceSearchCard.jsx`'s internal
  behavior. Its public props (`onResults`, `disabled`) are unchanged.

- [ ] **Step 1: Update the import block**

In `src/components/VoiceSearchCard.jsx`, change (currently lines 35-38):
```js
import {
  getSessionLlmKey,
  setSessionLlmKey,
  clearSessionLlmKey,
} from "../utils/llmSessionStore";
```
to add two new imports right after it:
```js
import {
  getSessionLlmKey,
  setSessionLlmKey,
  clearSessionLlmKey,
} from "../utils/llmSessionStore";
import { setPersistedLlmKey } from "../utils/secureLlmKeyStorage";
import { resolveDefaultLlmOptions } from "../utils/llmSearchDefaults";
```

- [ ] **Step 2: Hydrate from secure storage on mount**

Replace the mount effect (currently lines 117-136):
```js
  useEffect(() => {
    let mounted = true;
    (async () => {
      await ensureLlmPreferencesMigrated();
      const prefs = await loadLlmPreferences();
      if (!mounted) return;
      const provider = getProviderById(prefs.providerId || "groq");
      const normalizedBase = normalizeProviderBaseUrl(provider, prefs.baseUrl);
      const normalizedModel = normalizeProviderModel(provider, prefs.model);
      setUseLlmReasoning(prefs.useLlmReasoning);
      setProviderId(provider.id);
      setBaseUrl(normalizedBase);
      setModel(normalizedModel);
      setApiKey(getSessionLlmKey(userId));
      await fetchVoiceSearchConfig().catch(() => null);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);
```
with:
```js
  useEffect(() => {
    let mounted = true;
    (async () => {
      await ensureLlmPreferencesMigrated();
      const prefs = await loadLlmPreferences();
      if (!mounted) return;
      const provider = getProviderById(prefs.providerId || "groq");
      const normalizedBase = normalizeProviderBaseUrl(provider, prefs.baseUrl);
      const normalizedModel = normalizeProviderModel(provider, prefs.model);
      setProviderId(provider.id);
      setBaseUrl(normalizedBase);
      setModel(normalizedModel);
      // resolveDefaultLlmOptions checks the session key first, falls back to secure
      // storage, and hydrates the session store -- so this single call covers both
      // "already used this session" and "app was just restarted" cases.
      const defaults = await resolveDefaultLlmOptions(userId);
      if (!mounted) return;
      setUseLlmReasoning(defaults.useLlmReasoning || prefs.useLlmReasoning);
      setApiKey(defaults.apiKey || getSessionLlmKey(userId));
      await fetchVoiceSearchConfig().catch(() => null);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);
```

- [ ] **Step 3: Persist the key wherever it's saved to the session store**

In the `runSearch` callback, change (currently line 184):
```js
        setSessionLlmKey(apiKey, userId);
```
to:
```js
        setSessionLlmKey(apiKey, userId);
        await setPersistedLlmKey(apiKey, userId);
```

Also, in the `onSaveApiKey`/direct-input handler if one exists separately from `runSearch`
(check around line 325, `setSessionLlmKey(value, userId);`) — apply the same change there:
```js
        setSessionLlmKey(value, userId);
        setPersistedLlmKey(value, userId);
```
(This second call site is fire-and-forget/not awaited since it's inside a synchronous
event handler, not the async `runSearch` — matches the existing code style at that call
site, which does not await either.)

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: same single pre-existing `goldenFixtures.test.js` failure, nothing else changed.

- [ ] **Step 5: Commit**

```bash
git add src/components/VoiceSearchCard.jsx
git commit -m "feat: persist VoiceSearchCard's LLM key to secure storage, hydrate on mount

Keys saved via the Voice card now survive app restarts (Keychain/Keystore),
not just the current session. Mount effect uses the shared
resolveDefaultLlmOptions() so this component and the plain search box
(Task B5) resolve identically."
```

### Task B5: Wire `ProductListScreen.jsx`'s search box to use LLM reasoning by default

**Status:** Done (commit `22fd153`). One deviation: the new `state.auth.user`
selector broke 2 pre-existing tests (`ProductListScreen.searchState.test.js`,
`ProductListScreen.discoveryControls.test.js`) whose react-redux mocks only
stubbed `state.cart`. Fixed by adding `auth: { user: null }` to both mocks.
Full suite 181/181 shows only the one known pre-existing
`goldenFixtures.test.js` failure.

**Entry Criteria:** Task B4 Exit Criteria met.

**Exit Criteria:**
- `npm test` still shows only the one known pre-existing failure.
- Reading the diff shows `runSmartSearch()` calling `resolveDefaultLlmOptions(userId)` and
  passing the result as `searchCatalog()`'s third argument.

**Files:**
- Modify: `src/screens/ProductListScreen.jsx:1-35` (imports), `:106-152` (`runSmartSearch`)

**Interfaces:**
- Consumes: `resolveDefaultLlmOptions` (Task B3).
- Produces: no new exports.

- [ ] **Step 1: Add the imports**

In `src/screens/ProductListScreen.jsx`, add to the import block (after the existing
`searchCatalog, matchIdsFromProducts` import, currently around line 24-27):
```js
import { resolveDefaultLlmOptions } from "../utils/llmSearchDefaults";
```

- [ ] **Step 2: Get the current user's id**

In the component body, right after `const { products, isLoading, error, isOfflineFallback, refetch, catalogTotal } = useCatalogProducts();` (currently line 38-39), add:
```js
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id ?? user?.email ?? null;
```
(`useSelector` is already imported at the top of this file — no new import needed for this
line.)

- [ ] **Step 3: Use the resolved LLM options in `runSmartSearch`**

Change (currently line 118):
```js
        const result = await searchCatalog(q, products);
```
to:
```js
        const llmOptions = await resolveDefaultLlmOptions(userId);
        const result = await searchCatalog(q, products, llmOptions);
```

Also add `userId` to `runSmartSearch`'s `useCallback` dependency array (currently
`[searchQuery, products, clearSmartSearch]`, becomes
`[searchQuery, products, clearSmartSearch, userId]`).

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: same single pre-existing `goldenFixtures.test.js` failure, nothing else changed.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProductListScreen.jsx
git commit -m "feat: main search box uses LLM reasoning automatically when a key exists

runSmartSearch() now resolves llmOptions via the shared
resolveDefaultLlmOptions() before calling searchCatalog(), matching
VoiceSearchCard's behavior. Previously this screen's search box always
passed useLlmReasoning: false regardless of any key the user had configured
elsewhere in the app."
```

### Task B6: Add the first-run "add a key" invite banner

**Status:** Done (commit `f29ce5b`). No deviations; all token/route-name claims
verified against the actual codebase before writing. Full suite 181/181 shows
only the one known pre-existing `goldenFixtures.test.js` failure.

**Entry Criteria:** Task B5 Exit Criteria met.

**Exit Criteria:**
- `npm test` still shows only the one known pre-existing failure.
- New component file exists and is rendered conditionally in `ProductListScreen.jsx`.

**Files:**
- Create: `src/components/LlmSearchInviteBanner.jsx`
- Modify: `src/screens/ProductListScreen.jsx`

**Interfaces:**
- Produces: `LlmSearchInviteBanner` component, props `{ onPressSetup: () => void }`. No
  other task depends on this component's internals.

- [ ] **Step 1: Create the banner component**

Create `src/components/LlmSearchInviteBanner.jsx`:

```jsx
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, radius, spacing, typography } from "../theme/tokens";

const DISMISSED_KEY = "@shopease/llm-invite-banner-dismissed";

const LlmSearchInviteBanner = ({ onPressSetup }) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(DISMISSED_KEY).then((value) => {
      if (mounted) setDismissed(value === "true");
    });
    return () => {
      mounted = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, "true");
  }, []);

  if (dismissed) return null;

  return (
    <View style={styles.banner} testID="llm-invite-banner">
      <Text style={styles.text}>
        Add your API key for smarter search that understands full sentences.
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          testID="llm-invite-banner-setup"
          onPress={() => {
            dismiss();
            onPressSetup?.();
          }}
        >
          <Text style={styles.setupLink}>Set up</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="llm-invite-banner-dismiss" onPress={dismiss}>
          <Text style={styles.dismissLink}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  text: {
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
  },
  setupLink: {
    color: colors.accent,
    fontWeight: "600",
  },
  dismissLink: {
    color: colors.textMuted,
  },
});

export default LlmSearchInviteBanner;
```

Token values confirmed directly against `src/theme/tokens.js`: `colors.surfaceMuted`,
`colors.text`, `colors.accent`, `colors.textMuted`, `spacing.{xs,sm,md}`, and `radius.md` all
exist exactly as named above — no `colors.primary` or `typography.body` exist in this
codebase (typography only exports `displayFamily`/`eyebrowSpacing`; body text styling is done
via inline `fontSize` per component, matching this component's `text` style above).

- [ ] **Step 2: Render it conditionally in `ProductListScreen.jsx`**

Add the import:
```js
import LlmSearchInviteBanner from "../components/LlmSearchInviteBanner";
```

Add state to track whether a key exists (near the other `useState` calls, after the `userId`
line added in Task B5):
```js
  const [hasLlmKey, setHasLlmKey] = useState(false);

  useEffect(() => {
    let mounted = true;
    resolveDefaultLlmOptions(userId).then((opts) => {
      if (mounted) setHasLlmKey(Boolean(opts.apiKey));
    });
    return () => {
      mounted = false;
    };
  }, [userId]);
```

Render the banner just above the search input in the JSX (find the existing search-input
`TextInput` around line 380-390 and add immediately before its containing view):
```jsx
{!hasLlmKey && (
  <LlmSearchInviteBanner onPressSetup={() => navigation.navigate("Home")} />
)}
```
(`navigation` is already a prop on `ProductListScreen` per its signature
`({ navigation }) =>`. `"Home"` is confirmed as the exact registered route name in
`src/navigation/BottomTabNavigator.jsx:109` — `<Tab.Screen name="Home" component={HomeScreen} ... />`
— where `VoiceSearchCard` is rendered.)

- [ ] **Step 3: Run the full test suite**

Run: `npm test`

Expected: same single pre-existing `goldenFixtures.test.js` failure, nothing else changed.

- [ ] **Step 4: Commit**

```bash
git add src/components/LlmSearchInviteBanner.jsx src/screens/ProductListScreen.jsx
git commit -m "feat: add one-time invite banner for LLM search setup

Shown on ProductListScreen when no key is configured yet; dismissible
forever via AsyncStorage flag (not the key itself -- this is just a UI
preference, no Keychain/Keystore needed). Search is never blocked by its
presence or absence."
```

### Task B7: Stage B regression gate — manual on-device verification

**Status:** Done — verified on both iOS Simulator and Android emulator.

Deviation notes from live iOS Simulator verification (iPhone 17 Pro Max, iOS 26.2):
- Confirmed key persistence survives force-close/reopen via Keychain (per-user service
  `shopease-llm-key:<userId>`), and confirmed via the `voice-api-key-clear` testID (added
  this task) rather than literal-text assertion, since `secureTextEntry` masks the field's
  accessible text from Maestro/XCUITest on iOS.
- Found and fixed a real bug during this verification: the LLM invite banner never hid
  itself after a key was confirmed present, because `ProductListScreen.jsx`'s `listHeader`
  `useMemo` was missing `hasLlmKey` from its dependency array (stale closure). Fixed in
  commit `0be184d`.
- Found and fixed two supporting infra bugs also in commit `0be184d`: missing `pod install`
  for `react-native-keychain`, and `.maestro/ios/login.yaml`'s "Save password"/"Not now"
  dialog matcher never matching iOS's actual "Save Password?"/"Not Now" text.

Deviation notes from live Android emulator verification (Pixel 7 Pro, `-gpu swiftshader_indirect`):
- Once the emulator's GPU backend was stabilized, the full B7 flow (paste key → force-close
  → reopen → confirm key persisted via `voice-api-key-clear` → confirm invite banner hidden
  on Products screen) passed end-to-end with no code changes needed — the `hasLlmKey`
  stale-closure fix from the iOS pass applies identically on Android since it's shared JS.
  This confirms Android Keychain persistence (react-native-keychain's Android Keystore
  backend) already worked correctly; it was never actually broken.
- The earlier-session "Android is unreliable" conclusion was two separate, now-resolved
  causes: (1) the emulator's GPU backend needed `-gpu swiftshader_indirect`, and (2) my own
  ad-hoc verification script had a mistap bug — `voice-api-key-input` was only barely
  scrolled into view (right at the bottom edge under the tab bar), so Maestro's computed tap
  point landed on the Cart tab icon instead of the text field, silently switching tabs mid-flow
  and making it look like persistence failed. Fixed in my scratch script with an explicit
  extra `scroll` step after `scrollUntilVisible` before tapping. This was not a bug in any
  committed file (`.maestro/android/login.yaml` and friends were not touched), just in a
  throwaway verification flow — but worth remembering for Stage C's Android rewrite, since
  the same near-tab-bar mistap risk applies to any field scrolled to the bottom of a long form.
- `npm test` full suite: 180/181 passing (only the known pre-existing `goldenFixtures.test.js`
  failure), confirmed after the `ProductListScreen.jsx` fix.

**Entry Criteria:** Tasks B1-B6 all committed.

**Exit Criteria (all must be observed directly, not assumed):**
- On a fresh Android emulator install: paste a key into the Voice card, force-close and
  reopen the app, confirm the key is still present without re-pasting, and confirm the plain
  "Search products" box now returns LLM-quality results for a natural-language query without
  touching the toggle.
- Same sequence repeated on a fresh iOS Simulator install.
- With no key configured (fresh install, skip the banner), confirm the plain search box still
  returns results via the rule-based parser (search is never blocked).
- The invite banner appears once on first launch with no key, and does not reappear after
  being dismissed.
- `npm test` (full suite) still shows only the one known pre-existing failure.

**Files:** None (verification only).

- [ ] **Step 1: Android verification**

```bash
npm run android
```
Log in, open the Home screen's Voice/AI card, paste a test key (a real key if available and
you are running this yourself — not the implementing agent, per the Global Constraints
credential rule — or any non-empty string to verify the persistence mechanics if not testing
a real LLM call), force-close the app via the emulator's recent-apps switcher, reopen it, and
confirm the key field is pre-filled without needing to paste again. Then go to the product
list's plain search box and type a natural-language multi-attribute query; confirm the
results reflect LLM-quality understanding (or, at minimum, confirm `useLlmReasoning: true`
was sent by checking the server log for that request).

- [ ] **Step 2: iOS verification**

```bash
npm run ios
```
Repeat the same sequence as Step 1 on the iOS Simulator.

- [ ] **Step 3: No-key path verification**

On a fresh install (or after calling `deletePersistedLlmKey()` for the test user), confirm
the plain search box still returns results (rule-based fallback), the invite banner appears,
and dismissing it (tap "Not now") means it does not reappear on the next app launch.

- [ ] **Step 4: Final full regression check**

Run: `npm test`

Expected: same single pre-existing `goldenFixtures.test.js` failure, nothing else changed.

- [ ] **Step 5: Update this plan's status**

Mark Tasks B1-B7 as `Status: Done` in this file and commit:
```bash
git add docs/superpowers/plans/2026-07-10-default-llm-search-and-multiparam-e2e.md
git commit -m "docs: mark Stage B complete in the implementation plan"
```

---

## Stage C: `ml-multiparameter-search.yaml` rewrite (Android, then iOS)

**Stage C Entry Criteria (verify before starting Task C1):** Task B7's Exit Criteria are all
met and committed.

### Task C1: Build the multi-parameter fixture generator

**Status:** Done (commits `41a56db` + `473fad9`). Deviations: (1) the plan's own
SAMPLE_PRODUCTS test fixture only had 3 products, but the test asserts 5 positive
fixtures -- expanded to 5 sample products across distinct categories so the test
actually exercises the "5 positive, diverse categories" behavior. (2) `sentenceFor()`
was extended beyond the plan's literal code to avoid two real query-quality bugs found
during Step 6 manual verification: a title's trailing color word (e.g. "...Space Grey")
or a stopword (e.g. "...Red And Black" -> "and") getting picked as the sentence's "type"
word, and bare numeric sizes ("6") not being recognized by extractSize() without an
explicit "size" prefix. (3) Major deviation, user-approved: discovered the no-match
fixture was fundamentally untestable against the live search backend -- the existing
relative-only threshold (topScore * 0.55) mathematically guarantees the top result
always survives, so no text query could ever produce a genuine empty-result state.
User confirmed real e-commerce precedent (Amazon/Flipkart use an absolute floor, not
relative) and approved fixing server/src/naturalSearch.js with an ABSOLUTE_MIN_SCORE
floor (0.65, chosen from the empirical gap between 5 nonsense queries at 0.62-0.64 and
5 real matches at 0.70-0.82). All 6 fixtures (5 positive + 1 no-match) verified against
the live running server after the fix; full test suite 183/183 (only the known
pre-existing `goldenFixtures` failure remains, +1 net new passing test vs. Stage B's
181/181 baseline).

**Entry Criteria:** Stage C Entry Criteria met.

**Exit Criteria:**
- `node --test scripts/__tests__/multiparam-fixture-builder.test.mjs` passes.
- Running `node scripts/generate-multiparam-fixtures.mjs` produces
  `scripts/fixtures/golden-multiparam-queries.json` with exactly 6 entries (5 positive + 1
  no-match), each positive entry's `expectedProductTitle` corresponding to a real product
  currently in `server/catalog-static.json`.

**Files:**
- Create: `scripts/lib/multiparam-fixture-builder.mjs`
- Create: `scripts/generate-multiparam-fixtures.mjs`
- Create: `scripts/fixtures/golden-multiparam-queries.json` (generated output, committed like
  `golden-image-fixtures.json` and `golden-text-queries.json` already are)
- Test: `scripts/__tests__/multiparam-fixture-builder.test.mjs`

**Interfaces:**
- Produces: `buildFixtures(products): Array<{id, query, expectedProductTitle, attributesUsed}>`
  exported from `scripts/lib/multiparam-fixture-builder.mjs` (pure function, no I/O — testable
  without touching the filesystem). Tasks C2/C3/C5/C6 consume the JSON file this task
  generates, reading fields `query` and `expectedProductTitle` by exact name (mirrors
  `test-assets/image-search-samples/manifest.json`'s `productTitle` field naming precedent,
  adapted to this fixture's own shape).

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/multiparam-fixture-builder.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildFixtures } from "../lib/multiparam-fixture-builder.mjs";

const SAMPLE_PRODUCTS = [
  {
    id: "p1",
    title: "Man Plaid Shirt",
    category: "mens-clothing",
    department: "fashion",
    price: 34.99,
    colors: ["red", "black", "white"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    materials: ["cotton", "wool"],
    specifications: {},
  },
  {
    id: "p2",
    title: "Essence Mascara Lash Princess",
    category: "beauty-fragrances",
    department: "beauty",
    price: 9.99,
    colors: ["black"],
    sizes: [],
    materials: [],
    specifications: { waterproof: true },
  },
  {
    id: "p3",
    title: "Nike Air Jordan 1 Red And Black",
    category: "footwear",
    department: "fashion",
    price: 120,
    colors: ["red", "black"],
    sizes: ["8", "9", "10"],
    materials: ["leather"],
    specifications: {},
  },
];

test("buildFixtures returns exactly 5 positive fixtures + 1 no-match fixture", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  const positive = fixtures.filter((f) => f.expectedProductTitle !== null);
  const noMatch = fixtures.filter((f) => f.expectedProductTitle === null);
  assert.equal(fixtures.length, 6);
  assert.equal(positive.length, 5);
  assert.equal(noMatch.length, 1);
});

test("every positive fixture's expectedProductTitle matches a real input product", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  const titles = new Set(SAMPLE_PRODUCTS.map((p) => p.title));
  for (const f of fixtures) {
    if (f.expectedProductTitle !== null) {
      assert.ok(titles.has(f.expectedProductTitle), `"${f.expectedProductTitle}" not in input products`);
    }
  }
});

test("every fixture has a natural-language query, not a keyword list", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  for (const f of fixtures) {
    assert.equal(typeof f.query, "string");
    assert.ok(f.query.length > 10);
    // A real sentence has at least one lowercase filler word a keyword-list query wouldn't.
    assert.ok(/\b(a|for|in|with|that|looking)\b/i.test(f.query), `"${f.query}" doesn't read like a sentence`);
  }
});

test("the no-match fixture's query does not match any real product", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  const noMatch = fixtures.find((f) => f.expectedProductTitle === null);
  assert.ok(noMatch);
  assert.equal(typeof noMatch.query, "string");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/__tests__/multiparam-fixture-builder.test.mjs`

Expected: FAIL — cannot find module `../lib/multiparam-fixture-builder.mjs`.

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/multiparam-fixture-builder.mjs`:

```js
/**
 * Derives natural-language multi-parameter search fixtures from real catalog products,
 * instead of hand-invented query strings that may not match anything (see the diagnostic
 * finding: 4 of the original file's 5 queries matched zero real products).
 */

function hasAttrs(product, count) {
  let n = 0;
  if (product.colors?.length) n++;
  if (product.sizes?.length) n++;
  if (product.materials?.length) n++;
  if (Object.keys(product.specifications || {}).length) n++;
  return n >= count;
}

function sentenceFor(product) {
  const color = product.colors?.[0];
  const size = product.sizes?.[0];
  const material = product.materials?.[0];
  const specKeys = Object.keys(product.specifications || {}).filter(
    (k) => product.specifications[k] === true
  );
  const spec = specKeys[0];
  const typeWord = product.title.split(" ").slice(-1)[0].toLowerCase();

  const parts = ["I'm looking for a"];
  if (size) parts.push(`${sizeWord(size)}`);
  if (color) parts.push(color);
  if (material) parts.push(material);
  parts.push(typeWord);
  if (spec) parts.push(`that's ${spec}`);
  if (Number.isFinite(product.price)) parts.push(`under ${Math.ceil(product.price + 5)} dollars`);
  return parts.join(" ");
}

function sizeWord(code) {
  const map = { XS: "extra small", S: "small", M: "medium", L: "large", XL: "extra large", XXL: "double extra large" };
  return map[code] || code;
}

export function buildFixtures(products) {
  const candidates = products.filter((p) => hasAttrs(p, 2));
  // Prefer distinct departments/categories for breadth, then distinct attribute
  // combinations (color+size, price+spec, etc.) among the remainder.
  const seenCategories = new Set();
  const picked = [];
  for (const p of candidates) {
    if (picked.length >= 5) break;
    if (seenCategories.has(p.category)) continue;
    seenCategories.add(p.category);
    picked.push(p);
  }
  for (const p of candidates) {
    if (picked.length >= 5) break;
    if (picked.includes(p)) continue;
    picked.push(p);
  }

  const positive = picked.slice(0, 5).map((p, i) => ({
    id: `multiparam-${i + 1}`,
    query: sentenceFor(p),
    expectedProductTitle: p.title,
    attributesUsed: {
      color: p.colors?.[0] ?? null,
      size: p.sizes?.[0] ?? null,
      material: p.materials?.[0] ?? null,
    },
  }));

  const noMatch = {
    id: "multiparam-no-match",
    query: "I need a fluorescent pink size 47 titanium umbrella for my pet dinosaur",
    expectedProductTitle: null,
    attributesUsed: {},
  };

  return [...positive, noMatch];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/__tests__/multiparam-fixture-builder.test.mjs`

Expected: all 4 tests PASS.

- [ ] **Step 5: Write the CLI wrapper and generate the fixture file**

Create `scripts/generate-multiparam-fixtures.mjs`:

```js
#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFixtures } from "./lib/multiparam-fixture-builder.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const catalog = JSON.parse(
  await import("node:fs").then((fs) => fs.readFileSync(join(ROOT, "server", "catalog-static.json"), "utf8"))
);
const products = catalog.products;

const fixtures = buildFixtures(products);
const outDir = join(ROOT, "scripts", "fixtures");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "golden-multiparam-queries.json");
writeFileSync(outPath, JSON.stringify(fixtures, null, 2) + "\n");

console.log(`Wrote ${fixtures.length} fixtures to ${outPath}`);
fixtures.forEach((f) => console.log(`  ${f.id}: "${f.query}" -> ${f.expectedProductTitle ?? "(no match expected)"}`));
```

Run: `node scripts/generate-multiparam-fixtures.mjs`

Expected: prints 6 fixture lines, writes `scripts/fixtures/golden-multiparam-queries.json`.

- [ ] **Step 6: Manually verify the generated queries against the live parser**

For each of the 5 positive fixtures, run (substituting the actual generated query text):
```bash
node -e "
const { parseVoiceQuery } = require('./server/src/voiceQueryParser');
console.log(JSON.stringify(parseVoiceQuery('<paste generated query here>'), null, 2));
"
```
Confirm the extracted `size`/`colors`-via-`keywords`/`specifications` line up with that
fixture's `attributesUsed`. If any don't (e.g. the generated sentence structure trips a parser
edge case), adjust `sentenceFor()` in Step 3 and regenerate — do not proceed to Task C2 with a
fixture file that doesn't actually parse correctly, since Task C2's E2E assertions will be
unfalsifiable if the query itself is malformed.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/multiparam-fixture-builder.mjs scripts/generate-multiparam-fixtures.mjs scripts/fixtures/golden-multiparam-queries.json scripts/__tests__/multiparam-fixture-builder.test.mjs
git commit -m "feat: generate multi-parameter search fixtures from the real catalog

Derives 5 natural-language positive queries + 1 no-match query from
server/catalog-static.json, instead of hand-invented strings -- the
original ml-multiparameter-search.yaml's 5 queries were checked and 4 of 5
matched zero real products (numeric jean waist sizes, bluetooth/wireless
spec keys, and brown trousers that don't exist in the current 196-product
catalog)."
```

### Task C2: Android `ml-multiparameter-search.yaml` (rule-based search box)

**Status:** Done

**Deviations / findings during verification:**
- **Major, session-wide:** `config/app-target.json` was `"mode": "cloud"`, silently
  routing the emulator app at the old Railway production backend (258-product dynamic
  catalog, predates the static-catalog migration) instead of `localhost:5001`. Every
  "live verified" claim earlier in Stage C (and arguably Stage 0/A/B) that depended on
  server-side behavior was not actually exercising the code under test — only
  client-side JS fixes were validly verified, since those ship in the bundle
  regardless of backend. Root-caused by adding temporary request logging to the local
  server and confirming zero requests arrived during a live device search. Fixed by
  switching to `"mode": "local"`; full re-verification below is against the corrected
  target. See `feedback_verify_backend_target_before_testing` memory for the standing
  guideline this produced.
- Found and fixed (via TDD) two more real, previously-hidden bugs surfaced once the
  app was actually talking to the local server: (1) `FeaturedProductsStrip.jsx`'s
  pre-login "Trending now" carousel rendered blank images because it read raw
  server-relative paths from the bundled `catalog-fallback.json` snapshot without
  resolving them to absolute URLs; (2) `catalogSearchService.js` silently overrode a
  confident `resultStatus: "no_matches"` server response (the Task C1 absolute-floor
  fix) with a broad client-side keyword fallback, turning a correct empty result into
  23 bogus matches for the no-match fixture.
- Also fixed a reproducible Android E2E flow bug (not a product bug): the login
  screen's ScrollView stops responding to scroll/swipe gestures entirely while the
  soft keyboard is showing (confirmed with both Maestro and raw ADB swipes). Fixed
  `login.yaml` to dismiss the keyboard (`pressKey: back`) after typing the email,
  before locating the password field, instead of trying to scroll past a frozen
  ScrollView.
- Replaced `tapOn: text: "Search products"` / `"e.g. below 45"` (plan's literal
  template — never actually found/focused the field) with `tapOn: id:
  "product-search-input"`, and added `centerElement: true` to the pre-assertion
  `scrollUntilVisible` step to fix a near-tab-bar mistap.
- All 5 positive fixtures + the 1 no-match fixture from
  `scripts/fixtures/golden-multiparam-queries.json` verified live end-to-end against
  the corrected local backend.

**Entry Criteria:** Task C1 Exit Criteria met. Android emulator running with the dev server
started fresh (`npm run start:baseline` in `server/`, confirm it serves the current product
count before testing — a stale server was the very first bug found in this project's Phase 6
work).

**Exit Criteria:**
- Running the flow against a booted Android emulator, once per positive fixture (5 runs) plus
  the no-match fixture (1 run), all exit 0.
- Each positive run's Maestro output shows the `assertVisible: text: <expectedProductTitle>`
  step as `COMPLETED`, not skipped/optional.

**Files:**
- Create: `.maestro/android/ml-multiparameter-search.yaml`

**Interfaces:**
- Consumes: `scripts/fixtures/golden-multiparam-queries.json` (Task C1) via `--env QUERY=...
  --env EXPECTED_PRODUCT_TITLE=...` (the flow itself takes these as env vars; a wrapper script
  or manual loop supplies one fixture's values per invocation, mirroring how
  `photo-search.yaml` is invoked once per sample rather than looping internally).

- [ ] **Step 1: Write the flow**

Create `.maestro/android/ml-multiparameter-search.yaml`:

```yaml
appId: com.ecommerceappfullstack
---
# Multi-parameter search via the plain "Search products" box on the product list
# screen -- exercises the rule-based parser (server/src/voiceQueryParser.js), NOT the
# LLM-reasoning path (see ml-multiparameter-search-llm.yaml for that).
#
# Requires env: QUERY - a natural-language query from
# scripts/fixtures/golden-multiparam-queries.json, EXPECTED_PRODUCT_TITLE - that same
# fixture's expectedProductTitle (empty/unset for the no-match fixture).
- tapOn:
    id: "tab-products"

- extendedWaitUntil:
    visible:
      id: "tab-products"
    timeout: 8000

- tapOn:
    text: "Search products"
    optional: true

- tapOn:
    text: "e.g. below 45"
    optional: true

- inputText: "${QUERY}"

- pressKey: Enter

- extendedWaitUntil:
    visible:
      text: "${EXPECTED_PRODUCT_TITLE}"
    timeout: 15000

- assertVisible:
    text: "${EXPECTED_PRODUCT_TITLE}"

- tapOn:
    text: "${EXPECTED_PRODUCT_TITLE}"

- extendedWaitUntil:
    visible:
      id: "pdp-add-to-cart"
    timeout: 10000
```

- [ ] **Step 2: Write a companion no-match flow variant**

Create `.maestro/android/ml-multiparameter-search-no-match.yaml`:

```yaml
appId: com.ecommerceappfullstack
---
# Companion to ml-multiparameter-search.yaml for the deliberate no-match fixture --
# verifies a graceful empty state, not a crash or irrelevant results.
#
# Requires env: QUERY - the no-match fixture's query text.
- tapOn:
    id: "tab-products"

- extendedWaitUntil:
    visible:
      id: "tab-products"
    timeout: 8000

- tapOn:
    text: "Search products"
    optional: true

- tapOn:
    text: "e.g. below 45"
    optional: true

- inputText: "${QUERY}"

- pressKey: Enter

- extendedWaitUntil:
    visible:
      text: "No close intent match yet"
    timeout: 15000

- assertVisible:
    text: "No close intent match yet"
```

(`"No close intent match yet"` is the exact banner title `ProductListScreen.jsx`'s
`runSmartSearch` sets today — currently line 138-140 — when `matches.length` is 0.)

- [ ] **Step 3: Run once per positive fixture**

For each of the 5 positive fixtures in `scripts/fixtures/golden-multiparam-queries.json`,
create a temporary flow that runs login then this flow (mirroring how
`_tmp-verify-photo-search.yaml` was used earlier in this project — a throwaway file with
`runFlow: login.yaml` + `runFlow: ml-multiparameter-search.yaml`, deleted before the final
commit), and run:

```bash
~/.maestro/bin/maestro test .maestro/android/_tmp-verify-multiparam.yaml \
  --env QUERY="<fixture query>" \
  --env EXPECTED_PRODUCT_TITLE="<fixture expectedProductTitle>"
```

Expected: exit 0, `assertVisible: text: "<title>"` shown as `COMPLETED`. Repeat for all 5.

- [ ] **Step 4: Run the no-match fixture**

```bash
~/.maestro/bin/maestro test .maestro/android/_tmp-verify-multiparam-no-match.yaml \
  --env QUERY="<no-match fixture query>"
```

Expected: exit 0.

- [ ] **Step 5: Delete the temporary verification files, commit the real ones**

```bash
rm .maestro/android/_tmp-verify-multiparam.yaml .maestro/android/_tmp-verify-multiparam-no-match.yaml
git add .maestro/android/ml-multiparameter-search.yaml .maestro/android/ml-multiparameter-search-no-match.yaml
git commit -m "feat: Android multi-parameter search E2E (rule-based search box)

Types catalog-derived natural-language queries into the plain 'Search
products' box and asserts the exact expected product title + PDP
tap-through, mirroring photo-search.yaml's proven pattern. Validated
against all 5 positive fixtures + the 1 no-match fixture from
scripts/fixtures/golden-multiparam-queries.json."
```

### Task C3: Android `ml-multiparameter-search-llm.yaml` (LLM-reasoning path via Ollama)

**Status:** Done

**Deviation notes:**
- The plan's sketched flow (`voice-search-card` → `llm-reasoning-switch` → `voice-provider-ollama`
  → `voice-search-button`) needed real changes once run against the live app:
  - Scroll directly to `llm-reasoning-switch` itself (not the outer `voice-search-card`) with
    `centerElement: true`, or the switch isn't reliably in view.
  - The AI-provider row is its own horizontal `ScrollView` nested inside the vertically-scrolling
    page. React Native only mounts children that have been scrolled into view at least once, so
    `voice-provider-ollama` does not exist in the native tree at all until the row is scrolled
    right — tapping it directly (as the plan sketched) fails with "element not found" on a fresh
    load. Fixed by: `scrollUntilVisible` on the still-visible `voice-provider-groq` chip with
    `centerElement: true` (empirically centers the row at ~39% of screen height, not 50%), then a
    raw percentage `swipe` from `(90%, 39%)` to `(5%, 39%)`. Maestro's `scrollUntilVisible:
    direction: RIGHT` and the element-anchored `swipe: element:/direction:` syntax were both tried
    first and both failed silently (confirmed via `maestro hierarchy` dumps) — only a
    manually-calibrated raw-coordinate swipe worked.
  - Final assertion uses `scrollUntilVisible` (45s timeout) instead of the plan's
    `extendedWaitUntil`, since the LLM-reasoning path can rank the expected product slightly
    differently than the rule-based path (near-tied semantic scores), so it isn't always in the
    initial viewport.
- Found and fixed two real, previously-hidden bugs while building/running this flow (both
  pre-existing, unrelated to the plan's diff, each fixed via TDD, each committed separately):
  1. `src/config/llmProviders.js` sent an Android-emulator-specific `10.0.2.2` base URL for the
     Ollama provider. Wrong: the LLM call is proxied through the Node server
     (`voiceQueryLLM.js`), which shares a machine with Ollama regardless of which *client* device
     is testing. `10.0.2.2` is only meaningful inside the emulator's own network namespace, so the
     server tried (and failed) to fetch its own emulator-only alias. Fixed to always use
     `http://127.0.0.1:11434/v1`.
  2. `src/screens/ProductListScreen.jsx`: displaying precomputed voice/photo search results sets
     `searchQuery` for display purposes only, but a separate debounced search-as-you-type effect
     unconditionally re-fired `runSmartSearch` whenever `searchQuery` became non-empty for any
     reason — including this programmatic set — silently firing a redundant second, independent
     search ~450ms later that could overwrite the already-correct results. This bug pre-existed
     for the deterministic rule-based path (Task C2) too, but was invisible there since a
     deterministic query reproduces the same result on the redundant call; the LLM path's
     non-determinism (`temperature: 0.1` in `voiceQueryLLM.js`) is what made it visible here. Fixed
     with a one-shot `skipNextSearchDebounceRef` guard.
- All 5 positive fixtures from `golden-multiparam-queries.json` passed live on the Android
  emulator. Fixture 4 ("gray aluminum space... under 2005 dollars" → Apple MacBook Pro 14 Inch
  Space Grey) failed on one attempt after the redundant-search-call fix (a single, correct search
  call ranked a different product on top) and passed cleanly on retry — confirmed via direct curl
  against `/api/search/voice` that this is genuine LLM sampling variance (`temperature: 0.1`,
  local `llama3.2` model) on a near-tied ranking, not a flow or app bug. This mirrors fixture 1's
  earlier near-tie ("Men Check Shirt" 0.803 vs. expected "Blue & Black Check Shirt" 0.801). A
  cloud-grade model would likely be more consistent; per the project's execution-boundary
  constraint, real OpenAI/OpenRouter/Groq/Gemini coverage remains the user's own manual run.

**Entry Criteria:** Task C2 Exit Criteria met. Local Ollama running (`ollama serve`) with a
model available (per `src/config/llmProviders.js`'s `ollama` provider, default model
`llama3.2`).

**Exit Criteria:**
- Running the flow against a booted Android emulator with Ollama enabled, once per positive
  fixture, all exit 0.

**Files:**
- Create: `.maestro/android/ml-multiparameter-search-llm.yaml`

**Interfaces:**
- Consumes: same fixture file as Task C2, plus the existing `llm-reasoning-switch` /
  `voice-provider-ollama` / `voice-typed-query-input` / `voice-search-button` testIDs already
  used by `.maestro/flows/06-llm-reasoning.yaml` (read that file for the exact enable-and-type
  sequence before writing this one — do not guess the steps).

- [ ] **Step 1: Write the flow**

Create `.maestro/android/ml-multiparameter-search-llm.yaml`, adapting
`.maestro/flows/06-llm-reasoning.yaml`'s enable-and-provider-select steps (read that file's
current content first) for the Ollama provider and this task's fixture queries:

```yaml
appId: com.ecommerceappfullstack
---
# Multi-parameter search via the LLM-reasoning path (Voice/AI search card), using Ollama
# (credential-free, keyOptional: true) so this flow is safe for the agent to run itself --
# see the Global Constraints in the plan this flow was written from: never run this style
# of flow with a real OpenAI/OpenRouter/Groq/Gemini key loaded.
#
# Requires env: QUERY - a natural-language query from
# scripts/fixtures/golden-multiparam-queries.json, EXPECTED_PRODUCT_TITLE - that fixture's
# expectedProductTitle.
- tapOn:
    id: "tab-home"

- scrollUntilVisible:
    element:
      id: "voice-search-card"
    direction: DOWN
    timeout: 15000

- tapOn:
    id: "llm-reasoning-switch"

- extendedWaitUntil:
    visible:
      id: "voice-api-key-input"
    timeout: 10000
    optional: true

- tapOn:
    id: "voice-provider-ollama"

- scrollUntilVisible:
    element:
      id: "voice-typed-query-input"
    direction: DOWN
    timeout: 15000

- tapOn:
    id: "voice-typed-query-input"

- inputText: "${QUERY}"

- tapOn:
    id: "voice-search-button"

- extendedWaitUntil:
    visible:
      text: "${EXPECTED_PRODUCT_TITLE}"
    timeout: 30000

- assertVisible:
    text: "${EXPECTED_PRODUCT_TITLE}"
```

(30s timeout, not photo-search's 60s, since this hits a local Ollama call rather than a
CLIP/reranker image pipeline — adjust upward during Step 2 if local Ollama latency on the
test machine needs it.)

- [ ] **Step 2: Run once per positive fixture**

Same pattern as Task C2 Step 3 — a temporary `runFlow: login.yaml` + `runFlow:
ml-multiparameter-search-llm.yaml` wrapper, run once per positive fixture with `--env QUERY=...
--env EXPECTED_PRODUCT_TITLE=...`. All 5 must exit 0.

- [ ] **Step 3: Commit**

```bash
git add .maestro/android/ml-multiparameter-search-llm.yaml
git commit -m "feat: Android multi-parameter search E2E (LLM-reasoning path via Ollama)

Exercises the genuine LLM-based intent extraction (voiceQueryLLM.js) using
Ollama so the agent can run this itself with zero real credentials
involved. Real OpenAI/OpenRouter provider coverage remains the user's own
run, per the existing execution-boundary constraint."
```

### Task C4: Android Stage C regression gate

**Status:** Done

**Deviation notes:**
- `login.yaml` x3, both `photo-search.yaml` samples (mens-clothing sample-1 and sample-2), and
  a re-run of both Task C2/C3 flows all passed. The native gallery-picker "no crash, no dialog,
  picker just never opens" flake (already documented in `photo-search.yaml`'s own comments) showed
  up repeatedly during this gate — `adb shell am force-stop com.ecommerceappfullstack` before each
  `maestro test` invocation reliably cleared it; a bare retry without force-stopping first did not
  reliably help. Recommend force-stopping before any flow that opens the gallery picker.
- `ml-features-comprehensive.yaml` required the same force-stop treatment for its embedded photo
  search step, plus passing `--env EXPECTED_PRODUCT_TITLE=...` matching whatever sample is
  currently seeded on the device (the flow doesn't set this itself, unlike `photo-search.yaml`'s
  other callers).
- `complete-e2e-clean.yaml` had a real, previously-undiscovered break: it hardcoded an assumption
  that "Essence Mascara Lash Princess" appears in the initial product-browse viewport, which the
  Phase 1 static-catalog rebuild invalidated (the default browse-all order now starts with
  clothing). Because the tap was `optional: true`, the flow silently no-opted instead of failing
  loudly at that step, then failed later at the non-optional "Add to Cart" assertion. Fixed by
  searching for the product instead of assuming its position — this surfaced two further findings
  worth recording for any future flow on this app:
  1. Both `pressKey: back` and `hideKeyboard` pop this app's Products tab back to Home once that
     tab has no further stack history (the bottom-tab navigator treats hardware back — which
     `hideKeyboard` appears to implement via a back-equivalent press on this Maestro/Android
     combination — as "return to Home"). Neither should be used to dismiss the keyboard on any
     screen other than a stack root.
  2. A text selector for the search result ambiguously matches the search box's own typed-query
     text node, not just the actual result card, since the box renders the query as literal text.
     Target the result by its stable `product-list-item-<id>` testID instead (verified against
     `catalog-static.json`'s id for the product), not by title text — and use `centerElement: true`
     on the preceding `scrollUntilVisible`, since a sliver-only-visible list item (as when it's the
     last row scrolled just past the bottom nav bar) can silently miss the tap, matching a pattern
     already seen in `photo-search.yaml`.
- Full regression re-run after all fixes: `login.yaml` x3 ✅, `photo-search.yaml` both samples ✅,
  `ml-features-comprehensive.yaml` ✅, `complete-e2e-clean.yaml` (`npm run maestro:android`) ✅,
  one fixture each re-verified for both C2's rule-based and C3's LLM-reasoning flows ✅, `npm test`
  → 188 passed, 1 known pre-existing failure (`goldenFixtures.test.js`, unrelated).

**Entry Criteria:** Tasks C1-C3 committed.

**Exit Criteria (all must pass before any iOS task starts):**
- `.maestro/android/login.yaml` run 3x consecutively, all exit 0.
- `.maestro/android/photo-search.yaml` (via the existing verification pattern) still passes
  for both existing samples.
- `.maestro/android/ml-features-comprehensive.yaml` exits 0.
- `.maestro/android/complete-e2e-clean.yaml` (i.e. `npm run maestro:android`) exits 0.
- Both new files from Tasks C2/C3 still pass (re-run once more here as the regression check,
  not just their own task's verification).
- `npm test` shows only the one known pre-existing failure.

**Files:** None (verification only).

- [ ] **Step 1-6: Run each of the above, in order, recording pass/fail**

```bash
UDID_OR_DEVICE=emulator-5554  # adjust to the actual running emulator id

for i in 1 2 3; do
  ~/.maestro/bin/maestro test .maestro/android/login.yaml
done

node scripts/seed-emulator-photos.mjs mens-clothing/sample-1.webp
# (run photo-search via the same temp-wrapper pattern used in prior sessions)

~/.maestro/bin/maestro test .maestro/android/ml-features-comprehensive.yaml

npm run maestro:android

npm test
```

- [ ] **Step 2: Update this plan's status**

Mark Tasks C1-C4 as `Status: Done` and commit:
```bash
git add docs/superpowers/plans/2026-07-10-default-llm-search-and-multiparam-e2e.md
git commit -m "docs: mark Android Stage C tasks complete, gate passed for iOS start"
```

### Task C5: iOS `ml-multiparameter-search.yaml` (rule-based search box)

**Status:** Done

**Deviation notes:**
- **Major finding:** text entry cannot use `inputText` (nor Maestro's own `pasteText`) on iOS
  for any of these fixtures. Every query in `golden-multiparam-queries.json` contains an
  apostrophe (`"I'm looking for..."`), and confirmed directly (screenshot evidence, multiple
  isolated repro attempts) that XCTest's synthetic typing — which both `inputText` and
  `pasteText` appear to go through on iOS — silently drops every character after the first
  apostrophe, with no error. Only the field's own value was left as a single leading letter
  (`"I"` from `"I'm..."`).
  - First attempted fix: disable autocorrect/spellCheck on the input, suspecting iOS's
    QuickType predictive-text bar was desyncing the synthetic keystrokes. This is good practice
    regardless (search boxes shouldn't autocorrect) and was applied to both
    `product-search-input` and `voice-typed-query-input` via TDD, but did not fix the truncation.
  - Real fix: native long-press on the field to trigger the OS "Paste" callout, then
    `tapOn: "Paste"` by its literal button text — this bypasses synthetic keyboard typing
    entirely.
  - Maestro's own `setClipboard` command proved unreliable as the paste source: it worked
    correctly for 2 of 5 fixtures, then silently left a stale prior query's text in the OS
    pasteboard for a 3rd (confirmed directly via `xcrun simctl pbpaste`, with waits up to 3s
    added with no effect) — no error surfaced, the flow just silently searched the wrong query
    and failed later, at the product-not-found assertion, in a way that looked unrelated.
  - Final, reliable recipe: the caller sets the simulator's real OS pasteboard directly via
    `printf "%s" "$QUERY" | xcrun simctl pbcopy <udid>` *before* invoking `maestro test`, and the
    flow itself only does `longPressOn` + `tapOn: "Paste"`. This mirrors the existing
    pre-seeded-external-state pattern already used by `photo-search.yaml` (its gallery photo is
    seeded via a script before the flow runs, not from inside the YAML).
- All 5 positive fixtures plus the no-match fixture (`ml-multiparameter-search-no-match.yaml`,
  same paste recipe) verified live on the iPhone 17 Pro Max simulator (iOS 26.5), each after
  fresh `xcrun simctl pbcopy` of that fixture's exact query.

**Entry Criteria:** Task C4 Exit Criteria met. iOS Simulator booted (kill the Android emulator
first if memory is tight, per this project's established "one platform at a time" practice).

**Exit Criteria:** Same as Task C2's, but on iOS Simulator.

**Files:**
- Create: `.maestro/ios/ml-multiparameter-search.yaml`

Built fresh for iOS, not ported from Android — using the already-established iOS conventions
from this project's prior work: `appId: org.reactjs.native.example.EcommerceAppFullStack`,
`runFlow: login.yaml` for setup (not a manually-duplicated login block), no `pressKey: back`
anywhere (use `pressKey: enter` for search submission, matching
`ml-features-comprehensive.yaml`'s iOS fix from the prior stage of this project).

- [ ] **Step 1: Write the flow**

Create `.maestro/ios/ml-multiparameter-search.yaml`:

```yaml
appId: org.reactjs.native.example.EcommerceAppFullStack
---
# Multi-parameter search via the plain "Search products" box -- iOS equivalent of
# .maestro/android/ml-multiparameter-search.yaml. Uses pressKey: enter (not back --
# iOS has no hardware back key; see this project's ml-features-comprehensive.yaml fix
# for why pressKey: back is wrong here).
#
# Requires env: QUERY - a natural-language query from
# scripts/fixtures/golden-multiparam-queries.json, EXPECTED_PRODUCT_TITLE - that same
# fixture's expectedProductTitle.
- tapOn:
    id: "tab-products"

- extendedWaitUntil:
    visible:
      id: "tab-products"
    timeout: 8000

- tapOn:
    text: "Search products"
    optional: true

- tapOn:
    text: "e.g. below 45"
    optional: true

- inputText: "${QUERY}"

- pressKey: enter

- extendedWaitUntil:
    visible:
      text: "${EXPECTED_PRODUCT_TITLE}"
    timeout: 15000

- assertVisible:
    text: "${EXPECTED_PRODUCT_TITLE}"

- tapOn:
    text: "${EXPECTED_PRODUCT_TITLE}"

- extendedWaitUntil:
    visible:
      id: "pdp-add-to-cart"
    timeout: 10000
```

Also create `.maestro/ios/ml-multiparameter-search-no-match.yaml`, identical in structure to
Task C2's Android no-match flow but with the iOS `appId` and `pressKey: enter`.

- [ ] **Step 2: Run once per positive fixture + the no-match fixture**

Same verification pattern as Task C2 Steps 3-4, targeted at the booted iOS Simulator's UDID.
All 6 runs must exit 0.

- [ ] **Step 3: Commit**

```bash
git add .maestro/ios/ml-multiparameter-search.yaml .maestro/ios/ml-multiparameter-search-no-match.yaml
git commit -m "feat: iOS multi-parameter search E2E (rule-based search box)

Built fresh for iOS (not ported from Android) -- runFlow: login.yaml,
pressKey: enter for search submission, no pressKey: back. Validated against
all 5 positive fixtures + the no-match fixture."
```

### Task C6: iOS `ml-multiparameter-search-llm.yaml` (LLM-reasoning path via Ollama)

**Status:** Done

**Deviation notes:**
- Note: the Entry Criteria below describing an iOS-specific `10.0.2.2`-vs-`127.0.0.1` base-URL
  branch in `llmProviders.js` is stale — Task C3 already removed that Android-only conditional
  entirely (the LLM call is proxied through the server, which always needs its own loopback
  regardless of client device; see Task C3's deviation notes). No iOS-specific base-URL handling
  was needed here.
- Reused Task C5's paste-based text-entry fix for `voice-typed-query-input` (long-press +
  `tapOn: "Paste"`, OS pasteboard pre-set via `xcrun simctl pbcopy` before invoking `maestro
  test`) — same apostrophe-truncation problem, same fix.
- **The Android provider-chip swipe recipe does not transfer to iOS.** Android's
  `swipe: start/end` used a y-percentage (~39%) derived from analyzing screenshot pixel
  positions, and that same percentage applied to iOS had *zero* effect on the scroll position
  (confirmed directly, repeated identically across 3 different swipe/scroll attempts — raw
  swipe, `scrollUntilVisible: direction: RIGHT`, and element-anchored `swipe: element:/direction:`
  all produced no visible change). Root cause, confirmed via `maestro hierarchy`: iOS/XCTest's
  swipe coordinates map to POINTS, not the pixels a screenshot is captured at — this simulator
  reports a 440x956-point root view while capturing 1320x2868-pixel screenshots (a 3x scale).
  `maestro hierarchy`'s own element bounds are also in points, and comparing the actual mounted
  provider chips' bounds to the total point-space height gave the real center: ~56%, not ~39%.
  Recalibrated `ml-multiparameter-search-llm.yaml`'s swipe to `56%` and it worked immediately.
  Any future iOS flow needing a raw-coordinate swipe/tap should calibrate from `maestro
  hierarchy` bounds, not from screenshot pixel positions.
- All 5 positive fixtures verified live on the iPhone 17 Pro Max simulator, each passing on the
  first attempt (no non-determinism-driven retries needed this time, unlike Android's fixture 4).

**Entry Criteria:** Task C5 Exit Criteria met. Local Ollama running, reachable from the iOS
Simulator at `http://127.0.0.1:11434/v1` (per `src/config/llmProviders.js`'s iOS branch —
note this differs from Android's `10.0.2.2`, since the iOS Simulator shares the host's
network namespace directly).

**Exit Criteria:** Same as Task C3's, but on iOS Simulator.

**Files:**
- Create: `.maestro/ios/ml-multiparameter-search-llm.yaml`

- [ ] **Step 1: Write the flow**

Create `.maestro/ios/ml-multiparameter-search-llm.yaml`, mirroring Task C3's Android LLM flow
but with the iOS `appId` and iOS's established login/keyboard conventions (`runFlow:
login.yaml` if a Voice-card-specific login precursor is needed, no `pressKey: back`):

```yaml
appId: org.reactjs.native.example.EcommerceAppFullStack
---
# iOS equivalent of .maestro/android/ml-multiparameter-search-llm.yaml -- LLM-reasoning
# path via Ollama, credential-free, safe for the agent to run itself.
#
# Requires env: QUERY, EXPECTED_PRODUCT_TITLE (see the Android version's header comment
# for the full explanation).
- tapOn:
    id: "tab-home"

- scrollUntilVisible:
    element:
      id: "voice-search-card"
    direction: DOWN
    timeout: 15000

- tapOn:
    id: "llm-reasoning-switch"

- extendedWaitUntil:
    visible:
      id: "voice-api-key-input"
    timeout: 10000
    optional: true

- tapOn:
    id: "voice-provider-ollama"

- scrollUntilVisible:
    element:
      id: "voice-typed-query-input"
    direction: DOWN
    timeout: 15000

- tapOn:
    id: "voice-typed-query-input"

- inputText: "${QUERY}"

- tapOn:
    id: "voice-search-button"

- extendedWaitUntil:
    visible:
      text: "${EXPECTED_PRODUCT_TITLE}"
    timeout: 30000

- assertVisible:
    text: "${EXPECTED_PRODUCT_TITLE}"
```

- [ ] **Step 2: Run once per positive fixture**

Same verification pattern as Task C3 Step 2, targeted at iOS Simulator. All 5 must exit 0.

- [ ] **Step 3: Commit**

```bash
git add .maestro/ios/ml-multiparameter-search-llm.yaml
git commit -m "feat: iOS multi-parameter search E2E (LLM-reasoning path via Ollama)

Built fresh for iOS, mirroring the Android Ollama flow with iOS's own
appId and no pressKey: back. Real-provider coverage remains user-run."
```

### Task C7: iOS Stage C regression gate (final gate for the whole plan)

**Status:** Done

**Deviation notes:**
- `login.yaml` x3 and both `photo-search.yaml` samples passed cleanly — no flakiness at all on
  iOS's native `PHPickerViewController` (unlike Android's gallery-picker flake), confirming that
  earlier Android issue really is Android-specific infrastructure flakiness, not a general
  cross-platform picker problem.
- `complete-e2e-clean.yaml` had three real, previously-hidden bugs, all fixed and verified with
  2 consecutive clean runs:
  1. The "Save Password?" skip matched the stale `"Save password"` text (no question mark,
     lowercase) — the dialog silently blocked every subsequent step on a fresh `clearState: true`
     run. `login.yaml` already had the correct `"Save Password\?"` pattern from earlier session
     work; applied the same fix here.
  2. Same pre-existing viewport assumption bug as the Android version — "Essence Mascara Lash
     Princess" isn't in the initial browse-all viewport since the Phase 1 catalog rebuild. Fixed
     the same way: search for it, target by its stable `product-list-item-dj-1` testID.
  3. **New finding, broader than previously understood:** XCTest's synthetic typing on this app's
     search input can drop everything after the very first character even with NO apostrophe
     involved (confirmed directly: `"Essence Mascara Lash Princess"` typed via `inputText` left
     only `"E"` in the field). This means the truncation bug found in Tasks C5/C6 isn't
     specifically an apostrophe/contraction problem — it's a more general synthetic-typing
     reliability issue on this simulator. Maestro's own `setClipboard` command was tried as the
     paste source and worked on the first run, then silently failed (no error, browse-all list
     shown instead) on an immediate re-run — the same unreliability found in Task C5. Since this
     flow is invoked via a fixed `npm run maestro:ios` one-liner (no room for a companion
     `--env`-driven pre-step), the clipboard pre-population was moved into the npm script itself
     (`package.json`'s `maestro:ios` now runs `xcrun simctl pbcopy` before invoking `maestro
     test`), keeping the proven-reliable external-pasteboard pattern intact for a
     zero-argument, repeatable command.
- `ml-features-comprehensive.yaml` passed cleanly on the first attempt (already using the
  fixture-appropriate `EXPECTED_PRODUCT_TITLE` env var, and iOS's photo picker needed no
  force-stop workaround unlike Android's).
- Re-verified both Task C5/C6 flows (one fixture each) after all `complete-e2e-clean.yaml` fixes
  — still pass. `npm test` → 190 passed, 1 known pre-existing failure
  (`goldenFixtures.test.js`, unrelated).
- **This is the final gate for the entire plan.** All three stages (0, A, B, C) across both
  Android and iOS are now complete.

**Entry Criteria:** Tasks C5-C6 committed.

**Exit Criteria (all must pass — this is the last gate in the plan):**
- `.maestro/ios/login.yaml` run 3x consecutively, all exit 0.
- `.maestro/ios/photo-search.yaml` still passes for both existing samples.
- `.maestro/ios/ml-features-comprehensive.yaml` exits 0.
- `.maestro/ios/complete-e2e-clean.yaml` (i.e. `npm run maestro:ios`) exits 0.
- Both new files from Tasks C5/C6 still pass.
- `npm test` shows only the one known pre-existing failure.

**Files:** None (verification only).

- [ ] **Step 1-6: Run each of the above, in order**

```bash
UDID=<booted-simulator-udid>

for i in 1 2 3; do
  ~/.maestro/bin/maestro test .maestro/ios/login.yaml --device "$UDID"
done

node scripts/seed-ios-sim-photos.mjs mens-clothing/sample-1.webp
# (run photo-search via the same temp-wrapper pattern used in prior sessions)

~/.maestro/bin/maestro test .maestro/ios/ml-features-comprehensive.yaml --device "$UDID"

npm run maestro:ios

npm test
```

- [ ] **Step 2: Update this plan's status and update the governing design spec**

Mark Tasks C5-C7 as `Status: Done`. Update
`docs/superpowers/specs/2026-07-10-default-llm-search-and-multiparam-e2e-design.md`'s (implicit)
testing notes — add a short "Implementation results" note referencing this plan's completion,
mirroring how `docs/superpowers/specs/2026-07-10-e2e-keyboard-and-llm-testing-robustness-design.md`
was updated with real Android/iOS results after that stage's implementation.

```bash
git add docs/superpowers/plans/2026-07-10-default-llm-search-and-multiparam-e2e.md docs/superpowers/specs/2026-07-10-default-llm-search-and-multiparam-e2e-design.md
git commit -m "docs: mark Stage C complete, all three stages of this plan done"
```

---

## Backlog (not part of this plan, tracked so it isn't lost)

- **3D product models** — deferred per `docs/superpowers/specs/2026-07-09-static-product-catalog-design.md`.
- **SKU-level variant selection in cart/checkout** — backlogged, same source spec.
- **Orphaned `scripts/fixtures/golden-image-fixtures.json`** — references 3 deleted photo
  files, causing the one pre-existing Jest failure this plan's every exit criteria carves out
  as a known exception. Also breaks `scripts/eval-hybrid-search.mjs`. Not fixed by this plan.
- **`server/src/voiceQueryParser.js` has no dedicated `MATERIAL_WORDS` extraction list** —
  materials currently only influence ranking incidentally via the generic `keywords` list
  cross-checked against `product.materials` in `semanticTextReranker.js`'s `constraintBoost`.
  Works today for this plan's fixture queries (verified in Task C1 Step 6); a dedicated
  extraction list is a possible future precision improvement, not required here.
