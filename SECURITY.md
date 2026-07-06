# Security

**Last updated:** 2026-07-06

ShopEase is a portfolio demo. Report sensitive findings privately to the repository owner.

## Secrets policy

- **Never commit** API keys, tokens, or passwords. Use gitignored `src/.env` and `server/.env` locally; **GitHub Actions secrets** in CI.
- Run before every push: `npm run verify:secrets-policy`
- Appetize upload token: `APPETIZE_API_TOKEN` in GitHub Secrets only (CI); optional mirror in local `src/.env`
- LLM keys: user-supplied in-app or local `src/.env` for verify scripts — never bundled in release APK

Details: [docs/CLOUD_REGRESSION.md](docs/CLOUD_REGRESSION.md) · [docs/CONFIGURATION.md](docs/CONFIGURATION.md)

## Demo credentials

Public demo login (`test@example.com` / `secret123`) is intentional for Appetize — not production secrets.

## Dependencies

Third-party npm packages have their own licenses. Run `npm audit` periodically for known vulnerabilities.
