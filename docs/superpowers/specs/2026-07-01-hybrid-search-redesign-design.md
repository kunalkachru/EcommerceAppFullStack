# Hybrid Search Redesign Design

**Date:** 2026-07-01
**Status:** Approved for implementation planning
**Scope:** Isolated redesign of multimodal product search internals for text, voice, and image flows

---

## Goal

Redesign the current CLIP-centered search stack into an isolated hybrid retrieval system that is more tolerant of messy voice/text input, more reliable for camera/image similarity, and safer to develop without polluting the current `main` branch or existing local demo deployment.

The redesigned implementation must:

- live on a separate branch and worktree
- run on separate local ports and runtime storage
- preserve a fast rollback path by keeping the current implementation untouched
- improve search robustness for reordered words, partial mistakes, ambiguous pricing language, and near-match images

---

## Current-State Summary

The current app already provides:

- typed product search
- microphone-driven search via on-device speech-to-text
- optional LLM reasoning for shopping intent extraction
- CLIP-based image similarity search
- catalog fallback behavior and verification scripts

Today, the design is centered around a shared CLIP product index. Text and voice search use semantic CLIP ranking plus parser or LLM-derived intent. Image search also uses CLIP embeddings and visual heuristics. This works well for demo scenarios, but it has several architectural limitations:

1. text and voice search depend on the same index lifecycle as image search
2. retrieval strategy is not separated cleanly by modality
3. graceful degradation exists, but is not standardized behind one consistent response contract
4. noisy input handling is spread across parser, LLM, and ranking stages rather than being formalized as a dedicated query-understanding layer

---

## Design Principles

The redesign should follow these principles:

1. **Modality-aware retrieval**
   Voice/text and image search are related but not identical problems, so they should not share one dominant retrieval path.

2. **Graceful degradation**
   Search should fail soft. Messy input should produce best-effort results whenever reasonable.

3. **Stable client contract**
   The UI should receive one unified search response shape regardless of input modality.

4. **Isolation first**
   Development and verification must not affect the currently working local demo.

5. **Incremental rollout**
   The new architecture should be introducible behind compatibility-safe interfaces and verified side by side with the current behavior.

---

## Proposed Architecture

The new search internals will be split into four server-side layers.

### 1. Query Understanding Layer

This layer converts raw user input into a canonical `SearchIntent`.

Supported inputs:

- typed text
- voice transcript
- optional ASR alternates or partials in future iterations
- image-derived hints from the visual pipeline

Responsibilities:

- normalize phrasing and token order
- interpret budget language such as `under 50`, `around 40`, `between 500 and 900`
- infer category, product type, color, gender, and attribute hints
- detect ambiguity and attach confidence
- accept conversational or partially malformed input
- enrich intent with optional LLM reasoning when enabled

The output is a structured intent object, not just a rewritten string.

Illustrative shape:

```json
{
  "queryText": "women blue running shoes under 40",
  "productTypes": ["shoes", "running shoes"],
  "priceMin": 0,
  "priceMax": 40,
  "colors": ["blue"],
  "gender": "women",
  "categoryHints": ["footwear"],
  "attributes": [],
  "confidence": 0.86,
  "source": "rules+llm"
}
```

### 2. Retrieval Engines

The redesign uses separate retrieval engines by modality.

#### Text Retrieval Engine

Used for typed and voice-derived shopping queries.

Responsibilities:

- retrieve catalog candidates using text-oriented search
- support semantic similarity and structured narrowing
- avoid hard dependency on the visual CLIP index warm-up path
- support future replacement with stronger text embeddings or lexical-semantic hybrids

For v1, this engine should use a `hybrid lexical-first candidate generator plus semantic reranking` design:

- lexical retrieval for candidate recall over title, brand, category, tags, and short description
- semantic reranking over the lexical candidate set using the existing semantic capability
- structured constraint reranking for price, type, category, gender, and attributes

This v1 choice improves shopping-query precision without requiring an external search service in the first redesign phase.

#### Visual Retrieval Engine

Used for camera or gallery image search.

Responsibilities:

- perform image similarity against catalog embeddings
- apply blur, size, and input-quality checks
- infer coarse visual attributes such as probable category or color
- return exact, near, or best-effort similar products instead of empty failures where possible

#### Constraint Filter

A supporting engine that applies structured constraints from the canonical intent.

Examples:

- price range
- product type
- gender
- category
- color or material preference

This layer should prefer soft-to-hard behavior:

- use preferences as reranking inputs first
- only apply hard filters when intent confidence is high enough

### 3. Fusion and Reranking Layer

This layer combines retrieval candidates with structured intent.

Responsibilities:

- merge candidates from text, visual, and constraint-aware signals
- compute final ranking
- reduce false positives that are semantically related but shopping-irrelevant
- surface why a result was returned
- choose between `exact`, `best effort`, `fallback`, and `near match` response modes

This layer is where product search becomes a commerce-specific decision system rather than pure embedding similarity.

### 4. Stable API Contract

All modalities must return one unified response shape so the client can behave consistently.

Illustrative response shape:

```json
{
  "intent": {
    "queryText": "wireless headphones under 100",
    "priceMax": 100,
    "productTypes": ["headphones"],
    "confidence": 0.91
  },
  "results": [],
  "resultMode": "semantic_best_effort",
  "confidence": 0.79,
  "fallbackUsed": false,
  "explanations": [
    "Interpreted your request as headphones under $100",
    "Ranked by semantic match and price fit"
  ],
  "suggestedQuery": "wireless headphones under 100"
}
```

This contract should be additive-compatible where possible so existing screens can migrate safely.

---

## Pipeline Behavior by Modality

### Voice and Text Pipeline

Flow:

1. accept raw text or voice transcript
2. normalize and parse into `SearchIntent`
3. optionally enrich using LLM reasoning
4. retrieve candidates from the text retrieval engine
5. rerank using price, type, category, gender, and attribute signals
6. return unified response contract

Expected robustness:

- reordered words should not fail the query
- filler words should be ignored
- minor transcription mistakes should still yield a valid shopping intent when recoverable
- budget language should map to structured range constraints

Example:

Input:
`its a forty dollars blue women shoes maybe running`

Canonical interpretation:
`women's blue running shoes under $40`

Result behavior:

- return likely footwear matches
- bias toward blue when available
- prefer products within budget
- if exact matches are sparse, return semantically close footwear rather than empty failure

### Image Pipeline

Flow:

1. accept image input from camera or gallery
2. validate image quality
3. retrieve nearest visual neighbors from the visual engine
4. infer coarse image attributes and category hints
5. rerank using catalog metadata and optional constraints
6. return unified response contract

Expected robustness:

- exact catalog match is not required
- weak or off-catalog images should still return `near match` or `best effort` results where reasonable
- blurry or unusable images should fail clearly with guidance

Example:

Input:
a dark backpack photo

Behavior:

- find visually similar bags or backpacks
- boost likely accessory and bag categories
- return closest similar products even if brand or shape differs

---

## Isolated Delivery Model

Implementation must happen in a separate development lane to protect the current working deployment.

### Branch and Worktree

Future implementation should assume:

- a new feature branch created from current `main`
- a dedicated worktree for the redesign

Benefits:

- `main` remains untouched
- existing local demo can continue to run
- rollback is easy by abandoning the branch/worktree
- behavior comparison is straightforward

### Separate Local Runtime

The redesigned stack should use separate local runtime defaults.

Examples:

- separate API port
- separate Metro port if needed
- separate runtime data file path
- separate embedding cache path
- separate evaluation output directory

This prevents interference with:

- active cart/order demo state
- existing local store file
- current CLIP cache behavior
- current developer workflows

### Separate Environment Configuration

The redesign should introduce isolated configuration surfaces such as:

- `SEARCH_API_PORT`
- `SEARCH_DATA_PATH`
- `SEARCH_EMBED_CACHE_PATH`
- `SEARCH_EVAL_OUTPUT_PATH`
- optional `SEARCH_EXPERIMENT_NAME`

The implementation plan should define exact naming and ownership of these config values.

---

## Failure Handling Strategy

The redesign should not fail closed for ordinary shopping input.

### Voice/Text Failure Rules

- if LLM reasoning fails, fall back to deterministic query understanding
- if intent confidence is low, relax hard filters and use reranking instead
- if text retrieval is weak, return best-effort semantic results with explanation
- if query is ambiguous, expose a suggested interpretation rather than hard failing immediately

### Image Failure Rules

- if image is too blurry or too small, return a clear actionable error
- if no exact inventory match exists, return nearest similar products
- if the image is off-catalog, return low-confidence best-effort results or explain no confident inventory match

### Response Semantics

The response should distinguish:

- `exact_intent_match`
- `semantic_best_effort`
- `visual_similar_match`
- `fallback_match`
- `no_confident_match`
- `invalid_input`

This gives the client enough information to present helpful UI instead of a binary success/failure experience.

---

## Backward Compatibility and Rollout

The redesign should be introduced incrementally.

Requirements:

- current screens remain operable during migration
- existing route flows and product-list integration keep working
- new fields should be additive first
- client migration should happen behind compatibility-safe service boundaries

The implementation should avoid a forced full client rewrite at the same time as the server redesign.

---

## Verification Strategy

The redesign should be validated with quality-focused checks, not just unit tests.

### Golden Voice/Text Query Set

The verification suite should include:

- reordered words
- price-first queries
- conversational shopping requests
- type/color/gender combinations
- partial product descriptions
- slightly wrong or incomplete phrasing

Example categories:

- headphones under a budget
- jackets by color and price
- laptops in a price band
- monitors with price-first language
- women’s shoes with reordered tokens

### Image Regression Set

The verification suite should include:

- exact or near catalog photo
- visually similar but non-identical product
- off-catalog object
- blurry image
- weak-lighting or low-detail image

### Comparison Metrics

The isolated redesign should be compared against current behavior using metrics such as:

- top-k relevance
- constraint satisfaction rate
- fallback rate
- empty-result rate
- nearest-match usefulness for image queries

### A/B Validation

The verification plan should support direct comparison between:

- current baseline server
- isolated redesign server

Both should be testable side by side without port or state collision.

---

## Success Criteria

The redesign is successful if it achieves all of the following:

1. lower query-failure rate for messy voice/text requests
2. stronger honoring of price/type/category/gender constraints
3. better best-effort handling of imperfect image inputs
4. a stable unified result contract across modalities
5. isolated implementation and verification with zero pollution of `main`

---

## Out of Scope

To keep this work focused, the redesign does not include:

- replacing the entire mobile UI
- introducing a production cloud deployment platform
- redesigning commerce flows outside search except where response compatibility requires small integration adjustments
- building a full long-term ML platform with external feature stores or model registry

The design leaves room for future upgrades, but this phase is focused on a robust isolated search redesign that can be implemented safely and verified side by side with the current system.
