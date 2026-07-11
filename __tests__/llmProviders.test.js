const { getProviderById, resolveProviderBaseUrl } = require("../src/config/llmProviders");

describe("resolveProviderBaseUrl", () => {
  it("resolves Ollama's base URL to the server's own loopback, not the emulator's host alias", () => {
    // The LLM call is proxied through our Node server (voiceQueryLLM.js), which runs
    // on the same machine as Ollama regardless of which client device is testing --
    // 10.0.2.2 is only meaningful *inside* the Android emulator's own network
    // namespace, not from the server's perspective. Sending it as llmBaseUrl makes
    // the server try (and fail) to fetch its own emulator-only alias.
    const ollama = getProviderById("ollama");
    expect(resolveProviderBaseUrl(ollama)).toBe("http://127.0.0.1:11434/v1");
  });

  it("leaves cloud providers' base URLs untouched", () => {
    const openai = getProviderById("openai");
    expect(resolveProviderBaseUrl(openai)).toBe(openai.baseUrl);
  });
});
