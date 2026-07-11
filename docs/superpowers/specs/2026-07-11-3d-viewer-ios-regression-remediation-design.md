# 3D Viewer iOS Regression Remediation Design

**Goal:** Fix a confirmed regression where the 3D product viewer never actually renders on iOS
(silently stuck loading forever), fix the test-assertion weakness that let it ship as "plan
complete" despite extensive Maestro coverage, and re-verify all 12 categories on both platforms
with a corrected assertion before PR #3 is allowed to merge.

**Non-goals:** Per-product-exact 3D models (discussed and explicitly deferred to a separate
future brainstorm — infeasible within the project's "real, licensed, not fabricated" data rule;
see Context below). No new features, no scope beyond fixing this regression and re-verifying.

## Context

Found via live manual testing on the iOS Simulator, right before merging PR #3 — the user
selected a mens-clothing product ("Gigabyte Aorus Men Tshirt," `dj-84`), tapped the 3D toggle,
and saw a permanently blank viewer (no model, no error message, no retry button).

**Root cause 1 — the bug itself:** `server/src/index.js`'s Helmet CSP config spreads
`helmet.contentSecurityPolicy.getDefaultDirectives()`, which includes `upgrade-insecure-requests`
by default. This silently upgrades `product-3d-viewer.html`'s own subresource fetches
(`model-viewer.min.js`, `product-3d-viewer.js`) to `https://`, which fails dead silently against
the plain-HTTP local dev server — no console error, no server-log entry, nothing reaches the
bridge to report either `"loaded"` or `"error"`. Confirmed via server-log diffing (before: only
the top-level HTML request appears after tapping the 3D toggle; after removing the directive and
restarting the server: all four expected requests fire) and a simulator screenshot showing the
model rendering. WKWebView enforces this CSP-driven upgrade; Android's WebView and desktop Chrome
(used for this project's earlier CDP-based standalone verification) both treat
`http://localhost`/`127.0.0.1` as already-trustworthy and never upgrade, so neither was ever
affected. Reproduced on two categories from two different phases (mens-clothing/`dj-84`,
footwear/`dj-88`), confirming it's systemic (the CSP header applies server-wide), not isolated
to one model file. **Fix already applied and empirically verified**: added
`"upgrade-insecure-requests": null` to the directives object. Harmless on Railway (already
all-HTTPS in production, so there was nothing to "upgrade" there in the first place).

**Root cause 2 — why extensive Maestro testing never caught it:**
`.maestro/ios/product-3d-viewer.yaml`'s (and the Android equivalent's) success assertion is
`extendedWaitUntil: notVisible: id: "product-3d-retry"`. The retry button only renders when the
JS bridge posts an explicit `{"type":"error"}` message. When the bridge script never loads at all
(this exact bug), `Product3DViewer`'s status state stays stuck on its initial `"loading"` value
forever — it never reaches `"error"` either. So "retry not visible" was trivially satisfied by
both a real success *and* this silent failure mode. It never actually proved `"loaded"` was
reached. This means every iOS 3D-viewer Maestro result recorded across this whole plan (Stage 5's
four Phase 1 categories, Task 6.3's eight Phase 2 categories) must be treated as unverified for
real visual success, not just the two categories manually spot-checked. Android's flow has the
same latent assertion weakness, though no live bug was ever found there.

**Deferred (separate future brainstorm, not part of this remediation):** the user asked whether
per-product-exact 3D models are achievable instead of generic per-category placeholders.
Concluded infeasible within this project's real/licensed-data rule (no free 3D library has
assets matching specific synthetic-catalog SKUs; AI reconstruction from 2D photos would be
fabricated data, explicitly disallowed) — logged as a follow-up topic (sourcing-quality
improvements, UI copy/expectation-setting, or scoping 3D to lower-variance categories), not
addressed here.

## Remediation plan

1. **Strengthen the Maestro success assertion on both platforms** to check the actual bridge
   status text via `product-3d-status`'s own rendered text, not just "no error shown":
   ```yaml
   - extendedWaitUntil:
       visible:
         id: "product-3d-status"
         text: "loaded"
       timeout: 15000
   ```
   Apply to both `.maestro/android/product-3d-viewer.yaml` and
   `.maestro/ios/product-3d-viewer.yaml`, replacing the old `notVisible: product-3d-retry` check.
2. **Re-verify all 12 categories on iOS** with the corrected assertion — every prior iOS result
   is unverified for real success, not just the two categories manually caught.
3. **Re-verify all 12 categories on Android too**, even though no live bug was found there —
   confirms the corrected assertion behaves correctly on the platform already known to work
   (exercises the new assertion path itself, not just the app).
4. **Commit** the CSP fix and both strengthened `.yaml` files as their own commit(s), following
   this project's established one-fix-per-commit discipline.
5. **Correct the plan document**
   (`docs/superpowers/plans/2026-07-11-3d-product-models.md`): replace the "STATUS: COMPLETE"
   claim with an honest account of this regression — root cause, why testing missed it, the fix,
   and the corrected re-verification results — before re-declaring the plan complete.
6. **Hold the merge**: PR #3 stays open until steps 1–5 are done and all 24 re-verifications
   (12 categories × 2 platforms) pass with the corrected assertion.

## Testing / Verification

This plan *is* the verification pass. Success criterion: all 24 category/platform combinations
pass with the corrected `product-3d-status` text assertion (not the old weak one), plus the
existing full Jest + Maestro regression suites remain green on both platforms (already
established baseline from before this bug was found).

## Risks / Open Questions

- None identified — root causes are empirically confirmed, not hypothesized, and the fix has
  already been validated to work.
