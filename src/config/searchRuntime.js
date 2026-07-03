import axios from "axios";
import { getApiBaseUrl, resolveApiHost, resolveApiScheme } from "./api";
import { isCloudApiTarget } from "./apiTarget";

const SEARCH_RUNTIME_DEFAULTS = {
  baseline: {
    runtimeName: "baseline",
    port: 5001,
    strategy: "semantic-first",
  },
  hybrid: {
    runtimeName: "hybrid",
    port: 5002,
    strategy: "hybrid-lexical-semantic-v1",
  },
};

let searchRuntimeOverride = null;

function readSearchRuntimeName() {
  if (searchRuntimeOverride) {
    return searchRuntimeOverride;
  }
  if (typeof global !== "undefined" && global.__SEARCH_RUNTIME__) {
    return global.__SEARCH_RUNTIME__;
  }
  if (typeof process !== "undefined" && process.env?.SEARCH_RUNTIME) {
    return process.env.SEARCH_RUNTIME;
  }
  return "baseline";
}

export function normalizeSearchRuntimeName(value) {
  return String(value || "").trim().toLowerCase() === "hybrid" ? "hybrid" : "baseline";
}

export function getSearchRuntimeConfig() {
  const runtimeName = normalizeSearchRuntimeName(readSearchRuntimeName());
  return SEARCH_RUNTIME_DEFAULTS[runtimeName];
}

export function setSearchRuntimeOverride(value) {
  const runtimeName = normalizeSearchRuntimeName(value);
  searchRuntimeOverride = runtimeName;
  if (typeof global !== "undefined") {
    global.__SEARCH_RUNTIME__ = runtimeName;
  }
  return SEARCH_RUNTIME_DEFAULTS[runtimeName];
}

export function clearSearchRuntimeOverride() {
  searchRuntimeOverride = null;
  if (typeof global !== "undefined") {
    delete global.__SEARCH_RUNTIME__;
  }
}

export function getSearchApiBaseUrl() {
  if (isCloudApiTarget()) {
    return getApiBaseUrl();
  }
  const { port } = getSearchRuntimeConfig();
  return `${resolveApiScheme()}://${resolveApiHost()}:${port}`;
}

export function createSearchApiClient(options = {}) {
  return axios.create({
    baseURL: getSearchApiBaseUrl(),
    timeout: 15000,
    ...options,
  });
}
