import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Switch,
  Linking,
  ScrollView,
} from "react-native";
import { useSelector } from "react-redux";
import Voice from "@react-native-voice/voice";
import Ionicons from "react-native-vector-icons/Ionicons";
import { ensureMicrophonePermission } from "../utils/mediaPermissions";
import {
  bindSpeechHandlers,
  isSpeechRecognitionAvailable,
  startSpeechRecognition,
  stopSpeechRecognition,
} from "../utils/speechRecognition";
import {
  searchCatalog,
} from "../services/catalogSearchService";
import { fetchVoiceSearchConfig } from "../services/voiceSearchService";
import { useCatalogProducts } from "../redux/api/catalogApi";
import {
  loadLlmPreferences,
  saveLlmPreferences,
  ensureLlmPreferencesMigrated,
} from "../utils/llmSearchPreferences";
import {
  getSessionLlmKey,
  setSessionLlmKey,
  clearSessionLlmKey,
} from "../utils/llmSessionStore";
import {
  LLM_PROVIDERS,
  getProviderById,
  resolveProviderBaseUrl,
} from "../config/llmProviders";
import {
  getSearchRuntimeConfig,
  setSearchRuntimeOverride,
} from "../config/searchRuntime";

const EXAMPLE_HINTS = [
  "Women's shoes under 50",
  "Blue jacket under 50 dollars",
  "Wireless headphones below 100",
];

function isKnownProviderBaseUrl(url) {
  return LLM_PROVIDERS.some((p) => resolveProviderBaseUrl(p) === url);
}

function isKnownProviderModel(model) {
  return LLM_PROVIDERS.some((p) => p.defaultModel === model);
}

function normalizeProviderBaseUrl(provider, rawBaseUrl) {
  const targetBase = resolveProviderBaseUrl(provider);
  const current = String(rawBaseUrl || "").trim();
  if (!current) return targetBase;
  // If this is a stale default from another provider, auto-correct.
  if (isKnownProviderBaseUrl(current) && current !== targetBase) {
    return targetBase;
  }
  return current;
}

function normalizeProviderModel(provider, rawModel) {
  const targetModel = provider.defaultModel;
  const current = String(rawModel || "").trim();
  if (!current) return targetModel;
  // If this is a stale default from another provider, auto-correct.
  if (isKnownProviderModel(current) && current !== targetModel) {
    return targetModel;
  }
  return current;
}

const VoiceSearchCard = ({ onResults, disabled = false }) => {
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id ?? user?.email ?? null;
  const { products } = useCatalogProducts();

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typedQuery, setTypedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [lastParsed, setLastParsed] = useState(null);
  const [lastIntentSource, setLastIntentSource] = useState(null);

  const [useLlmReasoning, setUseLlmReasoning] = useState(false);
  const [providerId, setProviderId] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(isSpeechRecognitionAvailable());
  const [searchRuntimeName, setSearchRuntimeName] = useState(
    getSearchRuntimeConfig().runtimeName
  );

  const activeProvider = useMemo(() => getProviderById(providerId), [providerId]);
  const runSearchRef = useRef(() => {});

  useEffect(() => {
    let mounted = true;
    (async () => {
      await ensureLlmPreferencesMigrated();
      const prefs = await loadLlmPreferences();
      if (!mounted) return;
      const provider = getProviderById(prefs.providerId || "groq");
      const normalizedBase = normalizeProviderBaseUrl(provider, prefs.baseUrl);
      const normalizedModel = normalizeProviderModel(provider, prefs.model);
      setUseLlmReasoning(prefs.useLlmReasoning);
      setProviderId(provider.id);
      setBaseUrl(normalizedBase);
      setModel(normalizedModel);
      setApiKey(getSessionLlmKey(userId));
      await fetchVoiceSearchConfig().catch(() => null);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    setApiKey(getSessionLlmKey(userId));
  }, [userId]);

  const persistPreferences = useCallback(
    async (patch) => {
      await saveLlmPreferences({
        useLlmReasoning,
        providerId,
        baseUrl,
        model,
        ...patch,
      });
    },
    [useLlmReasoning, providerId, baseUrl, model]
  );

  const llmPayload = useCallback(() => {
    const provider = getProviderById(providerId);
    const normalizedBase = normalizeProviderBaseUrl(provider, baseUrl);
    const normalizedModel = normalizeProviderModel(provider, model);
    return {
      useLlmReasoning,
      providerId,
      apiKey: provider.keyOptional ? apiKey.trim() : apiKey.trim(),
      baseUrl: normalizedBase,
      model: normalizedModel,
    };
  }, [useLlmReasoning, providerId, apiKey, baseUrl, model]);

  const runSearch = useCallback(
    async (text) => {
      const q = String(text || "").trim();
      if (!q) {
        return;
      }

      const provider = getProviderById(providerId);
      if (useLlmReasoning && !provider.keyOptional && !apiKey.trim()) {
        setError(`Paste your ${provider.label} API key for this session (not saved to disk).`);
        return;
      }

      setSearching(true);
      setError(null);
      try {
        setSessionLlmKey(apiKey, userId);
        await persistPreferences({ useLlmReasoning, providerId, baseUrl, model });
        const result = await searchCatalog(q, products, llmPayload());
        setLastParsed(result.parsed);
        setLastIntentSource(result.source);
        if (!result.matches?.length) {
          setError(
            `No products matched "${q}". Try "women's shoes under 50" or tap an example below.`
          );
          return;
        }
        onResults?.({
          query: q,
          parsed: result.parsed,
          matches: result.matches,
          intentSource: result.source,
        });
      } catch (err) {
        const msg =
          err.response?.data?.message ?? err.message ?? "Search failed";
        setError(msg);
      } finally {
        setSearching(false);
      }
    },
    [
      useLlmReasoning,
      providerId,
      apiKey,
      userId,
      products,
      onResults,
      persistPreferences,
      llmPayload,
    ]
  );

  runSearchRef.current = runSearch;

  useEffect(() => {
    let unbind = () => {};
    let mounted = true;

    (async () => {
      if (!isSpeechRecognitionAvailable()) {
        if (mounted) setSpeechAvailable(false);
        return;
      }
      try {
        const available = await Voice.isAvailable?.();
        if (!mounted) return;
        setSpeechAvailable(Boolean(available));
      } catch {
        if (mounted) setSpeechAvailable(isSpeechRecognitionAvailable());
      }
    })();

    unbind = bindSpeechHandlers({
      onSpeechStart: () => setListening(true),
      onSpeechEnd: () => setListening(false),
      onSpeechError: (e) => {
        setListening(false);
        const msg = e?.error?.message ?? "";
        if (msg && !msg.includes("No match") && !msg.includes("7/")) {
          setError("Could not hear you. Try again or type below.");
        }
      },
      onSpeechResults: (e) => {
        const text = e.value?.[0] ?? "";
        setTranscript(text);
        if (text) {
          runSearchRef.current(text);
        }
      },
      onSpeechPartialResults: (e) => {
        if (e.value?.[0]) {
          setTranscript(e.value[0]);
        }
      },
    });

    return () => {
      mounted = false;
      unbind();
    };
  }, []);

  const startListening = async () => {
    setError(null);
    setTranscript("");
    if (!speechAvailable) {
      setError("Mic search unavailable here — type your request below.");
      return;
    }
    const ok = await ensureMicrophonePermission();
    if (!ok) {
      return;
    }
    try {
      const locale = Platform.OS === "ios" ? "en-US" : "en_US";
      await startSpeechRecognition(locale);
    } catch {
      setError("Voice not available on this device. Type your request below.");
    }
  };

  const stopListening = async () => {
    await stopSpeechRecognition();
    setListening(false);
  };

  const submitTyped = () => {
    const q = typedQuery.trim() || transcript.trim();
    runSearch(q);
  };

  const onToggleLlm = async (value) => {
    setUseLlmReasoning(value);
    await persistPreferences({ useLlmReasoning: value });
  };

  const selectProvider = (id) => {
    const provider = getProviderById(id);
    const nextBase = normalizeProviderBaseUrl(provider, baseUrl);
    const nextModel = normalizeProviderModel(provider, model);
    setProviderId(id);
    setBaseUrl(nextBase);
    setModel(nextModel);
    setError(null);
    saveLlmPreferences({
      useLlmReasoning,
      providerId: id,
      baseUrl: nextBase,
      model: nextModel,
    }).catch(() => {});
  };

  const onApiKeyChange = (value) => {
    setApiKey(value);
    setSessionLlmKey(value, userId);
  };

  const clearKey = () => {
    setApiKey("");
    clearSessionLlmKey();
  };

  const toggleSearchRuntime = () => {
    const next = searchRuntimeName === "hybrid" ? "baseline" : "hybrid";
    const config = setSearchRuntimeOverride(next);
    setSearchRuntimeName(config.runtimeName);
    setError(null);
  };

  const intentLabel =
    lastIntentSource === "llm"
      ? "AI reasoning"
      : lastIntentSource === "rules-fallback" || lastIntentSource === "local-fallback"
        ? "Smart rules (AI unavailable)"
        : lastIntentSource === "rules" || lastIntentSource?.includes("local")
          ? "Smart rules"
          : lastIntentSource === "api"
            ? "AI search"
            : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Shop with your voice</Text>
      <Text style={styles.hint}>
        Mic → free on-device speech-to-text. Turn on AI reasoning and paste your
        own API key for smarter product understanding (billed to your account).
      </Text>

      {user?.email ? (
        <Text style={styles.sessionNote}>
          Session: {user.email} — API keys stay in memory only and clear on logout.
        </Text>
      ) : null}

      <View style={styles.llmRow}>
        <View style={styles.llmLabelWrap}>
          <Ionicons name="sparkles" size={18} color="#6b46c1" />
          <Text style={styles.llmLabel}>AI reasoning (LLM)</Text>
        </View>
        <Switch
          value={useLlmReasoning}
          onValueChange={onToggleLlm}
          trackColor={{ false: "#cfd4da", true: "#b794f4" }}
          thumbColor={useLlmReasoning ? "#6b46c1" : "#f4f3f4"}
          disabled={searching}
        />
      </View>

      {useLlmReasoning ? (
        <View style={styles.keySection}>
          <Text style={styles.keyHint}>
            Gmail/Google login on OpenAI or Google AI Studio websites — then copy
            the API key here. ChatGPT Plus ≠ API access; each provider bills your
            key separately.
          </Text>

          <Text style={styles.providerLabel}>AI provider</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerRow}>
            {LLM_PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.providerChip,
                  providerId === p.id && styles.providerChipActive,
                ]}
                onPress={() => selectProvider(p.id)}
              >
                <Text
                  style={[
                    styles.providerChipText,
                    providerId === p.id && styles.providerChipTextActive,
                  ]}
                >
                  {p.label}
                </Text>
                <Text
                  style={[
                    styles.providerBadge,
                    providerId === p.id && styles.providerBadgeActive,
                  ]}
                >
                  {p.badge}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.providerHelp}>{activeProvider.help}</Text>

          {!activeProvider.keyOptional ? (
            <>
              <View style={styles.keyRow}>
                <TextInput
                  style={[styles.keyInput, styles.keyInputFlex]}
                  placeholder={activeProvider.keyHint}
                  placeholderTextColor="#9aa3af"
                  value={apiKey}
                  onChangeText={onApiKeyChange}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!searching}
                />
                {apiKey ? (
                  <TouchableOpacity style={styles.clearKeyBtn} onPress={clearKey}>
                    <Ionicons name="close-circle" size={22} color="#9aa3af" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => {
                  Linking.openURL(activeProvider.keyUrl).catch(() => {
                    setError(`Open ${activeProvider.keyUrl} in your browser to get a key.`);
                  });
                }}
              >
                <Text style={styles.getKeyLink}>Get a key from {activeProvider.label} →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.ollamaNote}>
              Run Ollama on your computer — no cloud key needed.
            </Text>
          )}

          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced((v) => !v)}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? "Hide" : "Show"} advanced (base URL / model)
            </Text>
            <Ionicons
              name={showAdvanced ? "chevron-up" : "chevron-down"}
              size={16}
              color="#007BFF"
            />
          </TouchableOpacity>
          {showAdvanced ? (
            <>
              <TextInput
                style={styles.input}
                placeholder={resolveProviderBaseUrl(activeProvider)}
                placeholderTextColor="#9aa3af"
                value={baseUrl}
                onChangeText={setBaseUrl}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!searching}
                onBlur={() => persistPreferences({ baseUrl })}
              />
              <TextInput
                style={styles.input}
                placeholder={`Model (default ${activeProvider.defaultModel})`}
                placeholderTextColor="#9aa3af"
                value={model}
                onChangeText={setModel}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!searching}
                onBlur={() => persistPreferences({ model })}
              />
            </>
          ) : null}

          {__DEV__ ? (
            <TouchableOpacity
              style={styles.runtimeToggle}
              onPress={toggleSearchRuntime}
            >
              <Text style={styles.runtimeToggleLabel}>Search runtime</Text>
              <Text style={styles.runtimeToggleValue}>
                {searchRuntimeName === "hybrid" ? "Hybrid :5002" : "Baseline :5001"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={styles.micRow}>
        <TouchableOpacity
          style={[styles.micBtn, listening && styles.micBtnActive]}
          onPress={listening ? stopListening : startListening}
          disabled={disabled || searching}
        >
          {searching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons
              name={listening ? "stop-circle" : "mic"}
              size={28}
              color="#fff"
            />
          )}
        </TouchableOpacity>
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>
            {listening ? "Listening…" : "Heard / type here"}
          </Text>
          <Text style={styles.transcript} numberOfLines={3}>
            {transcript || typedQuery || "e.g. " + EXAMPLE_HINTS[0]}
          </Text>
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Or type: laptop under 800 dollars"
        placeholderTextColor="#9aa3af"
        value={typedQuery}
        onChangeText={setTypedQuery}
        onSubmitEditing={submitTyped}
        returnKeyType="search"
        editable={!searching}
      />

      <TouchableOpacity
        style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
        onPress={submitTyped}
        disabled={searching || (!typedQuery.trim() && !transcript.trim())}
      >
        <Text style={styles.searchBtnText}>
          {searching ? "Searching catalog…" : "Find products"}
        </Text>
      </TouchableOpacity>

      {lastParsed?.summary ? (
        <Text style={styles.parsed}>
          Understood: {lastParsed.summary}
          {intentLabel ? ` · ${intentLabel}` : ""}
          {Number.isFinite(lastParsed.priceMax) && lastParsed.priceMax < 1e6
            ? ` · max $${lastParsed.priceMax}`
            : ""}
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.examples}>
        {EXAMPLE_HINTS.map((ex) => (
          <TouchableOpacity
            key={ex}
            style={styles.exampleChip}
            onPress={() => {
              setTypedQuery(ex);
              runSearch(ex);
            }}
          >
            <Text style={styles.exampleText}>{ex}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  hint: {
    fontSize: 14,
    color: "#5c6370",
    marginTop: 6,
    lineHeight: 20,
    marginBottom: 8,
  },
  sessionNote: {
    fontSize: 12,
    color: "#2c5282",
    marginBottom: 10,
    fontWeight: "500",
  },
  llmRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f7f3ff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  llmLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  llmLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4a3b8f",
  },
  keySection: {
    marginBottom: 12,
  },
  keyHint: {
    fontSize: 12,
    color: "#5c6370",
    lineHeight: 17,
    marginBottom: 8,
  },
  keyInput: {
    borderWidth: 1,
    borderColor: "#c4b5fd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#faf8ff",
    marginBottom: 6,
  },
  keyInputFlex: {
    flex: 1,
    marginBottom: 0,
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  clearKeyBtn: {
    padding: 4,
  },
  providerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 8,
  },
  providerRow: {
    marginBottom: 8,
  },
  providerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#eef2f7",
    marginRight: 8,
    minWidth: 100,
  },
  providerChipActive: {
    backgroundColor: "#6b46c1",
  },
  providerChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  providerChipTextActive: {
    color: "#fff",
  },
  providerBadge: {
    fontSize: 10,
    color: "#5c6370",
    marginTop: 2,
  },
  providerBadgeActive: {
    color: "#e9d8fd",
  },
  providerHelp: {
    fontSize: 12,
    color: "#5c6370",
    lineHeight: 17,
    marginBottom: 10,
  },
  getKeyLink: {
    fontSize: 13,
    color: "#007BFF",
    fontWeight: "600",
    marginBottom: 8,
  },
  ollamaNote: {
    fontSize: 13,
    color: "#2c5282",
    marginBottom: 8,
    fontStyle: "italic",
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  advancedToggleText: {
    fontSize: 13,
    color: "#007BFF",
    fontWeight: "600",
  },
  runtimeToggle: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  runtimeToggleLabel: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  runtimeToggleValue: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "700",
  },
  micRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  micBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007BFF",
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnActive: {
    backgroundColor: "#dc3545",
  },
  transcriptBox: {
    flex: 1,
    backgroundColor: "#f0f4f8",
    borderRadius: 10,
    padding: 10,
    minHeight: 56,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5c6370",
    marginBottom: 4,
  },
  transcript: {
    fontSize: 14,
    color: "#1a1a2e",
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dde2e8",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#fafbfc",
    marginBottom: 10,
  },
  searchBtn: {
    backgroundColor: "#1a1a2e",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  searchBtnDisabled: {
    opacity: 0.6,
  },
  searchBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  parsed: {
    marginTop: 10,
    fontSize: 13,
    color: "#2c5282",
    fontStyle: "italic",
  },
  error: {
    marginTop: 8,
    fontSize: 13,
    color: "#dc3545",
  },
  examples: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  exampleChip: {
    backgroundColor: "#e8f4fd",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exampleText: {
    fontSize: 12,
    color: "#007BFF",
    fontWeight: "600",
  },
});

export default VoiceSearchCard;
