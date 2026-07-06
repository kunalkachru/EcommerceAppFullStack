/**
 * Read gitignored client secrets for local scripts ONLY.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasClientLlmKey as hasClientLlmKeyFromEnv,
  resolveLlmConfig as resolveLlmConfigFromEnv,
  maestroLlmEnvFromEnv,
  listConfiguredLlmProviders,
} from "./lib/llm-env-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const CLIENT_ENV_PATH = join(__dirname, "..", "src", ".env");

const SECRET_KEYS = [
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
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

function mergeClientEnv() {
  const fromFile = loadEnvFile(CLIENT_ENV_PATH);
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || fromFile.OPENAI_API_KEY || "",
    OPENROUTER_API_KEY:
      process.env.OPENROUTER_API_KEY || fromFile.OPENROUTER_API_KEY || "",
    GROQ_API_KEY: process.env.GROQ_API_KEY || fromFile.GROQ_API_KEY || "",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || fromFile.GEMINI_API_KEY || "",
    DEMO_LLM_PROVIDER:
      process.env.DEMO_LLM_PROVIDER || fromFile.DEMO_LLM_PROVIDER || "",
    LLM_BASE_URL: process.env.LLM_BASE_URL || fromFile.LLM_BASE_URL || "",
    LLM_MODEL: process.env.LLM_MODEL || fromFile.LLM_MODEL || "",
  };
}

/** Keys from src/.env and/or process env — values never logged by helpers here. */
export function loadClientEnv() {
  return mergeClientEnv();
}

export function hasClientLlmKey(env = loadClientEnv()) {
  return hasClientLlmKeyFromEnv(env);
}

export { listConfiguredLlmProviders };

export function resolveLlmConfig(env = loadClientEnv()) {
  return resolveLlmConfigFromEnv(env);
}

/** Prefer OpenRouter for demo LLM UI; fall back to OpenAI. */
export function resolveDemoLlmKey(env = loadClientEnv()) {
  return resolveLlmConfigFromEnv(env)?.apiKey || "";
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
  return maestroLlmEnvFromEnv(env);
}

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

export function hasAppetizeCredentials(env = loadAppetizeEnv()) {
  return Boolean(env.APPETIZE_API_TOKEN?.trim());
}

/** Per-request header for /api/search/voice live LLM tests. */
export function llmRequestOptions(env = loadClientEnv(), { provider = "openai" } = {}) {
  const cfg = resolveLlmConfigFromEnv(env, { preferredProvider: provider });
  if (!cfg) return null;
  return { apiKey: cfg.apiKey, provider: cfg.provider, baseUrl: cfg.baseUrl, model: cfg.model };
}

export { SECRET_KEYS };
