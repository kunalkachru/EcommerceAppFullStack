#!/usr/bin/env node
/**
 * Ensure no live API keys are tracked in git. Safe to run before commit/PR.
 * Does not read src/.env — only scans files git would publish.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const LIVE_KEY_PATTERN =
  /sk-(?:or-v1-|proj-|live-|ant-api)[A-Za-z0-9_-]{10,}|gsk_[A-Za-z0-9]{10,}/;

const ALLOWLIST = [
  /scripts\/verify-search-flows\.mjs$/, // gsk-fake-test-key-not-real
  /__tests__\//,
  /voiceQueryLLM\.test\.js$/,
  /VoiceSearchCard\.test\.js$/,
  /docs\//, // placeholder sk-… in documentation
  /\.env\.example$/,
];

function listTrackedFiles() {
  return execSync("git ls-files", { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

function main() {
  const violations = [];
  for (const file of listTrackedFiles()) {
    if (ALLOWLIST.some((re) => re.test(file))) continue;
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (LIVE_KEY_PATTERN.test(content)) {
      violations.push(file);
    }
  }

  if (violations.length) {
    console.error("✗ Possible live secrets in tracked files:");
    violations.forEach((f) => console.error(`  - ${f}`));
    console.error("\nMove keys to src/.env (gitignored). Never commit real API keys.");
    process.exit(1);
  }

  console.log("✓ No live API key patterns in git-tracked files");
  console.log("  Client LLM keys: src/.env (see src/.env.example)");
  console.log("  Server secrets: server/.env (see server/.env.example)");
}

main();
