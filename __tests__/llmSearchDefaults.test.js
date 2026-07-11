jest.mock("../src/utils/llmSearchPreferences", () => ({
  loadLlmPreferences: jest.fn(),
}));
jest.mock("../src/utils/llmSessionStore", () => ({
  getSessionLlmKey: jest.fn(),
  setSessionLlmKey: jest.fn(),
}));
jest.mock("../src/utils/secureLlmKeyStorage", () => ({
  getPersistedLlmKey: jest.fn(),
}));

const { loadLlmPreferences } = require("../src/utils/llmSearchPreferences");
const { getSessionLlmKey, setSessionLlmKey } = require("../src/utils/llmSessionStore");
const { getPersistedLlmKey } = require("../src/utils/secureLlmKeyStorage");
const { resolveDefaultLlmOptions } = require("../src/utils/llmSearchDefaults");

describe("resolveDefaultLlmOptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stays off when no key exists anywhere and the provider requires one", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("");
    getPersistedLlmKey.mockResolvedValue("");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(false);
    expect(result.apiKey).toBe("");
  });

  it("turns on automatically when a session key already exists", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("sk-session-key");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(true);
    expect(result.apiKey).toBe("sk-session-key");
    expect(getPersistedLlmKey).not.toHaveBeenCalled();
  });

  it("falls back to secure storage and hydrates the session store when no session key exists", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("");
    getPersistedLlmKey.mockResolvedValue("sk-persisted-key");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(true);
    expect(result.apiKey).toBe("sk-persisted-key");
    expect(setSessionLlmKey).toHaveBeenCalledWith("sk-persisted-key", "user-1");
  });

  it("respects an explicit saved preference of false even when a key exists", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: false,
      providerId: "groq",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("sk-session-key");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(false);
  });

  it("allows reasoning for a keyOptional provider (ollama) even with no key", async () => {
    loadLlmPreferences.mockResolvedValue({
      useLlmReasoning: true,
      providerId: "ollama",
      baseUrl: "",
      model: "",
    });
    getSessionLlmKey.mockReturnValue("");
    getPersistedLlmKey.mockResolvedValue("");

    const result = await resolveDefaultLlmOptions("user-1");

    expect(result.useLlmReasoning).toBe(true);
    expect(result.providerId).toBe("ollama");
  });
});
