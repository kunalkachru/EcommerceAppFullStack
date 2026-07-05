# Configuration Guide

**Last updated:** 2026-07-05

All configuration points for the ShopEase full-stack demo app.

---

## Server (`server/.env`)

Copy from `server/.env.example`:

```bash
cp server/.env.example server/.env
```

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | No | `5001` | API listen port |
| `JWT_SECRET` | **Yes (prod)** | — | JWT signing for auth/cart/orders |
| `NODE_ENV` | No | `development` | Environment label |
| `OPENAI_API_KEY` | No | — | Server-side LLM fallback (optional) |
| `LLM_API_KEY` | No | — | Alias for OpenAI-compatible key |
| `LLM_BASE_URL` | No | `https://api.openai.com/v1` | OpenAI-compatible API base |
| `LLM_MODEL` | No | `gpt-4o-mini` | Default LLM model |

**Note:** `server/.env` is gitignored. Never commit secrets.

---

## Client LLM keys (`src/.env`)

Copy the example file — **never commit real keys**:

```bash
cp src/.env.example src/.env
# Edit src/.env locally with your OPENAI_API_KEY and/or OPENROUTER_API_KEY
```

Optional file for local development and verify scripts (gitignored):

```env
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
```

When **AI reasoning** is enabled in the Voice Search card, the app sends the key per request via `X-LLM-Api-Key`. Keys are session-only on the client and not stored on the server.

Provider presets: `src/config/llmProviders.js`

Supported providers in UI:
- OpenAI
- Groq
- Google Gemini (OpenAI-compatible endpoint)
- **OpenRouter** (`https://openrouter.ai/api/v1`, model `openai/gpt-4o-mini` default)
- Ollama (local, `http://10.0.2.2:11434/v1` on Android emulator)

OpenRouter keys use `sk-or-…` from [openrouter.ai/keys](https://openrouter.ai/keys). If you get HTTP 401, regenerate the key on OpenRouter's site.

**Scripts that read `src/.env`:** `verify:llm-live`, `verify:cloud:llm`, `record:demo:ios`, `record:demo:android`, iOS Maestro E2E (ML flow), optional `upload:appetize` / `upload:browserstack`. Keys are sent per request in `X-LLM-Api-Key` only — never written to the repo. Run `npm run verify:secrets-policy` before commits.

### LLM key policy (non‑negotiable)

| Location | LLM keys stored? |
|----------|------------------|
| GitHub repo | **Never** |
| GitHub Actions / Secrets | **Not configured** (no workflows) |
| Railway production env | **Do not set** `OPENAI_API_KEY` / `LLM_API_KEY` for public demo |
| APK / IPA / Appetize build | **Never** |
| Mobile app (Appetize users) | User pastes in UI → **RAM only** → `X-LLM-Api-Key` per request |
| Railway server | Pass-through per request; **not persisted** (`clientKeyOnly: true`) |

`src/.env` on a developer laptop is for **local verify scripts only**. It is gitignored and is **not** bundled into Appetize builds. See [APPETIZE_BROWSERSTACK.md](./APPETIZE_BROWSERSTACK.md) § GitHub vs Appetize.

Optional upload tokens in `src/.env` (`APPETIZE_API_TOKEN`, `BROWSERSTACK_*`) are **Appetize/BrowserStack account credentials** — not LLM keys — and are also never committed or shipped in the app.

---

## API host (client → server)

File: `src/config/api.js`  
Cloud toggle: `src/config/apiTarget.js`

| Mode | Config | URL |
|------|--------|-----|
| Local (default dev) | `API_TARGET_MODE = 'local'` | `http://10.0.2.2:5001` (Android) / `http://127.0.0.1:5001` (iOS) |
| Railway cloud | `API_TARGET_MODE = 'cloud'` | `https://…` from **`config/cloud-api.json`** |

Set `API_TARGET_MODE` in `src/config/apiTarget.js` before rebuilding the app. Cloud host is **`config/cloud-api.json`** (shared with verify/build scripts). `index.js` calls `applyApiTarget()` at startup.

Verify cloud API from Mac:

```bash
npm run verify:cloud
```

| Platform | Default host | URL |
|----------|--------------|-----|
| Android emulator | `10.0.2.2` | `http://10.0.2.2:5001` |
| iOS simulator | `127.0.0.1` | `http://127.0.0.1:5001` |
| Physical device | Must override | Set LAN IP |

Override for physical devices (before app bootstrap):

```javascript
global.__API_HOST__ = '192.168.1.42';
// optional:
global.__API_USE_HTTPS__ = false;
```

Verification scripts accept `API_URL`:

```bash
API_URL=http://127.0.0.1:5001 npm run verify:search
```

---

## Catalog

| Source | Location | Notes |
|--------|----------|-------|
| Live merge | `server/src/catalogService.js` | DummyJSON + FakeStore + EscuelaJS + demo coverage |
| Demo gap-fill | `server/src/demoCoverageProducts.js` | 6 curated products for common search demos |
| Client offline | `src/data/catalog-fallback.json` | Regenerated via `npm run snapshot-catalog` |
| Server snapshot | `server/data/catalog-snapshot.json` | Gitignored; used when live fetch fails |

Current catalog size: **~389 products**, CLIP indexed **~385**.

---

## Auth

- Register/login via `/api/users/register` and `/api/users/login`
- JWT stored in Redux + AsyncStorage (`redux-persist`)
- Protected routes: cart, orders
- Cart/orders return structured error codes (`auth_missing_token`, `auth_token_expired`, etc.)

---

## Orders / payment

- Payment gateway **not integrated**
- Checkout creates orders with `paymentStatus: "mocked_paid"` and `orderStatus: "placed"`
- Cart cleared only after successful order creation

---

## Android / iOS permissions

- **Microphone** — voice search (`AndroidManifest.xml`, `Info.plist`)
- **Camera / photo library** — image search and visual search

See platform manifests for exact permission strings.

---

## Demo / verification scripts

Scripts under `scripts/` are for **local development and CI**. They never embed API keys — each consumer creates gitignored env files:

| File | Used by |
|------|---------|
| `src/.env` | `verify:llm-live`, `record:demo:ios`, `record:demo:android` (LLM key paste in ML demo) |
| `server/.env` | `npm run server` (JWT, optional server LLM fallback) |

Example `src/.env`:

```env
OPENROUTER_API_KEY=sk-or-...
# or OPENAI_API_KEY=sk-...
```

Demo login credentials (`test@example.com` / `secret123`) are public demo data, not secrets.

See [demo/videos/README.md](./demo/videos/README.md) for recording demo MP4s locally.
