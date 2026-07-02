/**
 * Load gitignored env files for local scripts. Never commit secrets into scripts.
 * Consumers: create src/.env locally (see docs/CONFIGURATION.md).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const CLIENT_ENV_PATH = join(__dirname, "..", "src", ".env");

export function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

/** Keys from src/.env or process env — never hardcoded in repo scripts. */
export function loadClientEnv() {
  const fromFile = loadEnvFile(CLIENT_ENV_PATH);
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || fromFile.OPENAI_API_KEY || "",
    OPENROUTER_API_KEY:
      process.env.OPENROUTER_API_KEY || fromFile.OPENROUTER_API_KEY || "",
  };
}

/** Prefer OpenRouter for demo LLM UI; fall back to OpenAI. */
export function resolveDemoLlmKey(env = loadClientEnv()) {
  return env.OPENROUTER_API_KEY || env.OPENAI_API_KEY || "";
}

export function requireDemoLlmKey(env = loadClientEnv()) {
  const key = resolveDemoLlmKey(env);
  if (!key) {
    throw new Error(
      "LLM demo requires OPENROUTER_API_KEY or OPENAI_API_KEY in src/.env (gitignored). See docs/CONFIGURATION.md"
    );
  }
  return key;
}
