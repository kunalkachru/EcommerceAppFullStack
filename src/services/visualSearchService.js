import apiClient from "./apiClient";

const VISUAL_SEARCH_TIMEOUT_MS = 120000;

/**
 * CLIP visual search via backend — compares photo embeddings to catalog images + titles.
 */
export async function analyzeImageForProducts(
  _imageUri,
  _products,
  imageBase64,
  { categoryFilter = null } = {}
) {
  if (!imageBase64) {
    throw new Error("Image data missing — enable includeBase64 in the picker");
  }

  const { data } = await apiClient.post(
    "/api/visual-search",
    { imageBase64, categoryFilter },
    { timeout: VISUAL_SEARCH_TIMEOUT_MS }
  );

  return {
    labels: data.labels ?? [],
    attributes: data.attributes ?? [],
    matches: data.matches ?? [],
    searchQuery: data.searchQuery ?? "",
    identification: data.identification ?? null,
    resultStatus: data.resultStatus ?? "unknown",
    nearestMatch: data.nearestMatch ?? null,
    categoryFilter: data.categoryFilter ?? "all",
    engine: data.engine ?? "clip",
  };
}

/** Feature 1: similar products for product detail page. */
export async function fetchSimilarProducts(productId, limit = 8) {
  const { data } = await apiClient.get(
    `/api/visual-search/similar/${encodeURIComponent(productId)}`,
    { params: { limit }, timeout: 30000 }
  );
  return {
    product: data.product,
    matches: data.matches ?? [],
  };
}

export const VISUAL_SEARCH_GROUPS = [
  { id: "all", label: "Any category" },
  { id: "clothing", label: "Clothing" },
  { id: "electronics", label: "Electronics" },
  { id: "beauty", label: "Beauty" },
  { id: "home", label: "Home" },
  { id: "groceries", label: "Groceries" },
  { id: "sports", label: "Sports" },
];
