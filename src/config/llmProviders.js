/**
 * OpenAI-compatible LLM providers users can bring their own key for.
 * Voice-to-text stays free via device speech (@react-native-voice/voice).
 */
export const LLM_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    badge: "Paid API",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyHint: "sk-… from platform.openai.com/api-keys",
    keyUrl: "https://platform.openai.com/api-keys",
    help:
      "Sign in with Google/Gmail on OpenAI’s site, then create an API key. ChatGPT Plus is separate from API billing.",
  },
  {
    id: "groq",
    label: "Groq",
    badge: "Free tier",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    keyHint: "gsk_… from console.groq.com",
    keyUrl: "https://console.groq.com/keys",
    help: "Fast free tier — good default if you don’t want OpenAI costs.",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    badge: "Free tier",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    keyHint: "AIza… from aistudio.google.com",
    keyUrl: "https://aistudio.google.com/apikey",
    help: "Use your Google account; free quota from AI Studio (not Gmail OAuth in-app).",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    badge: "Multi-model",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    keyHint: "sk-or-… from openrouter.ai/keys",
    keyUrl: "https://openrouter.ai/keys",
    help:
      "One key routes to many models (GPT, Claude, Llama). Paste sk-or-… from openrouter.ai/keys.",
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    badge: "Free local",
    baseUrl: "http://127.0.0.1:11434/v1",
    defaultModel: "llama3.2",
    keyHint: "Optional — often leave blank for local Ollama",
    keyUrl: "https://ollama.com",
    help: "Run `ollama serve` on the machine running the API server.",
    keyOptional: true,
  },
];

export function getProviderById(id) {
  return LLM_PROVIDERS.find((p) => p.id === id) ?? LLM_PROVIDERS[0];
}

/**
 * The LLM call is proxied through the API server (server/src/voiceQueryLLM.js),
 * which shares a machine with Ollama regardless of which client device is
 * testing -- this must always be the server's own loopback, never a
 * client-device-specific host alias like the Android emulator's 10.0.2.2.
 */
export function resolveProviderBaseUrl(provider) {
  return provider?.baseUrl ?? "";
}

function isKnownProviderBaseUrl(url) {
  return LLM_PROVIDERS.some((p) => resolveProviderBaseUrl(p) === url);
}

function isKnownProviderModel(model) {
  return LLM_PROVIDERS.some((p) => p.defaultModel === model);
}

export function normalizeProviderBaseUrl(provider, rawBaseUrl) {
  const targetBase = resolveProviderBaseUrl(provider);
  const current = String(rawBaseUrl || "").trim();
  if (!current) return targetBase;
  // If this is a stale default from another provider, auto-correct.
  if (isKnownProviderBaseUrl(current) && current !== targetBase) {
    return targetBase;
  }
  return current;
}

export function normalizeProviderModel(provider, rawModel) {
  const targetModel = provider.defaultModel;
  const current = String(rawModel || "").trim();
  if (!current) return targetModel;
  // If this is a stale default from another provider, auto-correct.
  if (isKnownProviderModel(current) && current !== targetModel) {
    return targetModel;
  }
  return current;
}
