#!/usr/bin/env node
/**
 * Live LLM reasoning verification — requires real API keys in src/.env (gitignored).
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadClientEnv,
  CLIENT_ENV_PATH,
  listConfiguredLlmProviders,
  resolveLlmConfig,
} from "./load-env.mjs";
import { resolveApiUrl } from "./lib/cloud-api-url.mjs";
import { LLM_PROVIDER_PRESETS } from "./lib/llm-env-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = CLIENT_ENV_PATH;
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
function warn(id, d) {
  results.push({ id, ok: true, d, warn: true });
  console.warn(`⚠ ${id}: ${d}`);
}

async function postVoice(query, cfg, apiUrl = API) {
  const headers = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers["X-LLM-Api-Key"] = cfg.apiKey;
  const body = {
    query,
    useLlmReasoning: true,
    llmProvider: cfg.provider,
    llmBaseUrl: cfg.baseUrl,
    llmModel: cfg.model,
  };

  const res = await fetch(`${apiUrl}/api/search/voice`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assertLiveLlmResult(id, { status, data }, { minMatches = 1, expectPriceMax } = {}) {
  if (status === 401 || status === 403) {
    fail(id, `[INFRA] HTTP ${status}: check key in ${ENV_PATH}`);
    return false;
  }
  if (status !== 200) {
    fail(id, `[INFRA] HTTP ${status}: ${data.message ?? data.code ?? "unknown"}`);
    return false;
  }
  if (data.intentSource !== "llm") {
    fail(id, `[PRODUCT] intentSource=${data.intentSource} (expected llm)`);
    return false;
  }
  const matches = data.matches ?? [];
  if (matches.length < minMatches) {
    fail(id, `[PRODUCT] only ${matches.length} matches`);
    return false;
  }
  if (expectPriceMax != null) {
    const parsedMax = data.parsed?.priceMax;
    if (parsedMax == null || parsedMax > expectPriceMax + 5) {
      fail(id, `[PRODUCT] priceMax=${parsedMax} expected ≤${expectPriceMax}`);
      return false;
    }
  }
  pass(id, `intent=llm, ${matches.length} matches, top="${matches[0]?.title?.slice(0, 40) ?? "?"}"`);
  return true;
}

const PROVIDER_CASES = {
  openai: [
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
  ],
  openrouter: [
    {
      id: "openrouter-headphones",
      query: "wireless headphones below 100",
      expectPriceMax: 100,
    },
  ],
  groq: [
    {
      id: "groq-headphones",
      query: "wireless headphones below 100",
      expectPriceMax: 100,
    },
  ],
  gemini: [
    {
      id: "gemini-headphones",
      query: "wireless headphones below 100",
      expectPriceMax: 100,
    },
  ],
};

export async function runLlmLiveVerification(options = {}) {
  const apiUrl = options.apiUrl || API;
  const env = options.env || loadClientEnv();
  results.length = 0;

  console.log(`Live LLM reasoning: ${apiUrl}\n`);

  const health = await fetch(`${apiUrl}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) {
    fail("server-health", "[INFRA] API not running — start npm run server");
    return { ok: false, results: [...results] };
  }
  pass("server-health", `CLIP index ${health.visualSearch?.indexCount ?? 0}`);

  const configured = listConfiguredLlmProviders(env);
  if (!configured.length) {
    fail("env-keys", `No keys in ${ENV_PATH} — set OPENAI_API_KEY or OPENROUTER_API_KEY`);
    return { ok: false, results: [...results] };
  }

  for (const providerId of configured) {
    const preset = LLM_PROVIDER_PRESETS[providerId];
    pass(`${providerId}-key-present`, `${preset.envKey} loaded (not logged)`);

    const cfg = resolveLlmConfig(env, { preferredProvider: providerId });
    if (!cfg) continue;

    const cases = PROVIDER_CASES[providerId] || [];
    for (const c of cases) {
      const res = await postVoice(c.query, cfg, apiUrl);
      if (providerId === "openrouter" && res.status === 401) {
        warn(
          "openrouter-headphones",
          "[INFRA] OpenRouter key rejected — skipped (OpenAI may still pass)"
        );
        continue;
      }
      assertLiveLlmResult(c.id, res, {
        minMatches: c.minMatches ?? 1,
        expectPriceMax: c.expectPriceMax,
      });
    }
  }

  for (const id of ["groq", "gemini"]) {
    if (!configured.includes(id)) {
      console.log(`  … skip ${id} (no ${LLM_PROVIDER_PRESETS[id].envKey} in ${ENV_PATH})`);
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n--- Live LLM: ${results.length - failed}/${results.length} passed ---`);
  return { ok: failed === 0, results: [...results], failed };
}

async function main() {
  const { ok } = await runLlmLiveVerification();
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
