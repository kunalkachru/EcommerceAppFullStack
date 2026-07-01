/** Shared LLM provider presets (OpenAI-compatible APIs). */
const LLM_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    badge: "Paid API",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyUrl: "https://platform.openai.com/api-keys",
    keyOptional: false,
  },
  {
    id: "groq",
    label: "Groq",
    badge: "Free tier",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
    keyOptional: false,
  },
  {
    id: "gemini",
    label: "Google Gemini",
    badge: "Free tier",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    keyUrl: "https://aistudio.google.com/apikey",
    keyOptional: false,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    badge: "Multi-model",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    keyUrl: "https://openrouter.ai/keys",
    keyOptional: false,
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    badge: "Free local",
    baseUrl: "http://127.0.0.1:11434/v1",
    defaultModel: "llama3.2",
    keyUrl: "https://ollama.com",
    keyOptional: true,
  },
];

module.exports = { LLM_PROVIDERS };
