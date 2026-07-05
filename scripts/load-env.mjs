/**
 * Read gitignored client secrets for local scripts ONLY.
 *
 * Policy:
 * - Reads from src/.env and/or process.env — never from repo-tracked files.
 * - Never writes, copies, or logs key material.
 * - Scripts must use loadClientEnv() / resolveDemoLlmKey(); do not hardcode keys.
 *
 * Setup: cp src/.env.example src/.env  then add your keys locally.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const CLIENT_ENV_PATH = join(__dirname, "..", "src", ".env");

const SECRET_KEYS = [
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "JWT_SECRET",
  "APPETIZE_API_TOKEN",
  "BROWSERSTACK_ACCESS_KEY",
];

export function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Keys from src/.env and/or process env — values never logged by helpers here. */
export function loadClientEnv() {
  const fromFile = loadEnvFile(CLIENT_ENV_PATH);
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || fromFile.OPENAI_API_KEY || "",
    OPENROUTER_API_KEY:
      process.env.OPENROUTER_API_KEY || fromFile.OPENROUTER_API_KEY || "",
  };
}

/** True if any supported LLM key is configured locally. */
export function hasClientLlmKey(env = loadClientEnv()) {
  return Boolean(env.OPENAI_API_KEY?.trim() || env.OPENROUTER_API_KEY?.trim());
}

/** Prefer OpenRouter for demo LLM UI; fall back to OpenAI. */
export function resolveDemoLlmKey(env = loadClientEnv()) {
  return env.OPENROUTER_API_KEY?.trim() || env.OPENAI_API_KEY?.trim() || "";
}

export function requireDemoLlmKey(env = loadClientEnv()) {
  const key = resolveDemoLlmKey(env);
  if (!key) {
    throw new Error(
      `LLM key required: set OPENROUTER_API_KEY or OPENAI_API_KEY in ${CLIENT_ENV_PATH} (copy from src/.env.example). See docs/CONFIGURATION.md`
    );
  }
  return key;
}

/** Maestro -e vars for ML flows; key passed in memory only for the subprocess. */
export function maestroLlmEnv(env = loadClientEnv()) {
  const key = resolveDemoLlmKey(env);
  if (!key) {
    return { DEMO_LLM_API_KEY: "", DEMO_LLM_PROVIDER: "OpenAI" };
  }
  const provider = key.startsWith("sk-or-") ? "OpenRouter" : "OpenAI";
  return { DEMO_LLM_API_KEY: key, DEMO_LLM_PROVIDER: provider };
}

/** Appetize upload credentials — CI uses GitHub Secrets (process.env only); local uses src/.env. */
export function loadAppetizeEnv() {
  const inCi = process.env.GITHUB_ACTIONS === "true";
  const fromFile = inCi ? {} : loadEnvFile(CLIENT_ENV_PATH);
  return {
    APPETIZE_API_TOKEN:
      process.env.APPETIZE_API_TOKEN?.trim() ||
      fromFile.APPETIZE_API_TOKEN?.trim() ||
      "",
    APPETIZE_PUBLIC_KEY_ANDROID:
      process.env.APPETIZE_PUBLIC_KEY_ANDROID?.trim() ||
      fromFile.APPETIZE_PUBLIC_KEY_ANDROID?.trim() ||
      "",
    APPETIZE_PUBLIC_KEY_IOS:
      process.env.APPETIZE_PUBLIC_KEY_IOS?.trim() ||
      fromFile.APPETIZE_PUBLIC_KEY_IOS?.trim() ||
      "",
  };
}

/** True when local Appetize upload can run without extra env exports. */
export function hasAppetizeCredentials(env = loadAppetizeEnv()) {
  return Boolean(env.APPETIZE_API_TOKEN?.trim());
}

/** Per-request header for /api/search/voice live LLM tests. */
export function llmRequestOptions(env = loadClientEnv(), { provider = "openai" } = {}) {
  const openai = env.OPENAI_API_KEY?.trim();
  const openrouter = env.OPENROUTER_API_KEY?.trim();
  if (provider === "openrouter" && openrouter) {
    return { apiKey: openrouter, provider: "openrouter" };
  }
  if (openai) {
    return { apiKey: openai, provider: "openai" };
  }
  if (openrouter) {
    return { apiKey: openrouter, provider: "openrouter" };
  }
  return null;
}

export { SECRET_KEYS };
