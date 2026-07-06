# Cursor agents (ShopEase)

Specialized subagents for this repo. Files live in [`.cursor/agents/`](.cursor/agents/).

| Agent | Use when |
|-------|----------|
| **e2e-testing** | Maestro flows, emulator/simulator E2E, photo→PDP gates |
| **appetize-cicd** | GitHub Actions → Appetize pipeline, secrets, upload |
| **railway-ops** | Railway API deploy, env vars, health checks |
| **review-fixes** | Post-review hygiene; zero new CI cost |
| **oci-ops** | Optional OCI self-hosted API |
| **docs-showcase** | Public README/docs polish, broken links, fact sync |

Full narrative: [docs/AGENTIC_DEVELOPMENT.md](docs/AGENTIC_DEVELOPMENT.md)
