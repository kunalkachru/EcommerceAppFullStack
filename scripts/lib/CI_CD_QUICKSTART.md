# CI/CD quick reference — ShopEase mobile demo

Primary entry point for **GitHub Actions → Appetize** and local preflight. Full guide: [docs/APPETIZE_BROWSERSTACK.md](../../docs/APPETIZE_BROWSERSTACK.md). **Local run + Maestro E2E:** [docs/LOCAL_RUN.md](../../docs/LOCAL_RUN.md).

## Live demo (stable URL)

**Android:** https://appetize.io/app/b_syzdh2dfef37uy3fyeib33aky4

| Form factor | Appetize URL suffix |
|-------------|---------------------|
| Phone (Pixel 7) | `?device=pixel7&osVersion=13.0&toolbar=true` |
| Tablet (Pixel Tablet) | `?device=pixelTablet&osVersion=13.0&toolbar=true` |
| Large phone | `?device=pixel7pro&osVersion=13.0&toolbar=true` |

No rebuild needed — change `device` in the URL to test layout on phone vs tablet.

---

## GitHub Actions workflow

**File:** `.github/workflows/appetize-demo.yml`  
**Name in UI:** *Appetize demo deploy*

### How to trigger

| When | What happens | Cost |
|------|----------------|------|
| **Push to `main`** (mobile bundle paths only — see below) | Preflight → build APK → update Appetize | Ubuntu only (free tier) |
| **Manual:** Actions → *Appetize demo deploy* → *Run workflow* | Same as push | Ubuntu only |
| **Manual + `include_ios: true`** | Above + iOS sim zip → Appetize | **macOS minutes** (opt-in) |
| **Pull request** (same mobile bundle paths) | Android APK artifact only (14 days) | Ubuntu only |

### Path filters (APK / iOS sim rebuild)

Push and PR **only** trigger a demo rebuild when files that affect the embedded JS bundle or native shell change:

| Triggers rebuild | Does **not** trigger rebuild |
|------------------|------------------------------|
| `src/**`, `android/**`, `ios/**`, `config/**` | `docs/**`, `README.md`, `__tests__/**` |
| `App.jsx`, `index.js`, `app.json`, Metro/Babel/RN config | `scripts/run-e2e-*.mjs`, `scripts/verify-*.mjs` |
| `package.json`, `package-lock.json` | `scripts/lib/e2e-infra.mjs`, `scripts/lib/llm-env-config.mjs` |
| `scripts/build-demo-*.mjs`, `scripts/assert-cloud-api-target.mjs` | `.maestro/**`, `server/**` (API regression is separate) |
| `scripts/patch-voice-gradle.mjs`, `scripts/lib/demo-build-paths.mjs`, `scripts/lib/read-cloud-api.mjs` | |

**Manual dispatch** always runs (optional iOS). Docs-only commits to `main` skip this workflow entirely.

## Credential model

| Context | Source | Notes |
|---------|--------|-------|
| **GitHub Actions (CI/CD)** | **Repository secrets only** | Injected via workflow `env:` — never reads `src/.env` |
| **Local dev / agents** | `src/.env` (mirror of secrets) | Same variable names; optional convenience |

### GitHub Secrets (required for CI/CD)

| Secret | Required | Purpose |
|--------|----------|---------|
| `APPETIZE_API_TOKEN` | **Yes** | Appetize upload API |
| `APPETIZE_PUBLIC_KEY_ANDROID` | **Yes** | Stable Android demo URL |
| `APPETIZE_PUBLIC_KEY_IOS` | No | Set after first manual iOS upload |

Add at: **GitHub → repo → Settings → Secrets and variables → Actions**

CI validates before upload: `node scripts/assert-github-secrets.mjs --context appetize-android`

### Local `src/.env` (optional mirror for agents)

Same names — lets agents run uploads without prompting. **Not used in CI** (`GITHUB_ACTIONS=true` skips file read).

```bash
APPETIZE_API_TOKEN=...
APPETIZE_PUBLIC_KEY_ANDROID=b_syzdh2dfef37uy3fyeib33aky4
APPETIZE_PUBLIC_KEY_IOS=          # optional
```

**Security:** Never commit `src/.env`. Rotate token if exposed.

---

## Local commands (run before pushing)

```bash
# 1. Deploy gate (same as CI preflight — API + CLIP + ML + search)
npm run verify:cloud:deploy-gate

# 2. Build standalone APK (JS embedded, Railway API)
npm run build:demo:apk

# 3. Upload to Appetize (uses src/.env or env vars)
npm run upload:appetize -- --platform android --note "local smoke"

# 4. Full mobile E2E (emulator/simulator required)
USE_CLOUD_API=1 npm run verify:e2e-all
```

### Deploy gate behavior

Script: `scripts/verify-cloud-deploy-gate.mjs`

| Failure type | Examples | CI behavior |
|--------------|----------|-------------|
| **Transient** | 502/503, CLIP indexing, network reset | Retry once after 30s |
| **Blocking** | `/health` fail, wrong API target, auth broken | Fail immediately — do not deploy |
| **Unknown** | Unclassified stderr | Retry once; set `DEPLOY_GATE_STRICT=1` to disable |

Env overrides: `CLIP_WAIT_MS=600000` · `GATE_MAX_ATTEMPTS=2` · `GATE_RETRY_MS=30000`

---

## What CI does NOT run (by design)

GitHub Actions **does not** boot an Android emulator or iOS simulator. There is no Maestro/E2E on the runner — that keeps cost at zero and avoids flaky device CI.

| Runs in CI | Runs locally only |
|------------|---------------------|
| `verify:cloud:deploy-gate` (HTTP → Railway) | `npm run verify:e2e-all` (Maestro + emulator/sim) |
| `build:demo:apk` (Gradle on ubuntu) | `verify:photo-tap`, adb UI scripts |
| Upload APK → **Appetize** | iOS sim E2E |

After CI uploads, the **Appetize website** streams your APK in a browser-hosted virtual device (Pixel 7, tablet, etc.) — that is not GitHub running an emulator.

To add device E2E in CI later: macOS/android-emulator runners, Maestro cloud, or BrowserStack App Automate (paid).

---

| Workflow | Purpose |
|----------|---------|
| `api-regression.yml` | API-only on every push (no APK) |
| `appetize-demo.yml` | Mobile demo build + Appetize |

---

## E2E & device coverage

Maestro flows use **testIDs** (not coordinates) — they adapt to phone and tablet widths.

```bash
# Android emulator
USE_CLOUD_API=1 npm run verify:e2e-all -- --android-only

# iOS simulator
IOS_SIM_UDID=<udid> USE_CLOUD_API=1 npm run verify:e2e-all -- --ios-only
```

Scenarios: `docs/E2E_TEST_MATRIX.md` · Cursor agent: `.cursor/agents/e2e-testing.md`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Preflight fails twice | Check Railway dashboard; run `npm run verify:cloud:clip` |
| Appetize 403 | Token role (DEVELOPER/ADMIN); rotate secret |
| New Appetize URL each deploy | Add `APPETIZE_PUBLIC_KEY_ANDROID` secret |
| iOS job never runs | Expected — use manual dispatch + check `include_ios` |
| Photo search empty on Appetize | Wait ~30s after deploy; CLIP index on Railway |

---

## Cursor subagent

For CI/CD issues, invoke **appetize-cicd** (`.cursor/agents/appetize-cicd.md`).
