# Hybrid Search Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated hybrid multimodal search stack that improves text, voice, and image robustness without polluting the current `main` branch or local demo runtime.

**Architecture:** The implementation creates a separate worktree/branch and runtime profile, then splits the current monolithic search logic into query-understanding, text retrieval, visual retrieval, fusion, and response-contract layers. Existing endpoints remain available through compatibility adapters while new internal modules power a lexical-first, semantic-reranked, constraint-aware pipeline.

**Tech Stack:** React Native, Redux Toolkit, Express, Node.js, `@xenova/transformers`, MiniSearch, Jest, local verification scripts, Android/iOS local runtime overrides

---

### Task 1: Create the isolated branch/worktree and runtime matrix

**Files:**
- Create: `docs/search-runtime-matrix.md`
- Create: `server/.env.hybrid.example`
- Modify: `package.json`
- Modify: `docs/SETUP.md`
- Test: `__tests__/searchRuntimePaths.test.js`

- [ ] **Step 1: Write the failing runtime-path test**

```js
// __tests__/searchRuntimePaths.test.js
const { buildSearchRuntimeConfig } = require("../server/src/runtime/searchRuntimeConfig");

describe("buildSearchRuntimeConfig", () => {
  it("defaults the hybrid profile to isolated ports and file paths", () => {
    const cfg = buildSearchRuntimeConfig({
      SEARCH_RUNTIME_PROFILE: "hybrid",
      SEARCH_API_PORT: "",
      SEARCH_DATA_PATH: "",
      SEARCH_EMBED_CACHE_PATH: "",
    });

    expect(cfg.profile).toBe("hybrid");
    expect(cfg.apiPort).toBe(5002);
    expect(cfg.dataPath).toContain("store.hybrid.json");
    expect(cfg.embedCachePath).toContain("clip-embeddings.hybrid.json");
  });
});
```

- [ ] **Step 2: Run the focused test to confirm the config module does not exist yet**

Run:
```bash
npx jest --watchman=false __tests__/searchRuntimePaths.test.js --runInBand
```

Expected:
```text
FAIL __tests__/searchRuntimePaths.test.js
Cannot find module '../server/src/runtime/searchRuntimeConfig'
```

- [ ] **Step 3: Implement isolated runtime config and environment examples**

```js
// server/src/runtime/searchRuntimeConfig.js
const path = require("path");

function buildSearchRuntimeConfig(env = process.env) {
  const profile = env.SEARCH_RUNTIME_PROFILE || "baseline";
  const hybrid = profile === "hybrid";

  return {
    profile,
    apiPort: Number(env.SEARCH_API_PORT) || (hybrid ? 5002 : 5001),
    dataPath:
      env.SEARCH_DATA_PATH ||
      path.join(__dirname, "..", "..", "data", hybrid ? "store.hybrid.json" : "store.json"),
    embedCachePath:
      env.SEARCH_EMBED_CACHE_PATH ||
      path.join(
        __dirname,
        "..",
        "..",
        "data",
        hybrid ? "clip-embeddings.hybrid.json" : "clip-embeddings.json"
      ),
    evalOutputPath:
      env.SEARCH_EVAL_OUTPUT_PATH ||
      path.join(__dirname, "..", "..", "data", hybrid ? "eval.hybrid" : "eval"),
  };
}

module.exports = { buildSearchRuntimeConfig };
```

```env
# server/.env.hybrid.example
SEARCH_RUNTIME_PROFILE=hybrid
SEARCH_API_PORT=5002
SEARCH_DATA_PATH=server/data/store.hybrid.json
SEARCH_EMBED_CACHE_PATH=server/data/clip-embeddings.hybrid.json
SEARCH_EVAL_OUTPUT_PATH=server/data/eval.hybrid
JWT_SECRET=dev-only-change-me
```

```md
<!-- docs/search-runtime-matrix.md -->
| Runtime | Branch | API Port | Store File | Embedding Cache |
|--------|--------|----------|------------|-----------------|
| Baseline | `main` | `5001` | `server/data/store.json` | `server/data/clip-embeddings.json` |
| Hybrid | `codex/hybrid-search-v1` | `5002` | `server/data/store.hybrid.json` | `server/data/clip-embeddings.hybrid.json` |
```

- [ ] **Step 4: Add isolated workflow commands to docs and scripts**

```json
// package.json
{
  "scripts": {
    "server:hybrid": "SEARCH_RUNTIME_PROFILE=hybrid SEARCH_API_PORT=5002 npm run start --prefix server",
    "verify:search:hybrid": "BASELINE_API_URL=http://127.0.0.1:5001 HYBRID_API_URL=http://127.0.0.1:5002 node scripts/verify-search-ab.mjs"
  }
}
```

```md
<!-- docs/SETUP.md -->
## Hybrid redesign runtime

```bash
git worktree add ../EcommerceAppFullStack-hybrid-search -b codex/hybrid-search-v1 main
cp server/.env.hybrid.example server/.env.hybrid
SEARCH_RUNTIME_PROFILE=hybrid npm run server:hybrid
```
```

- [ ] **Step 5: Re-run the test and commit the isolation scaffold**

Run:
```bash
npx jest --watchman=false __tests__/searchRuntimePaths.test.js --runInBand
```

Expected:
```text
PASS __tests__/searchRuntimePaths.test.js
```

```bash
git add __tests__/searchRuntimePaths.test.js server/src/runtime/searchRuntimeConfig.js server/.env.hybrid.example docs/search-runtime-matrix.md docs/SETUP.md package.json
git commit -m "feat: add isolated hybrid search runtime scaffolding"
```

### Task 2: Split the search contract from route-specific payloads

**Files:**
- Create: `server/src/search/contracts/unifiedSearchResponse.js`
- Create: `server/src/search/contracts/legacyAdapters.js`
- Modify: `server/src/index.js`
- Modify: `src/services/catalogSearchService.js`
- Test: `__tests__/unifiedSearchResponse.test.js`

- [ ] **Step 1: Write failing contract tests**

```js
// __tests__/unifiedSearchResponse.test.js
const {
  buildUnifiedSearchResponse
} = require("../server/src/search/contracts/unifiedSearchResponse");
const {
  adaptUnifiedToLegacyVoice,
  adaptUnifiedToLegacyVisual,
} = require("../server/src/search/contracts/legacyAdapters");

describe("unified search response", () => {
  it("builds a modality-agnostic response envelope", () => {
    const response = buildUnifiedSearchResponse({
      modality: "text",
      intent: { queryText: "wireless headphones under 100" },
      results: [{ id: "p1", title: "Headphones" }],
      resultMode: "semantic_best_effort",
      confidence: 0.81,
    });

    expect(response.modality).toBe("text");
    expect(response.intent.queryText).toBe("wireless headphones under 100");
    expect(response.results).toHaveLength(1);
  });

  it("adapts unified responses into the legacy voice payload", () => {
    const legacy = adaptUnifiedToLegacyVoice({
      intent: { queryText: "blue jacket under 50" },
      results: [{ id: "p1", title: "Jacket", matchScore: 0.88 }],
      resultMode: "exact_intent_match",
    });

    expect(legacy.query).toBe("blue jacket under 50");
    expect(legacy.matches).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the contract test to confirm missing modules**

Run:
```bash
npx jest --watchman=false __tests__/unifiedSearchResponse.test.js --runInBand
```

Expected:
```text
FAIL __tests__/unifiedSearchResponse.test.js
Cannot find module '../server/src/search/contracts/unifiedSearchResponse'
```

- [ ] **Step 3: Implement the unified contract and adapter layer**

```js
// server/src/search/contracts/unifiedSearchResponse.js
function buildUnifiedSearchResponse({
  modality,
  intent,
  results,
  resultMode,
  confidence,
  fallbackUsed = false,
  explanations = [],
  suggestedQuery = "",
  legacyMeta = {},
}) {
  return {
    modality,
    intent,
    results,
    resultMode,
    confidence,
    fallbackUsed,
    explanations,
    suggestedQuery,
    legacyMeta,
  };
}

module.exports = {
  buildUnifiedSearchResponse,
};
```

```js
// server/src/search/contracts/legacyAdapters.js
function adaptUnifiedToLegacyVoice(response) {
  return {
    query: response.intent?.queryText ?? "",
    parsed: response.intent ?? null,
    matches: response.results ?? [],
    resultStatus: response.resultMode,
    intentSource: response.intent?.source ?? "rules",
    searchMode: "hybrid-v1",
    responseMeta: response,
  };
}

function adaptUnifiedToLegacyVisual(response) {
  return {
    matches: response.results ?? [],
    searchQuery: response.suggestedQuery ?? response.intent?.queryText ?? "",
    resultStatus: response.resultMode,
    labels: response.legacyMeta?.labels ?? [],
    attributes: response.legacyMeta?.attributes ?? [],
    responseMeta: response,
  };
}

module.exports = {
  adaptUnifiedToLegacyVoice,
  adaptUnifiedToLegacyVisual,
};
```

- [ ] **Step 4: Route current endpoints through the adapter without breaking clients**

```js
// server/src/index.js
const {
  adaptUnifiedToLegacyVoice,
  adaptUnifiedToLegacyVisual,
} = require("./search/contracts/legacyAdapters");

const unified = await searchCatalogByText({ query: query.trim(), llmOptions: built.options });
res.json(adaptUnifiedToLegacyVoice(unified));
```

```js
// src/services/catalogSearchService.js
return {
  query: q,
  matches: result.matches,
  parsed: result.parsed ?? result.responseMeta?.intent ?? null,
  source: result.intentSource ?? result.responseMeta?.intent?.source ?? "api",
  searchMode: result.searchMode ?? "hybrid-v1",
  responseMeta: result.responseMeta ?? null,
};
```

- [ ] **Step 5: Re-run the tests and commit the contract layer**

Run:
```bash
npx jest --watchman=false __tests__/unifiedSearchResponse.test.js --runInBand
```

Expected:
```text
PASS __tests__/unifiedSearchResponse.test.js
```

```bash
git add __tests__/unifiedSearchResponse.test.js server/src/search/contracts/unifiedSearchResponse.js server/src/search/contracts/legacyAdapters.js server/src/index.js src/services/catalogSearchService.js
git commit -m "feat: add unified search contract and legacy adapters"
```

### Task 3: Split query understanding into dedicated intent modules

**Files:**
- Create: `server/src/search/intent/buildSearchIntent.js`
- Create: `server/src/search/intent/queryNormalizer.js`
- Create: `server/src/search/intent/ruleIntentResolver.js`
- Create: `server/src/search/intent/llmIntentResolver.js`
- Modify: `server/src/queryNormalize.js`
- Modify: `server/src/voiceQueryParser.js`
- Modify: `server/src/voiceQueryLLM.js`
- Test: `__tests__/searchIntentBuilder.test.js`

- [ ] **Step 1: Add a failing intent-builder test for messy voice input**

```js
// __tests__/searchIntentBuilder.test.js
const { buildSearchIntent } = require("../server/src/search/intent/buildSearchIntent");

describe("buildSearchIntent", () => {
  it("normalizes a messy shopping utterance into stable intent fields", async () => {
    const intent = await buildSearchIntent({
      rawQuery: "its a forty dollars blue women shoes maybe running",
      llmOptions: { useLlmReasoning: false },
      transcriptAlternatives: ["women running shoes blue under forty"],
    });

    expect(intent.priceMax).toBeLessThanOrEqual(40);
    expect(intent.productTypes).toContain("shoes");
    expect(intent.colors).toContain("blue");
    expect(intent.gender).toBe("women");
  });
});
```

- [ ] **Step 2: Run the new test to confirm the builder is missing**

Run:
```bash
npx jest --watchman=false __tests__/searchIntentBuilder.test.js --runInBand
```

Expected:
```text
FAIL __tests__/searchIntentBuilder.test.js
Cannot find module '../server/src/search/intent/buildSearchIntent'
```

- [ ] **Step 3: Implement the new intent-builder module and keep old entry points as wrappers**

```js
// server/src/search/intent/buildSearchIntent.js
const { normalizeSearchQuery } = require("./queryNormalizer");
const { resolveRuleIntent } = require("./ruleIntentResolver");
const { resolveLlmIntent } = require("./llmIntentResolver");

async function buildSearchIntent({ rawQuery, llmOptions = {}, transcriptAlternatives = [] }) {
  const normalizedQuery = normalizeSearchQuery(rawQuery);
  const ruleIntent = resolveRuleIntent({ rawQuery, normalizedQuery, transcriptAlternatives });

  if (llmOptions.useLlmReasoning === true) {
    try {
      return await resolveLlmIntent({ rawQuery, normalizedQuery, ruleIntent, llmOptions });
    } catch {
      return { ...ruleIntent, source: "rules-fallback" };
    }
  }

  return ruleIntent;
}

module.exports = { buildSearchIntent };
```

```js
// server/src/voiceQueryLLM.js
const { buildSearchIntent } = require("./search/intent/buildSearchIntent");

async function resolveVoiceIntent(text, options = {}) {
  return buildSearchIntent({ rawQuery: text, llmOptions: options });
}

module.exports = { resolveVoiceIntent };
```

- [ ] **Step 4: Preserve current tests by routing old modules to the new internals**

```js
// server/src/voiceQueryParser.js
const { resolveRuleIntent } = require("./search/intent/ruleIntentResolver");

function parseVoiceQuery(text) {
  return resolveRuleIntent({ rawQuery: text });
}

module.exports = { parseVoiceQuery };
```

- [ ] **Step 5: Re-run focused tests and commit the intent split**

Run:
```bash
npx jest --watchman=false __tests__/searchIntentBuilder.test.js __tests__/voiceQueryParser.test.js __tests__/voiceQueryLLM.test.js --runInBand
```

Expected:
```text
PASS __tests__/searchIntentBuilder.test.js
PASS __tests__/voiceQueryParser.test.js
PASS __tests__/voiceQueryLLM.test.js
```

```bash
git add __tests__/searchIntentBuilder.test.js server/src/search/intent/buildSearchIntent.js server/src/search/intent/queryNormalizer.js server/src/search/intent/ruleIntentResolver.js server/src/search/intent/llmIntentResolver.js server/src/queryNormalize.js server/src/voiceQueryParser.js server/src/voiceQueryLLM.js
git commit -m "refactor: split search intent understanding into dedicated modules"
```

### Task 4: Build the v1 text retrieval engine with lexical recall and semantic reranking

**Files:**
- Create: `server/src/search/text/lexicalCatalogIndex.js`
- Create: `server/src/search/text/semanticTextReranker.js`
- Create: `server/src/search/text/searchTextCatalog.js`
- Create: `server/src/search/shared/clipModelRegistry.js`
- Modify: `server/package.json`
- Modify: `server/src/naturalSearch.js`
- Test: `__tests__/textRetrievalEngine.test.js`

- [ ] **Step 1: Add a failing text retrieval engine test**

```js
// __tests__/textRetrievalEngine.test.js
const { searchTextCatalog } = require("../server/src/search/text/searchTextCatalog");

describe("searchTextCatalog", () => {
  it("uses lexical recall before semantic rerank for commerce terms", async () => {
    const products = [
      { id: "m1", title: "LG UltraGear 24 Gaming Monitor", category: "electronics", price: 179.99, tags: ["monitor", "gaming"] },
      { id: "p1", title: "Cooking Pot", category: "home", price: 39.99, tags: ["kitchen"] },
    ];

    const results = await searchTextCatalog({
      catalog: products,
      intent: { queryText: "under 240 gaming monitor", productTypes: ["monitor"], priceMax: 240 },
    });

    expect(results[0].id).toBe("m1");
  });
});
```

- [ ] **Step 2: Run the test to confirm the engine module is missing**

Run:
```bash
npx jest --watchman=false __tests__/textRetrievalEngine.test.js --runInBand
```

Expected:
```text
FAIL __tests__/textRetrievalEngine.test.js
Cannot find module '../server/src/search/text/searchTextCatalog'
```

- [ ] **Step 3: Add lexical recall with MiniSearch**

```json
// server/package.json
{
  "dependencies": {
    "minisearch": "^7.1.2"
  }
}
```

```js
// server/src/search/text/lexicalCatalogIndex.js
const MiniSearch = require("minisearch");

function buildLexicalCatalogIndex(catalog) {
  const mini = new MiniSearch({
    fields: ["title", "brand", "category", "tagsText", "description"],
    storeFields: ["id", "title", "price", "category", "brand", "image", "tagsText"],
    searchOptions: { boost: { title: 4, brand: 2, category: 2, tagsText: 2 }, fuzzy: 0.2, prefix: true },
  });

  mini.addAll(
    catalog.map((product) => ({
      ...product,
      tagsText: (product.tags || []).join(" "),
      description: String(product.description || "").slice(0, 220),
    }))
  );

  return mini;
}

module.exports = { buildLexicalCatalogIndex };
```

- [ ] **Step 4: Implement semantic reranking on the lexical candidate set**

```js
// server/src/search/text/searchTextCatalog.js
const { buildLexicalCatalogIndex } = require("./lexicalCatalogIndex");
const { rerankLexicalCandidates } = require("./semanticTextReranker");

async function searchTextCatalog({ catalog, intent, embeddings, limit = 30 }) {
  const index = buildLexicalCatalogIndex(catalog);
  const lexical = index.search(intent.queryText, { combineWith: "AND" }).slice(0, 80);

  return rerankLexicalCandidates({
    lexicalCandidates: lexical,
    intent,
    embeddings,
    limit,
  });
}

module.exports = { searchTextCatalog };
```

```js
// server/src/search/text/semanticTextReranker.js
function applyConstraintScore(product, intent) {
  let score = 0;
  if (Number.isFinite(intent.priceMax) && product.price <= intent.priceMax) score += 0.2;
  if (intent.productTypes?.some((type) => `${product.title} ${product.category}`.toLowerCase().includes(type))) score += 0.25;
  return score;
}
```

- [ ] **Step 5: Re-run tests, install the dependency, and commit the text engine**

Run:
```bash
npm install --prefix server
npx jest --watchman=false __tests__/textRetrievalEngine.test.js __tests__/naturalSearch.test.js --runInBand
```

Expected:
```text
added 1 package
PASS __tests__/textRetrievalEngine.test.js
PASS __tests__/naturalSearch.test.js
```

```bash
git add server/package.json server/package-lock.json __tests__/textRetrievalEngine.test.js server/src/search/text/lexicalCatalogIndex.js server/src/search/text/semanticTextReranker.js server/src/search/text/searchTextCatalog.js server/src/search/shared/clipModelRegistry.js server/src/naturalSearch.js
git commit -m "feat: add lexical-first semantic text retrieval engine"
```

### Task 5: Split visual retrieval and fusion out of the monolith

**Files:**
- Create: `server/src/search/visual/imageQualityGate.js`
- Create: `server/src/search/visual/visualCatalogSearch.js`
- Create: `server/src/search/fusion/fuseSearchResults.js`
- Create: `server/src/search/orchestrators/searchCatalogByText.js`
- Create: `server/src/search/orchestrators/searchCatalogByImage.js`
- Modify: `server/src/visualSearch.js`
- Modify: `server/src/naturalSearch.js`
- Test: `__tests__/fusionSearch.test.js`

- [ ] **Step 1: Add a failing fusion test**

```js
// __tests__/fusionSearch.test.js
const { fuseSearchResults } = require("../server/src/search/fusion/fuseSearchResults");

describe("fuseSearchResults", () => {
  it("promotes candidates that satisfy high-confidence constraints", () => {
    const fused = fuseSearchResults({
      intent: { priceMax: 240, productTypes: ["monitor"], confidence: 0.9 },
      candidates: [
        { id: "pot", title: "Cooking Pot", price: 30, semanticScore: 0.7, lexicalScore: 0.2 },
        { id: "monitor", title: "Gaming Monitor", price: 219, semanticScore: 0.62, lexicalScore: 0.9 },
      ],
    });

    expect(fused[0].id).toBe("monitor");
  });
});
```

- [ ] **Step 2: Run the new test to confirm the fusion module does not exist**

Run:
```bash
npx jest --watchman=false __tests__/fusionSearch.test.js --runInBand
```

Expected:
```text
FAIL __tests__/fusionSearch.test.js
Cannot find module '../server/src/search/fusion/fuseSearchResults'
```

- [ ] **Step 3: Move image-quality logic and visual search into dedicated modules**

```js
// server/src/search/visual/imageQualityGate.js
async function assertUsableQueryImage(buffer) {
  const result = await validateQueryImage(buffer);
  if (!result.ok) {
    const err = new Error(result.message);
    err.code = result.code;
    throw err;
  }
}

module.exports = { assertUsableQueryImage };
```

```js
// server/src/search/visual/visualCatalogSearch.js
async function visualCatalogSearch({ base64, catalogVectors, categoryFilter, embeddings }) {
  const queryVec = await embeddings.embedQueryImageBase64(base64);
  return rankProducts(queryVec, catalogVectors, { categoryFilter });
}

module.exports = { visualCatalogSearch };
```

- [ ] **Step 4: Implement orchestrators and make old files thin delegates**

```js
// server/src/search/orchestrators/searchCatalogByText.js
async function searchCatalogByText({ query, llmOptions, catalog, embeddings }) {
  const intent = await buildSearchIntent({ rawQuery: query, llmOptions });
  const textCandidates = await searchTextCatalog({ catalog, intent, embeddings });
  const fused = fuseSearchResults({ intent, candidates: textCandidates, modality: "text" });
  return buildUnifiedSearchResponse({
    modality: "text",
    intent,
    results: fused,
    resultMode: fused.length ? "semantic_best_effort" : "no_confident_match",
    confidence: fused[0]?.confidence ?? 0,
  });
}
```

```js
// server/src/visualSearch.js
const { searchCatalogByImage } = require("./search/orchestrators/searchCatalogByImage");
const { searchCatalogByText } = require("./search/orchestrators/searchCatalogByText");

module.exports = {
  searchByImageBase64: (base64, options) => searchCatalogByImage({ base64, ...options }),
  searchByVoiceQuery: (query, options) => searchCatalogByText({ query, ...options }),
};
```

- [ ] **Step 5: Re-run tests and commit the module split**

Run:
```bash
npx jest --watchman=false __tests__/fusionSearch.test.js __tests__/naturalSearch.test.js __tests__/visualSearchMessages.test.js --runInBand
```

Expected:
```text
PASS __tests__/fusionSearch.test.js
PASS __tests__/naturalSearch.test.js
PASS __tests__/visualSearchMessages.test.js
```

```bash
git add __tests__/fusionSearch.test.js server/src/search/visual/imageQualityGate.js server/src/search/visual/visualCatalogSearch.js server/src/search/fusion/fuseSearchResults.js server/src/search/orchestrators/searchCatalogByText.js server/src/search/orchestrators/searchCatalogByImage.js server/src/visualSearch.js server/src/naturalSearch.js
git commit -m "refactor: split visual retrieval and fusion from search monolith"
```

### Task 6: Add side-by-side eval fixtures and comparison scripts

**Files:**
- Create: `scripts/fixtures/golden-text-queries.json`
- Create: `scripts/fixtures/golden-image-fixtures.json`
- Create: `scripts/verify-search-ab.mjs`
- Create: `scripts/eval-hybrid-search.mjs`
- Modify: `scripts/verify-search-flows.mjs`
- Test: `__tests__/goldenFixtures.test.js`

- [ ] **Step 1: Add a failing fixture-shape test**

```js
// __tests__/goldenFixtures.test.js
const textFixtures = require("../scripts/fixtures/golden-text-queries.json");
const imageFixtures = require("../scripts/fixtures/golden-image-fixtures.json");

describe("golden fixtures", () => {
  it("contains voice/text regression cases with expected constraints", () => {
    expect(textFixtures.some((item) => item.query === "100 under headphones wireless")).toBe(true);
    expect(textFixtures.every((item) => item.expectedMode)).toBe(true);
  });

  it("contains image fixtures for exact, near, off-catalog, and invalid cases", () => {
    const kinds = new Set(imageFixtures.map((item) => item.kind));
    expect(kinds.has("catalog")).toBe(true);
    expect(kinds.has("off_catalog")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to confirm the fixtures do not exist**

Run:
```bash
npx jest --watchman=false __tests__/goldenFixtures.test.js --runInBand
```

Expected:
```text
FAIL __tests__/goldenFixtures.test.js
Cannot find module '../scripts/fixtures/golden-text-queries.json'
```

- [ ] **Step 3: Create the text and image fixture files**

```json
// scripts/fixtures/golden-text-queries.json
[
  {
    "id": "headphones_jumbled_budget",
    "query": "100 under headphones wireless",
    "expectedMode": "semantic_best_effort",
    "mustIncludeTypes": ["headphones"],
    "priceMax": 100
  },
  {
    "id": "monitor_price_first",
    "query": "under 240 gaming monitor",
    "expectedMode": "exact_intent_match",
    "mustIncludeTypes": ["monitor"],
    "priceMax": 240
  }
]
```

```json
// scripts/fixtures/golden-image-fixtures.json
[
  {
    "id": "catalog_jacket",
    "kind": "catalog",
    "path": "docs/test-photos/01-catalog-jacket.jpg",
    "expectedMode": "visual_similar_match"
  },
  {
    "id": "off_catalog_pizza",
    "kind": "off_catalog",
    "path": "docs/test-photos/12-off-catalog-pizza.jpg",
    "expectedMode": "fallback_match"
  }
]
```

- [ ] **Step 4: Build a side-by-side evaluation script**

```js
// scripts/verify-search-ab.mjs
const BASELINE_API = process.env.BASELINE_API_URL || "http://127.0.0.1:5001";
const HYBRID_API = process.env.HYBRID_API_URL || "http://127.0.0.1:5002";

async function compareTextFixture(fixture) {
  const [baseline, hybrid] = await Promise.all([
    postVoice(BASELINE_API, fixture.query),
    postVoice(HYBRID_API, fixture.query),
  ]);

  return {
    id: fixture.id,
    baselineMode: baseline.data.resultStatus,
    hybridMode: hybrid.data.resultStatus,
    hybridTop: hybrid.data.matches?.[0]?.title ?? null,
  };
}
```

- [ ] **Step 5: Re-run the fixture test and commit the evaluation layer**

Run:
```bash
npx jest --watchman=false __tests__/goldenFixtures.test.js --runInBand
```

Expected:
```text
PASS __tests__/goldenFixtures.test.js
```

```bash
git add __tests__/goldenFixtures.test.js scripts/fixtures/golden-text-queries.json scripts/fixtures/golden-image-fixtures.json scripts/verify-search-ab.mjs scripts/eval-hybrid-search.mjs scripts/verify-search-flows.mjs
git commit -m "test: add golden fixtures and side-by-side hybrid search evaluation"
```

### Task 7: Add a minimal client A/B runtime switch

**Files:**
- Create: `src/config/searchRuntime.js`
- Modify: `src/config/api.js`
- Modify: `src/services/voiceSearchService.js`
- Modify: `src/services/visualSearchService.js`
- Modify: `src/services/catalogSearchService.js`
- Modify: `src/components/VoiceSearchCard.jsx`
- Test: `__tests__/searchRuntimeClient.test.js`

- [ ] **Step 1: Add a failing client runtime selection test**

```js
// __tests__/searchRuntimeClient.test.js
const { getSearchApiBaseUrl } = require("../src/config/searchRuntime");

describe("getSearchApiBaseUrl", () => {
  it("uses the hybrid override when set", () => {
    global.__SEARCH_API_BASE_URL__ = "http://127.0.0.1:5002";
    expect(getSearchApiBaseUrl()).toBe("http://127.0.0.1:5002");
    delete global.__SEARCH_API_BASE_URL__;
  });
});
```

- [ ] **Step 2: Run the test to confirm the runtime module is missing**

Run:
```bash
npx jest --watchman=false __tests__/searchRuntimeClient.test.js --runInBand
```

Expected:
```text
FAIL __tests__/searchRuntimeClient.test.js
Cannot find module '../src/config/searchRuntime'
```

- [ ] **Step 3: Implement a minimal search runtime selector**

```js
// src/config/searchRuntime.js
const { getApiBaseUrl } = require("./api");

function getSearchApiBaseUrl() {
  if (typeof global !== "undefined" && global.__SEARCH_API_BASE_URL__) {
    return global.__SEARCH_API_BASE_URL__;
  }
  return getApiBaseUrl();
}

module.exports = { getSearchApiBaseUrl };
```

- [ ] **Step 4: Route search-only services through the override without changing other commerce traffic**

```js
// src/services/voiceSearchService.js
import { getSearchApiBaseUrl } from "../config/searchRuntime";

const { data } = await axios.post(`${getSearchApiBaseUrl()}/api/search/voice`, body, {
  headers,
  timeout: VOICE_SEARCH_TIMEOUT_MS,
});
```

```js
// src/services/visualSearchService.js
import { getSearchApiBaseUrl } from "../config/searchRuntime";

const { data } = await axios.post(
  `${getSearchApiBaseUrl()}/api/visual-search`,
  { imageBase64, categoryFilter },
  { timeout: VISUAL_SEARCH_TIMEOUT_MS }
);
```

- [ ] **Step 5: Re-run tests and commit the client A/B switch**

Run:
```bash
npx jest --watchman=false __tests__/searchRuntimeClient.test.js __tests__/catalogSearchService.test.js --runInBand
```

Expected:
```text
PASS __tests__/searchRuntimeClient.test.js
PASS __tests__/catalogSearchService.test.js
```

```bash
git add __tests__/searchRuntimeClient.test.js src/config/searchRuntime.js src/config/api.js src/services/voiceSearchService.js src/services/visualSearchService.js src/services/catalogSearchService.js src/components/VoiceSearchCard.jsx
git commit -m "feat: add client-side A/B switch for hybrid search server"
```

### Task 8: Final verification, docs, and isolated rollout checklist

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ML_SEARCH.md`
- Modify: `docs/TESTING_STATUS.md`
- Modify: `docs/DEPLOYMENT.md`
- Test: `__tests__/App.test.tsx`

- [ ] **Step 1: Update the docs to explain baseline versus hybrid runtime**

```md
<!-- README.md -->
## Hybrid search experiment

Baseline runtime remains on `5001`.
Hybrid redesign runtime uses `5002` and isolated data/cache files.

```bash
SEARCH_RUNTIME_PROFILE=hybrid npm run server:hybrid
BASELINE_API_URL=http://127.0.0.1:5001 HYBRID_API_URL=http://127.0.0.1:5002 npm run verify:search:hybrid
```
```

- [ ] **Step 2: Add the isolated rollout checklist to testing docs**

```md
<!-- docs/TESTING_STATUS.md -->
### Hybrid search A/B checklist

- baseline server up on `5001`
- hybrid server up on `5002`
- golden text fixtures pass against hybrid
- golden image fixtures pass against hybrid
- no baseline runtime files modified by hybrid run
```

- [ ] **Step 3: Run the full targeted verification set**

Run:
```bash
npx jest --watchman=false __tests__/searchRuntimePaths.test.js __tests__/unifiedSearchResponse.test.js __tests__/searchIntentBuilder.test.js __tests__/textRetrievalEngine.test.js __tests__/fusionSearch.test.js __tests__/goldenFixtures.test.js __tests__/searchRuntimeClient.test.js --runInBand
```

Expected:
```text
PASS 7 test suites
```

- [ ] **Step 4: Run the isolated search comparison flow**

Run:
```bash
SEARCH_RUNTIME_PROFILE=hybrid npm run server:hybrid
BASELINE_API_URL=http://127.0.0.1:5001 HYBRID_API_URL=http://127.0.0.1:5002 npm run verify:search:hybrid
API_URL=http://127.0.0.1:5002 npm run verify:ml
```

Expected:
```text
baseline and hybrid comparison summary emitted
hybrid search verification passes
hybrid ML verification passes
```

- [ ] **Step 5: Commit the rollout docs and final checklist**

```bash
git add README.md docs/ARCHITECTURE.md docs/ML_SEARCH.md docs/TESTING_STATUS.md docs/DEPLOYMENT.md
git commit -m "docs: add hybrid search rollout and verification guidance"
```
