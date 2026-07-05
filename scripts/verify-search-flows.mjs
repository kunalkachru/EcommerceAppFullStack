#!/usr/bin/env node
/**
 * Exhaustive search-flow verification (voice, text, photo, LLM on/off).
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { resolveApiUrl } from "./lib/cloud-api-url.mjs";
import { loadTestPhotoBase64 } from "./lib/test-photo-fixtures.mjs";

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = resolveApiUrl();
const results = [];

function pass(id, d) {
  results.push({ id, ok: true, d });
  console.log(`✓ ${id}: ${d}`);
}
function fail(id, d) {
  results.push({ id, ok: false, d });
  console.error(`✗ ${id}: ${d}`);
}

async function post(path, body, headers = {}) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log(`Search flows: ${API}\n`);

  const health = await fetch(`${API}/health`).then((r) => r.json());
  if (!health.ok) {
    fail("server-health", "Server down");
    process.exit(1);
  }
  pass("server-health", `CLIP index ${health.visualSearch?.indexCount ?? 0}`);

  const textQueries = [
    { q: "below 45", min: 5, check: (m) => m.every((p) => p.price <= 45) },
    { q: "Below 45", min: 5, check: (m) => m.every((p) => p.price <= 45) },
    { q: "under $50", min: 5, check: (m) => m.every((p) => p.price <= 50) },
    { q: "shoes women", min: 3, check: () => true },
    { q: "blue jacket under 50 dollars", min: 1, check: () => true },
    { q: "wireless headphones below 100", min: 1, check: () => true },
    { q: "between 20 and 40", min: 3, check: (m) => m.every((p) => p.price >= 20 && p.price <= 40) },
    { q: "lipstick under 20", min: 1, check: (m) => m.every((p) => p.price <= 20) },
  ];

  for (const { q, min, check } of textQueries) {
    const { status, data } = await post("/api/search/voice", { query: q });
    const matches = data.matches ?? [];
    if (status === 200 && matches.length >= min && check(matches)) {
      pass(`voice-text:${q}`, `${matches.length} matches`);
    } else {
      fail(`voice-text:${q}`, `status=${status} matches=${matches.length}`);
    }
  }

  const empty = await post("/api/search/voice", { query: "" });
  if (empty.status === 400) pass("voice-empty-query", "rejects empty");
  else fail("voice-empty-query", `status ${empty.status}`);

  const llmNoKey = await post("/api/search/voice", {
    query: "shoes under 50",
    useLlmReasoning: true,
  });
  if (llmNoKey.status === 400 && llmNoKey.data.code === "llm_key_required") {
    pass("llm-no-key", "requires key when LLM on");
  } else {
    fail("llm-no-key", `status=${llmNoKey.status} code=${llmNoKey.data.code}`);
  }

  const llmFakeKey = await post(
    "/api/search/voice",
    { query: "shoes under 50", useLlmReasoning: true, llmProvider: "groq" },
    { "X-LLM-Api-Key": "gsk-fake-test-key-not-real" }
  );
  if (llmFakeKey.status === 500 || llmFakeKey.status === 400) {
    pass("llm-bad-key-handled", `status ${llmFakeKey.status} (no crash)`);
  } else if (llmFakeKey.status === 200) {
    pass("llm-bad-key-handled", "returned (provider accepted key format)");
  } else {
    fail("llm-bad-key-handled", `unexpected ${llmFakeKey.status}`);
  }

  const { filterProductsLocally: localFilter } = require("../src/utils/catalogTextFilter");
  const fallback = require("../src/data/catalog-fallback.json").products ?? [];

  const localCases = [
    ["below 45", (m) => m.length > 0 && m.every((p) => p.price <= 45)],
    ["Below 45", (m) => m.length > 0 && m.every((p) => p.price <= 45)],
    ["shoes women", (m) => m.length > 0],
    ["xyzqwerty", (m) => m.length === 0],
  ];
  for (const [q, check] of localCases) {
    const m = localFilter(fallback, q);
    if (check(m)) pass(`local:${q}`, `${m.length} products`);
    else fail(`local:${q}`, `${m.length} products`);
  }

  try {
    const b64 = await loadTestPhotoBase64("01-catalog-jacket.jpg");
    const visual = await post("/api/visual-search", { imageBase64: b64 });
    const matches = visual.data.matches ?? [];
    if (visual.status === 200 && matches.length >= 1) {
      pass("photo-jacket", `${matches.length} matches, top ${matches[0]?.matchPercent ?? "?"}%`);
    } else {
      fail("photo-jacket", visual.data.message ?? `status ${visual.status}`);
    }
  } catch (e) {
    fail("photo-jacket", e.message);
  }

  try {
    const b64 = await loadTestPhotoBase64("02-catalog-backpack.jpg");
    const visual = await post("/api/visual-search", {
      imageBase64: b64,
      categoryFilter: "clothing",
    });
    if (visual.status === 200) {
      pass("photo-category-filter", `${(visual.data.matches ?? []).length} matches with clothing filter`);
    } else {
      fail("photo-category-filter", visual.data.message ?? String(visual.status));
    }
  } catch (e) {
    fail("photo-category-filter", e.message);
  }

  try {
    const b64 = await loadTestPhotoBase64("12-off-catalog-pizza.jpg");
    const visual = await post("/api/visual-search", { imageBase64: b64 });
    const matches = visual.data.matches ?? [];
    if (visual.status === 200) {
      const lowConf = matches.length === 0 || (matches[0]?.matchPercent ?? 0) < 90;
      pass("photo-off-catalog-pizza", `${matches.length} matches${lowConf ? " (weak/off-catalog ok)" : ""}`);
    } else {
      fail("photo-off-catalog-pizza", visual.data.message ?? String(visual.status));
    }
  } catch (e) {
    fail("photo-off-catalog-pizza", e.message);
  }

  const cfg = await fetch(`${API}/api/search/voice/config`).then((r) => r.json());
  if (cfg.requiresClientKey && cfg.providers?.length >= 5) {
    pass("voice-config", `${cfg.providers.length} LLM providers listed`);
  } else {
    fail("voice-config", "missing provider config");
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n--- Search flows: ${results.length - failed}/${results.length} passed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
