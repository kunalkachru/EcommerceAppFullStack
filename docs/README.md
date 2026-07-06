# ShopEase documentation

**Last updated:** 2026-07-06

Central index for reviewers, recruiters, and developers. **Start on the [README](../README.md)** for product overview, live demo, and videos.

---

## Try it first (no install)

| | Link |
|--|------|
| **Live app (Appetize)** | [Open demo →](https://appetize.io/app/b_syzdh2dfef37uy3fyeib33aky4?device=pixel7&osVersion=13.0&toolbar=true&scale=100) |
| **Demo login** | `test@example.com` / `secret123` |
| **App flow video** | [app-flow-demo.mp4](./demo/videos/app-flow-demo.mp4) (Android) |
| **ML search video** | [ml-features-demo.mp4](./demo/videos/ml-features-demo.mp4) (Android) |
| **iOS simulator (short)** | [app-flow](./demo/videos/ios/app-flow-demo-short.mp4) · [ML](./demo/videos/ios/ml-features-demo-short.mp4) |
| **GitHub Actions** | [Workflow runs](https://github.com/kunalkachru/EcommerceAppFullStack/actions) |

---

## By audience

### Portfolio / stakeholders

| Doc | Purpose |
|-----|---------|
| [README](../README.md) | Product story, architecture diagram, live links |
| [AGENTIC_DEVELOPMENT.md](./AGENTIC_DEVELOPMENT.md) | Agent-assisted dev workflow (Cursor, Claude, Codex) |
| [DEMO_PRESENTATION.md](./DEMO_PRESENTATION.md) | 5-minute demo script + talking points |
| [demo/videos/README.md](./demo/videos/README.md) | Screen recordings |
| [e2e/README.md](./e2e/README.md) | Screenshot gallery |

### Technical reviewers

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data flows, API surface |
| [ML_SEARCH.md](./ML_SEARCH.md) | Text, voice, photo search pipelines |
| [TESTING_STATUS.md](./TESTING_STATUS.md) | Gates, coverage, review checklist |
| [CLOUD_REGRESSION.md](./CLOUD_REGRESSION.md) | Verify & E2E scripts |
| [E2E_TEST_MATRIX.md](./E2E_TEST_MATRIX.md) | Maestro scenario matrix |

### Developers

| Doc | Purpose |
|-----|---------|
| [SETUP.md](./SETUP.md) | Install, 3-terminal startup |
| [CONFIGURATION.md](./CONFIGURATION.md) | Env vars, API host, LLM keys |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Local + Railway + Appetize model |
| [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) | Railway ops |
| [CI_CD_QUICKSTART.md](../scripts/lib/CI_CD_QUICKSTART.md) | GitHub Actions → Appetize |
| [APPETIZE_BROWSERSTACK.md](./APPETIZE_BROWSERSTACK.md) | Mobile demo upload |
| [AGENTS.md](../AGENTS.md) | Cursor subagent index |
| [superpowers/README.md](./superpowers/README.md) | Design spec history |

### Automation and CI/CD

| Resource | Purpose |
|----------|---------|
| [`.github/workflows/`](../.github/workflows/) | api-regression, appetize-demo |
| [CI_CD_QUICKSTART.md](../scripts/lib/CI_CD_QUICKSTART.md) | Triggers, secrets, deploy gate |
| [E2E_TEST_MATRIX.md](./E2E_TEST_MATRIX.md) | Local emulator/simulator tests |
| [`.cursor/agents/`](../.cursor/agents/) | Specialized Cursor subagents |

---

## Full index

| Document | Description |
|----------|-------------|
| [AGENTIC_DEVELOPMENT.md](./AGENTIC_DEVELOPMENT.md) | Agent-assisted workflow |
| [SETUP.md](./SETUP.md) | Prerequisites, install, verification |
| [CONFIGURATION.md](./CONFIGURATION.md) | Env vars and runtime config |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment model (local, Railway, Appetize) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture and API summary |
| [ML_SEARCH.md](./ML_SEARCH.md) | Multimodal search design |
| [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) | Railway hosting |
| [CLOUD_REGRESSION.md](./CLOUD_REGRESSION.md) | Cloud verify & E2E |
| [E2E_TEST_MATRIX.md](./E2E_TEST_MATRIX.md) | Maestro flows |
| [TESTING_STATUS.md](./TESTING_STATUS.md) | Test status & review checklist |
| [DEMO_PRESENTATION.md](./DEMO_PRESENTATION.md) | Demo script |
| [HYBRID_SEARCH_TEST_STEPS.md](./HYBRID_SEARCH_TEST_STEPS.md) | Manual ML validation |
| [APPETIZE_BROWSERSTACK.md](./APPETIZE_BROWSERSTACK.md) | Appetize / BrowserStack |
| [OCI_DEPLOY.md](./OCI_DEPLOY.md) | Optional self-hosted API |
| [SECURITY.md](../SECURITY.md) | Secrets policy |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | How to contribute |
