import { Platform } from "react-native";

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
    id: "ollama",
    label: "Ollama (local)",
    badge: "Free local",
    baseUrl:
      Platform.OS === "android"
        ? "http://10.0.2.2:11434/v1"
        : "http://127.0.0.1:11434/v1",
    defaultModel: "llama3.2",
    keyHint: "Optional — often leave blank for local Ollama",
    keyUrl: "https://ollama.com",
    help: "Run `ollama serve` on your Mac/PC. Emulator uses 10.0.2.2 to reach the host.",
    keyOptional: true,
  },
];

export function getProviderById(id) {
  return LLM_PROVIDERS.find((p) => p.id === id) ?? LLM_PROVIDERS[0];
}

/** Android emulator reaches the dev machine at 10.0.2.2 */
export function resolveProviderBaseUrl(provider) {
  if (provider?.id === "ollama" && Platform.OS === "android") {
    return "http://10.0.2.2:11434/v1";
  }
  return provider?.baseUrl ?? "";
}
