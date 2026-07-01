const {
  shouldUseLlm,
  llmConfigured,
  resolveVoiceIntent,
} = require("../server/src/voiceQueryLLM");

describe("voiceQueryLLM", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.LLM_API_KEY;
    global.fetch = originalFetch;
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("shouldUseLlm only when enabled and key present", () => {
    expect(shouldUseLlm({ useLlmReasoning: false, apiKey: "sk-test" })).toBe(false);
    expect(shouldUseLlm({ useLlmReasoning: true, apiKey: "" })).toBe(false);
    expect(shouldUseLlm({ useLlmReasoning: true, apiKey: "sk-test" })).toBe(true);
  });

  it("llmConfigured respects client override", () => {
    expect(llmConfigured()).toBe(false);
    expect(llmConfigured("sk-user")).toBe(true);
    process.env.OPENAI_API_KEY = "sk-server";
    expect(llmConfigured()).toBe(true);
  });

  it("throws when AI enabled without any key", async () => {
    await expect(
      resolveVoiceIntent("shoes women", { useLlmReasoning: true, strictLlm: true })
    ).rejects.toMatchObject({ code: "llm_key_required" });
  });

  it("uses rules when AI reasoning is off", async () => {
    const intent = await resolveVoiceIntent("shoes women", { useLlmReasoning: false });
    expect(intent.source).toBe("rules");
    expect(intent.gender).toBe("women");
  });

  it("filters noisy LLM keywords that are unrelated to query intent", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                searchText: "wireless headphones under 100",
                keywords: ["wireless", "headphones", "phone", "smartphone", "mobile"],
                categories: [],
                gender: null,
                priceMin: 0,
                priceMax: 100,
                productTypes: ["headphones"],
                summary: "Headphones under 100",
              }),
            },
          },
        ],
      }),
    });

    const intent = await resolveVoiceIntent("wireless headphones below 100", {
      useLlmReasoning: true,
      strictLlm: true,
      apiKey: "sk-test",
      clientKeyOnly: true,
    });

    expect(intent.source).toBe("llm");
    expect(intent.keywords).toEqual(expect.arrayContaining(["wireless", "headphones"]));
    expect(intent.keywords).not.toEqual(
      expect.arrayContaining(["phone", "smartphone", "mobile"])
    );
  });

  it("treats ambiguous exact price as budget cap for conversational query", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                searchText: "blue jacket fifty dollars",
                keywords: ["blue", "jacket", "fifty dollars"],
                categories: [],
                gender: null,
                priceMin: 50,
                priceMax: 50,
                productTypes: ["jacket"],
                summary: "Blue jacket around fifty dollars",
              }),
            },
          },
        ],
      }),
    });

    const intent = await resolveVoiceIntent("it's a fifty dollars jacket blue please", {
      useLlmReasoning: true,
      strictLlm: true,
      apiKey: "sk-test",
      clientKeyOnly: true,
    });

    expect(intent.priceMin).toBe(0);
    expect(intent.priceMax).toBe(50);
  });

  it("preserves exact price intent when explicitly requested", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                searchText: "exactly 50 dollars jacket",
                keywords: ["jacket", "50"],
                categories: [],
                gender: null,
                priceMin: 50,
                priceMax: 50,
                productTypes: ["jacket"],
                summary: "Jacket exactly 50 dollars",
              }),
            },
          },
        ],
      }),
    });

    const intent = await resolveVoiceIntent("jacket exactly 50 dollars", {
      useLlmReasoning: true,
      strictLlm: true,
      apiKey: "sk-test",
      clientKeyOnly: true,
    });

    expect(intent.priceMin).toBe(50);
    expect(intent.priceMax).toBe(50);
  });

  it("treats ambiguous min-only price as budget cap", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                searchText: "gaming monitor 240 dollars",
                keywords: ["gaming", "monitor", "240"],
                categories: [],
                gender: null,
                priceMin: 240,
                priceMax: null,
                productTypes: ["monitor"],
                summary: "Gaming monitor around 240 dollars",
              }),
            },
          },
        ],
      }),
    });

    const intent = await resolveVoiceIntent("its a 240 dollars gaming monitor please", {
      useLlmReasoning: true,
      strictLlm: true,
      apiKey: "sk-test",
      clientKeyOnly: true,
    });

    expect(intent.priceMin).toBe(0);
    expect(intent.priceMax).toBe(240);
  });
});
