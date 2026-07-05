# Railway deployment (primary cloud host)

**Status:** Live — commerce + CLIP visual/voice search on Railway Hobby.

| Field | Value |
|-------|--------|
| Project | `terrific-reprieve` |
| Service | `cooperative-presence` |
| Public URL | `https://cooperative-presence-production-f5d9.up.railway.app` |
| GitHub | `kunalkachru/EcommerceAppFullStack` → branch `main` |
| Root directory | **`server`** (required) |

Oracle Cloud (OCI) is optional for self-hosted VMs with adequate RAM — see [OCI_DEPLOY.md](./OCI_DEPLOY.md). **Railway remains the primary live host** for this project.

---

## One-time setup

1. Create a [Railway](https://railway.app) project (Hobby plan).
2. **New → GitHub Repo** → select this repo.
3. Set **Root Directory** to `server`.
4. Add variables (Railway → service → Variables):

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | long random string |
| `SEARCH_RUNTIME` | `baseline` |

Do **not** set `SKIP_CLIP_WARMUP` unless you intentionally want commerce-only (no CLIP).

5. Deploy. First boot downloads ~150MB CLIP weights and indexes ~280 products (2–5 minutes).

---

## CLI (optional)

```bash
npm i -g @railway/cli
railway login
cd /path/to/EcommerceAppFullStack
railway link   # pick terrific-reprieve / cooperative-presence
railway logs
railway variables
railway service redeploy --yes
```

---

## Health checks

See **[CLOUD_REGRESSION.md](./CLOUD_REGRESSION.md)** for full script reference (Android + iOS).

```bash
# Commerce smoke (login, cart, catalog)
npm run verify:cloud

# Wait for CLIP index (after redeploy)
npm run verify:cloud:clip

# Full ML + search against cloud
npm run verify:cloud:all
```

Manual:

```bash
curl -sS https://cooperative-presence-production-f5d9.up.railway.app/health
curl -sS https://cooperative-presence-production-f5d9.up.railway.app/api/visual-search/status
```

Expect `modelLoaded: true` and `indexCount` ≥ 200 after warm-up.

---

## Mobile app → cloud API

In `src/config/apiTarget.js`:

```js
export const API_TARGET_MODE = "cloud";
```

Reload Metro (`npm start` → `r` in terminal). Android emulator and iOS simulator use HTTPS to the Railway host (no port).

Emulator regression (API checks use cloud when `USE_CLOUD_API=1`):

```bash
npm run verify:e2e-android:cloud
npm run verify:android-nav:cloud
npm run verify:android-ml:cloud
```

---

## Memory limits (CLIP)

CLIP warm-up needs enough RAM for transformers.js + indexing. After warm-up we observed **~650–780 MB** steady usage (no OOM on Railway; unlike OCI Micro).

### How to increase memory on Railway

The CLI does not expose replica memory limits; use the **dashboard**:

1. Open [Railway dashboard](https://railway.app) → project **terrific-reprieve**
2. Service **cooperative-presence** → **Settings**
3. **Resources** (or **Deploy** → **Replica limits** / **Memory** depending on UI version)
4. Set **Memory** to **2 GB** (2048 MB) if CLIP OOMs during first deploy — or **4 GB** if still unstable
5. **Save** → **Redeploy** (or `railway service redeploy --yes`)

Watch usage: Railway **Metrics** tab or `railway metrics --memory --json`

| Symptom | Action |
|---------|--------|
| Logs: `Killed`, restart during `[visual-search]` | Set memory **≥ 2 GB**, redeploy |
| `modelLoaded: false` forever | Redeploy first; then raise RAM |
| Stable after index (`indexCount` ≥ 200) | Current RAM is sufficient |

Use `SKIP_CLIP_WARMUP=1` only for commerce-only demos (no visual search).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `modelLoaded: false` after 10+ min | Redeploy: `railway service redeploy --yes`; watch logs for `[visual-search]` |
| OOM / container restart during index | Raise memory limit; or set `SKIP_CLIP_WARMUP=1` for commerce-only |
| Catalog 403 from FakeStore | OK — other sources still merge (~280 products) |
| Wrong service root | Must be `server`, not repo root |
| Login 401 on fresh deploy | `verify:cloud` auto-registers `test@example.com` / `secret123` |

---

## Appetize / BrowserStack

Build standalone APK / iOS sim zip and upload for browser or device-farm demos:

**[docs/APPETIZE_BROWSERSTACK.md](./docs/APPETIZE_BROWSERSTACK.md)**

```bash
npm run verify:demo-build-ready
npm run build:demo:apk
npm run upload:appetize -- --platform android   # needs APPETIZE_API_TOKEN in src/.env
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) § Browser-based demo platforms for context.
