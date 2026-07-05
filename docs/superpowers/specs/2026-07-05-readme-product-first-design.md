# README product-first redesign — design

**Date:** 2026-07-05  
**Status:** Approved  
**Approach:** A — single README restructure (product top, developer reference below fold)

## Goal

Make `README.md` impress portfolio visitors and technical reviewers equally: product story and media first; preserve existing developer docs, gates, and links below a clear `#for-developers` divider.

## Audience

Option C — both recruiters/portfolio readers and technical reviewers.

## Section layout

### Above the fold (product)

1. **Hero** — ShopEase tagline, one-liner, stack badge line
2. **Try it** — Appetize phone/tablet links + demo login (unchanged URLs)
3. **Watch it** — Two-column media:
   - App flow: poster `docs/e2e/08-order-summary.png` → `docs/demo/videos/app-flow-demo.mp4`
   - ML search: poster `docs/e2e/photo-search-results.png` → `docs/demo/videos/ml-features-demo.mp4`
   - Optional `<video controls width="320">` below each poster for GitHub inline playback
4. **What ShopEase does** — E-commerce domain bullets (browse, cart, checkout, orders, auth)
5. **Multimodal search** — Text / voice / photo capabilities; 3-line hybrid summary; link `docs/ML_SEARCH.md`
6. **Architecture at a glance** — Stack line + two mermaid diagrams (user flow LR + full-stack LR); links `ARCHITECTURE.md`, `DEPLOYMENT.md`

### Below the fold (`#for-developers`)

Preserve from current README with light dedup:

- Quick start
- Cloud demo / CI doc table (condensed — no duplicate of hero Appetize block)
- Documentation index
- Project status summary
- Testing gates table
- Repository layout + key modules
- npm scripts
- Configuration
- External review checklist
- License

**Remove from README body:** Long "ML search design evolution" PR narrative (detail stays in `ML_SEARCH.md`).

## Media policy

| Asset | Role |
|-------|------|
| `docs/demo/videos/app-flow-demo.mp4` | Primary app-flow video (26 MB) |
| `docs/demo/videos/ml-features-demo.mp4` | Primary ML video (49 MB) |
| E2E PNG posters | Fast-loading thumbnails linking to MP4 |
| iOS `ios/*-short.mp4` | Mention in `docs/demo/videos/README.md` only; README uses root Android recordings |

Large ML video: poster + link primary; inline `<video>` secondary.

## Out of scope

- New `docs/DEVELOPERS.md` file
- `<details>` collapsible sections
- Re-recording videos
- CI/CD workflow changes

## Success criteria

- First screen on GitHub shows product, live demo, and visual media
- Mermaid user-flow diagram renders on GitHub
- All existing doc links and verify commands remain reachable below fold
- No broken relative paths to videos or screenshots
