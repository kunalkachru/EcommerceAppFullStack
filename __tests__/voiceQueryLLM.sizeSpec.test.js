const { resolveVoiceIntent } = require("../server/src/voiceQueryLLM");

describe("voiceQueryLLM size/specification passthrough (no API key -> rules fallback)", () => {
  it("falls back to rule-based size/specification extraction when LLM is not configured", async () => {
    const intent = await resolveVoiceIntent("brown trousers size XL", { useLlmReasoning: false });
    expect(intent.size).toBe("XL");
    expect(intent.source).toBe("rules");
  });

  it("falls back to rule-based specification extraction when LLM is not configured", async () => {
    const intent = await resolveVoiceIntent("waterproof wireless headphones", { useLlmReasoning: false });
    expect(intent.specifications).toEqual(expect.arrayContaining(["waterproof", "wireless"]));
  });
});
