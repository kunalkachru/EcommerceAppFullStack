const RUNTIME_DEFAULTS = {
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

function normalizeRuntimeName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "hybrid" ? "hybrid" : "baseline";
}

function getSearchRuntimeConfig(env = process.env) {
  const runtimeName = normalizeRuntimeName(env.SEARCH_RUNTIME);
  const defaults = RUNTIME_DEFAULTS[runtimeName];
  const port = Number(env.PORT) || defaults.port;

  return {
    ...defaults,
    port,
    envName: env.SEARCH_ENV_NAME || runtimeName,
  };
}

module.exports = {
  RUNTIME_DEFAULTS,
  getSearchRuntimeConfig,
};
