#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const baselineApi = process.env.BASELINE_API_URL || "http://127.0.0.1:5001";
const hybridApi = process.env.HYBRID_API_URL || "http://127.0.0.1:5002";
const root = resolve(process.cwd());

function loadJson(relPath) {
  return JSON.parse(readFileSync(resolve(root, relPath), "utf8"));
}

function containsAny(text, snippets = []) {
  const hay = String(text || "").toLowerCase();
  return snippets.some((snippet) => hay.includes(String(snippet).toLowerCase()));
}

function validateTextFixture(data, expectation = {}) {
  const matches = data.matches ?? [];
  const priceCheckedMatches = matches.slice(
    0,
    expectation.priceCheckLimit ?? Math.min(matches.length, 5)
  );
  if (matches.length < (expectation.minMatches ?? 0)) {
    return `expected at least ${expectation.minMatches} matches, got ${matches.length}`;
  }
  if (
    expectation.maxPrice != null &&
    !priceCheckedMatches.every((match) => Number(match.price) <= expectation.maxPrice)
  ) {
    return `some matches exceeded maxPrice=${expectation.maxPrice}`;
  }
  if (
    expectation.minPrice != null &&
    !priceCheckedMatches.every((match) => Number(match.price) >= expectation.minPrice)
  ) {
    return `some matches were below minPrice=${expectation.minPrice}`;
  }
  if (expectation.topTitleIncludes?.length && matches[0]) {
    if (!containsAny(matches[0].title, expectation.topTitleIncludes)) {
      return `top title "${matches[0].title}" missed expected hints`;
    }
  }
  if (expectation.mustIncludeWords?.length) {
    const ok = matches.some((match) =>
      containsAny(`${match.title} ${match.description} ${match.category}`, expectation.mustIncludeWords)
    );
    if (!ok) {
      return `no match contained required words ${expectation.mustIncludeWords.join(", ")}`;
    }
  }
  return null;
}

function validateImageFixture(data, expectation = {}) {
  const matches = data.matches ?? [];
  if (!expectation.allowNoInventory && matches.length < (expectation.minMatches ?? 0)) {
    return `expected at least ${expectation.minMatches} matches, got ${matches.length}`;
  }
  return null;
}

async function postJson(api, path, body) {
  const res = await fetch(`${api}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function evaluateTextFixture(api, fixture) {
  const response = await postJson(api, "/api/search/voice", { query: fixture.query });
  const error = response.status !== 200
    ? `status=${response.status}`
    : validateTextFixture(response.data, fixture.expectation);
  return {
    id: fixture.id,
    mode: "text",
    ok: !error,
    error,
    status: response.status,
    matchCount: response.data.matches?.length ?? 0,
    topTitle: response.data.matches?.[0]?.title ?? null,
  };
}

async function evaluateImageFixture(api, fixture) {
  const imageBase64 = readFileSync(resolve(root, fixture.imagePath)).toString("base64");
  const response = await postJson(api, "/api/visual-search", {
    imageBase64,
    categoryFilter: fixture.categoryFilter || null,
  });
  const error = response.status !== 200
    ? `status=${response.status}`
    : validateImageFixture(response.data, fixture.expectation);
  return {
    id: fixture.id,
    mode: "image",
    ok: !error,
    error,
    status: response.status,
    matchCount: response.data.matches?.length ?? 0,
    topTitle: response.data.matches?.[0]?.title ?? null,
    resultStatus: response.data.resultStatus ?? null,
  };
}

async function evaluateRuntime(api, runtimeName) {
  const textFixtures = loadJson("scripts/fixtures/golden-text-queries.json");
  const imageFixtures = loadJson("scripts/fixtures/golden-image-fixtures.json");
  const results = [];

  for (const fixture of textFixtures) {
    results.push({ runtime: runtimeName, ...(await evaluateTextFixture(api, fixture)) });
  }
  for (const fixture of imageFixtures) {
    results.push({ runtime: runtimeName, ...(await evaluateImageFixture(api, fixture)) });
  }

  return results;
}

async function main() {
  const baselineResults = await evaluateRuntime(baselineApi, "baseline");
  const hybridResults = await evaluateRuntime(hybridApi, "hybrid");
  console.log(
    JSON.stringify(
      {
        baselineApi,
        hybridApi,
        baselineResults,
        hybridResults,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
