# Search Runtime Matrix

| Runtime | Purpose | Server Port | Env |
|---------|---------|-------------|-----|
| `baseline` | Current production-like semantic-first search | `5001` | `server/.env` |
| `hybrid` | Lexical + semantic rerank (available on `main`, port 5002) | `5002` | `server/.env.hybrid.example` |

## Notes

- The mobile client can switch between runtimes without changing the legacy API contract.
- `PORT` always wins if explicitly provided.
- `SEARCH_RUNTIME=hybrid` selects the redesigned retrieval strategy defaults.
