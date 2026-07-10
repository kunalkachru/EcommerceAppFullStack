# E2E Keyboard Robustness & Live-LLM Testing Integration — Design

**Date:** 2026-07-10
**Status:** Draft — pending user review

## Goal

Two related problems, one spec:

1. **Root-cause fix for the on-screen keyboard covering fields** in Maestro flows on both Android and iOS — currently causes intermittent, hard-to-reproduce failures (e.g. `login.yaml`'s `login-password` visibility check), because the soft keyboard renders over content below the focused field, and whether that content ends up hidden depends on scroll position at that instant.
2. **Wire Phase 6/7's automated photo/voice/size/spec E2E work together with the existing (already-approved) live-LLM-reasoning infrastructure** from `docs/superpowers/specs/2026-07-06-llm-env-automation-design.md`, clarifying exactly which test runs the agent executes itself (credential-free) versus which the user must trigger personally (real API keys).

## Part 1: Keyboard root cause and fix

### Root cause

The Android emulator's AVD config already sets `hw.keyboard=yes` (treats the host as a physical keyboard) and `show_ime_with_hard_keyboard` is `0` (soft keyboard should suppress when a hardware keyboard is active). Empirically the on-screen Gboard keyboard still renders and covers fields below the focused input. This is because Android only suppresses the soft keyboard once it has received a **real physical key event** proving hardware keyboard use — Maestro's `tapOn` + `inputText` goes through the accessibility/touch injection path, which does not count as that proof, so Android shows the default IME regardless of `hw.keyboard=yes`.

Because the keyboard occupies roughly the bottom 40% of the screen once shown, whether a field positioned below the one just typed into ends up hidden is purely a function of absolute scroll position at that moment — explaining why this has been intermittent (worked repeatedly earlier in the session, then failed 5/5 times after an emulator restart shifted that position) rather than reliably broken or reliably working.

iOS Simulator has an analogous but mechanically distinct problem and fix: enabling "Connect Hardware Keyboard" (`Cmd+Shift+K` / the `ConnectHardwareKeyboard` preference) suppresses its on-screen keyboard the same way.

### Fix: suppress the keyboard at the source, per platform

**Android** — disable the on-screen IME entirely for the test session:
```bash
adb shell ime disable com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME
```
With no enabled software IME and `hw.keyboard=yes` already set, Android has nothing to render when a field is focused; `inputText` still delivers text via Maestro's input-injection path. Re-enable is symmetric (`ime enable ...`) if a flow ever needs to test the keyboard itself (none currently do).

**iOS** — enable the Simulator's hardware-keyboard preference once per machine:
```bash
defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool YES
```
This is a `Simulator.app` preference, not per-AVD — set once, persists across simulator restarts.

**New script:** `scripts/disable-soft-keyboard.mjs --platform android|ios`
- Idempotent (safe to re-run; checking current state before changing it where practical).
- Exits non-zero with a clear message if no device/simulator is reachable (adb device / booted simulator check), rather than silently no-op'ing.

**Wiring:** called automatically at the start of the two canonical npm entry points (`maestro:android`, `maestro:ios` in `package.json`) before the `maestro test` invocation, plus documented as a standalone command (`node scripts/disable-soft-keyboard.mjs --platform android`) for ad-hoc/interactive runs. The project's several older overlapping runner scripts (`run-e2e-android-maestro.sh`, `e2e-android-final.mjs`, etc.) are out of scope — this only touches the two currently-canonical entry points plus the standalone script.

### Belt-and-suspenders: explicit `hideKeyboard` in flows

Even with the IME disabled, add an explicit `- hideKeyboard` step (a native Maestro command, already used successfully in `.maestro/flows/06-llm-reasoning.yaml`) immediately after every `inputText` step in any flow where a later step needs to see content below the just-typed field. This is a second line of defense, not the primary fix — if IME suppression fully works, `hideKeyboard` is a fast no-op; if suppression is incomplete in some environment (e.g. a CI machine with different AVD defaults), this still prevents the failure.

Flows affected: `.maestro/android/login.yaml`, `.maestro/ios/login.yaml`, and any other current or future flow with a type-then-check-below-it pattern (grep for `inputText` followed by a subsequent `extendedWaitUntil`/`assertVisible`/`tapOn` targeting a *different* element to identify candidates at implementation time).

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

- **Keyboard fix:** re-run `login.yaml` on both platforms after IME suppression is wired in; confirm `login-password` visibility check passes without relying on lucky scroll position. Verify by deliberately testing from a fresh emulator/simulator boot (the exact condition that exposed the bug) rather than a warm one.
- **Phase 6 gate (unblocked by the keyboard fix):** re-run the two-sample photo-search verification (`Blue & Black Check Shirt` already passed once; `Nike Air Jordan 1 Red And Black` blocked by the login flake) to close out the existing Phase 6 gate.
- **LLM integration:** agent runs `06-llm-reasoning.yaml` with `DEMO_LLM_PROVIDER=ollama` to confirm the flow's mechanics (toggle, key field, provider selection, query, result assertion) are sound. User runs `node scripts/run-e2e-all.mjs` themselves for real-provider confirmation and reports pass/fail back.

## Out of scope

- Rewriting or consolidating the project's several overlapping legacy E2E runner scripts (`run-e2e-android-maestro.sh`, `e2e-android-final.mjs`, `run-e2e-android.mjs`, etc.) — noted as existing clutter, not touched here.
- Any change to how `src/.env` itself is structured or gitignored — already correct per the 2026-07-06 spec.
- Phase 7's multi-parameter search rewrite — separate, already-planned work in the static-catalog plan.
