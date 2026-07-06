/**
 * Pure LLM env resolution for local automation scripts (testable, no fs reads).
 */

export const LLM_PROVIDER_PRESETS = {
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    envKey: "OPENROUTER_API_KEY",
  },
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    envKey: "GROQ_API_KEY",
  },
  gemini: {
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    envKey: "GEMINI_API_KEY",
  },
};

const PROVIDER_ORDER = ["openrouter", "openai", "groq", "gemini"];

/** @param {Record<string, string>} env */
export function hasClientLlmKey(env) {
  return PROVIDER_ORDER.some((id) => env[LLM_PROVIDER_PRESETS[id].envKey]?.trim());
}

/** @param {Record<string, string>} env */
export function listConfiguredLlmProviders(env) {
  return PROVIDER_ORDER.filter((id) => env[LLM_PROVIDER_PRESETS[id].envKey]?.trim());
}

/**
 * @param {Record<string, string>} env
 * @param {{ preferredProvider?: string, baseUrl?: string, model?: string }} opts
 */
export function resolveLlmConfig(env, opts = {}) {
  const preferred = (opts.preferredProvider || env.DEMO_LLM_PROVIDER || "")
    .trim()
    .toLowerCase();

  const pick = (id) => {
    const preset = LLM_PROVIDER_PRESETS[id];
    if (!preset) return null;
    const apiKey = env[preset.envKey]?.trim();
    if (!apiKey) return null;
    return {
      provider: id,
      apiKey,
      baseUrl: opts.baseUrl || env.LLM_BASE_URL?.trim() || preset.baseUrl,
      model: opts.model || env.LLM_MODEL?.trim() || preset.defaultModel,
      maestroProvider: preset.label,
      maestroProviderId: id,
    };
  };

  if (preferred && LLM_PROVIDER_PRESETS[preferred]) {
    return pick(preferred);
  }

  for (const id of PROVIDER_ORDER) {
    const cfg = pick(id);
    if (cfg) return cfg;
  }

  return null;
}

/** @param {Record<string, string>} env */
export function maestroLlmEnvFromEnv(env) {
  const cfg = resolveLlmConfig(env);
  if (!cfg) {
    return { DEMO_LLM_API_KEY: "", DEMO_LLM_PROVIDER: "OpenAI", DEMO_LLM_PROVIDER_ID: "openai" };
  }
  return {
    DEMO_LLM_API_KEY: cfg.apiKey,
    DEMO_LLM_PROVIDER: cfg.maestroProvider,
    DEMO_LLM_PROVIDER_ID: cfg.maestroProviderId,
  };
}
