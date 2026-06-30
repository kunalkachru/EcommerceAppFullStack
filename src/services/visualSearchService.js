import apiClient from "./apiClient";

const VISUAL_SEARCH_TIMEOUT_MS = 120000;

/**
 * CLIP visual search via backend — compares photo embeddings to catalog images + titles.
 */
export async function analyzeImageForProducts(_imageUri, _products, imageBase64) {
  if (!imageBase64) {
    throw new Error("Image data missing — enable includeBase64 in the picker");
  }

  const { data } = await apiClient.post(
    "/api/visual-search",
    { imageBase64 },
    { timeout: VISUAL_SEARCH_TIMEOUT_MS }
  );

  return {
    labels: data.labels ?? [],
    matches: data.matches ?? [],
    searchQuery: data.searchQuery ?? "",
    engine: data.engine ?? "clip",
  };
}
