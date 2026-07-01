import axios from "axios";
import { getApiBaseUrl } from "../config/api";
import apiClient, { getAuthToken } from "./apiClient";

const VOICE_SEARCH_TIMEOUT_MS = 90000;

/**
 * Voice search uses a dedicated request path.
 * LLM keys travel only in X-LLM-Api-Key — never in shared client defaults or JSON body.
 *
 * @param {string} query
 * @param {{ useLlmReasoning?: boolean, apiKey?: string, baseUrl?: string, model?: string, providerId?: string }} [llm]
 */
export async function searchProductsByVoice(query, llm = {}) {
  const body = {
    query: query.trim(),
    useLlmReasoning: llm.useLlmReasoning === true,
  };
  if (llm.providerId?.trim()) {
    body.llmProvider = llm.providerId.trim();
  }
  if (llm.baseUrl?.trim()) {
    body.llmBaseUrl = llm.baseUrl.trim();
  }
  if (llm.model?.trim()) {
    body.llmModel = llm.model.trim();
  }

  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (llm.useLlmReasoning === true && llm.apiKey?.trim()) {
    headers["X-LLM-Api-Key"] = llm.apiKey.trim();
  } else if (llm.useLlmReasoning === true && llm.providerId === "ollama") {
    headers["X-LLM-Api-Key"] = "ollama-local";
  }

  const { data } = await axios.post(`${getApiBaseUrl()}/api/search/voice`, body, {
    headers,
    timeout: VOICE_SEARCH_TIMEOUT_MS,
  });

  return {
    query: data.query ?? query,
    parsed: data.parsed ?? null,
    matches: data.matches ?? [],
    resultStatus: data.resultStatus ?? "unknown",
    engine: data.engine ?? "clip",
    intentSource: data.intentSource ?? data.parsed?.source ?? "rules",
  };
}

export async function fetchVoiceSearchConfig() {
  const { data } = await apiClient.get("/api/search/voice/config");
  return {
    requiresClientKey: data.requiresClientKey !== false,
    defaultModel: data.defaultModel ?? "gpt-4o-mini",
    defaultBaseUrl: data.defaultBaseUrl ?? "https://api.openai.com/v1",
    keyTransport: data.keyTransport ?? "X-LLM-Api-Key",
  };
}
