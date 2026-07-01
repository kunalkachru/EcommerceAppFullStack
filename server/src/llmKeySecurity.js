/**
 * Server-side guards for per-request client LLM keys.
 * Keys are never stored, logged, or reused across requests/users.
 */

const PRIVATE_HOST_RE =
  /^(10\.(?!0\.2\.2)|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|metadata\.google)/i;

const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

function scrubKeyMaterial(value) {
  if (typeof value !== "string" || !value) {
    return value;
  }
  return value
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[REDACTED_KEY]")
    .replace(/gsk_[A-Za-z0-9_-]{8,}/g, "[REDACTED_KEY]")
    .replace(/AIza[A-Za-z0-9_-]{8,}/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED_KEY]");
}

function extractClientLlmKey(req) {
  const headerKey = req.headers["x-llm-api-key"];
  if (typeof headerKey === "string" && headerKey.trim()) {
    return headerKey.trim();
  }
  return "";
}

function scrubLlmSecretsFromRequest(req) {
  if (req.body && typeof req.body === "object") {
    delete req.body.llmApiKey;
    delete req.body.apiKey;
  }
  if (req.headers["x-llm-api-key"]) {
    delete req.headers["x-llm-api-key"];
  }
}

function validateClientApiKey(apiKey, { optional = false } = {}) {
  if (!apiKey) {
    if (optional) {
      return { ok: true };
    }
    return { ok: false, message: "API key is required for this AI provider." };
  }
  if (apiKey.length < 8 || apiKey.length > 512) {
    return { ok: false, message: "API key format is invalid." };
  }
  if (/\s/.test(apiKey)) {
    return { ok: false, message: "API key must not contain whitespace." };
  }
  return { ok: true };
}

function validateLlmBaseUrl(baseUrl) {
  if (!baseUrl) {
    return { ok: true, value: "" };
  }
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { ok: false, message: "LLM base URL is invalid." };
  }
  if (!["https:", "http:"].includes(parsed.protocol)) {
    return { ok: false, message: "LLM base URL must use http or https." };
  }
  if (parsed.protocol === "http:" && !DEV_HOSTS.has(parsed.hostname)) {
    return { ok: false, message: "Non-local LLM base URL must use https." };
  }
  if (
    PRIVATE_HOST_RE.test(parsed.hostname) &&
    !DEV_HOSTS.has(parsed.hostname)
  ) {
    return { ok: false, message: "LLM base URL host is not allowed." };
  }
  return { ok: true, value: parsed.origin + parsed.pathname.replace(/\/$/, "") };
}

function buildClientLlmOptions(req, { useLlmReasoning }) {
  const headerKey = extractClientLlmKey(req);
  const apiKey = headerKey === "ollama-local" ? "" : headerKey;
  const baseUrlRaw = typeof req.body?.llmBaseUrl === "string" ? req.body.llmBaseUrl.trim() : "";
  const model = typeof req.body?.llmModel === "string" ? req.body.llmModel.trim().slice(0, 120) : "";
  const providerId = typeof req.body?.llmProvider === "string" ? req.body.llmProvider.trim() : "";
  const { LLM_PROVIDERS } = require("./llmProviders");
  const provider = LLM_PROVIDERS.find((p) => p.id === providerId);
  const keyOptional = provider?.keyOptional === true || providerId === "ollama";

  if (useLlmReasoning !== true) {
    return {
      ok: true,
      options: {
        useLlmReasoning: false,
        clientKeyOnly: true,
        strictLlm: false,
      },
    };
  }

  const keyCheck = validateClientApiKey(apiKey, { optional: keyOptional });
  if (!keyCheck.ok) {
    return { ok: false, status: 400, code: "llm_key_required", message: keyCheck.message };
  }

  const urlCheck = validateLlmBaseUrl(baseUrlRaw || provider?.baseUrl || "");
  if (!urlCheck.ok) {
    return { ok: false, status: 400, code: "llm_url_invalid", message: urlCheck.message };
  }

  const resolvedModel = model || provider?.defaultModel || "";

  return {
    ok: true,
    options: {
      useLlmReasoning: true,
      apiKey,
      baseUrl: urlCheck.value,
      model: resolvedModel,
      clientKeyOnly: true,
      strictLlm: true,
      providerId,
    },
  };
}

module.exports = {
  scrubKeyMaterial,
  extractClientLlmKey,
  scrubLlmSecretsFromRequest,
  validateClientApiKey,
  validateLlmBaseUrl,
  buildClientLlmOptions,
};
