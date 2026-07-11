import { getProviderById, normalizeProviderBaseUrl, normalizeProviderModel } from "../config/llmProviders";
import { loadLlmPreferences } from "./llmSearchPreferences";
import { getSessionLlmKey, setSessionLlmKey } from "./llmSessionStore";
import { getPersistedLlmKey } from "./secureLlmKeyStorage";

/**
 * Resolves the default llmOptions payload for a search call without requiring the
 * caller to have visited VoiceSearchCard first. Checks the fast in-memory session key,
 * falls back to secure on-device storage, and hydrates the session store from it so
 * later calls in the same session skip the secure-storage round trip.
 */
export async function resolveDefaultLlmOptions(userId = null) {
  const prefs = await loadLlmPreferences();
  const provider = getProviderById(prefs.providerId || "groq");

  let apiKey = getSessionLlmKey(userId);
  if (!apiKey) {
    apiKey = await getPersistedLlmKey(userId);
    if (apiKey) {
      setSessionLlmKey(apiKey, userId);
    }
  }

  const hasUsableKey = provider.keyOptional === true || apiKey.length > 0;

  return {
    useLlmReasoning: Boolean(prefs.useLlmReasoning) && hasUsableKey,
    providerId: provider.id,
    apiKey: apiKey.trim(),
    baseUrl: normalizeProviderBaseUrl(provider, prefs.baseUrl),
    model: normalizeProviderModel(provider, prefs.model),
  };
}
