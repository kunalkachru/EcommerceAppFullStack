import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const APP_TARGET_CONFIG_PATH = join(ROOT, "config", "app-target.json");

export function normalizeApiTargetMode(value) {
  return String(value || "").trim().toLowerCase() === "cloud" ? "cloud" : "local";
}

export function shouldUseCloudApiTarget(env = process.env) {
  return env.USE_CLOUD_API === "1" || env.USE_CLOUD_API === "true";
}

export function readApiTargetConfig({ configPath = APP_TARGET_CONFIG_PATH } = {}) {
  const parsed = JSON.parse(readFileSync(configPath, "utf8"));
  return {
    ...parsed,
    mode: normalizeApiTargetMode(parsed.mode),
  };
}

export function readApiTargetMode(options = {}) {
  return readApiTargetConfig(options).mode;
}

export function writeApiTargetMode(mode, { configPath = APP_TARGET_CONFIG_PATH } = {}) {
  const current = readApiTargetConfig({ configPath });
  const next = {
    ...current,
    mode: normalizeApiTargetMode(mode),
  };
  writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`);
  return next.mode;
}

export async function withTemporaryApiTargetMode(
  mode,
  callback,
  { configPath = APP_TARGET_CONFIG_PATH } = {}
) {
  const previousMode = readApiTargetMode({ configPath });
  const nextMode = normalizeApiTargetMode(mode);
  if (previousMode !== nextMode) {
    writeApiTargetMode(nextMode, { configPath });
  }
  try {
    return await callback();
  } finally {
    if (readApiTargetMode({ configPath }) !== previousMode) {
      writeApiTargetMode(previousMode, { configPath });
    }
  }
}
