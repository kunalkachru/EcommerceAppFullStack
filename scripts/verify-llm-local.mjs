#!/usr/bin/env node
/**
 * Live local-LLM verification through the hybrid API using Ollama.
 */
const API = process.env.API_URL || "http://127.0.0.1:5002";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:1.5b-base";

const results = [];
const strictMode = process.env.STRICT_LOCAL_LLM === "1";

function pass(id, detail) {
  results.push({ id, ok: true, severity: "pass", detail });
  console.log(`✓ ${id}: ${detail}`);
}

function fail(id, detail) {
  results.push({ id, ok: false, severity: "hard", detail });
  console.error(`✗ ${id}: ${detail}`);
}

function warn(id, detail) {
  results.push({ id, ok: false, severity: "soft", detail });
  console.warn(`! ${id}: ${detail}`);
}

async function postVoice(query) {
  const response = await fetch(`${API}/api/search/voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      useLlmReasoning: true,
      llmProvider: "ollama",
      llmBaseUrl: OLLAMA_BASE_URL,
      llmModel: OLLAMA_MODEL,
    }),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function assertLlmResult(id, payload, { maxPrice, containsTitle }) {
  if (payload.status !== 200) {
    fail(id, `HTTP ${payload.status}: ${payload.data.message ?? payload.data.code ?? "unknown"}`);
    return;
  }
  if (payload.data.intentSource !== "llm") {
    fail(id, `intentSource=${payload.data.intentSource} expected llm`);
    return;
  }
  const matches = payload.data.matches ?? [];
  if (!matches.length) {
    fail(id, "no matches");
    return;
  }
  if (maxPrice != null) {
    const parsedMax = payload.data.parsed?.priceMax;
    if (!Number.isFinite(parsedMax) || parsedMax > maxPrice) {
      const message = `parsed priceMax=${parsedMax} expected <= ${maxPrice}`;
      if (strictMode) {
        fail(id, message);
      } else {
        warn(id, `${message} (model-quality warning)`);
      }
      return;
    }
  }
  if (containsTitle?.length) {
    const topTitle = String(matches[0]?.title || "").toLowerCase();
    if (!containsTitle.some((term) => topTitle.includes(term))) {
      const message = `top title "${matches[0]?.title ?? "?"}" missed ${containsTitle.join(", ")}`;
      if (strictMode) {
        fail(id, message);
      } else {
        warn(id, `${message} (model-quality warning)`);
      }
      return;
    }
  }
  pass(id, `intent=llm matches=${matches.length} top="${matches[0]?.title ?? "?"}"`);
}

async function main() {
  console.log(`Local LLM verify: API=${API} OLLAMA=${OLLAMA_BASE_URL} MODEL=${OLLAMA_MODEL}\n`);

  const health = await fetch(`${API}/health`).then((res) => res.json()).catch(() => null);
  if (!health?.ok) {
    fail("server-health", "Hybrid API not reachable");
    process.exit(1);
  }
  pass("server-health", `CLIP index ${health.visualSearch?.indexCount ?? 0}`);

  const ollamaHealth = await fetch(OLLAMA_BASE_URL.replace(/\/v1$/, "/api/tags"))
    .then((res) => res.json())
    .catch(() => null);
  if (!ollamaHealth?.models?.length) {
    fail("ollama-health", "Ollama not reachable or no local models");
    process.exit(1);
  }
  pass("ollama-health", `${ollamaHealth.models.length} local models available`);

  const cases = [
    {
      id: "ollama-headphones",
      query: "100 under headphones wireless",
      maxPrice: 100,
      containsTitle: ["headphone", "earbud", "earphone"],
    },
    {
      id: "ollama-jacket",
      query: "it's a fifty dollars jacket blue please",
      maxPrice: 60,
      containsTitle: ["jacket", "coat"],
    },
    {
      id: "ollama-laptop-range",
      query: "900 and 500 laptop between",
      maxPrice: 900,
      containsTitle: ["laptop"],
    },
  ];

  for (const testCase of cases) {
    const payload = await postVoice(testCase.query);
    assertLlmResult(testCase.id, payload, testCase);
  }

  const hardFailures = results.filter((row) => row.severity === "hard").length;
  const softWarnings = results.filter((row) => row.severity === "soft").length;
  const passed = results.filter((row) => row.severity === "pass").length;
  console.log(
    `\n--- Local LLM verify: ${passed} passed, ${softWarnings} warnings, ${hardFailures} hard failures ---`
  );
  process.exit(hardFailures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
