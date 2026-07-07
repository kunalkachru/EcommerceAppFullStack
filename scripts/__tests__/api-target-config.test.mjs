import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  normalizeApiTargetMode,
  readApiTargetMode,
  withTemporaryApiTargetMode,
} from "../lib/api-target-config.mjs";

function createTargetConfig(mode = "local") {
  const root = mkdtempSync(join(tmpdir(), "api-target-config-"));
  const configPath = join(root, "config", "app-target.json");
  mkdirSync(join(root, "config"), { recursive: true });
  writeFileSync(configPath, JSON.stringify({ mode }, null, 2));
  return configPath;
}

test("normalizeApiTargetMode falls back to local for unknown values", () => {
  assert.equal(normalizeApiTargetMode("cloud"), "cloud");
  assert.equal(normalizeApiTargetMode(" local "), "local");
  assert.equal(normalizeApiTargetMode("staging"), "local");
  assert.equal(normalizeApiTargetMode(""), "local");
});

test("readApiTargetMode reads the configured mode from disk", () => {
  const configPath = createTargetConfig("cloud");
  assert.equal(readApiTargetMode({ configPath }), "cloud");
});

test("withTemporaryApiTargetMode switches to cloud during the callback and restores afterward", async () => {
  const configPath = createTargetConfig("local");

  await withTemporaryApiTargetMode(
    "cloud",
    async () => {
      assert.equal(readApiTargetMode({ configPath }), "cloud");
    },
    { configPath }
  );

  const restored = JSON.parse(readFileSync(configPath, "utf8"));
  assert.equal(restored.mode, "local");
});

test("withTemporaryApiTargetMode restores the original mode after a failure", async () => {
  const configPath = createTargetConfig("local");

  await assert.rejects(
    withTemporaryApiTargetMode(
      "cloud",
      async () => {
        throw new Error("boom");
      },
      { configPath }
    ),
    /boom/
  );

  const restored = JSON.parse(readFileSync(configPath, "utf8"));
  assert.equal(restored.mode, "local");
});
