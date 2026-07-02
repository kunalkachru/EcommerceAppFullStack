#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const baselineApi = process.env.BASELINE_API_URL || "http://127.0.0.1:5001";
const hybridApi = process.env.HYBRID_API_URL || "http://127.0.0.1:5002";

const result = spawnSync(
  process.execPath,
  ["scripts/eval-hybrid-search.mjs"],
  {
    stdio: "pipe",
    encoding: "utf8",
    env: {
      ...process.env,
      BASELINE_API_URL: baselineApi,
      HYBRID_API_URL: hybridApi,
    },
  }
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

const parsed = JSON.parse(result.stdout);
const all = [...parsed.baselineResults, ...parsed.hybridResults];
const failed = all.filter((row) => !row.ok);
const failedHybrid = parsed.hybridResults.filter((row) => !row.ok);
const failedBaseline = parsed.baselineResults.filter((row) => !row.ok);

all.forEach((row) => {
  const prefix = row.ok ? "✓" : "✗";
  const detail = row.ok
    ? `${row.runtime}:${row.mode}:${row.id} matches=${row.matchCount}`
    : `${row.runtime}:${row.mode}:${row.id} ${row.error}`;
  console.log(`${prefix} ${detail}`);
});

if (failedBaseline.length > 0) {
  console.log(
    `\nBaseline gaps retained for comparison: ${failedBaseline
      .map((row) => `${row.mode}:${row.id}`)
      .join(", ")}`
  );
}

console.log(`\n--- A/B verify: ${all.length - failed.length}/${all.length} passed ---`);
process.exit(failedHybrid.length ? 1 : 0);
