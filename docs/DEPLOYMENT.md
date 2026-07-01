# Deployment Guide

**Last updated:** 2026-07-01

How the full-stack application is deployed and run **today**.

---

## Current deployment model

This project is deployed as a **local development full-stack demo**, not a production cloud deployment.

```
┌─────────────────────┐     HTTP :5001      ┌──────────────────────────────┐
│  React Native App   │ ◄──────────────────►│  Express API (server/)       │
│  (Metro bundler)    │                     │  - Auth, cart, orders        │
│  Android / iOS      │                     │  - Catalog merge             │
└─────────────────────┘                     │  - CLIP visual + voice search│
        ▲                                   └──────────────────────────────┘
        │                                              │
        │ JS bundle                                    │ Fetches catalog from
        │                                              │ public APIs + indexes
┌───────┴────────┐                                     ▼
│ Metro :8081    │                          DummyJSON, FakeStore, EscuelaJS
└────────────────┘                          + demoCoverageProducts (6 items)
```

There is **no** current CI/CD pipeline, Docker compose, or cloud host (Heroku, AWS, etc.) checked into this repo.

---

## Standard local deployment (recommended)

Run these three processes on the developer machine:

| # | Process | Command | Port |
|---|---------|---------|------|
| 1 | API + CLIP search | `npm run server` | **5001** |
| 2 | Metro bundler | `npm start` | **8081** |
| 3 | Mobile app | `npm run android` or `npm run ios` | — |

### Network routing

| Client | Reaches API at |
|--------|----------------|
| Android emulator | `http://10.0.2.2:5001` |
| iOS simulator | `http://127.0.0.1:5001` |
| Physical phone | `http://<host-lan-ip>:5001` (manual override) |

Configured in: `src/config/api.js`

### Startup sequence

1. `npm run server` — wait for `[visual-search] Indexed N products`
2. `npm start` — Metro ready
3. `npm run android` — installs and launches on emulator

First API start may take 1–2 minutes (CLIP model download + index build).

---

## Data persistence (local demo)

| Data | Storage | Survives restart? |
|------|---------|-------------------|
| Users, carts, orders | In-memory (`server/src/index.js` store) | **No** — resets on server restart |
| Catalog | Fetched from public APIs + merged | Refetched on server start |
| Client auth/cart | AsyncStorage via Redux Persist | Yes (on device) |
| CLIP vectors | Built in memory on server start | Rebuilt each restart |

For persistent orders/users in production, replace in-memory store with a database.

---

## Production deployment (not implemented)

To deploy beyond local demo, you would need:

1. **API host** — Node server on VPS/container (Render, Railway, AWS ECS, etc.)
2. **HTTPS + domain** — reverse proxy (nginx) with TLS
3. **Database** — PostgreSQL/MongoDB for users, carts, orders
4. **Persistent catalog** — snapshot DB or scheduled `snapshot-catalog` job
5. **CLIP model cache** — warm index on deploy or object storage for vectors
6. **Mobile release builds** — Android APK/AAB, iOS TestFlight with `__API_HOST__` pointing to deployed API
7. **Secrets** — JWT_SECRET, LLM keys via platform secret manager (not `.env` in repo)

None of the above is automated in this repository yet.

---

## Verification after deploy

```bash
curl http://127.0.0.1:5001/health
npm run verify:search
npm run verify:ml
```

See [TESTING_STATUS.md](./TESTING_STATUS.md) for full test matrix.

---

## Related scripts

| Script | Purpose |
|--------|---------|
| `npm run server` | Start API |
| `npm run snapshot-catalog` | Refresh offline catalog JSON |
| `npm run seed:emulator-photos` | Push test images to Android emulator |
| `npm run verify:emulator` | Emulator ML smoke checks |
