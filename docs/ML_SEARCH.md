# ML Search Architecture

**Last updated:** 2026-07-01

Voice, text, and photo search pipelines — design and data flow.

> **Navigation:** [README](../README.md) · [Architecture](./ARCHITECTURE.md) · [Demo Presentation](./DEMO_PRESENTATION.md)

---

## Overview

Search supports three input modes that share a unified ranking philosophy:

1. **Typed text** — product list search bar or Home smart search
2. **Voice** — speech-to-text on device, then same API as text
3. **Photo** — camera/gallery image sent as base64 to CLIP visual search

Text/voice uses **semantic-first ranking** (CLIP text embeddings) plus **structured intent** (price, product type, gender) from rules or LLM. Photo search uses **CLIP image embeddings** compared to pre-indexed product image + text vectors.

---

## Unified multimodal pipeline

```mermaid
flowchart TD
  input[UserInput] --> router{InputType}
  router -->|text_or_voice| textPath[TextVoicePath]
  router -->|photo| imagePath[ImagePath]
  textPath --> normalize[queryNormalize]
  normalize --> intent{LLM_enabled?}
  intent -->|yes| llm[voiceQueryLLM]
  intent -->|no| rules[voiceQueryParser]
  llm --> naturalSearch[naturalSearch]
  rules --> naturalSearch
  naturalSearch --> clipText[CLIP_text_embedding]
  clipText --> rank[Rank_plus_type_price_refine]
  rank --> results[ProductMatches]
  imagePath --> visualSearch[visualSearch.js]
  visualSearch --> clipImage[CLIP_image_embedding]
  clipImage --> imgRank[Cosine_rank_plus_category]
  imgRank --> results
```

---

## Text / voice search flow

```mermaid
sequenceDiagram
  participant UI as VoiceSearchCard_or_ProductList
  participant Client as catalogSearchService
  participant API as POST_search_voice
  participant Intent as voiceQueryLLM_or_Parser
  participant Search as naturalSearch
  participant CLIP as CLIP_index

  UI->>Client: query plus optional LLM key
  Client->>API: useLlmReasoning body plus X_LLM_Api_Key
  API->>Intent: resolveVoiceIntent
  Intent-->>API: parsed priceMax productTypes keywords
  API->>Search: searchByNaturalLanguage
  Search->>CLIP: embed query text
  CLIP-->>Search: query vector
  Search->>Search: cosine rank plus refineRankedResults
  Search-->>Client: matches plus intentSource
  Client-->>UI: product IDs navigate ProductList
```

### Intent layers

| Layer | File | When used |
|-------|------|-----------|
| Normalization | [server/src/queryNormalize.js](../server/src/queryNormalize.js) | Spelled numbers, comparators, reversed phrasing |
| LLM intent | [server/src/voiceQueryLLM.js](../server/src/voiceQueryLLM.js) | `useLlmReasoning=true` + API key |
| Rule parser | [server/src/voiceQueryParser.js](../server/src/voiceQueryParser.js) | LLM off or fallback |
| Ranking | [server/src/naturalSearch.js](../server/src/naturalSearch.js) | CLIP + type/price refinement |

### Client entry points

| UI | Service | Notes |
|----|---------|-------|
| [VoiceSearchCard.jsx](../src/components/VoiceSearchCard.jsx) | [voiceSearchService.js](../src/services/voiceSearchService.js) | Mic + LLM provider config |
| [ProductListScreen.jsx](../src/screens/ProductListScreen.jsx) | [catalogSearchService.js](../src/services/catalogSearchService.js) | Debounced text search |
| [HomeScreen.jsx](../src/screens/HomeScreen.jsx) | [catalogSearchService.js](../src/services/catalogSearchService.js) | Smart search navigation |

---

## Photo search flow

```mermaid
sequenceDiagram
  participant PL as ProductListScreen
  participant Picker as photoPicker
  participant VS as visualSearchService
  participant API as POST_visual_search
  participant CLIP as CLIP_index

  PL->>Picker: launch camera or gallery
  Picker-->>PL: imageBase64
  PL->>VS: analyzeImageForProducts
  VS->>API: POST /api/visual-search
  API->>CLIP: embed image compare to catalog
  CLIP-->>API: ranked matches attributes
  API-->>PL: match IDs matchPercent
  PL->>PL: Filter list by match IDs
```

### Visual search features

| Feature | Endpoint | File |
|---------|----------|------|
| Photo search | `POST /api/visual-search` | [visualSearch.js](../server/src/visualSearch.js) |
| Similar products (PDP) | `GET /api/visual-search/similar/:id` | Same |
| Category narrow | `categoryFilter` body param | [VisualSearchCategoryPrompt.jsx](../src/components/VisualSearchCategoryPrompt.jsx) |

---

## Demo use cases

Validated queries for presentations and regression checks.

### Text / voice (LLM or rules)

| Query style | Example | Expected behavior |
|-------------|---------|-------------------|
| Clean + price | `wireless headphones below 100` | Headphone/earbud products under $100 |
| Jumbled order | `100 under headphones wireless` | Same intent as clean query |
| Reversed between | `900 and 500 laptop between` | Laptops $500–900 (demo coverage products) |
| Conversational | `it's a fifty dollars jacket blue please` | Jackets under $50 budget cap |
| Price-first | `under 240 gaming monitor` | Gaming/office monitors under $240 |
| Gender + type | `shoes women` | Women's footwear ranked first |
| Rules-only | `below 45` | All products under $45 |

### Photo search

| Input | Expected behavior |
|-------|-------------------|
| [01-catalog-jacket.jpg](./test-photos/01-catalog-jacket.jpg) | Clothing/jacket matches, high match % |
| Off-catalog (pizza, dog) | Best-effort nearest matches, not empty crash |
| Category filter = clothing | Results constrained to clothing categories |

---

## Fallback behavior

```mermaid
flowchart TD
  apiCall[API_search_voice] --> ok{HTTP 200?}
  ok -->|yes| hasResults{matches length?}
  hasResults -->|yes| returnApi[Return server matches]
  hasResults -->|no| localFallback[localMatches catalog-fallback]
  ok -->|no| localOffline[localMatches offline source]
  llmFail[LLM fails strict off] --> rulesFallback[rules-fallback parser]
```

Client: [catalogSearchService.js](../src/services/catalogSearchService.js)  
Server LLM fallback: [voiceQueryLLM.js](../server/src/voiceQueryLLM.js)

---

## Configuration for ML demos

| Setting | Location |
|---------|----------|
| Enable AI reasoning | Voice Search card toggle |
| LLM API key | Paste in UI (session-only) or `src/.env` for dev |
| LLM provider/model | Voice Search card dropdown |
| Server-side LLM | `server/.env` `OPENAI_API_KEY` (optional) |

Details: [CONFIGURATION.md](./CONFIGURATION.md)

---

## Testing

| Test type | Command / file |
|-----------|----------------|
| Parser unit tests | `__tests__/voiceQueryParser.test.js` |
| LLM intent tests | `__tests__/voiceQueryLLM.test.js` |
| Ranking tests | `__tests__/naturalSearch.test.js` |
| Search integration | `npm run verify:search` |
| ML + catalog | `npm run verify:ml` |

Full status: [TESTING_STATUS.md](./TESTING_STATUS.md)

---

## Demo videos

Short platform recordings (<60s):

- [demo/videos/android/](./demo/videos/android/)
- [demo/videos/ios/](./demo/videos/ios/)

See [demo/videos/README.md](./demo/videos/README.md) and [DEMO_PRESENTATION.md](./DEMO_PRESENTATION.md).
