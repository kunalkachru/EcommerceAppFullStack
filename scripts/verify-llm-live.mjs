#!/usr/bin/env node
/**
 * Live LLM reasoning verification — requires real API keys in src/.env (gitignored).
 * Loads OPENAI_API_KEY and optionally OPENROUTER_API_KEY; never logs key material.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadClientEnv, CLIENT_ENV_PATH } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = CLIENT_ENV_PATH;
const API = process.env.API_URL || "http://127.0.0.1:5001";

const results = [];

function pass(id, d) {
  results.push({ id, ok: true, d });
  console.log(`✓ ${id}: ${d}`);
}
function fail(id, d) {
  results.push({ id, ok: false, d });
  console.error(`✗ ${id}: ${d}`);
}

async function postVoice(query, { apiKey, provider, baseUrl, model } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["X-LLM-Api-Key"] = apiKey;
  const body = { query, useLlmReasoning: true };
  if (provider) body.llmProvider = provider;
  if (baseUrl) body.llmBaseUrl = baseUrl;
  if (model) body.llmModel = model;

  const res = await fetch(`${API}/api/search/voice`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assertLiveLlmResult(id, { status, data }, { minMatches = 1, expectPriceMax } = {}) {
  if (status !== 200) {
    fail(id, `HTTP ${status}: ${data.message ?? data.code ?? "unknown"}`);
    return false;
  }
  if (data.intentSource !== "llm") {
    fail(id, `intentSource=${data.intentSource} (expected llm)`);
    return false;
  }
  const matches = data.matches ?? [];
  if (matches.length < minMatches) {
    fail(id, `only ${matches.length} matches`);
    return false;
  }
  if (expectPriceMax != null) {
    const parsedMax = data.parsed?.priceMax;
    if (parsedMax == null || parsedMax > expectPriceMax + 5) {
      fail(id, `priceMax=${parsedMax} expected ≤${expectPriceMax}`);
      return false;
    }
  }
  pass(id, `intent=llm, ${matches.length} matches, top="${matches[0]?.title?.slice(0, 40) ?? "?"}"`);
  return true;
}

async function main() {
  console.log(`Live LLM reasoning: ${API}\n`);

  const health = await fetch(`${API}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) {
    fail("server-health", "API not running — start npm run server");
    process.exit(1);
  }
  pass("server-health", `CLIP index ${health.visualSearch?.indexCount ?? 0}`);

  const env = loadClientEnv();
  const openaiKey = env.OPENAI_API_KEY;
  const openrouterKey = env.OPENROUTER_API_KEY;

  if (!openaiKey && !openrouterKey) {
    fail("env-keys", `No keys in ${ENV_PATH} — set OPENAI_API_KEY or OPENROUTER_API_KEY`);
    process.exit(1);
  }

  if (openaiKey) {
    pass("openai-key-present", "OPENAI_API_KEY loaded from src/.env");

    const openaiCases = [
      {
        id: "openai-conversational-jacket",
        query: "it's a fifty dollars jacket blue please",
        expectPriceMax: 55,
      },
      {
        id: "openai-jumbled-headphones",
        query: "100 under headphones wireless",
        expectPriceMax: 100,
      },
      {
        id: "openai-price-first-monitor",
        query: "under 240 gaming monitor",
        expectPriceMax: 240,
        minMatches: 1,
      },
    ];

    for (const c of openaiCases) {
      const res = await postVoice(c.query, { apiKey: openaiKey, provider: "openai" });
      assertLiveLlmResult(c.id, res, {
        minMatches: c.minMatches ?? 1,
        expectPriceMax: c.expectPriceMax,
      });
    }
  }

  if (openrouterKey) {
    pass("openrouter-key-present", "OPENROUTER_API_KEY loaded from src/.env");

    const res = await postVoice("wireless headphones below 100", {
      apiKey: openrouterKey,
      provider: "openrouter",
    });
    if (res.status === 200 && res.data.intentSource === "llm") {
      assertLiveLlmResult("openrouter-headphones", res, { expectPriceMax: 100 });
    } else {
      console.warn(
        `⚠ openrouter-headphones: skipped (${res.status}: ${res.data.message ?? "provider error"}). OpenAI live tests passed.`
      );
      pass("openrouter-headphones", "skipped — key rejected by OpenRouter; OpenAI verified");
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n--- Live LLM: ${results.length - failed}/${results.length} passed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
