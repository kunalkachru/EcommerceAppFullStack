import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@shopease/llm-voice-preferences";

const DEFAULTS = {
  useLlmReasoning: false,
  providerId: "groq",
  baseUrl: "",
  model: "",
};

/** Preferences only — API keys are never persisted (session memory only). */
export async function loadLlmPreferences() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await migrateLegacySettings();
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(raw);
    return {
      useLlmReasoning: Boolean(parsed.useLlmReasoning),
      providerId: String(parsed.providerId || "groq"),
      baseUrl: String(parsed.baseUrl || ""),
      model: String(parsed.model || ""),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveLlmPreferences(settings) {
  const payload = {
    useLlmReasoning: Boolean(settings.useLlmReasoning),
    providerId: String(settings.providerId || "groq"),
    baseUrl: String(settings.baseUrl || "").trim(),
    model: String(settings.model || "").trim(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

/** Remove legacy file that may have stored apiKey on disk. */
async function migrateLegacySettings() {
  try {
    const legacy = await AsyncStorage.getItem("@shopease/llm-voice-search");
    if (!legacy) return;
    const parsed = JSON.parse(legacy);
    await saveLlmPreferences({
      useLlmReasoning: parsed.useLlmReasoning,
      providerId: parsed.providerId || "groq",
      baseUrl: parsed.baseUrl,
      model: parsed.model,
    });
    await AsyncStorage.removeItem("@shopease/llm-voice-search");
  } catch {
    await AsyncStorage.removeItem("@shopease/llm-voice-search");
  }
}

export async function ensureLlmPreferencesMigrated() {
  await migrateLegacySettings();
}
