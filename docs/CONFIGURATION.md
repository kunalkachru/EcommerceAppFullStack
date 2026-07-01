# Configuration Guide

**Last updated:** 2026-07-01

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

Optional file for local development (gitignored):

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
- OpenRouter
- Ollama (local, `http://10.0.2.2:11434/v1` on Android emulator)

---

## API host (client → server)

File: `src/config/api.js`

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
