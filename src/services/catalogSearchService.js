import { searchProductsByVoice } from "./voiceSearchService";
import {
  filterProductsLocally,
  matchIdsFromProducts,
  parseVoiceQuery,
} from "../utils/catalogTextFilter";

/**
 * Unified catalog search — server semantic pipeline first.
 * Local rules are used as a resilience fallback when API is empty/unreachable.
 */
export async function searchCatalog(query, catalogProducts = [], llmOptions = {}) {
  const q = String(query || "").trim();
  if (!q) {
    return { query: q, matches: [], parsed: null, source: "empty" };
  }

  const localMatches = () => filterProductsLocally(catalogProducts, q);
  const localParsed = () => parseVoiceQuery(q);

  try {
    const result = await searchProductsByVoice(q, {
      useLlmReasoning: llmOptions.useLlmReasoning === true,
      apiKey: llmOptions.apiKey,
      baseUrl: llmOptions.baseUrl,
      model: llmOptions.model,
      providerId: llmOptions.providerId,
    });

    if (Array.isArray(result.matches) && result.matches.length > 0) {
      return {
        query: q,
        matches: result.matches,
        parsed: result.parsed,
        source: result.intentSource ?? "api",
        searchMode: result.searchMode ?? "semantic-first",
      };
    }

    const local = localMatches();
    return {
      query: q,
      matches: local,
      parsed: result.parsed ?? localParsed(),
      source: local.length ? "local-fallback" : "none",
      searchMode: result.searchMode ?? "semantic-first",
    };
  } catch (err) {
    if (llmOptions.useLlmReasoning === true) {
      throw err;
    }
    const local = localMatches();
    return {
      query: q,
      matches: local,
      parsed: localParsed(),
      source: local.length ? "local-offline" : "none",
      error: err?.message,
    };
  }
}

export { filterProductsLocally, matchIdsFromProducts, parseVoiceQuery };
