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
  Pressable,
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
  normalizeProviderBaseUrl,
  normalizeProviderModel,
} from "../config/llmProviders";
import {
  getSearchRuntimeConfig,
  setSearchRuntimeOverride,
} from "../config/searchRuntime";
import {
  buildAmbientUnderstandingLine,
} from "../utils/ambientAiNarratives";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";

const EXAMPLE_HINTS = [
  "Women's shoes under 50",
  "Blue jacket under 50 dollars",
  "Wireless headphones below 100",
];

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
      baseUrl,
      model,
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

  const understandingLine = buildAmbientUnderstandingLine({
    summary: lastParsed?.summary,
    source: lastIntentSource,
  });

  return (
    <View style={styles.card} testID="voice-search-card">
      <Text style={styles.eyebrow}>Ambient AI concierge</Text>
      <Text style={styles.title}>Speak naturally. Let the catalog narrow itself.</Text>
      <Text style={styles.hint}>
        Use the mic for on-device speech capture, then let ShopEase refine price,
        category, and intent with optional LLM reasoning when you want extra help.
      </Text>

      {user?.email ? (
        <Text style={styles.sessionNote}>
          Session: {user.email} — API keys stay in memory only and clear on logout.
        </Text>
      ) : null}

      <View style={styles.llmRow} testID="llm-reasoning-row">
        <View style={styles.llmLabelWrap}>
          <Ionicons name="sparkles" size={18} color="#6b46c1" />
          <Text style={styles.llmLabel}>AI reasoning (LLM)</Text>
        </View>
        <Pressable
          testID="llm-reasoning-switch"
          accessibilityLabel="AI reasoning LLM switch"
          accessibilityRole="switch"
          accessibilityState={{ checked: useLlmReasoning }}
          onPress={() => !searching && onToggleLlm(!useLlmReasoning)}
          hitSlop={8}
        >
          <Switch
            value={useLlmReasoning}
            onValueChange={onToggleLlm}
            pointerEvents="none"
            trackColor={{ false: "#cfd4da", true: "#b794f4" }}
            thumbColor={useLlmReasoning ? "#6b46c1" : "#f4f3f4"}
            disabled={searching}
          />
        </Pressable>
      </View>

      {useLlmReasoning ? (
        <View style={styles.keySection}>
          <Text style={styles.keyHint}>
            Paste your provider key for this session only. The key stays in memory,
            clears on logout, and any live LLM cost is billed by that provider.
          </Text>

          <Text style={styles.providerLabel}>AI provider</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerRow}>
            {LLM_PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.id}
                testID={`voice-provider-${p.id}`}
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
                  testID="voice-api-key-input"
                  style={[styles.keyInput, styles.keyInputFlex]}
                  placeholder={activeProvider.keyHint}
                  placeholderTextColor="#9aa3af"
                  value={apiKey}
                  onChangeText={onApiKeyChange}
                  secureTextEntry
                  autoComplete="off"
                  importantForAutofill="no"
                  textContentType="oneTimeCode"
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
            testID="voice-advanced-toggle"
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
                testID="voice-base-url-input"
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
                testID="voice-model-input"
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
              testID="voice-runtime-toggle"
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

      {useLlmReasoning ? (
        <View style={styles.stickySearchBar} testID="voice-llm-sticky-search">
          <TextInput
            testID="voice-typed-query-sticky"
            style={styles.stickyQueryInput}
            placeholder="Type search query (sticky bar)"
            placeholderTextColor="#9aa3af"
            value={typedQuery}
            onChangeText={setTypedQuery}
            onSubmitEditing={submitTyped}
            returnKeyType="search"
            editable={!searching}
          />
          <TouchableOpacity
            testID="voice-search-button-sticky"
            style={[
              styles.stickySearchBtn,
              (searching || (!typedQuery.trim() && !transcript.trim())) &&
                styles.searchBtnDisabled,
            ]}
            onPress={submitTyped}
            disabled={searching}
            accessibilityRole="button"
            accessibilityLabel="Find products"
          >
            <Text style={styles.stickySearchBtnText}>
              {searching ? "Searching…" : "Find products"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.micRow}>
        <TouchableOpacity
          testID="voice-mic-button"
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
        testID="voice-typed-query-input"
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
        testID="voice-search-button"
        style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
        onPress={submitTyped}
        disabled={searching || (!typedQuery.trim() && !transcript.trim())}
      >
        <Text style={styles.searchBtnText}>
          {searching ? "Searching catalog…" : "Find products"}
        </Text>
      </TouchableOpacity>

      {understandingLine ? (
        <Text style={styles.parsed}>
          {understandingLine}
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: colors.accentWarm,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
    lineHeight: 31,
  },
  hint: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  sessionNote: {
    fontSize: 12,
    color: colors.info,
    marginBottom: spacing.sm,
    fontWeight: "500",
  },
  llmRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accentSoft,
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
    color: colors.accentStrong,
  },
  keySection: {
    marginBottom: spacing.sm,
  },
  stickySearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stickyQueryInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 15,
    backgroundColor: colors.white,
    color: colors.text,
  },
  stickySearchBtn: {
    backgroundColor: colors.accentStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  stickySearchBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  keyHint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: spacing.xs,
  },
  keyInput: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 15,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  keyInputFlex: {
    flex: 1,
    marginBottom: 0,
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  clearKeyBtn: {
    padding: 4,
  },
  providerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  providerRow: {
    marginBottom: spacing.xs,
  },
  providerChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    marginRight: spacing.xs,
    minWidth: 100,
    borderWidth: 1,
    borderColor: colors.line,
  },
  providerChipActive: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong,
  },
  providerChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  providerChipTextActive: {
    color: colors.white,
  },
  providerBadge: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  providerBadgeActive: {
    color: colors.backgroundAccent,
  },
  providerHelp: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  getKeyLink: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  ollamaNote: {
    fontSize: 13,
    color: colors.info,
    marginBottom: spacing.xs,
    fontStyle: "italic",
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.xs,
  },
  advancedToggleText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: "600",
  },
  runtimeToggle: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceMuted,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  runtimeToggleLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  runtimeToggleValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
  },
  micRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  micBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnActive: {
    backgroundColor: colors.error,
  },
  transcriptBox: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 56,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 4,
  },
  transcript: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 15,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  searchBtn: {
    backgroundColor: colors.surfaceInverse,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
    ...shadows.soft,
  },
  searchBtnDisabled: {
    opacity: 0.6,
  },
  searchBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  parsed: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.info,
    fontStyle: "italic",
  },
  error: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.error,
  },
  examples: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  exampleChip: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  exampleText: {
    fontSize: 12,
    color: colors.accentStrong,
    fontWeight: "600",
  },
});

export default VoiceSearchCard;
