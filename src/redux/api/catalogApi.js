import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import fallbackProducts from "../../data/products";

const CATALOG_BASE_URL = "https://fakestoreapi.com";

export const catalogApi = createApi({
  reducerPath: "catalogApi",
  baseQuery: fetchBaseQuery({
    baseUrl: CATALOG_BASE_URL,
    timeout: 15000,
  }),
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: () => "/products",
    }),
    getProductById: builder.query({
      query: (id) => `/products/${id}`,
    }),
  }),
});

export const { useGetProductsQuery, useGetProductByIdQuery } = catalogApi;

/**
 * Prefer live catalog; use bundled snapshot when the request fails (offline / API down).
 */
export function useCatalogProducts() {
  const { data, error, isLoading, isFetching, refetch, isError, isSuccess } =
    useGetProductsQuery();

  const products =
    isSuccess && data?.length ? data : isError ? fallbackProducts : [];

  return {
    products,
    isLoading: isLoading && !isError,
    isFetching,
    error: isError ? error : null,
    isOfflineFallback: isError,
    refetch,
  };
}
