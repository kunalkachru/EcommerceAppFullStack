# README product-first Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or inline execution.

**Goal:** Restructure `README.md` — product hero + media + architecture above fold; developer reference below `#for-developers`.

**Architecture:** Single-file reorder (Approach A). No new docs. Posters link to committed MP4s in `docs/demo/videos/`.

**Tech Stack:** Markdown, Mermaid, existing assets only.

## Global Constraints

- Preserve all Appetize URLs and demo login unchanged
- Preserve verify commands and doc index below fold
- No CI cost changes
- Trim long ML PR narrative from README (keep in ML_SEARCH.md)

---

### Task 1: Rewrite README product sections

**Files:**
- Modify: `README.md`

- [ ] Add hero, Try it, Watch it (posters + video links)
- [ ] Add e-commerce capabilities + multimodal ML + mermaid diagrams
- [ ] Add `#for-developers` divider; move existing dev content below

**Verify:** Open README on GitHub preview; mermaid renders; video/screenshot links resolve.

---

### Task 2: Spec doc (done)

**Files:**
- Create: `docs/superpowers/specs/2026-07-05-readme-product-first-design.md`
