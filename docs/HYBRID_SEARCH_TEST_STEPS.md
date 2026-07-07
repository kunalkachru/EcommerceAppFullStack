# Hybrid Search Test Steps

**Last updated:** 2026-07-01

Manual and automated validation guide for the hybrid search redesign, including expected outcomes and comparison notes against the legacy baseline runtime.

## Goal

Use this guide to confirm four things:

1. Hybrid text, voice, and image search are working end to end
2. Hybrid handles order-mismatched and conversational phrasing better than baseline
3. LLM-enabled and non-LLM modes both remain stable
4. Core commerce flows still work after the search redesign

## Runtime Matrix

| Runtime | Port | Purpose |
|---------|------|---------|
| `baseline` | `5001` | Existing semantic-first comparison target |
| `hybrid` | `5002` | Lexical + semantic rerank redesign |

## Preconditions

Before starting manual validation:

1. Start the baseline API: `npm run server`
2. Start the hybrid API: `npm run server:hybrid`
3. Start Metro: `npm start`
4. Launch the app on Android or iOS
5. Wait until both APIs report indexed search status from `/health`

Expected:

- `http://127.0.0.1:5001/health` returns `ok: true`
- `http://127.0.0.1:5002/health` returns `ok: true`
- hybrid reports a populated CLIP index and catalog count
- the app opens to the login or home flow without a red screen

## Automated Gates

Run from repo root before manual exploration.

```bash
npm test -- --watchman=false --runInBand --forceExit
npm run test:scripts
npm run verify:search
npm run verify:ml
npm run verify:search:hybrid
```

Expected:

- Jest: **112/112** tests pass
- Script-unit tests: **21/21**
- Local search regression: `27/27`
- Local ML regression: `16/16`
- A/B comparison: hybrid passes all hybrid fixtures; baseline-only comparison notes are acceptable

Optional no-cost smoke:

```bash
npm run verify:llm-local
```

Expected:

- requests hit `intentSource=llm`
- server or Ollama connectivity failures are hard failures
- query-quality misses are warnings unless `STRICT_LOCAL_LLM=1`

If paid-provider keys are available, run:

```bash
API_URL=http://127.0.0.1:5002 node scripts/verify-llm-live.mjs
```

Expected:

- provider-backed reasoning returns `intentSource=llm`
- conversational queries parse price and product intent more consistently than small local models
- current validated result on the hybrid branch: **7/7 passed** on 2026-07-02

## App Runtime Toggle

In development builds:

1. Open **Home**
2. Open **Shop with your voice**
3. Expand **advanced**
4. Use **Search runtime**
5. Switch between:
   - `Baseline :5001`
   - `Hybrid :5002`

This toggle changes only search traffic. Cart, checkout, auth, and other app APIs remain on the primary API host.

## Manual Text Search Matrix

Set:

- `AI reasoning (LLM)` = Off
- test each query once on `Baseline :5001`
- repeat the same query on `Hybrid :5002`

### Case T1: clean keyword + budget

Query: `wireless headphones below 100`

Expected on baseline:

- relevant headphone or earbud items appear
- some noise is acceptable if results still fit the request

Expected on hybrid:

- same intent is preserved
- top results should stay focused on headphones/earbuds under `$100`
- no query failure or empty response

### Case T2: order-mismatched phrasing

Query: `100 under headphones wireless`

Expected on baseline:

- may work, but can be noisier because ordering is jumbled

Expected on hybrid:

- should behave close to T1
- top results should overlap materially with T1
- order mismatch must not cause query failure

### Case T3: gender + type

Query: `shoes women`

Expected on both:

- women’s footwear should rank near the top

Expected hybrid improvement:

- stronger category alignment and fewer irrelevant non-footwear results

### Case T4: price-first conversational shorthand

Query: `under 240 gaming monitor`

Expected on baseline:

- may return usable monitor results

Expected on hybrid:

- monitors under `$240` should appear near the top
- at least one gaming monitor should appear in the first screen of results

### Case T5: reversed range phrasing

Query: `900 and 500 laptop between`

Expected on baseline:

- known comparison gap; expensive out-of-range laptops may leak in

Expected on hybrid:

- top results stay in the `$500-$900` band
- expected examples include the HP Pavilion, Lenovo IdeaPad Slim 7, or Dell Inspiron 15 demo-coverage laptops

### Case T6: zero-result resilience

Query: `purple titanium camping drone under 15`

Expected on both:

- no crash
- app should show a graceful no-results state or weak best-effort result set

Expected hybrid improvement:

- structured handling remains stable even when the catalog has no strong match

## Manual Voice Search Matrix

Set:

- open **Shop with your voice**
- allow microphone access if prompted

### Rules mode

Set:

- `AI reasoning (LLM)` = Off

Speak each phrase naturally:

1. `wireless headphones below one hundred dollars`
2. `women shoes around forty`
3. `between five hundred and nine hundred laptops`

Expected:

- transcript is captured without crashing the app
- the resulting search behaves similarly to the matching typed query
- small speech-recognition word-order changes should not break search

### LLM mode with local Ollama

Set:

- `AI reasoning (LLM)` = On
- provider = `Ollama (local)`

Speak or paste:

1. `it's a fifty dollars jacket blue please`
2. `hundred under headphones wireless`
3. `nine hundred and five hundred laptop between`

Expected:

- response metadata indicates LLM reasoning
- conversational wording still resolves to a usable product intent
- hybrid should recover from minor order mismatches better than the baseline CLIP-text-only approach

Model note:

- local small models are valid for no-cost smoke testing
- if the local model misses one of the harder budget parses, treat that as a model-quality limit, not a framework crash, and repeat with a stronger provider if available

### LLM mode with paid provider

Set:

- provider = OpenAI, OpenRouter, Groq, Gemini, or another configured provider
- paste a valid session key if required

Queries:

1. `it's a fifty dollars jacket blue please`
2. `i need a gaming monitor around two hundred and twenty dollars`
3. `get me a laptop somewhere between five hundred and nine hundred`

Expected:

- `intentSource=llm`
- price limits are extracted correctly
- ranking remains product-focused even with conversational phrasing

## Manual Visual Search Matrix

Use files from `docs/test-photos/`.

### Case V1: in-catalog jacket

Image: `01-catalog-jacket.jpg`

Expected:

- clothing or jacket-like products are returned
- there is no parsing or upload failure

### Case V2: in-catalog backpack with category narrowing

Image: `02-catalog-backpack.jpg`

Steps:

1. upload the image
2. apply clothing filter

Expected:

- the search still completes
- results are narrowed or best-effort rather than crashing

### Case V3: off-catalog object

Image: `12-off-catalog-pizza.jpg`

Expected:

- no crash
- weak nearest-neighbor output is acceptable
- the system should avoid misleading confidence language

### Case V4: low-quality input

Use a blurry, tiny, or partially obstructed image.

Expected:

- the app returns a helpful error or best-effort guidance
- the API does not crash

### Case V5: PDP similar-products strip

Steps:

1. open any product detail page
2. inspect the **More like this** section

Expected:

- similar products render successfully
- tapping a similar product navigates correctly

## End-to-End Commerce Regression

Run these after the hybrid search checks so we know the redesign did not break the core purchase flow.

### Case E1: login

1. Sign in with `test@example.com` / `secret123`

Expected:

- login succeeds
- no stale loading spinner remains

### Case E2: search to product list

1. Search from Home or Product List
2. Open a result product

Expected:

- the selected result opens the correct PDP
- filters and result counts remain believable

### Case E3: add to cart from list

1. Add a product directly from the list view

Expected:

- loading state is truthful
- cart count updates
- no false-positive success toast appears on failure

### Case E4: add to cart from PDP

1. Add the same or another product from the PDP

Expected:

- button state reflects the async request
- cart reflects the new line item

### Case E5: checkout

1. Open Cart
2. Proceed to Checkout
3. Complete the order

Expected:

- checkout succeeds
- cart clears after a successful order
- order summary is shown

### Case E6: orders history

1. Open **Orders**
2. Open the latest order

Expected:

- the order appears in the list
- totals and purchased items render correctly

## Evidence Capture

For each failed or suspicious case, capture:

1. runtime in use (`baseline` or `hybrid`)
2. whether LLM reasoning was on or off
3. exact spoken or typed query
4. top 3 returned products
5. screenshot of the UI state
6. relevant API response snippet if available

This makes baseline-versus-hybrid comparisons reviewable and keeps model-quality issues separate from product bugs.

## Pass Criteria

The redesign is ready for review when:

1. all automated non-provider gates pass
2. hybrid beats or matches baseline on all typed-query cases
3. hybrid clearly improves the reversed-range and jumbled-order cases
4. image search remains stable for in-catalog and off-catalog inputs
5. cart, checkout, and orders still work end to end
