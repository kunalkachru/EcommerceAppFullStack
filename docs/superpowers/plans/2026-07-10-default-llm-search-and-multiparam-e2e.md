# Default LLM Search, Secure Key Persistence & Multi-Parameter E2E Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This plan is designed to be resumable by a different agent than the one who started it.**
> Every task has an explicit **Entry Criteria** (what must already be true/done before this
> task may start) and **Exit Criteria** (the observable proof this task is done — not "I
> believe it's done" but a command and its expected output). Before starting any task, verify
> its Entry Criteria yourself — don't trust a `Status` field alone, since it can go stale.
> After finishing a task, update its `Status` field in this file and commit that update.

**Goal:** Fix two real bugs in the rule-based natural-language query parser, make
LLM-based search understanding the automatic default across both search surfaces (with a
securely-persisted, never-server-stored-long-term API key), and rewrite
`ml-multiparameter-search.yaml` into a real, falsifiable E2E test of both the rule-based and
LLM-reasoning search paths — on Android first, then iOS.

**Architecture:** Three sequential stages, each gating the next. Stage A fixes
`server/src/voiceQueryParser.js` so natural conversational size phrasing works correctly.
Stage B adds `react-native-keychain`-backed secure key persistence and threads a shared
`resolveDefaultLlmOptions()` helper into both `ProductListScreen.jsx`'s plain search box and
`VoiceSearchCard.jsx`'s voice/AI card, so LLM reasoning activates automatically once a key
exists, with the existing toggle becoming an override. Stage C derives real multi-parameter
test queries from the live catalog and writes four new Maestro flows (rule-based + LLM path,
Android + iOS) using the same exact-title-assertion + PDP-tap-through pattern already proven
in `photo-search.yaml`.

**Tech Stack:** Node.js/Express backend (`server/`), React Native 0.85.3 frontend (`src/`),
Jest for unit tests, `node --test` for script tests, Maestro for E2E, `react-native-keychain`
(new dependency) for secure on-device storage.

## Global Constraints

- **Android and iOS Maestro flows live in permanently separate folders** (`.maestro/android/`
  vs `.maestro/ios/`) with zero shared/conditional/templated files between them — a hard
  project requirement. `.maestro/flows/06-llm-reasoning.yaml` is a pre-existing, already-wired
  exception to this rule from before it was established; do not follow its shared-file pattern
  for anything new, and do not modify it as part of this plan.
- **The agent implementing this plan must never execute a Maestro flow with a real
  OpenAI/OpenRouter/Groq/Gemini API key present** (directly or via env-var pass-through it
  invokes itself) — Maestro's terminal output prints the literal resolved value for
  `inputText` steps, which becomes part of the agent's own transcript. Only Ollama
  (`keyOptional: true`, credential-free) may be used for any flow the agent runs itself. Real
  API key coverage for `06-llm-reasoning.yaml`-style flows is the user's job, run in the
  user's own terminal — never the implementing agent's.
- **TDD is required for every code change in Stages A and B**: write the failing test, watch
  it fail for the expected reason, write minimal code to pass, watch it pass, then move on.
  No production code without a failing test first.
- **Each stage's full regression suite must be green before the next stage starts.** Stage A
  gates Stage B. Stage B gates Stage C. Within Stage C, Android's full regression gates the
  start of the iOS tasks.
- **`server/catalog-static.json` has the shape `{ updatedAt, products: [...] }`** — it is not
  a bare array. Any script reading it must do `require("../server/catalog-static.json").products`,
  never assume the file's top level is the array itself.
- **`scripts/fixtures/golden-image-fixtures.json` is currently broken** (three photo paths
  that no longer exist, causing 1 pre-existing Jest failure in
  `__tests__/goldenFixtures.test.js`) — this is a known, unrelated, out-of-scope issue. Every
  "full regression green" gate in this plan means 159+N/160+N passing (N = new tests added by
  this plan), with that one specific pre-existing failure as the only allowed exception. If
  any *other* test fails, that is a real regression and must be fixed before proceeding.

---

## Stage A: Parser bug fixes

### Task A1: Fix natural-language size extraction in `voiceQueryParser.js`

**Status:** Not Started

**Entry Criteria:**
- Working tree is clean on `feature/static-product-catalog` (or its current active branch).
- `npm test` passes with exactly one known failure: `goldenFixtures.test.js`'s "defines image
  fixtures that point at checked-in photos" (run `npm test` now and confirm this before
  starting, so any *other* pre-existing failure is caught before you get blamed for it).

**Exit Criteria:**
- `npm test -- voiceQueryParser` shows all tests passing, including the two new ones below.
- `npm test` (full suite) shows the same single pre-existing `goldenFixtures.test.js` failure
  and nothing else red.
- Both bugs verified fixed by direct execution (commands given in Step 6 below), not just by
  the unit tests passing.

**Files:**
- Modify: `server/src/voiceQueryParser.js:29-36` (constants), `:166-185` (`extractSize`)
- Test: `__tests__/voiceQueryParser.sizeSpec.test.js` (existing file — add to it)

**Interfaces:**
- Consumes: nothing new — this task only changes the internals of the existing exported
  `parseVoiceQuery(text)` function's `size` field.
- Produces: `parseVoiceQuery(text).size` now correctly returns `"M"` for `"medium"`-style
  spoken phrasing, and correctly returns `null` (not a false `"S"`) for queries containing
  contractions like `"that's"`/`"it's"`. No signature changes — later tasks (Stage C) rely on
  `parseVoiceQuery` continuing to be a synchronous function returning
  `{ size, colors, specifications, ... }` as it already does today.

- [ ] **Step 1: Write the two failing tests**

Add to the end of `__tests__/voiceQueryParser.sizeSpec.test.js` (inside the existing
`describe` block, after the last `it`):

```js
  it("extracts a spelled-out size word from a natural sentence", () => {
    const intent = parseVoiceQuery("a shirt in medium size");
    expect(intent.size).toBe("M");
  });

  it("does not false-match a size letter inside a contraction", () => {
    const intent = parseVoiceQuery("a shirt that's nice");
    expect(intent.size).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/voiceQueryParser.sizeSpec.test.js -v`

Expected: 2 failures.
- `"extracts a spelled-out size word from a natural sentence"` fails with
  `Expected: "M", Received: null`
- `"does not false-match a size letter inside a contraction"` fails with
  `Expected: null, Received: "S"`

If the failures show different values than this, stop — something else has already changed
this file's behavior; investigate before continuing.

- [ ] **Step 3: Add the size-word synonym table**

In `server/src/voiceQueryParser.js`, immediately after the existing `SIZE_SHOE_NUMBERS`
constant (currently line 36), add:

```js
// Spoken-word -> stored-code canonicalization. Size is the only attribute where the
// catalog's stored value (XS/S/M/L/XL/XXL) is an abbreviation a person wouldn't actually
// say out loud -- colors/materials/specifications don't have this gap because the catalog
// already stores the plain word ("waterproof", "brown") that matches natural speech. If a
// future attribute is ever added with this same code-vs-word mismatch, reuse this pattern
// rather than inventing a new one.
const SIZE_WORD_SYNONYMS = {
  "extra small": "XS",
  "small": "S",
  "medium": "M",
  "large": "L",
  "extra large": "XL",
  "extra-large": "XL",
  "double extra large": "XXL",
  "2xl": "XXL",
};
```

- [ ] **Step 4: Rewrite `extractSize()` to use the synonym table and fix the contraction bug**

Replace the existing `extractSize` function (currently lines 166-185):

```js
function extractSize(text) {
  const lower = String(text).toLowerCase();

  // Spoken-word sizes ("medium", "extra large") take priority. Check longer phrases
  // first so "extra large" matches before a bare "large" substring inside it would.
  const sortedSynonyms = Object.keys(SIZE_WORD_SYNONYMS).sort((a, b) => b.length - a.length);
  for (const phrase of sortedSynonyms) {
    if (wordMatch(lower, phrase)) {
      return SIZE_WORD_SYNONYMS[phrase];
    }
  }

  // Explicit "size X" / "size X waist" phrasing takes priority over a bare letter.
  const sizeMatch = lower.match(/\bsize\s+([a-z0-9]+)\b/);
  if (sizeMatch) {
    const raw = sizeMatch[1].toUpperCase();
    if (
      SIZE_LETTER_WORDS.includes(raw.toLowerCase()) ||
      SIZE_WAIST_NUMBERS.includes(sizeMatch[1]) ||
      SIZE_SHOE_NUMBERS.includes(sizeMatch[1])
    ) {
      return raw;
    }
  }

  // Bare letter size as a standalone word (e.g. "trousers XL brown"). Guard against
  // contractions like "that's"/"it's": the apostrophe creates a word boundary that would
  // otherwise let the trailing "s" false-match as size S. The negative lookbehind excludes
  // any match immediately preceded by an apostrophe. This file runs only in Node.js (server
  // + Jest), never on-device, so lookbehind support is not a Hermes/React-Native concern.
  for (const w of ["xxxl", "xxl", "xl", "s", "m", "l", "xs"]) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<!')\\b${escaped}\\b`, "i");
    if (re.test(lower)) return w.toUpperCase();
  }
  return null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/voiceQueryParser.sizeSpec.test.js -v`

Expected: all tests in the file PASS, including the two new ones and the three pre-existing
ones (`"brown trousers size XL"` → `"XL"`, `"blue jeans size 32 waist"` → `"32"`, etc. — these
must still pass unchanged, proving the rewrite didn't regress explicit `"size X"` phrasing).

- [ ] **Step 6: Verify both bugs directly, not just via the unit test**

Run:
```bash
node -e "
const { parseVoiceQuery } = require('./server/src/voiceQueryParser');
console.log(parseVoiceQuery('a shirt in medium size').size);
console.log(parseVoiceQuery(\"a shirt that's nice\").size);
console.log(parseVoiceQuery('brown trousers size XL').size);
console.log(parseVoiceQuery('blue jeans size 32 waist').size);
"
```
Expected output, in order: `M`, `null`, `XL`, `32`.

- [ ] **Step 7: Run the full Jest suite to confirm no regressions**

Run: `npm test`

Expected: only `__tests__/goldenFixtures.test.js`'s pre-existing "defines image fixtures that
point at checked-in photos" test fails (unrelated, tracked separately). Every other suite,
including the two new tests, passes.

- [ ] **Step 8: Commit**

```bash
git add server/src/voiceQueryParser.js __tests__/voiceQueryParser.sizeSpec.test.js
git commit -m "fix: recognize spelled-out sizes and stop contraction false-match in query parser

- extractSize() now recognizes natural spoken size words (small/medium/large/
  extra large) via a new SIZE_WORD_SYNONYMS table, not just letter codes.
- Fixed a false-positive where a contraction like \"that's\" was misread as
  size \"S\" (apostrophe creates a word boundary the bare-letter fallback
  didn't guard against). Confirmed via direct execution, not assumption:
  parseVoiceQuery(\"a shirt in medium size\").size was null, now \"M\";
  parseVoiceQuery(\"a shirt that's nice\").size was \"S\", now null."
```

---

## Stage B: Secure key persistence + default-reasoning UX

**Stage B Entry Criteria (verify before starting Task B1):** Task A1's Exit Criteria are all
met (`npm test` shows only the one known pre-existing failure) and the Task A1 commit exists
on the branch (`git log --oneline -1 -- server/src/voiceQueryParser.js` shows the fix commit).

### Task B1: Add secure on-device key storage module

**Status:** Not Started

**Entry Criteria:** Stage B Entry Criteria met (see above).

**Exit Criteria:**
- `react-native-keychain` appears in `package.json` `dependencies`.
- `npx jest __tests__/secureLlmKeyStorage.test.js -v` passes, all cases green.
- `jest.setup.js` contains a `jest.mock("react-native-keychain", ...)` block.

**Files:**
- Modify: `package.json` (add dependency), `jest.setup.js` (add mock)
- Create: `src/utils/secureLlmKeyStorage.js`
- Test: `__tests__/secureLlmKeyStorage.test.js`

**Interfaces:**
- Produces: `getPersistedLlmKey(userId = null): Promise<string>`,
  `setPersistedLlmKey(key, userId = null): Promise<void>`,
  `deletePersistedLlmKey(userId = null): Promise<void>` — all exported from
  `src/utils/secureLlmKeyStorage.js`. `userId` scoping mirrors the existing
  `src/utils/llmSessionStore.js`'s pattern (`getSessionLlmKey(userId)` /
  `setSessionLlmKey(key, userId)`) so switching accounts on one device can't leak another
  user's key. Task B3 consumes these three functions by exact name.

- [ ] **Step 1: Install the dependency**

Run: `npm install react-native-keychain`

Expected: `package.json` `dependencies` now includes `"react-native-keychain"`. (No native
pod/gradle install step is required to run the Jest unit tests in this task — those come at
Task B7's manual on-device verification.)

- [ ] **Step 2: Add the global Jest mock**

In `jest.setup.js`, add this block (placement: anywhere among the other `jest.mock(...)`
calls, e.g. right after the `@react-native-async-storage/async-storage` mock):

```js
jest.mock("react-native-keychain", () => {
  const store = new Map();
  return {
    setGenericPassword: jest.fn((username, password, options) => {
      store.set(options?.service ?? "default", { username, password });
      return Promise.resolve(true);
    }),
    getGenericPassword: jest.fn((options) => {
      const entry = store.get(options?.service ?? "default");
      return Promise.resolve(entry ? { username: entry.username, password: entry.password } : false);
    }),
    resetGenericPassword: jest.fn((options) => {
      store.delete(options?.service ?? "default");
      return Promise.resolve(true);
    }),
  };
});
```

- [ ] **Step 3: Write the failing test**

Create `__tests__/secureLlmKeyStorage.test.js`:

```js
const {
  getPersistedLlmKey,
  setPersistedLlmKey,
  deletePersistedLlmKey,
} = require("../src/utils/secureLlmKeyStorage");

describe("secureLlmKeyStorage", () => {
  it("returns an empty string when no key is stored", async () => {
    const key = await getPersistedLlmKey("user-1");
    expect(key).toBe("");
  });

  it("persists and retrieves a key scoped to a user id", async () => {
    await setPersistedLlmKey("sk-test-key", "user-1");
    const key = await getPersistedLlmKey("user-1");
    expect(key).toBe("sk-test-key");
  });

  it("scopes keys per user id so one user cannot read another's key", async () => {
    await setPersistedLlmKey("sk-user-a-key", "user-a");
    const keyForB = await getPersistedLlmKey("user-b");
    expect(keyForB).toBe("");
  });

  it("deletes a stored key", async () => {
    await setPersistedLlmKey("sk-to-delete", "user-2");
    await deletePersistedLlmKey("user-2");
    const key = await getPersistedLlmKey("user-2");
    expect(key).toBe("");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx jest __tests__/secureLlmKeyStorage.test.js -v`

Expected: FAIL — `Cannot find module '../src/utils/secureLlmKeyStorage'`.

- [ ] **Step 5: Write the implementation**

Create `src/utils/secureLlmKeyStorage.js`:

```js
import * as Keychain from "react-native-keychain";

const SERVICE_PREFIX = "shopease-llm-key";

function serviceFor(userId) {
  return userId ? `${SERVICE_PREFIX}:${userId}` : SERVICE_PREFIX;
}

export async function getPersistedLlmKey(userId = null) {
  try {
    const result = await Keychain.getGenericPassword({ service: serviceFor(userId) });
    return result ? String(result.password || "") : "";
  } catch {
    return "";
  }
}

export async function setPersistedLlmKey(key, userId = null) {
  const trimmed = String(key || "").trim();
  if (!trimmed) {
    return deletePersistedLlmKey(userId);
  }
  try {
    await Keychain.setGenericPassword("llm-api-key", trimmed, { service: serviceFor(userId) });
  } catch {
    // Secure storage unavailable (e.g. device policy) -- degrade to session-only
    // behavior for this session rather than crashing. Caller (llmSearchDefaults.js /
    // VoiceSearchCard.jsx) already keeps the key in llmSessionStore.js regardless.
  }
}

export async function deletePersistedLlmKey(userId = null) {
  try {
    await Keychain.resetGenericPassword({ service: serviceFor(userId) });
  } catch {
    // Nothing stored, or storage unavailable -- either way there's nothing left to do.
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest __tests__/secureLlmKeyStorage.test.js -v`

Expected: all 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json jest.setup.js src/utils/secureLlmKeyStorage.js __tests__/secureLlmKeyStorage.test.js
git commit -m "feat: add secure on-device LLM key storage via react-native-keychain

New src/utils/secureLlmKeyStorage.js wraps react-native-keychain (iOS
Keychain / Android Keystore) with the same userId-scoping pattern already
used by the session-only llmSessionStore.js. This is the persistence layer
Task B3/B4 build the default-reasoning behavior on top of."
```

### Task B2: Extract provider URL/model normalization helpers into the shared config module

**Status:** Not Started

**Entry Criteria:** Task B1 Exit Criteria met.

**Exit Criteria:**
- `src/config/llmProviders.js` exports `normalizeProviderBaseUrl` and
  `normalizeProviderModel`.
- `src/components/VoiceSearchCard.jsx` no longer defines these functions locally — it imports
  them instead.
- `npm test` still shows only the one known pre-existing failure (this task changes no
  behavior, only moves code — a regression here means the move broke something).

**Files:**
- Modify: `src/config/llmProviders.js`, `src/components/VoiceSearchCard.jsx:68-88`

**Interfaces:**
- Produces: `normalizeProviderBaseUrl(provider, rawBaseUrl): string`,
  `normalizeProviderModel(provider, rawModel): string`, both exported from
  `src/config/llmProviders.js`. Task B3's `resolveDefaultLlmOptions()` consumes these two
  functions by exact name and signature.

This is a pure move — no logic changes. Right-sized as its own task because it's a
prerequisite Task B3 depends on, and a reviewer could reasonably approve "the move is clean"
independently of "the new resolver function is correct."

- [ ] **Step 1: Move the two functions**

In `src/config/llmProviders.js`, add at the end of the file (after `resolveProviderBaseUrl`):

```js
function isKnownProviderBaseUrl(url) {
  return LLM_PROVIDERS.some((p) => resolveProviderBaseUrl(p) === url);
}

function isKnownProviderModel(model) {
  return LLM_PROVIDERS.some((p) => p.defaultModel === model);
}

export function normalizeProviderBaseUrl(provider, rawBaseUrl) {
  const targetBase = resolveProviderBaseUrl(provider);
  const current = String(rawBaseUrl || "").trim();
  if (!current) return targetBase;
  // If this is a stale default from another provider, auto-correct.
  if (isKnownProviderBaseUrl(current) && current !== targetBase) {
    return targetBase;
  }
  return current;
}

export function normalizeProviderModel(provider, rawModel) {
  const targetModel = provider.defaultModel;
  const current = String(rawModel || "").trim();
  if (!current) return targetModel;
  // If this is a stale default from another provider, auto-correct.
  if (isKnownProviderModel(current) && current !== targetModel) {
    return targetModel;
  }
  return current;
}
```

- [ ] **Step 2: Remove the local copies from `VoiceSearchCard.jsx` and import instead**

In `src/components/VoiceSearchCard.jsx`, delete lines 68-88 (the local
`isKnownProviderBaseUrl`, `isKnownProviderModel`, `normalizeProviderBaseUrl`,
`normalizeProviderModel` function definitions — everything between the `EXAMPLE_HINTS`
constant and the `const VoiceSearchCard = ({ onResults, disabled = false }) => {` line).

Change the import block (currently lines 40-44):
```js
import {
  LLM_PROVIDERS,
  getProviderById,
  resolveProviderBaseUrl,
} from "../config/llmProviders";
```
to:
```js
import {
  LLM_PROVIDERS,
  getProviderById,
  resolveProviderBaseUrl,
  normalizeProviderBaseUrl,
  normalizeProviderModel,
} from "../config/llmProviders";
```

- [ ] **Step 3: Run the full test suite to confirm nothing broke**

Run: `npm test`

Expected: same single pre-existing `goldenFixtures.test.js` failure, nothing else changed.
(There is no dedicated `VoiceSearchCard.test.jsx` today; the coverage here is the full-suite
regression check plus the manual verification in Task B7.)

- [ ] **Step 4: Commit**

```bash
git add src/config/llmProviders.js src/components/VoiceSearchCard.jsx
git commit -m "refactor: move provider URL/model normalization into llmProviders.js

Pure move, no behavior change -- normalizeProviderBaseUrl/normalizeProviderModel
were local to VoiceSearchCard.jsx; Task B3's shared resolveDefaultLlmOptions()
needs them too, so they belong in the shared config module, not duplicated."
```

### Task B3: Add the shared `resolveDefaultLlmOptions()` helper

**Status:** Not Started

**Entry Criteria:** Task B2 Exit Criteria met.

**Exit Criteria:**
- `npx jest __tests__/llmSearchDefaults.test.js -v` passes, all cases green.

**Files:**
- Create: `src/utils/llmSearchDefaults.js`
- Test: `__tests__/llmSearchDefaults.test.js`

**Interfaces:**
- Consumes: `loadLlmPreferences()` from `src/utils/llmSearchPreferences.js` (existing,
  unchanged), `getSessionLlmKey(userId)` / `setSessionLlmKey(key, userId)` from
  `src/utils/llmSessionStore.js` (existing, unchanged), `getPersistedLlmKey(userId)` from
  Task B1's `src/utils/secureLlmKeyStorage.js`, `getProviderById(id)` /
  `normalizeProviderBaseUrl` / `normalizeProviderModel` from Task B2's
  `src/config/llmProviders.js`.
- Produces: `resolveDefaultLlmOptions(userId = null): Promise<{ useLlmReasoning, providerId,
  apiKey, baseUrl, model }>` — the exact shape `searchCatalog()`'s third argument
  (`llmOptions`) already expects (matches `VoiceSearchCard.jsx`'s existing `llmPayload()`
  return shape). Tasks B4 and B5 both call this function by exact name.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/llmSearchDefaults.test.js`:

```js
jest.mock("../src/utils/llmSearchPreferences", () => ({
  loadLlmPreferences: jest.fn(),
}));
jest.mock("../src/utils/llmSessionStore", () => ({
  getSessionLlmKey: jest.fn(),
  setSessionLlmKey: jest.fn(),
}));
jest.mock("../src/utils/secureLlmKeyStorage", () => ({
  getPersistedLlmKey: jest.fn(),
}));

const { loadLlmPreferences } = require("../src/utils/llmSearchPreferences");
const { getSessionLlmKey, setSessionLlmKey } = require("../src/utils/llmSessionStore");
const { getPersistedLlmKey } = require("../src/utils/secureLlmKeyStorage");
const { resolveDefaultLlmOptions } = require("../src/utils/llmSearchDefaults");

describe("resolveDefaultLlmOptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stays off when no key exists anywhere and the provider requires one", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("");
    getPersistedLlmKey.mockResolvedValue("");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(false);
    expect(result.apiKey).toBe("");
  });

  it("turns on automatically when a session key already exists", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("sk-session-key");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(true);
    expect(result.apiKey).toBe("sk-session-key");
    expect(getPersistedLlmKey).not.toHaveBeenCalled();
  });

  it("falls back to secure storage and hydrates the session store when no session key exists", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("");
    getPersistedLlmKey.mockResolvedValue("sk-persisted-key");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(true);
    expect(result.apiKey).toBe("sk-persisted-key");
    expect(setSessionLlmKey).toHaveBeenCalledWith("sk-persisted-key", "user-1");
  });

  it("respects an explicit saved preference of false even when a key exists", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: false,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("sk-session-key");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(false);
  });

  it("allows reasoning for a keyOptional provider (ollama) even with no key", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "ollama",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("");
    getPersistedLlmKey.mockResolvedValue("");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(true);
    expect(result.providerId).toBe("ollama");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/llmSearchDefaults.test.js -v`

Expected: FAIL — `Cannot find module '../src/utils/llmSearchDefaults'`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/llmSearchDefaults.js`:

```js
import { getProviderById, normalizeProviderBaseUrl, normalizeProviderModel } from "../config/llmProviders";
import { loadLlmPreferences } from "./llmSearchPreferences";
import { getSessionLlmKey, setSessionLlmKey } from "./llmSessionStore";
import { getPersistedLlmKey } from "./secureLlmKeyStorage";

/**
 * Resolves the default llmOptions payload for a search call without requiring the
 * caller to have visited VoiceSearchCard first. Checks the fast in-memory session key,
 * falls back to secure on-device storage, and hydrates the session store from it so
 * later calls in the same session skip the secure-storage round trip.
 */
export async function resolveDefaultLlmOptions(userId = null) {
  const prefs = await loadLlmPreferences();
  const provider = getProviderById(prefs.providerId || "groq");

  let apiKey = getSessionLlmKey(userId);
  if (!apiKey) {
    apiKey = await getPersistedLlmKey(userId);
    if (apiKey) {
      setSessionLlmKey(apiKey, userId);
    }
  }

  const hasUsableKey = provider.keyOptional === true || apiKey.length > 0;

  return {
    useLlmReasoning: Boolean(prefs.useLlmReasoning) && hasUsableKey,
    providerId: provider.id,
    apiKey: apiKey.trim(),
    baseUrl: normalizeProviderBaseUrl(provider, prefs.baseUrl),
    model: normalizeProviderModel(provider, prefs.model),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/llmSearchDefaults.test.js -v`

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/llmSearchDefaults.js __tests__/llmSearchDefaults.test.js
git commit -m "feat: add resolveDefaultLlmOptions() shared resolver

Single source of truth for 'should this search use LLM reasoning, and with
which key' -- checks session key, falls back to secure storage, respects an
explicit saved preference of false. Task B4 wires this into VoiceSearchCard,
Task B5 wires it into the plain product-search box."
```

### Task B4: Wire `VoiceSearchCard.jsx` to persist keys and hydrate from secure storage

**Status:** Not Started

**Entry Criteria:** Task B3 Exit Criteria met.

**Exit Criteria:**
- `npm test` still shows only the one known pre-existing failure.
- Manual smoke check (Task B7 covers full device verification; this task's own check is
  narrower): reading the diff shows `setPersistedLlmKey` called wherever `setSessionLlmKey`
  is currently called with a user-provided key, and the mount effect calling
  `resolveDefaultLlmOptions` as a fallback.

**Files:**
- Modify: `src/components/VoiceSearchCard.jsx:36-38` (import), `:117-140` (mount effect),
  `:184` (key save point)

**Interfaces:**
- Consumes: `resolveDefaultLlmOptions` (Task B3), `setPersistedLlmKey` (Task B1).
- Produces: no new exports — this task only changes `VoiceSearchCard.jsx`'s internal
  behavior. Its public props (`onResults`, `disabled`) are unchanged.

- [ ] **Step 1: Update the import block**

In `src/components/VoiceSearchCard.jsx`, change (currently lines 35-38):
```js
import {
  getSessionLlmKey,
  setSessionLlmKey,
  clearSessionLlmKey,
} from "../utils/llmSessionStore";
```
to add two new imports right after it:
```js
import {
  getSessionLlmKey,
  setSessionLlmKey,
  clearSessionLlmKey,
} from "../utils/llmSessionStore";
import { setPersistedLlmKey } from "../utils/secureLlmKeyStorage";
import { resolveDefaultLlmOptions } from "../utils/llmSearchDefaults";
```

- [ ] **Step 2: Hydrate from secure storage on mount**

Replace the mount effect (currently lines 117-136):
```js
  useEffect(() => {
    let mounted = true;
    (async () => {
      await ensureLlmPreferencesMigrated();
      const prefs = await loadLlmPreferences();
      if (!mounted) return;
      const provider = getProviderById(prefs.providerId || "groq");
      const normalizedBase = normalizeProviderBaseUrl(provider, prefs.baseUrl);
      const normalizedModel = normalizeProviderModel(provider, prefs.model);
      setUseLlmReasoning(prefs.useLlmReasoning);
      setProviderId(provider.id);
      setBaseUrl(normalizedBase);
      setModel(normalizedModel);
      setApiKey(getSessionLlmKey(userId));
      await fetchVoiceSearchConfig().catch(() => null);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);
```
with:
```js
  useEffect(() => {
    let mounted = true;
    (async () => {
      await ensureLlmPreferencesMigrated();
      const prefs = await loadLlmPreferences();
      if (!mounted) return;
      const provider = getProviderById(prefs.providerId || "groq");
      const normalizedBase = normalizeProviderBaseUrl(provider, prefs.baseUrl);
      const normalizedModel = normalizeProviderModel(provider, prefs.model);
      setProviderId(provider.id);
      setBaseUrl(normalizedBase);
      setModel(normalizedModel);
      // resolveDefaultLlmOptions checks the session key first, falls back to secure
      // storage, and hydrates the session store -- so this single call covers both
      // "already used this session" and "app was just restarted" cases.
      const defaults = await resolveDefaultLlmOptions(userId);
      if (!mounted) return;
      setUseLlmReasoning(defaults.useLlmReasoning || prefs.useLlmReasoning);
      setApiKey(defaults.apiKey || getSessionLlmKey(userId));
      await fetchVoiceSearchConfig().catch(() => null);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);
```

- [ ] **Step 3: Persist the key wherever it's saved to the session store**

In the `runSearch` callback, change (currently line 184):
```js
        setSessionLlmKey(apiKey, userId);
```
to:
```js
        setSessionLlmKey(apiKey, userId);
        await setPersistedLlmKey(apiKey, userId);
```

Also, in the `onSaveApiKey`/direct-input handler if one exists separately from `runSearch`
(check around line 325, `setSessionLlmKey(value, userId);`) — apply the same change there:
```js
        setSessionLlmKey(value, userId);
        setPersistedLlmKey(value, userId);
```
(This second call site is fire-and-forget/not awaited since it's inside a synchronous
event handler, not the async `runSearch` — matches the existing code style at that call
site, which does not await either.)

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: same single pre-existing `goldenFixtures.test.js` failure, nothing else changed.

- [ ] **Step 5: Commit**

```bash
git add src/components/VoiceSearchCard.jsx
git commit -m "feat: persist VoiceSearchCard's LLM key to secure storage, hydrate on mount

Keys saved via the Voice card now survive app restarts (Keychain/Keystore),
not just the current session. Mount effect uses the shared
resolveDefaultLlmOptions() so this component and the plain search box
(Task B5) resolve identically."
```

### Task B5: Wire `ProductListScreen.jsx`'s search box to use LLM reasoning by default

**Status:** Not Started

**Entry Criteria:** Task B4 Exit Criteria met.

**Exit Criteria:**
- `npm test` still shows only the one known pre-existing failure.
- Reading the diff shows `runSmartSearch()` calling `resolveDefaultLlmOptions(userId)` and
  passing the result as `searchCatalog()`'s third argument.

**Files:**
- Modify: `src/screens/ProductListScreen.jsx:1-35` (imports), `:106-152` (`runSmartSearch`)

**Interfaces:**
- Consumes: `resolveDefaultLlmOptions` (Task B3).
- Produces: no new exports.

- [ ] **Step 1: Add the imports**

In `src/screens/ProductListScreen.jsx`, add to the import block (after the existing
`searchCatalog, matchIdsFromProducts` import, currently around line 24-27):
```js
import { resolveDefaultLlmOptions } from "../utils/llmSearchDefaults";
```

- [ ] **Step 2: Get the current user's id**

In the component body, right after `const { products, isLoading, error, isOfflineFallback, refetch, catalogTotal } = useCatalogProducts();` (currently line 38-39), add:
```js
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id ?? user?.email ?? null;
```
(`useSelector` is already imported at the top of this file — no new import needed for this
line.)

- [ ] **Step 3: Use the resolved LLM options in `runSmartSearch`**

Change (currently line 118):
```js
        const result = await searchCatalog(q, products);
```
to:
```js
        const llmOptions = await resolveDefaultLlmOptions(userId);
        const result = await searchCatalog(q, products, llmOptions);
```

Also add `userId` to `runSmartSearch`'s `useCallback` dependency array (currently
`[searchQuery, products, clearSmartSearch]`, becomes
`[searchQuery, products, clearSmartSearch, userId]`).

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: same single pre-existing `goldenFixtures.test.js` failure, nothing else changed.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProductListScreen.jsx
git commit -m "feat: main search box uses LLM reasoning automatically when a key exists

runSmartSearch() now resolves llmOptions via the shared
resolveDefaultLlmOptions() before calling searchCatalog(), matching
VoiceSearchCard's behavior. Previously this screen's search box always
passed useLlmReasoning: false regardless of any key the user had configured
elsewhere in the app."
```

### Task B6: Add the first-run "add a key" invite banner

**Status:** Not Started

**Entry Criteria:** Task B5 Exit Criteria met.

**Exit Criteria:**
- `npm test` still shows only the one known pre-existing failure.
- New component file exists and is rendered conditionally in `ProductListScreen.jsx`.

**Files:**
- Create: `src/components/LlmSearchInviteBanner.jsx`
- Modify: `src/screens/ProductListScreen.jsx`

**Interfaces:**
- Produces: `LlmSearchInviteBanner` component, props `{ onPressSetup: () => void }`. No
  other task depends on this component's internals.

- [ ] **Step 1: Create the banner component**

Create `src/components/LlmSearchInviteBanner.jsx`:

```jsx
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, radius, spacing, typography } from "../theme/tokens";

const DISMISSED_KEY = "@shopease/llm-invite-banner-dismissed";

const LlmSearchInviteBanner = ({ onPressSetup }) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(DISMISSED_KEY).then((value) => {
      if (mounted) setDismissed(value === "true");
    });
    return () => {
      mounted = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, "true");
  }, []);

  if (dismissed) return null;

  return (
    <View style={styles.banner} testID="llm-invite-banner">
      <Text style={styles.text}>
        Add your API key for smarter search that understands full sentences.
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          testID="llm-invite-banner-setup"
          onPress={() => {
            dismiss();
            onPressSetup?.();
          }}
        >
          <Text style={styles.setupLink}>Set up</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="llm-invite-banner-dismiss" onPress={dismiss}>
          <Text style={styles.dismissLink}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  text: {
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
  },
  setupLink: {
    color: colors.accent,
    fontWeight: "600",
  },
  dismissLink: {
    color: colors.textMuted,
  },
});

export default LlmSearchInviteBanner;
```

Token values confirmed directly against `src/theme/tokens.js`: `colors.surfaceMuted`,
`colors.text`, `colors.accent`, `colors.textMuted`, `spacing.{xs,sm,md}`, and `radius.md` all
exist exactly as named above — no `colors.primary` or `typography.body` exist in this
codebase (typography only exports `displayFamily`/`eyebrowSpacing`; body text styling is done
via inline `fontSize` per component, matching this component's `text` style above).

- [ ] **Step 2: Render it conditionally in `ProductListScreen.jsx`**

Add the import:
```js
import LlmSearchInviteBanner from "../components/LlmSearchInviteBanner";
```

Add state to track whether a key exists (near the other `useState` calls, after the `userId`
line added in Task B5):
```js
  const [hasLlmKey, setHasLlmKey] = useState(false);

  useEffect(() => {
    let mounted = true;
    resolveDefaultLlmOptions(userId).then((opts) => {
      if (mounted) setHasLlmKey(Boolean(opts.apiKey));
    });
    return () => {
      mounted = false;
    };
  }, [userId]);
```

Render the banner just above the search input in the JSX (find the existing search-input
`TextInput` around line 380-390 and add immediately before its containing view):
```jsx
{!hasLlmKey && (
  <LlmSearchInviteBanner onPressSetup={() => navigation.navigate("Home")} />
)}
```
(`navigation` is already a prop on `ProductListScreen` per its signature
`({ navigation }) =>`. `"Home"` is confirmed as the exact registered route name in
`src/navigation/BottomTabNavigator.jsx:109` — `<Tab.Screen name="Home" component={HomeScreen} ... />`
— where `VoiceSearchCard` is rendered.)

- [ ] **Step 3: Run the full test suite**

Run: `npm test`

Expected: same single pre-existing `goldenFixtures.test.js` failure, nothing else changed.

- [ ] **Step 4: Commit**

```bash
git add src/components/LlmSearchInviteBanner.jsx src/screens/ProductListScreen.jsx
git commit -m "feat: add one-time invite banner for LLM search setup

Shown on ProductListScreen when no key is configured yet; dismissible
forever via AsyncStorage flag (not the key itself -- this is just a UI
preference, no Keychain/Keystore needed). Search is never blocked by its
presence or absence."
```

### Task B7: Stage B regression gate — manual on-device verification

**Status:** Not Started

**Entry Criteria:** Tasks B1-B6 all committed.

**Exit Criteria (all must be observed directly, not assumed):**
- On a fresh Android emulator install: paste a key into the Voice card, force-close and
  reopen the app, confirm the key is still present without re-pasting, and confirm the plain
  "Search products" box now returns LLM-quality results for a natural-language query without
  touching the toggle.
- Same sequence repeated on a fresh iOS Simulator install.
- With no key configured (fresh install, skip the banner), confirm the plain search box still
  returns results via the rule-based parser (search is never blocked).
- The invite banner appears once on first launch with no key, and does not reappear after
  being dismissed.
- `npm test` (full suite) still shows only the one known pre-existing failure.

**Files:** None (verification only).

- [ ] **Step 1: Android verification**

```bash
npm run android
```
Log in, open the Home screen's Voice/AI card, paste a test key (a real key if available and
you are running this yourself — not the implementing agent, per the Global Constraints
credential rule — or any non-empty string to verify the persistence mechanics if not testing
a real LLM call), force-close the app via the emulator's recent-apps switcher, reopen it, and
confirm the key field is pre-filled without needing to paste again. Then go to the product
list's plain search box and type a natural-language multi-attribute query; confirm the
results reflect LLM-quality understanding (or, at minimum, confirm `useLlmReasoning: true`
was sent by checking the server log for that request).

- [ ] **Step 2: iOS verification**

```bash
npm run ios
```
Repeat the same sequence as Step 1 on the iOS Simulator.

- [ ] **Step 3: No-key path verification**

On a fresh install (or after calling `deletePersistedLlmKey()` for the test user), confirm
the plain search box still returns results (rule-based fallback), the invite banner appears,
and dismissing it (tap "Not now") means it does not reappear on the next app launch.

- [ ] **Step 4: Final full regression check**

Run: `npm test`

Expected: same single pre-existing `goldenFixtures.test.js` failure, nothing else changed.

- [ ] **Step 5: Update this plan's status**

Mark Tasks B1-B7 as `Status: Done` in this file and commit:
```bash
git add docs/superpowers/plans/2026-07-10-default-llm-search-and-multiparam-e2e.md
git commit -m "docs: mark Stage B complete in the implementation plan"
```

---

## Stage C: `ml-multiparameter-search.yaml` rewrite (Android, then iOS)

**Stage C Entry Criteria (verify before starting Task C1):** Task B7's Exit Criteria are all
met and committed.

### Task C1: Build the multi-parameter fixture generator

**Status:** Not Started

**Entry Criteria:** Stage C Entry Criteria met.

**Exit Criteria:**
- `node --test scripts/__tests__/multiparam-fixture-builder.test.mjs` passes.
- Running `node scripts/generate-multiparam-fixtures.mjs` produces
  `scripts/fixtures/golden-multiparam-queries.json` with exactly 6 entries (5 positive + 1
  no-match), each positive entry's `expectedProductTitle` corresponding to a real product
  currently in `server/catalog-static.json`.

**Files:**
- Create: `scripts/lib/multiparam-fixture-builder.mjs`
- Create: `scripts/generate-multiparam-fixtures.mjs`
- Create: `scripts/fixtures/golden-multiparam-queries.json` (generated output, committed like
  `golden-image-fixtures.json` and `golden-text-queries.json` already are)
- Test: `scripts/__tests__/multiparam-fixture-builder.test.mjs`

**Interfaces:**
- Produces: `buildFixtures(products): Array<{id, query, expectedProductTitle, attributesUsed}>`
  exported from `scripts/lib/multiparam-fixture-builder.mjs` (pure function, no I/O — testable
  without touching the filesystem). Tasks C2/C3/C5/C6 consume the JSON file this task
  generates, reading fields `query` and `expectedProductTitle` by exact name (mirrors
  `test-assets/image-search-samples/manifest.json`'s `productTitle` field naming precedent,
  adapted to this fixture's own shape).

- [ ] **Step 1: Write the failing test**

Create `scripts/__tests__/multiparam-fixture-builder.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildFixtures } from "../lib/multiparam-fixture-builder.mjs";

const SAMPLE_PRODUCTS = [
  {
    id: "p1",
    title: "Man Plaid Shirt",
    category: "mens-clothing",
    department: "fashion",
    price: 34.99,
    colors: ["red", "black", "white"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    materials: ["cotton", "wool"],
    specifications: {},
  },
  {
    id: "p2",
    title: "Essence Mascara Lash Princess",
    category: "beauty-fragrances",
    department: "beauty",
    price: 9.99,
    colors: ["black"],
    sizes: [],
    materials: [],
    specifications: { waterproof: true },
  },
  {
    id: "p3",
    title: "Nike Air Jordan 1 Red And Black",
    category: "footwear",
    department: "fashion",
    price: 120,
    colors: ["red", "black"],
    sizes: ["8", "9", "10"],
    materials: ["leather"],
    specifications: {},
  },
];

test("buildFixtures returns exactly 5 positive fixtures + 1 no-match fixture", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  const positive = fixtures.filter((f) => f.expectedProductTitle !== null);
  const noMatch = fixtures.filter((f) => f.expectedProductTitle === null);
  assert.equal(fixtures.length, 6);
  assert.equal(positive.length, 5);
  assert.equal(noMatch.length, 1);
});

test("every positive fixture's expectedProductTitle matches a real input product", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  const titles = new Set(SAMPLE_PRODUCTS.map((p) => p.title));
  for (const f of fixtures) {
    if (f.expectedProductTitle !== null) {
      assert.ok(titles.has(f.expectedProductTitle), `"${f.expectedProductTitle}" not in input products`);
    }
  }
});

test("every fixture has a natural-language query, not a keyword list", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  for (const f of fixtures) {
    assert.equal(typeof f.query, "string");
    assert.ok(f.query.length > 10);
    // A real sentence has at least one lowercase filler word a keyword-list query wouldn't.
    assert.ok(/\b(a|for|in|with|that|looking)\b/i.test(f.query), `"${f.query}" doesn't read like a sentence`);
  }
});

test("the no-match fixture's query does not match any real product", () => {
  const fixtures = buildFixtures(SAMPLE_PRODUCTS);
  const noMatch = fixtures.find((f) => f.expectedProductTitle === null);
  assert.ok(noMatch);
  assert.equal(typeof noMatch.query, "string");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/__tests__/multiparam-fixture-builder.test.mjs`

Expected: FAIL — cannot find module `../lib/multiparam-fixture-builder.mjs`.

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/multiparam-fixture-builder.mjs`:

```js
/**
 * Derives natural-language multi-parameter search fixtures from real catalog products,
 * instead of hand-invented query strings that may not match anything (see the diagnostic
 * finding: 4 of the original file's 5 queries matched zero real products).
 */

function hasAttrs(product, count) {
  let n = 0;
  if (product.colors?.length) n++;
  if (product.sizes?.length) n++;
  if (product.materials?.length) n++;
  if (Object.keys(product.specifications || {}).length) n++;
  return n >= count;
}

function sentenceFor(product) {
  const color = product.colors?.[0];
  const size = product.sizes?.[0];
  const material = product.materials?.[0];
  const specKeys = Object.keys(product.specifications || {}).filter(
    (k) => product.specifications[k] === true
  );
  const spec = specKeys[0];
  const typeWord = product.title.split(" ").slice(-1)[0].toLowerCase();

  const parts = ["I'm looking for a"];
  if (size) parts.push(`${sizeWord(size)}`);
  if (color) parts.push(color);
  if (material) parts.push(material);
  parts.push(typeWord);
  if (spec) parts.push(`that's ${spec}`);
  if (Number.isFinite(product.price)) parts.push(`under ${Math.ceil(product.price + 5)} dollars`);
  return parts.join(" ");
}

function sizeWord(code) {
  const map = { XS: "extra small", S: "small", M: "medium", L: "large", XL: "extra large", XXL: "double extra large" };
  return map[code] || code;
}

export function buildFixtures(products) {
  const candidates = products.filter((p) => hasAttrs(p, 2));
  // Prefer distinct departments/categories for breadth, then distinct attribute
  // combinations (color+size, price+spec, etc.) among the remainder.
  const seenCategories = new Set();
  const picked = [];
  for (const p of candidates) {
    if (picked.length >= 5) break;
    if (seenCategories.has(p.category)) continue;
    seenCategories.add(p.category);
    picked.push(p);
  }
  for (const p of candidates) {
    if (picked.length >= 5) break;
    if (picked.includes(p)) continue;
    picked.push(p);
  }

  const positive = picked.slice(0, 5).map((p, i) => ({
    id: `multiparam-${i + 1}`,
    query: sentenceFor(p),
    expectedProductTitle: p.title,
    attributesUsed: {
      color: p.colors?.[0] ?? null,
      size: p.sizes?.[0] ?? null,
      material: p.materials?.[0] ?? null,
    },
  }));

  const noMatch = {
    id: "multiparam-no-match",
    query: "I need a fluorescent pink size 47 titanium umbrella for my pet dinosaur",
    expectedProductTitle: null,
    attributesUsed: {},
  };

  return [...positive, noMatch];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/__tests__/multiparam-fixture-builder.test.mjs`

Expected: all 4 tests PASS.

- [ ] **Step 5: Write the CLI wrapper and generate the fixture file**

Create `scripts/generate-multiparam-fixtures.mjs`:

```js
#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFixtures } from "./lib/multiparam-fixture-builder.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const catalog = JSON.parse(
  await import("node:fs").then((fs) => fs.readFileSync(join(ROOT, "server", "catalog-static.json"), "utf8"))
);
const products = catalog.products;

const fixtures = buildFixtures(products);
const outDir = join(ROOT, "scripts", "fixtures");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "golden-multiparam-queries.json");
writeFileSync(outPath, JSON.stringify(fixtures, null, 2) + "\n");

console.log(`Wrote ${fixtures.length} fixtures to ${outPath}`);
fixtures.forEach((f) => console.log(`  ${f.id}: "${f.query}" -> ${f.expectedProductTitle ?? "(no match expected)"}`));
```

Run: `node scripts/generate-multiparam-fixtures.mjs`

Expected: prints 6 fixture lines, writes `scripts/fixtures/golden-multiparam-queries.json`.

- [ ] **Step 6: Manually verify the generated queries against the live parser**

For each of the 5 positive fixtures, run (substituting the actual generated query text):
```bash
node -e "
const { parseVoiceQuery } = require('./server/src/voiceQueryParser');
console.log(JSON.stringify(parseVoiceQuery('<paste generated query here>'), null, 2));
"
```
Confirm the extracted `size`/`colors`-via-`keywords`/`specifications` line up with that
fixture's `attributesUsed`. If any don't (e.g. the generated sentence structure trips a parser
edge case), adjust `sentenceFor()` in Step 3 and regenerate — do not proceed to Task C2 with a
fixture file that doesn't actually parse correctly, since Task C2's E2E assertions will be
unfalsifiable if the query itself is malformed.

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/multiparam-fixture-builder.mjs scripts/generate-multiparam-fixtures.mjs scripts/fixtures/golden-multiparam-queries.json scripts/__tests__/multiparam-fixture-builder.test.mjs
git commit -m "feat: generate multi-parameter search fixtures from the real catalog

Derives 5 natural-language positive queries + 1 no-match query from
server/catalog-static.json, instead of hand-invented strings -- the
original ml-multiparameter-search.yaml's 5 queries were checked and 4 of 5
matched zero real products (numeric jean waist sizes, bluetooth/wireless
spec keys, and brown trousers that don't exist in the current 196-product
catalog)."
```

### Task C2: Android `ml-multiparameter-search.yaml` (rule-based search box)

**Status:** Not Started

**Entry Criteria:** Task C1 Exit Criteria met. Android emulator running with the dev server
started fresh (`npm run start:baseline` in `server/`, confirm it serves the current product
count before testing — a stale server was the very first bug found in this project's Phase 6
work).

**Exit Criteria:**
- Running the flow against a booted Android emulator, once per positive fixture (5 runs) plus
  the no-match fixture (1 run), all exit 0.
- Each positive run's Maestro output shows the `assertVisible: text: <expectedProductTitle>`
  step as `COMPLETED`, not skipped/optional.

**Files:**
- Create: `.maestro/android/ml-multiparameter-search.yaml`

**Interfaces:**
- Consumes: `scripts/fixtures/golden-multiparam-queries.json` (Task C1) via `--env QUERY=...
  --env EXPECTED_PRODUCT_TITLE=...` (the flow itself takes these as env vars; a wrapper script
  or manual loop supplies one fixture's values per invocation, mirroring how
  `photo-search.yaml` is invoked once per sample rather than looping internally).

- [ ] **Step 1: Write the flow**

Create `.maestro/android/ml-multiparameter-search.yaml`:

```yaml
appId: com.ecommerceappfullstack
---
# Multi-parameter search via the plain "Search products" box on the product list
# screen -- exercises the rule-based parser (server/src/voiceQueryParser.js), NOT the
# LLM-reasoning path (see ml-multiparameter-search-llm.yaml for that).
#
# Requires env: QUERY - a natural-language query from
# scripts/fixtures/golden-multiparam-queries.json, EXPECTED_PRODUCT_TITLE - that same
# fixture's expectedProductTitle (empty/unset for the no-match fixture).
- tapOn:
    id: "tab-products"

- extendedWaitUntil:
    visible:
      id: "tab-products"
    timeout: 8000

- tapOn:
    text: "Search products"
    optional: true

- tapOn:
    text: "e.g. below 45"
    optional: true

- inputText: "${QUERY}"

- pressKey: Enter

- extendedWaitUntil:
    visible:
      text: "${EXPECTED_PRODUCT_TITLE}"
    timeout: 15000

- assertVisible:
    text: "${EXPECTED_PRODUCT_TITLE}"

- tapOn:
    text: "${EXPECTED_PRODUCT_TITLE}"

- extendedWaitUntil:
    visible:
      id: "pdp-add-to-cart"
    timeout: 10000
```

- [ ] **Step 2: Write a companion no-match flow variant**

Create `.maestro/android/ml-multiparameter-search-no-match.yaml`:

```yaml
appId: com.ecommerceappfullstack
---
# Companion to ml-multiparameter-search.yaml for the deliberate no-match fixture --
# verifies a graceful empty state, not a crash or irrelevant results.
#
# Requires env: QUERY - the no-match fixture's query text.
- tapOn:
    id: "tab-products"

- extendedWaitUntil:
    visible:
      id: "tab-products"
    timeout: 8000

- tapOn:
    text: "Search products"
    optional: true

- tapOn:
    text: "e.g. below 45"
    optional: true

- inputText: "${QUERY}"

- pressKey: Enter

- extendedWaitUntil:
    visible:
      text: "No close intent match yet"
    timeout: 15000

- assertVisible:
    text: "No close intent match yet"
```

(`"No close intent match yet"` is the exact banner title `ProductListScreen.jsx`'s
`runSmartSearch` sets today — currently line 138-140 — when `matches.length` is 0.)

- [ ] **Step 3: Run once per positive fixture**

For each of the 5 positive fixtures in `scripts/fixtures/golden-multiparam-queries.json`,
create a temporary flow that runs login then this flow (mirroring how
`_tmp-verify-photo-search.yaml` was used earlier in this project — a throwaway file with
`runFlow: login.yaml` + `runFlow: ml-multiparameter-search.yaml`, deleted before the final
commit), and run:

```bash
~/.maestro/bin/maestro test .maestro/android/_tmp-verify-multiparam.yaml \
  --env QUERY="<fixture query>" \
  --env EXPECTED_PRODUCT_TITLE="<fixture expectedProductTitle>"
```

Expected: exit 0, `assertVisible: text: "<title>"` shown as `COMPLETED`. Repeat for all 5.

- [ ] **Step 4: Run the no-match fixture**

```bash
~/.maestro/bin/maestro test .maestro/android/_tmp-verify-multiparam-no-match.yaml \
  --env QUERY="<no-match fixture query>"
```

Expected: exit 0.

- [ ] **Step 5: Delete the temporary verification files, commit the real ones**

```bash
rm .maestro/android/_tmp-verify-multiparam.yaml .maestro/android/_tmp-verify-multiparam-no-match.yaml
git add .maestro/android/ml-multiparameter-search.yaml .maestro/android/ml-multiparameter-search-no-match.yaml
git commit -m "feat: Android multi-parameter search E2E (rule-based search box)

Types catalog-derived natural-language queries into the plain 'Search
products' box and asserts the exact expected product title + PDP
tap-through, mirroring photo-search.yaml's proven pattern. Validated
against all 5 positive fixtures + the 1 no-match fixture from
scripts/fixtures/golden-multiparam-queries.json."
```

### Task C3: Android `ml-multiparameter-search-llm.yaml` (LLM-reasoning path via Ollama)

**Status:** Not Started

**Entry Criteria:** Task C2 Exit Criteria met. Local Ollama running (`ollama serve`) with a
model available (per `src/config/llmProviders.js`'s `ollama` provider, default model
`llama3.2`).

**Exit Criteria:**
- Running the flow against a booted Android emulator with Ollama enabled, once per positive
  fixture, all exit 0.

**Files:**
- Create: `.maestro/android/ml-multiparameter-search-llm.yaml`

**Interfaces:**
- Consumes: same fixture file as Task C2, plus the existing `llm-reasoning-switch` /
  `voice-provider-ollama` / `voice-typed-query-input` / `voice-search-button` testIDs already
  used by `.maestro/flows/06-llm-reasoning.yaml` (read that file for the exact enable-and-type
  sequence before writing this one — do not guess the steps).

- [ ] **Step 1: Write the flow**

Create `.maestro/android/ml-multiparameter-search-llm.yaml`, adapting
`.maestro/flows/06-llm-reasoning.yaml`'s enable-and-provider-select steps (read that file's
current content first) for the Ollama provider and this task's fixture queries:

```yaml
appId: com.ecommerceappfullstack
---
# Multi-parameter search via the LLM-reasoning path (Voice/AI search card), using Ollama
# (credential-free, keyOptional: true) so this flow is safe for the agent to run itself --
# see the Global Constraints in the plan this flow was written from: never run this style
# of flow with a real OpenAI/OpenRouter/Groq/Gemini key loaded.
#
# Requires env: QUERY - a natural-language query from
# scripts/fixtures/golden-multiparam-queries.json, EXPECTED_PRODUCT_TITLE - that fixture's
# expectedProductTitle.
- tapOn:
    id: "tab-home"

- scrollUntilVisible:
    element:
      id: "voice-search-card"
    direction: DOWN
    timeout: 15000

- tapOn:
    id: "llm-reasoning-switch"

- extendedWaitUntil:
    visible:
      id: "voice-api-key-input"
    timeout: 10000
    optional: true

- tapOn:
    id: "voice-provider-ollama"

- scrollUntilVisible:
    element:
      id: "voice-typed-query-input"
    direction: DOWN
    timeout: 15000

- tapOn:
    id: "voice-typed-query-input"

- inputText: "${QUERY}"

- tapOn:
    id: "voice-search-button"

- extendedWaitUntil:
    visible:
      text: "${EXPECTED_PRODUCT_TITLE}"
    timeout: 30000

- assertVisible:
    text: "${EXPECTED_PRODUCT_TITLE}"
```

(30s timeout, not photo-search's 60s, since this hits a local Ollama call rather than a
CLIP/reranker image pipeline — adjust upward during Step 2 if local Ollama latency on the
test machine needs it.)

- [ ] **Step 2: Run once per positive fixture**

Same pattern as Task C2 Step 3 — a temporary `runFlow: login.yaml` + `runFlow:
ml-multiparameter-search-llm.yaml` wrapper, run once per positive fixture with `--env QUERY=...
--env EXPECTED_PRODUCT_TITLE=...`. All 5 must exit 0.

- [ ] **Step 3: Commit**

```bash
git add .maestro/android/ml-multiparameter-search-llm.yaml
git commit -m "feat: Android multi-parameter search E2E (LLM-reasoning path via Ollama)

Exercises the genuine LLM-based intent extraction (voiceQueryLLM.js) using
Ollama so the agent can run this itself with zero real credentials
involved. Real OpenAI/OpenRouter provider coverage remains the user's own
run, per the existing execution-boundary constraint."
```

### Task C4: Android Stage C regression gate

**Status:** Not Started

**Entry Criteria:** Tasks C1-C3 committed.

**Exit Criteria (all must pass before any iOS task starts):**
- `.maestro/android/login.yaml` run 3x consecutively, all exit 0.
- `.maestro/android/photo-search.yaml` (via the existing verification pattern) still passes
  for both existing samples.
- `.maestro/android/ml-features-comprehensive.yaml` exits 0.
- `.maestro/android/complete-e2e-clean.yaml` (i.e. `npm run maestro:android`) exits 0.
- Both new files from Tasks C2/C3 still pass (re-run once more here as the regression check,
  not just their own task's verification).
- `npm test` shows only the one known pre-existing failure.

**Files:** None (verification only).

- [ ] **Step 1-6: Run each of the above, in order, recording pass/fail**

```bash
UDID_OR_DEVICE=emulator-5554  # adjust to the actual running emulator id

for i in 1 2 3; do
  ~/.maestro/bin/maestro test .maestro/android/login.yaml
done

node scripts/seed-emulator-photos.mjs mens-clothing/sample-1.webp
# (run photo-search via the same temp-wrapper pattern used in prior sessions)

~/.maestro/bin/maestro test .maestro/android/ml-features-comprehensive.yaml

npm run maestro:android

npm test
```

- [ ] **Step 2: Update this plan's status**

Mark Tasks C1-C4 as `Status: Done` and commit:
```bash
git add docs/superpowers/plans/2026-07-10-default-llm-search-and-multiparam-e2e.md
git commit -m "docs: mark Android Stage C tasks complete, gate passed for iOS start"
```

### Task C5: iOS `ml-multiparameter-search.yaml` (rule-based search box)

**Status:** Not Started

**Entry Criteria:** Task C4 Exit Criteria met. iOS Simulator booted (kill the Android emulator
first if memory is tight, per this project's established "one platform at a time" practice).

**Exit Criteria:** Same as Task C2's, but on iOS Simulator.

**Files:**
- Create: `.maestro/ios/ml-multiparameter-search.yaml`

Built fresh for iOS, not ported from Android — using the already-established iOS conventions
from this project's prior work: `appId: org.reactjs.native.example.EcommerceAppFullStack`,
`runFlow: login.yaml` for setup (not a manually-duplicated login block), no `pressKey: back`
anywhere (use `pressKey: enter` for search submission, matching
`ml-features-comprehensive.yaml`'s iOS fix from the prior stage of this project).

- [ ] **Step 1: Write the flow**

Create `.maestro/ios/ml-multiparameter-search.yaml`:

```yaml
appId: org.reactjs.native.example.EcommerceAppFullStack
---
# Multi-parameter search via the plain "Search products" box -- iOS equivalent of
# .maestro/android/ml-multiparameter-search.yaml. Uses pressKey: enter (not back --
# iOS has no hardware back key; see this project's ml-features-comprehensive.yaml fix
# for why pressKey: back is wrong here).
#
# Requires env: QUERY - a natural-language query from
# scripts/fixtures/golden-multiparam-queries.json, EXPECTED_PRODUCT_TITLE - that same
# fixture's expectedProductTitle.
- tapOn:
    id: "tab-products"

- extendedWaitUntil:
    visible:
      id: "tab-products"
    timeout: 8000

- tapOn:
    text: "Search products"
    optional: true

- tapOn:
    text: "e.g. below 45"
    optional: true

- inputText: "${QUERY}"

- pressKey: enter

- extendedWaitUntil:
    visible:
      text: "${EXPECTED_PRODUCT_TITLE}"
    timeout: 15000

- assertVisible:
    text: "${EXPECTED_PRODUCT_TITLE}"

- tapOn:
    text: "${EXPECTED_PRODUCT_TITLE}"

- extendedWaitUntil:
    visible:
      id: "pdp-add-to-cart"
    timeout: 10000
```

Also create `.maestro/ios/ml-multiparameter-search-no-match.yaml`, identical in structure to
Task C2's Android no-match flow but with the iOS `appId` and `pressKey: enter`.

- [ ] **Step 2: Run once per positive fixture + the no-match fixture**

Same verification pattern as Task C2 Steps 3-4, targeted at the booted iOS Simulator's UDID.
All 6 runs must exit 0.

- [ ] **Step 3: Commit**

```bash
git add .maestro/ios/ml-multiparameter-search.yaml .maestro/ios/ml-multiparameter-search-no-match.yaml
git commit -m "feat: iOS multi-parameter search E2E (rule-based search box)

Built fresh for iOS (not ported from Android) -- runFlow: login.yaml,
pressKey: enter for search submission, no pressKey: back. Validated against
all 5 positive fixtures + the no-match fixture."
```

### Task C6: iOS `ml-multiparameter-search-llm.yaml` (LLM-reasoning path via Ollama)

**Status:** Not Started

**Entry Criteria:** Task C5 Exit Criteria met. Local Ollama running, reachable from the iOS
Simulator at `http://127.0.0.1:11434/v1` (per `src/config/llmProviders.js`'s iOS branch —
note this differs from Android's `10.0.2.2`, since the iOS Simulator shares the host's
network namespace directly).

**Exit Criteria:** Same as Task C3's, but on iOS Simulator.

**Files:**
- Create: `.maestro/ios/ml-multiparameter-search-llm.yaml`

- [ ] **Step 1: Write the flow**

Create `.maestro/ios/ml-multiparameter-search-llm.yaml`, mirroring Task C3's Android LLM flow
but with the iOS `appId` and iOS's established login/keyboard conventions (`runFlow:
login.yaml` if a Voice-card-specific login precursor is needed, no `pressKey: back`):

```yaml
appId: org.reactjs.native.example.EcommerceAppFullStack
---
# iOS equivalent of .maestro/android/ml-multiparameter-search-llm.yaml -- LLM-reasoning
# path via Ollama, credential-free, safe for the agent to run itself.
#
# Requires env: QUERY, EXPECTED_PRODUCT_TITLE (see the Android version's header comment
# for the full explanation).
- tapOn:
    id: "tab-home"

- scrollUntilVisible:
    element:
      id: "voice-search-card"
    direction: DOWN
    timeout: 15000

- tapOn:
    id: "llm-reasoning-switch"

- extendedWaitUntil:
    visible:
      id: "voice-api-key-input"
    timeout: 10000
    optional: true

- tapOn:
    id: "voice-provider-ollama"

- scrollUntilVisible:
    element:
      id: "voice-typed-query-input"
    direction: DOWN
    timeout: 15000

- tapOn:
    id: "voice-typed-query-input"

- inputText: "${QUERY}"

- tapOn:
    id: "voice-search-button"

- extendedWaitUntil:
    visible:
      text: "${EXPECTED_PRODUCT_TITLE}"
    timeout: 30000

- assertVisible:
    text: "${EXPECTED_PRODUCT_TITLE}"
```

- [ ] **Step 2: Run once per positive fixture**

Same verification pattern as Task C3 Step 2, targeted at iOS Simulator. All 5 must exit 0.

- [ ] **Step 3: Commit**

```bash
git add .maestro/ios/ml-multiparameter-search-llm.yaml
git commit -m "feat: iOS multi-parameter search E2E (LLM-reasoning path via Ollama)

Built fresh for iOS, mirroring the Android Ollama flow with iOS's own
appId and no pressKey: back. Real-provider coverage remains user-run."
```

### Task C7: iOS Stage C regression gate (final gate for the whole plan)

**Status:** Not Started

**Entry Criteria:** Tasks C5-C6 committed.

**Exit Criteria (all must pass — this is the last gate in the plan):**
- `.maestro/ios/login.yaml` run 3x consecutively, all exit 0.
- `.maestro/ios/photo-search.yaml` still passes for both existing samples.
- `.maestro/ios/ml-features-comprehensive.yaml` exits 0.
- `.maestro/ios/complete-e2e-clean.yaml` (i.e. `npm run maestro:ios`) exits 0.
- Both new files from Tasks C5/C6 still pass.
- `npm test` shows only the one known pre-existing failure.

**Files:** None (verification only).

- [ ] **Step 1-6: Run each of the above, in order**

```bash
UDID=<booted-simulator-udid>

for i in 1 2 3; do
  ~/.maestro/bin/maestro test .maestro/ios/login.yaml --device "$UDID"
done

node scripts/seed-ios-sim-photos.mjs mens-clothing/sample-1.webp
# (run photo-search via the same temp-wrapper pattern used in prior sessions)

~/.maestro/bin/maestro test .maestro/ios/ml-features-comprehensive.yaml --device "$UDID"

npm run maestro:ios

npm test
```

- [ ] **Step 2: Update this plan's status and update the governing design spec**

Mark Tasks C5-C7 as `Status: Done`. Update
`docs/superpowers/specs/2026-07-10-default-llm-search-and-multiparam-e2e-design.md`'s (implicit)
testing notes — add a short "Implementation results" note referencing this plan's completion,
mirroring how `docs/superpowers/specs/2026-07-10-e2e-keyboard-and-llm-testing-robustness-design.md`
was updated with real Android/iOS results after that stage's implementation.

```bash
git add docs/superpowers/plans/2026-07-10-default-llm-search-and-multiparam-e2e.md docs/superpowers/specs/2026-07-10-default-llm-search-and-multiparam-e2e-design.md
git commit -m "docs: mark Stage C complete, all three stages of this plan done"
```

---

## Backlog (not part of this plan, tracked so it isn't lost)

- **3D product models** — deferred per `docs/superpowers/specs/2026-07-09-static-product-catalog-design.md`.
- **SKU-level variant selection in cart/checkout** — backlogged, same source spec.
- **Orphaned `scripts/fixtures/golden-image-fixtures.json`** — references 3 deleted photo
  files, causing the one pre-existing Jest failure this plan's every exit criteria carves out
  as a known exception. Also breaks `scripts/eval-hybrid-search.mjs`. Not fixed by this plan.
- **`server/src/voiceQueryParser.js` has no dedicated `MATERIAL_WORDS` extraction list** —
  materials currently only influence ranking incidentally via the generic `keywords` list
  cross-checked against `product.materials` in `semanticTextReranker.js`'s `constraintBoost`.
  Works today for this plan's fixture queries (verified in Task C1 Step 6); a dedicated
  extraction list is a possible future precision improvement, not required here.
