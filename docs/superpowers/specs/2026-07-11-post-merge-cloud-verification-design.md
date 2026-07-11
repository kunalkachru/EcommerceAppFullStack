# Post-Merge Cloud Verification Design

**Goal:** Merge PR #3 (`feature/static-product-catalog` → `main`, 162 commits: static catalog,
multi-parameter search, visual/voice search, and the 3D Product Models feature) into `main`,
then confirm the two cloud systems that auto-trigger from that push — Railway (backend API) and
Appetize (public mobile demo) — actually come up healthy on the new code, then prove the mobile
app works correctly against the live Railway endpoint via full Maestro E2E on both platforms.

**Non-goals:** Building new features, changing application code (except reverting
`config/app-target.json` to its default at the end), triggering an iOS Appetize rebuild
(explicitly deferred — Android-only Appetize rebuild is in scope, iOS Appetize stays on its last
uploaded build for now).

## Context

- PR: https://github.com/kunalkachru/EcommerceAppFullStack/pull/3
- `origin/main` currently has one commit that neither local `main` nor the feature branch has:
  `0761cff "Restrict Appetize CI to mobile bundle paths only"` (touches
  `.github/workflows/appetize-demo.yml` and `docs/APPETIZE_BROWSERSTACK.md`).
- The feature branch independently touched the same two files in commit `d1830b3`, but at
  non-overlapping line ranges (verified via `git show` diff comparison) — GitHub's PR merge
  should resolve this automatically with no conflict, since it merges against `origin/main`'s
  actual current tip.
- Railway (`docs/RAILWAY_DEPLOY.md`): GitHub-connected, root directory `server`, tracks branch
  `main` — auto-redeploys on every push to `main`, no manual trigger needed.
- Appetize (`.github/workflows/appetize-demo.yml`): GitHub Actions workflow, auto-triggers on
  push to `main` when the diff touches its path filter (`src/**`, `config/**`, `package.json`,
  etc. — this merge touches several of these). Push-to-`main` only rebuilds the **Android** demo
  by default; iOS requires a separate manual `workflow_dispatch` with `include_ios: true`
  (explicitly out of scope for this pass, per user decision).
- Existing tooling this plan reuses (no new scripts needed):
  - `npm run verify:cloud:deploy-gate` — retries transient Railway cold-start/CLIP-reindex
    failures, blocks on real regressions.
  - `npm run verify:cloud:all` — full cloud API + CLIP + ML + search verification.
  - `scripts/with-api-target.mjs cloud <command>` — temporarily flips
    `config/app-target.json` to `{"mode":"cloud"}` for the duration of `<command>`, then restores
    it automatically. Preferred over hand-editing the config file.
- Environment note: the iOS Simulator (`iPhone 17 Pro Max`,
  `7EABE577-D15B-4B90-848F-EDAC9BF2FC7A`) is already booted from earlier work this session; the
  Android emulator is currently shut down. Per the machine's memory constraint (only one of
  {Android emulator, iOS Simulator} can run at a time), this plan runs iOS first, then closes it
  and boots Android — the reverse of the platform order used earlier in this session, chosen
  simply because iOS is already up.

## Decisions (confirmed with the user)

1. **Merge strategy:** regular merge commit (`gh pr merge 3 --merge`), not squash or rebase —
   preserves all 162 individual commits and their messages.
2. **Merge safety:** re-check the PR's live mergeable status immediately before merging. If
   GitHub reports anything other than cleanly mergeable, **stop and show the user the
   conflicting files/hunks** — do not force-resolve (no `-X ours`/`-X theirs`, no unilateral
   conflict resolution).
3. **Appetize scope:** Android-only (automatic, no manual iOS trigger this pass).
4. **Cloud E2E scope:** full regression on both platforms, not a smoke subset — the same test
   list already proven locally:
   - `login.yaml` x3
   - `photo-search.yaml`, both samples (`mens-clothing/sample-1.webp`, `sample-2.webp`)
   - `ml-features-comprehensive.yaml`
   - `complete-e2e-clean.yaml`
   - the 3D-viewer flow (`product-3d-viewer.yaml`) across all 12 catalog categories
5. **Execution mode:** pause once after the merge completes, to confirm with the user that
   Railway and Appetize actually came up healthy, before spending emulator/simulator time on
   device testing. Otherwise proceed straight through per this session's standing "run the plan
   through without stopping except for genuine blockers" convention.
6. **Platform order:** iOS first (simulator already booted), then Android.

## Stages

### Stage A: Merge

1. `gh pr view 3 --json mergeable,mergeStateStatus` — confirm still cleanly mergeable. If not,
   stop and surface the conflict to the user.
2. `gh pr merge 3 --merge` — regular merge commit, closes the PR, pushes to `main`.
3. **Checkpoint — pause here and report the merge result to the user before continuing.**

### Stage B: Confirm both auto-triggered cloud deploys are healthy

4. Railway: `curl /health` and `curl /api/visual-search/status` for a quick pulse, then
   `npm run verify:cloud:deploy-gate` — do not proceed to Stage C until this is green.
5. Appetize: check the `appetize-demo.yml` GitHub Actions run for the merge commit
   (`gh run list`/`gh run view`) succeeded.

### Stage C: Cloud-pointed E2E — iOS first, then Android

6. iOS: `scripts/with-api-target.mjs cloud <maestro command>` for each flow in the Decision-4
   test list, against the already-booted `iPhone 17 Pro Max` simulator.
7. Shut down the iOS Simulator; boot the Android emulator.
8. Android: same full test list against cloud, same wrapper-script pattern.

### Stage D: Cleanup and close-out

9. Confirm `config/app-target.json` reads `{"mode": "local"}` (the wrapper script restores this
   automatically after each cloud-pointed command — this step just verifies it, no manual edit
   expected).
10. Final report: merge commit SHA, Railway health result, Appetize workflow run status/URL, and
    a pass/fail table for the iOS and Android cloud regressions.

## Testing / Verification

This plan *is* the verification pass — Stage B verifies the two cloud deploys, Stage C verifies
the mobile app against the live Railway endpoint on both platforms. No separate test-writing is
needed; all commands reuse existing project scripts and Maestro flows.

## Risks / Open Questions

- If Stage A's mergeable check comes back non-clean, this plan pauses for user input on
  resolution — no predetermined resolution strategy, by design (see Decision 2).
- If Railway's deploy-gate doesn't go green within its retry budget, Stage C should not proceed
  until the user is consulted on whether to keep waiting, investigate, or abort this pass.
