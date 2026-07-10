import * as Keychain from "react-native-keychain";

const SERVICE_PREFIX = "shopease-llm-key";

function serviceFor(userId) {
  return userId ? `${SERVICE_PREFIX}:${userId}` : SERVICE_PREFIX;
}

export async function getPersistedLlmKey(userId = null) {
  try {
    const result = await Keychain.getGenericPassword({ service: serviceFor(userId) });
    return result ? String(result.password || "") : "";
  } catch {
    return "";
  }
}

export async function setPersistedLlmKey(key, userId = null) {
  const trimmed = String(key || "").trim();
  if (!trimmed) {
    return deletePersistedLlmKey(userId);
  }
  try {
    await Keychain.setGenericPassword("llm-api-key", trimmed, { service: serviceFor(userId) });
  } catch {
    // Secure storage unavailable (e.g. device policy) -- degrade to session-only
    // behavior for this session rather than crashing. Caller (llmSearchDefaults.js /
    // VoiceSearchCard.jsx) already keeps the key in llmSessionStore.js regardless.
  }
}

export async function deletePersistedLlmKey(userId = null) {
  try {
    await Keychain.resetGenericPassword({ service: serviceFor(userId) });
  } catch {
    // Nothing stored, or storage unavailable -- either way there's nothing left to do.
  }
}
