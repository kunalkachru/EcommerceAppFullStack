/**
 * LLM-backed shopping intent extraction (OpenAI-compatible API).
 * Uses per-request client key when provided, else server env key, else rules.
 */
const { parseVoiceQuery } = require("./voiceQueryParser");
const { normalizeSearchQuery } = require("./queryNormalize");

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

const PRODUCT_TYPE_KEYWORDS = {
  headphones: ["headphone", "headphones", "earphone", "earphones", "earbud", "earbuds", "airpod", "airpods"],
  earbuds: ["earbud", "earbuds", "airpod", "airpods", "earphone", "earphones"],
  shoes: ["shoe", "shoes", "sneaker", "sneakers", "boot", "boots"],
  jacket: ["jacket", "coat", "outerwear", "parka"],
  laptop: ["laptop", "notebook", "macbook", "ultrabook"],
  watch: ["watch", "wristwatch", "smartwatch"],
};

function canonicalToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(es|s)$/i, "");
}

function buildAllowedKeywordCanonicals(rawQuery, productTypes = [], ruleKeywords = []) {
  const normalizedQuery = normalizeSearchQuery(rawQuery);
  const allowed = new Set(
    normalizedQuery
      .split(/\s+/)
      .map((t) => canonicalToken(t))
      .filter(Boolean)
  );
  for (const type of productTypes) {
    const normalizedType = String(type || "").toLowerCase().trim();
    const terms = PRODUCT_TYPE_KEYWORDS[normalizedType] || [normalizedType];
    for (const term of terms) {
      const canonical = canonicalToken(term);
      if (canonical) allowed.add(canonical);
    }
  }
  for (const kw of ruleKeywords) {
    const canonical = canonicalToken(kw);
    if (canonical) allowed.add(canonical);
  }
  return allowed;
}

function normalizeAmbiguousExactPrice(rawQuery, priceMin, priceMax) {
  const minIsFinite = Number.isFinite(priceMin);
  const maxIsFinite = Number.isFinite(priceMax);
  if (!minIsFinite || !maxIsFinite || priceMin <= 0 || priceMin !== priceMax) {
    return { priceMin, priceMax };
  }

  const normalized = normalizeSearchQuery(rawQuery);
  const hasExactCue = /\b(exact|exactly|fixed|equal|precise|only)\b/.test(normalized);
  if (hasExactCue) {
    return { priceMin, priceMax };
  }

  const hasUpperBoundCue = /\b(over|above|greater|minimum|min|at least|more than)\b/.test(normalized);
  const hasLowerBoundCue = /\b(under|below|less|cheaper|max|maximum|up to|at most|around|about|budget)\b/.test(normalized);

  if (hasUpperBoundCue && !hasLowerBoundCue) {
    return { priceMin, priceMax: Number.POSITIVE_INFINITY };
  }

  // Conversational shopping prompts with a single price tend to imply a max budget.
  return { priceMin: 0, priceMax };
}

function normalizeAmbiguousSingleBoundPrice(rawQuery, priceMin, priceMax) {
  const normalized = normalizeSearchQuery(rawQuery);
  const hasUpperBoundCue = /\b(over|above|greater|minimum|min|at least|more than)\b/.test(normalized);
  const hasLowerBoundCue = /\b(under|below|less|cheaper|max|maximum|up to|at most|around|about|budget)\b/.test(normalized);
  const hasMoneyCue = /\b(dollar|dollars|bucks|price|priced|budget|cost)\b/.test(normalized);
  const maxIsOpen = !Number.isFinite(priceMax) || priceMax > 1e8;

  // "it's 240 dollars monitor please" style phrases often get parsed as min-only;
  // interpret as budget cap unless the user explicitly said above/minimum.
  if (priceMin > 0 && maxIsOpen && !hasUpperBoundCue && !hasLowerBoundCue && hasMoneyCue) {
    return { priceMin: 0, priceMax: priceMin };
  }

  return { priceMin, priceMax };
}

function llmConfigured(overrideKey, { clientKeyOnly = false } = {}) {
  if (clientKeyOnly) {
    return Boolean(String(overrideKey || "").trim());
  }
  return Boolean(
    String(overrideKey || "").trim() ||
      process.env.LLM_API_KEY ||
      process.env.OPENAI_API_KEY
  );
}

function resolveLlmConfig(clientOptions = {}) {
  const clientKey = String(clientOptions.apiKey || "").trim();
  const clientKeyOnly = clientOptions.clientKeyOnly === true;

  const apiKey = clientKeyOnly
    ? clientKey
    : clientKey ||
      process.env.LLM_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

  const baseUrl = (
    String(clientOptions.baseUrl || "").trim() ||
    process.env.LLM_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    DEFAULT_BASE_URL
  ).replace(/\/$/, "");
  const model =
    String(clientOptions.model || "").trim() ||
    process.env.LLM_MODEL ||
    process.env.OPENAI_MODEL ||
    DEFAULT_MODEL;
  return { apiKey, baseUrl, model, clientKeyOnly };
}

function getLlmConfig() {
  return resolveLlmConfig({});
}

function applyProviderHeaders(headers, clientOptions, baseUrl) {
  const providerId = clientOptions.providerId;
  const isOpenRouter =
    providerId === "openrouter" || String(baseUrl || "").includes("openrouter.ai");
  if (isOpenRouter) {
    headers["HTTP-Referer"] = "https://github.com/kunalkachru/EcommerceAppFullStack";
    headers["X-Title"] = "ShopEase Demo";
  }
}

const SYSTEM_PROMPT = `You extract structured shopping search intent from spoken or typed customer requests.
Return ONLY valid JSON (no markdown) with this shape:
{
  "searchText": "natural language product description for semantic search",
  "keywords": ["important", "product", "terms"],
  "categories": ["catalog category slugs if inferable, else []"],
  "gender": "women" | "men" | "unisex" | null,
  "priceMin": number,
  "priceMax": number | null,
  "productTypes": ["shoes", "jacket", etc],
  "summary": "short human-readable summary"
}
Rules:
- Infer gender from words like women/womens/ladies/girls vs men/mens/boys.
- Map footwear requests to categories like womens-shoes, mens-shoes, shoesk when relevant.
- priceMax null means no upper limit. priceMin defaults to 0.
- keywords should include product type + gender + color/material when mentioned.
- searchText should be a rich phrase for embedding search, e.g. "women's casual shoes sneakers sandals".`;

async function callLlm(rawQuery, clientOptions = {}) {
  const { apiKey, baseUrl, model } = resolveLlmConfig(clientOptions);
  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (clientOptions.clientKeyOnly && clientOptions.providerId !== "ollama") {
    throw new Error("LLM API key is required for this provider");
  }
  applyProviderHeaders(headers, clientOptions, baseUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: rawQuery },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty LLM response");
    }
    return JSON.parse(content);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeLlmIntent(rawQuery, llm) {
  const rule = parseVoiceQuery(rawQuery);
  let priceMin = Number.isFinite(llm.priceMin) ? llm.priceMin : rule.priceMin;
  let priceMax = rule.priceMax;
  if (llm.priceMax === null) {
    priceMax = Number.POSITIVE_INFINITY;
  } else if (Number.isFinite(llm.priceMax)) {
    priceMax = llm.priceMax;
  }
  ({ priceMin, priceMax } = normalizeAmbiguousExactPrice(rawQuery, priceMin, priceMax));
  ({ priceMin, priceMax } = normalizeAmbiguousSingleBoundPrice(rawQuery, priceMin, priceMax));

  const llmProductTypes = Array.isArray(llm.productTypes) ? llm.productTypes : [];
  const allowedKeywordCanonicals = buildAllowedKeywordCanonicals(
    rawQuery,
    llmProductTypes,
    rule.keywords
  );
  const keywords = [
    ...(Array.isArray(llm.keywords) ? llm.keywords : []),
    ...llmProductTypes,
    ...rule.keywords,
  ]
    .map((k) => String(k).toLowerCase().trim())
    .filter((k) => k.length > 1)
    .filter((k) => {
      if (k.includes(" ")) {
        return normalizeSearchQuery(rawQuery).includes(k);
      }
      return allowedKeywordCanonicals.has(canonicalToken(k));
    });

  const categoryFilters = [
    ...(Array.isArray(llm.categories) ? llm.categories : []),
    ...rule.categoryFilters,
  ]
    .map((c) => String(c).toLowerCase().trim())
    .filter(Boolean);

  const gender = llm.gender || rule.gender || null;
  const searchText =
    String(llm.searchText || "").trim() ||
    [gender, ...llmProductTypes, ...rule.keywords].filter(Boolean).join(" ") ||
    rawQuery;

  return {
    rawQuery,
    searchText,
    priceMin,
    priceMax,
    categoryGroups: rule.categoryGroups,
    categoryFilters: [...new Set(categoryFilters)],
    keywords: [...new Set(keywords)],
    gender,
    productTypes: llmProductTypes.length ? llmProductTypes : rule.productTypes,
    summary: llm.summary || rule.summary,
    source: "llm",
  };
}

function shouldUseLlm(options = {}) {
  if (options.useLlmReasoning !== true) {
    return false;
  }
  if (options.providerId === "ollama") {
    return true;
  }
  return llmConfigured(options.apiKey, { clientKeyOnly: options.clientKeyOnly === true });
}

/** Parse voice/text query — LLM when requested + key available, else enhanced rules. */
async function resolveVoiceIntent(text, options = {}) {
  const rawQuery = String(text || "").trim();
  if (!rawQuery) {
    throw new Error("Query text is required");
  }

  const ollamaLocal = options.providerId === "ollama";
  if (
    options.useLlmReasoning === true &&
    !ollamaLocal &&
    !llmConfigured(options.apiKey, { clientKeyOnly: options.clientKeyOnly === true })
  ) {
    const err = new Error(
      options.clientKeyOnly
        ? "AI reasoning requires your API key in this session. Paste your key — it is never saved on the server."
        : "AI reasoning is enabled but no API key was provided. Paste your OpenAI-compatible key."
    );
    err.code = "llm_key_required";
    throw err;
  }

  if (!shouldUseLlm(options)) {
    const intent = parseVoiceQuery(rawQuery);
    return { ...intent, searchText: intent.semanticQuery, source: "rules" };
  }

  try {
    const llm = await callLlm(rawQuery, {
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      model: options.model,
      clientKeyOnly: options.clientKeyOnly,
      providerId: options.providerId,
    });
    return normalizeLlmIntent(rawQuery, llm);
  } catch (err) {
    if (options.strictLlm === true) {
      throw err;
    }
    const { scrubKeyMaterial } = require("./llmKeySecurity");
    console.warn("[voice-llm] Falling back to rules:", scrubKeyMaterial(err.message));
    const intent = parseVoiceQuery(rawQuery);
    return { ...intent, searchText: intent.semanticQuery, source: "rules-fallback" };
  }
}

module.exports = {
  resolveVoiceIntent,
  llmConfigured,
  getLlmConfig,
  shouldUseLlm,
  DEFAULT_MODEL,
  DEFAULT_BASE_URL,
};
