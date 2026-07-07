const React = require("react");
const ReactTestRenderer = require("react-test-renderer");
const { act } = ReactTestRenderer;

jest.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        user: {
          _id: "user-1",
          email: "test@example.com",
        },
      },
    }),
}));

jest.mock("@react-native-voice/voice", () => ({
  isAvailable: jest.fn().mockResolvedValue(true),
}));

jest.mock("../src/utils/speechRecognition", () => ({
  bindSpeechHandlers: jest.fn(() => () => {}),
  isSpeechRecognitionAvailable: jest.fn(() => true),
  startSpeechRecognition: jest.fn(),
  stopSpeechRecognition: jest.fn(),
}));

jest.mock("../src/utils/mediaPermissions", () => ({
  ensureMicrophonePermission: jest.fn().mockResolvedValue(true),
}));

jest.mock("../src/services/catalogSearchService", () => ({
  searchCatalog: jest.fn(),
}));

jest.mock("../src/services/voiceSearchService", () => ({
  fetchVoiceSearchConfig: jest.fn().mockResolvedValue({}),
}));

jest.mock("../src/redux/api/catalogApi", () => ({
  useCatalogProducts: jest.fn(() => ({ products: [] })),
}));

jest.mock("../src/utils/llmSearchPreferences", () => ({
  ensureLlmPreferencesMigrated: jest.fn().mockResolvedValue(),
  loadLlmPreferences: jest.fn().mockResolvedValue({
    useLlmReasoning: true,
    providerId: "openai",
    baseUrl: "",
    model: "",
  }),
  saveLlmPreferences: jest.fn().mockResolvedValue(),
}));

jest.mock("../src/utils/llmSessionStore", () => ({
  getSessionLlmKey: jest.fn(() => "sk-test"),
  setSessionLlmKey: jest.fn(),
  clearSessionLlmKey: jest.fn(),
}));

jest.mock("../src/config/searchRuntime", () => ({
  getSearchRuntimeConfig: jest.fn(() => ({ runtimeName: "baseline" })),
  setSearchRuntimeOverride: jest.fn(),
}));

jest.mock("react-native-vector-icons/Ionicons", () => "Icon");

const VoiceSearchCard = require("../src/components/VoiceSearchCard").default;
const { searchCatalog } = require("../src/services/catalogSearchService");

describe("VoiceSearchCard automation hooks", () => {
  it("exposes stable test ids for llm controls", async () => {
    let tree;

    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(VoiceSearchCard, {
          onResults: jest.fn(),
        })
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(() => tree.root.findByProps({ testID: "llm-reasoning-switch" })).not.toThrow();
    expect(() => tree.root.findByProps({ testID: "voice-llm-sticky-search" })).not.toThrow();
    expect(() => tree.root.findByProps({ testID: "voice-typed-query-sticky" })).not.toThrow();
    expect(() => tree.root.findByProps({ testID: "voice-search-button-sticky" })).not.toThrow();
    expect(() => tree.root.findByProps({ testID: "voice-provider-openai" })).not.toThrow();
    const apiKeyInput = tree.root.findByProps({ testID: "voice-api-key-input" });
    expect(apiKeyInput.props.autoComplete).toBe("off");
    expect(apiKeyInput.props.importantForAutofill).toBe("no");
    expect(apiKeyInput.props.textContentType).toBe("oneTimeCode");

    await act(async () => {
      tree.unmount();
    });
  });

  it("renders the shared ambient understanding line after a successful search", async () => {
    searchCatalog.mockResolvedValueOnce({
      parsed: {
        summary: "women · shoes · under $50",
        priceMax: 50,
      },
      source: "llm",
      matches: [{ id: 1, title: "Golden Shoes Woman" }],
    });

    const onResults = jest.fn();
    let tree;

    await act(async () => {
      tree = ReactTestRenderer.create(
        React.createElement(VoiceSearchCard, {
          onResults,
        })
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    const input = tree.root.findByProps({ testID: "voice-typed-query-input" });
    const submit = tree.root.findByProps({ testID: "voice-search-button" });

    await act(async () => {
      input.props.onChangeText("women's shoes under 50");
    });

    await act(async () => {
      await submit.props.onPress();
    });

    const renderedText = tree.root
      .findAll((node) => typeof node.props?.children === "string")
      .map((node) => node.props.children)
      .join(" ");

    expect(onResults).toHaveBeenCalled();
    expect(renderedText).toContain(
      "Refined for women · shoes · under $50 · AI reasoning"
    );

    await act(async () => {
      tree.unmount();
    });
  });
});
