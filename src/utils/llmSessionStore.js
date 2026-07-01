/**
 * In-memory LLM API key — never written to disk or Redux.
 * Cleared on logout and when a different user signs in.
 */
let sessionApiKey = "";
let sessionOwnerId = null;

export function setSessionLlmKey(key, userId = null) {
  sessionApiKey = String(key || "").trim();
  sessionOwnerId = userId ?? null;
}

export function getSessionLlmKey(userId = null) {
  if (sessionOwnerId && userId && sessionOwnerId !== userId) {
    return "";
  }
  return sessionApiKey;
}

export function hasSessionLlmKey(userId = null) {
  return getSessionLlmKey(userId).length > 0;
}

export function clearSessionLlmKey() {
  sessionApiKey = "";
  sessionOwnerId = null;
}

/** Wipe key from a string copy (best-effort; does not affect original). */
export function scrubKeyMaterial(value) {
  if (typeof value !== "string" || !value) {
    return value;
  }
  return value.replace(/sk-[A-Za-z0-9_-]{8,}/g, "[REDACTED_KEY]");
}
