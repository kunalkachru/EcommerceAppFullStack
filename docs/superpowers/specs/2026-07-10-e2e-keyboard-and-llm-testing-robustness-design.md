# E2E Keyboard Robustness & Live-LLM Testing Integration — Design

**Date:** 2026-07-10
**Status:** Part 1 revised after implementation (IME-disable approach was tried and reverted — see "Revision" below), and extended to cover the iOS keyboard/photo-search findings below. Part 2 approved as designed.

## Goal

Two related problems, one spec:

1. **Root-cause fix for the on-screen keyboard covering fields** in Maestro flows on both Android and iOS — currently causes intermittent, hard-to-reproduce failures (e.g. `login.yaml`'s `login-password` visibility check), because the soft keyboard renders over content below the focused field, and whether that content ends up hidden depends on scroll position at that instant.
2. **Wire Phase 6/7's automated photo/voice/size/spec E2E work together with the existing (already-approved) live-LLM-reasoning infrastructure** from `docs/superpowers/specs/2026-07-06-llm-env-automation-design.md`, clarifying exactly which test runs the agent executes itself (credential-free) versus which the user must trigger personally (real API keys).

## Part 1: Keyboard root cause and fix

### Root cause

The Android emulator's AVD config already sets `hw.keyboard=yes` (treats the host as a physical keyboard) and `show_ime_with_hard_keyboard` is `0` (soft keyboard should suppress when a hardware keyboard is active). Empirically the on-screen Gboard keyboard still renders and covers fields below the focused input. This is because Android only suppresses the soft keyboard once it has received a **real physical key event** proving hardware keyboard use — Maestro's `tapOn` + `inputText` goes through the accessibility/touch injection path, which does not count as that proof, so Android shows the default IME regardless of `hw.keyboard=yes`.

Because the keyboard occupies roughly the bottom 40% of the screen once shown, whether a field positioned below the one just typed into ends up hidden is purely a function of absolute scroll position at that moment — explaining why this has been intermittent (worked repeatedly earlier in the session, then failed 5/5 times after an emulator restart shifted that position) rather than reliably broken or reliably working.

iOS Simulator has an analogous but mechanically distinct problem, now validated directly (see "iOS findings" below) — the Android conclusion does NOT transfer as-is.

### iOS findings (validated)

iOS has no hardware back button, so the Android `pressKey: back` keyboard-dismiss convention does not apply. Two distinct iOS-specific bugs were found and fixed:

1. **`ml-features-comprehensive.yaml`'s manually-duplicated login block used `pressKey: back` after each `inputText`, copy-pasted from the Android version without adaptation.** On iOS this command completes without error but does not dismiss the keyboard, so the keyboard stayed open and the next `tapOn: id: "login-password"` landed on the still-focused email field instead — confirmed directly via screenshot, the email field ended up containing the literal concatenated string `test@example.comysecret123g`. Fixed by replacing the manually-duplicated login block with `runFlow: login.yaml` (the already-validated canonical iOS login flow, which uses the correct convention: tap the next field directly by id, with an optional `tapOn: text: "Sign in"` in between as a dismiss — no back-press involved).
2. **The same file also used `pressKey: back` to submit search queries** (`inputText` into the product-search field). This is likewise a no-op on iOS. The search field is wired to `returnKeyType="search"` + `onSubmitEditing` (`src/screens/ProductListScreen.jsx`), so the correct key is the iOS return/search key. Fixed by replacing both occurrences with `pressKey: enter`.
3. **`ml-features-comprehensive.yaml` (iOS) also had the wrong `appId`** — it was set to the Android package id (`com.ecommerceappfullstack`) instead of the iOS bundle id (`org.reactjs.native.example.EcommerceAppFullStack`), meaning the file could not have launched the correct app on a real run. Fixed.
4. **`photo-search.yaml` (iOS): a layout-ordering scroll bug**, unrelated to the keyboard issue above. `photo-closest-match` (the top-match "compare" row) renders *above* `photo-results-section` (the full matches grid) in `HomeScreen.jsx`'s JSX. The original two-step scroll (scroll to `photo-results-section`, then continue scrolling to `photo-closest-match`) overshot past `photo-closest-match` entirely, landing at the bottom of the screen ("Browse the full catalog"). Confirmed via failure screenshot. Fixed by collapsing to a single `scrollUntilVisible` targeting `photo-closest-match` directly, with `timeout: 60000` (covers the CLIP/reranker search-completion wait, not just the scroll) and `centerElement: true`.

Notably, `.maestro/ios/login.yaml` itself needed **no fix** — it already used the correct per-field-tap convention and was stable across repeated runs (see Testing). The bug was confined to files that had duplicated Android-style login/search logic inline instead of composing the canonical iOS flow.

### Revision: IME-disable was tried and reverted — do not repeat it

The first version of this spec proposed disabling the on-screen IME entirely (`adb shell ime disable ...`) as the fix, on the theory that "no keyboard to render" removes the bug at the source. **This was implemented, tested, and found to break the suite in a different way, so it was reverted.**

What actually happened: this project's Android flows use `pressKey: back` pervasively (17+ occurrences across `checkout.yaml`, `complete-e2e*.yaml`, `ml-multiparameter-search.yaml`, `ml-features-comprehensive.yaml`, `login.yaml`) as the established, working keyboard-dismiss convention — pressing back is intercepted by the IME to close the keyboard when the keyboard is actually showing. With the IME disabled, there's no keyboard to intercept the back press, so it performs **real back-navigation** instead — reproduced directly: `hideKeyboard` (added as an initial belt-and-suspenders step) exited the app to the Android home launcher instead of doing nothing, because there was no keyboard for it to hide.

`scripts/disable-soft-keyboard.mjs` was removed. **Do not re-add IME-disable to the Android path** — it is fundamentally incompatible with this codebase's existing `pressKey: back` convention, and fixing that would mean touching every flow that relies on it, a much larger and riskier change than the field-visibility problem warrants.

### Fix: scroll to the target with centering, not a blind visibility check

The actual, implemented, validated fix leaves the keyboard alone and instead makes field-visibility checks robust to it being present:

- Replace a bare `extendedWaitUntil: visible: id: X` (which only checks hierarchy presence + raw on-screen coordinates, not whether the keyboard currently covers those coordinates) with `scrollUntilVisible: element: { id: X }, direction: DOWN` immediately before interacting with a field that might sit behind the keyboard. `scrollUntilVisible` actively scrolls until the target genuinely clears the viewport, keyboard included.
- Where the target can end up only *barely* visible at a screen edge (observed directly: `photo-closest-match`'s bounds were `[144,0][1297,204]`, clipped by the status bar, and a tap there missed the real button with no error), add `centerElement: true` to the `scrollUntilVisible` so the element lands away from any edge before tapping.
- Existing `pressKey: back` keyboard-dismiss steps are left untouched — they already work correctly precisely because the keyboard is genuinely present when they run.

Applied to: `.maestro/android/login.yaml` (`login-password` visibility, was a bare `extendedWaitUntil`, now `scrollUntilVisible`) and `.maestro/android/photo-search.yaml` (`photo-closest-match`, added `centerElement: true`). Both validated with repeated real runs against the emulator (see Testing).

## Part 2: Integrating with existing live-LLM infrastructure

### What already exists (approved 2026-07-06, do not duplicate)

- `scripts/load-env.mjs` — `loadClientEnv()`, `hasClientLlmKey()`, `maestroLlmEnv()` (resolves `src/.env` → `{DEMO_LLM_API_KEY, DEMO_LLM_PROVIDER}`).
- `scripts/verify-llm-live.mjs` — direct API-level live-reasoning checks (no UI) for each configured provider.
- `.maestro/flows/06-llm-reasoning.yaml` — full UI flow: login → enable `llm-reasoning-switch` → type `${DEMO_LLM_API_KEY}` into `voice-api-key-input` → select provider → run a live query → assert a result appears.
- `scripts/run-e2e-all.mjs` — already wires all of the above together: if `hasClientLlmKey()` is true, runs `06-llm-reasoning.yaml` on both Android and iOS automatically.

This is exactly the credential-safe pattern (env-var templating, never a literal key in any file) needed for live-reasoning UI verification. No new key-handling infrastructure is needed.

### The execution-boundary constraint (new, must be documented explicitly)

Maestro's default terminal progress output prints the **literal resolved value** for `inputText` steps (observed directly and repeatedly this session — e.g. `Input text test@example.com... COMPLETED` shows the real value, not a placeholder). Any process that captures that stdout — including the agent's own Bash tool, whose output becomes part of the conversation transcript — will see the real API key in plain text if a real key is loaded when `06-llm-reasoning.yaml` runs.

Consequence: **the agent must never execute `run-e2e-all.mjs` (or invoke `06-llm-reasoning.yaml` directly) while a real OpenAI/OpenRouter/Groq/Gemini key is present in `src/.env` or process env.** This applies regardless of user authorization — it is a property of the tool's output, not a trust decision.

**Two-tier execution split:**

| Tier | Who runs it | Provider | Where the key lives |
|------|-------------|----------|---------------------|
| Automated (agent-run) | Agent, unattended, repeatable | Ollama (local, `keyOptional: true`) | N/A — no real secret involved |
| Live-provider (user-run) | User, manually, in their own terminal | OpenAI / OpenRouter / Groq / Gemini per `src/.env` | `src/.env`, read only by `run-e2e-all.mjs`'s own process — never passes through the agent |

The agent's automated tier still genuinely exercises the `useLlmReasoning: true` code path end-to-end (same toggle, same API contract, same reranker) — only the answering model differs. This is not a downgraded test; it's the same code path with a credential-free provider.

For the user-run tier, the agent's job is limited to: keeping `06-llm-reasoning.yaml` correct and passing when Ollama is selected as `DEMO_LLM_PROVIDER=ollama` (so the agent CAN safely dry-run the flow's mechanics with zero secrets), and handing the user the exact one-line command to run themselves for real-provider coverage, e.g.:
```bash
node scripts/run-e2e-all.mjs
```
(`load-env.mjs` auto-detects whichever of `OPENAI_API_KEY`/`OPENROUTER_API_KEY` is set in `src/.env`).

## Testing

- **Keyboard fix (Android, done):** `login.yaml` re-run 3x consecutively against a real emulator, passed every time (previously 5/5 failures). Root cause confirmed via direct `uiautomator dump` bounds inspection, not assumption.
- **Phase 6 gate (Android, done):** two-sample photo-search verification, both passing end-to-end with exact product-title assertions and PDP confirmation — `Blue & Black Check Shirt` (mens-clothing/sample-1) and `Nike Air Jordan 1 Red And Black` (footwear/sample-1).
- **Phase 6 gate (iOS, done):** `login.yaml` validated stable across repeated runs with no changes needed (3/4 clean, one run discarded due to acknowledged manual interference during testing, not a script defect). `photo-search.yaml` validated end-to-end for both samples — `Blue & Black Check Shirt` (mens-clothing/sample-1, run twice for repeatability) and `Nike Air Jordan 1 Red And Black` (footwear/sample-1) — all reaching `pdp-add-to-cart`. `ml-features-comprehensive.yaml` (iOS) fixed (wrong appId, Android-style `pressKey: back` in login and search submission, photo-search Phase 3 placeholder replaced with the real subflow) and validated 2/2 consecutive clean runs (exit 0).
- **iOS regression check (done):** `complete-e2e-clean.yaml` (the canonical flow wired into `npm run maestro:ios`, unmodified by this work) re-run and passed (exit 0) after the `photo-search.yaml`/`ml-features-comprehensive.yaml` changes — confirms no side effects on other iOS flows. Jest suite: 159/160 passing, the 1 failure (`goldenFixtures.test.js`, missing checked-in image path) is pre-existing and unrelated, matching the Android regression baseline.
- **LLM integration:** agent runs `06-llm-reasoning.yaml` with `DEMO_LLM_PROVIDER=ollama` to confirm the flow's mechanics (toggle, key field, provider selection, query, result assertion) are sound. User runs `node scripts/run-e2e-all.mjs` themselves for real-provider confirmation and reports pass/fail back.

## Out of scope

- Rewriting or consolidating the project's several overlapping legacy E2E runner scripts (`run-e2e-android-maestro.sh`, `e2e-android-final.mjs`, `run-e2e-android.mjs`, etc.) — noted as existing clutter, not touched here.
- `.maestro/ios/complete-e2e.yaml` (the non-"clean" variant) — confirmed unreferenced by any npm script or runner (`complete-e2e-clean.yaml` is the canonical one wired into `maestro:ios`); it has the same `pressKey: back` bug but is dead code, not touched here.
- Any change to how `src/.env` itself is structured or gitignored — already correct per the 2026-07-06 spec.
- Phase 7's multi-parameter search rewrite — separate, already-planned work in the static-catalog plan.
