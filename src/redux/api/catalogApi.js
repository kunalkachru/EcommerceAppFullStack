import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiBaseUrl } from "../../config/api";
import catalogFallback from "../../data/catalog-fallback.json";

export const catalogApi = createApi({
  reducerPath: "catalogApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getApiBaseUrl(),
    timeout: 25000,
  }),
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: () => "/api/catalog/products",
      transformResponse: (response) => response?.products ?? response ?? [],
    }),
    getCatalogMeta: builder.query({
      query: () => "/api/catalog/meta",
    }),
    getProductById: builder.query({
      query: (id) => `/api/catalog/products/${id}`,
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetCatalogMetaQuery,
  useGetProductByIdQuery,
} = catalogApi;

const FALLBACK_PRODUCTS = catalogFallback?.products ?? [];

/**
 * Prefer live catalog from API; use bundled snapshot when offline / API down.
 */
export function useCatalogProducts() {
  const { data, error, isLoading, isFetching, refetch, isError, isSuccess } =
    useGetProductsQuery();

  const products =
    isSuccess && data?.length ? data : isError ? FALLBACK_PRODUCTS : [];

  return {
    products,
    isLoading: isLoading && !isError,
    isFetching,
    error: isError ? error : null,
    isOfflineFallback: isError,
    catalogTotal: products.length,
    refetch,
  };
}

/** Top categories by product count for home / filter shortcuts. */
export function getTopCategories(products, limit = 8) {
  const counts = new Map();
  products.forEach((p) => {
    if (p.category) {
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    }
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category);
}
