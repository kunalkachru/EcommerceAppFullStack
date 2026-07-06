import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hasClientLlmKey,
  resolveLlmConfig,
  maestroLlmEnvFromEnv,
  listConfiguredLlmProviders,
} from "../lib/llm-env-config.mjs";

describe("llm-env-config", () => {
  it("hasClientLlmKey is false when no keys configured", () => {
    assert.equal(hasClientLlmKey({}), false);
  });

  it("hasClientLlmKey is true when Groq key present", () => {
    assert.equal(hasClientLlmKey({ GROQ_API_KEY: "gsk_test" }), true);
  });

  it("resolveLlmConfig prefers OpenRouter when both OpenAI and OpenRouter set", () => {
    const cfg = resolveLlmConfig({
      OPENAI_API_KEY: "sk-openai",
      OPENROUTER_API_KEY: "sk-or-v1-test",
    });
    assert.equal(cfg.provider, "openrouter");
    assert.equal(cfg.apiKey, "sk-or-v1-test");
    assert.match(cfg.baseUrl, /openrouter\.ai/);
  });

  it("resolveLlmConfig honors preferredProvider openai", () => {
    const cfg = resolveLlmConfig(
      {
        OPENAI_API_KEY: "sk-openai",
        OPENROUTER_API_KEY: "sk-or-v1-test",
      },
      { preferredProvider: "openai" }
    );
    assert.equal(cfg.provider, "openai");
    assert.equal(cfg.apiKey, "sk-openai");
  });

  it("resolveLlmConfig returns null when no keys", () => {
    assert.equal(resolveLlmConfig({}), null);
  });

  it("resolveLlmConfig uses Groq when only GROQ_API_KEY set", () => {
    const cfg = resolveLlmConfig({ GROQ_API_KEY: "gsk_abc" });
    assert.equal(cfg.provider, "groq");
    assert.equal(cfg.apiKey, "gsk_abc");
    assert.match(cfg.baseUrl, /groq\.com/);
  });

  it("maestroLlmEnvFromEnv maps OpenRouter label", () => {
    const env = maestroLlmEnvFromEnv({
      OPENROUTER_API_KEY: "sk-or-v1-demo",
    });
    assert.equal(env.DEMO_LLM_API_KEY, "sk-or-v1-demo");
    assert.equal(env.DEMO_LLM_PROVIDER, "OpenRouter");
  });

  it("listConfiguredLlmProviders skips absent keys", () => {
    assert.deepEqual(listConfiguredLlmProviders({ OPENAI_API_KEY: "sk-x" }), ["openai"]);
    assert.deepEqual(listConfiguredLlmProviders({}), []);
  });
});
