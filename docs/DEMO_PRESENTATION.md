# Demo Presentation Guide

**Last updated:** 2026-07-01

Live demo script, talking points, and video references for stakeholders and code reviewers.

> **Navigation:** [README](../README.md) · [Architecture](./ARCHITECTURE.md) · [ML Search](./ML_SEARCH.md) · [Setup](./SETUP.md)

---

## Audience

- Technical reviewers (Codex, Claude, internal QA)
- Stakeholders evaluating search + commerce demo
- Developers onboarding to the project

---

## Prerequisites (5 minutes before demo)

1. Complete [SETUP.md](./SETUP.md) — three terminals: API, Metro, app
2. Configure [CONFIGURATION.md](./CONFIGURATION.md) — `server/.env` JWT secret, optional LLM key
3. Wait for `[visual-search] Indexed N products` in API logs
4. Demo account: register once or use `test@example.com` / `secret123`
5. For photo search: `npm run seed:emulator-photos` (Android)

**Test user shortcut:** Register in-app if login fails.

---

## Demo videos (<60 seconds each)

| Video | Content |
|-------|---------|
| [app-flow-demo.mp4](./demo/videos/app-flow-demo.mp4) | Login → browse → cart → checkout → orders |
| [ml-features-demo.mp4](./demo/videos/ml-features-demo.mp4) | Text search → LLM reasoning + key → voice/photo search |

Platform-specific assets:

| Platform | App flow | ML features |
|----------|----------|-------------|
| Android | [android/app-flow-demo.mp4](./demo/videos/android/app-flow-demo.mp4) | [android/ml-features-demo.mp4](./demo/videos/android/ml-features-demo.mp4) |
| iOS | [ios/app-flow-demo-short.mp4](./demo/videos/ios/app-flow-demo-short.mp4) | [ios/ml-features-demo-short.mp4](./demo/videos/ios/ml-features-demo-short.mp4) |

Raw iOS captures are also available beside the short cuts as `ios/app-flow-demo.mp4` and `ios/ml-features-demo.mp4`.

Re-record on Android: `npm run record:demo:android` · iOS: `npm run record:demo:ios` (same two output files)

Fallback screenshots: [docs/e2e/](./e2e/)

---

## 5-minute live demo script

| Step | Time | Action | What to say |
|------|------|--------|-------------|
| 1 | 0:00 | Login | "JWT auth gates cart and orders." |
| 2 | 0:30 | Home → Products | "389-product merged catalog from public APIs plus demo coverage." |
| 3 | 1:00 | Text search: `wireless headphones below 100` | "Intent parser handles price + product type; jumbled word order works too." |
| 4 | 1:45 | Voice Search card → enable AI reasoning → paste key → speak query | "LLM extracts structured intent; rules fallback if LLM off." |
| 5 | 2:30 | Products → camera icon → pick jacket photo | "CLIP compares photo embedding to catalog image+text vectors." |
| 6 | 3:15 | Open PDP → Add to cart | "Per-product pending state; no false success alerts." |
| 7 | 3:45 | Cart → Checkout → Place order | "Order created before cart clear; payment is mocked for demo." |
| 8 | 4:30 | Orders tab → tap order | "Immutable order snapshot with line items and status." |

---

## ML feature talking points

### Text search

- Normalizes spelled numbers (`forty` → 40) and reversed phrasing (`240 under gaming monitor`)
- Server owns parsing — client displays ranked IDs, no duplicate filter logic
- See [ML_SEARCH.md](./ML_SEARCH.md)

### Voice + LLM

- On-device speech-to-text → same `/api/search/voice` endpoint as typed text
- LLM optional: extracts `priceMax`, `productTypes`, `keywords`
- Conversational phrasing (`it's a fifty dollars jacket`) treated as budget cap
- Key sent in `X-LLM-Api-Key` header only — never stored on server

### Photo search

- User picks camera or gallery; base64 sent to `/api/visual-search`
- Returns match %, attribute chips (color, material), optional category filter
- Off-catalog photos still return best-effort matches (never hard crash)

---

## Suggested demo queries

| Query | Why it works |
|-------|--------------|
| `wireless headphones below 100` | Clean price + type |
| `100 under headphones wireless` | Jumbled order parity |
| `it's a fifty dollars jacket blue please` | Conversational LLM |
| `under 240 gaming monitor` | Demo coverage monitors |
| Photo: `docs/test-photos/01-catalog-jacket.jpg` | Strong CLIP match |

---

## Known demo caveats

| Caveat | Mitigation |
|--------|------------|
| Server data resets on API restart | Re-register / re-login; mention in demo |
| Payment is `mocked_paid` | Explain gateway is future work |
| LLM requires API key | Paste in Voice Search card or use rules-only text search |
| First CLIP load ~1–2 min | Start API early |
| Cloud deploy N/A | Local demo only — [DEPLOYMENT.md](./DEPLOYMENT.md) |

---

## Architecture quick links

- System diagram: [ARCHITECTURE.md](./ARCHITECTURE.md)
- ML pipelines: [ML_SEARCH.md](./ML_SEARCH.md)
- Test evidence: [TESTING_STATUS.md](./TESTING_STATUS.md)

---

## Reviewer checklist

- [ ] Read README index
- [ ] Run `npm test`, `npm run verify:search`, `npm run verify:ml`
- [ ] Watch both demo videos (or follow live script)
- [ ] Confirm cart + checkout + orders flow
- [ ] Confirm jumbled search query returns relevant products
