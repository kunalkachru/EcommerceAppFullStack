import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { useCatalogProducts, getTopCategories } from "../redux/api/catalogApi";
import { analyzeImageForProducts } from "../services/visualSearchService";
import {
  navigateToProductList,
  navigateToProductListWithCategory,
  navigateToProductListWithVoiceResults,
  navigateToProductListWithMatchResults,
} from "../navigation/productNavigation";
import CategoryFilterBar from "../components/CategoryFilterBar";
import VisualSearchCategoryPrompt from "../components/VisualSearchCategoryPrompt";
import VoiceSearchCard from "../components/VoiceSearchCard";
import { LuxuryErrorBanner, LuxuryLoadingState } from "../components/LuxuryStateIndicators";
import { pickPhotoAsset } from "../utils/photoPicker";
import { storePromos } from "../data/promos";
import {
  buildVisualSearchOutcome,
  buildVisualSearchErrorMessage,
} from "../utils/visualSearchMessages";
import {
  buildVisualCueHeading,
  buildVisualMatchesHeading,
} from "../utils/ambientAiNarratives";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";

const HomeScreen = () => {
  const navigation = useNavigation();
  const user = useSelector((state) => state.auth.user);
  const { products, catalogTotal } = useCatalogProducts();

  const [previewUri, setPreviewUri] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [labels, setLabels] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [searchHint, setSearchHint] = useState("");
  const [outcome, setOutcome] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [searchCategory, setSearchCategory] = useState("all");
  const [topMatch, setTopMatch] = useState(null);
  const [selectedVisualAsset, setSelectedVisualAsset] = useState(null);

  const runVisualSearch = useCallback(
    async (asset) => {
      setPreviewUri(asset.uri);
      setAnalyzing(true);
      setLabels([]);
      setAttributes([]);
      setMatches([]);
      setSearchHint("");
      setOutcome(null);
      setSearchError(null);
      setTopMatch(null);

      try {
        const result = await analyzeImageForProducts(
          asset.uri,
          null,
          asset.base64,
          { categoryFilter: searchCategory === "all" ? null : searchCategory }
        );
        setLabels(result.labels);
        setAttributes(result.attributes ?? []);
        setMatches(result.matches);
        setSearchHint(result.searchQuery);
        setTopMatch(result.matches[0] ?? result.nearestMatch ?? null);
        setOutcome(buildVisualSearchOutcome(result));
      } catch (err) {
        console.warn("Visual search failed:", err);
        setSearchError(buildVisualSearchErrorMessage(err));
        setPreviewUri(null);
      } finally {
        setAnalyzing(false);
      }
    },
    [searchCategory]
  );

  const pickImage = async (source) => {
    const asset = await pickPhotoAsset(source);
    if (asset) {
      setSelectedVisualAsset(asset);
    }
  };

  useEffect(() => {
    if (!selectedVisualAsset) {
      return;
    }
    runVisualSearch(selectedVisualAsset);
  }, [selectedVisualAsset, searchCategory, runVisualSearch]);

  const clearSearch = () => {
    setSelectedVisualAsset(null);
    setPreviewUri(null);
    setLabels([]);
    setAttributes([]);
    setMatches([]);
    setSearchHint("");
    setOutcome(null);
    setSearchError(null);
    setTopMatch(null);
  };

  const openProduct = (product) => {
    navigation.navigate("Products", {
      screen: "ProductDetail",
      params: { product },
    });
  };

  const renderMatch = (item) => (
    <TouchableOpacity
      key={String(item.id)}
      style={styles.matchCard}
      onPress={() => openProduct(item)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      testID={`photo-match-card-${item.id}`}
    >
      <Image source={{ uri: item.image }} style={styles.matchImage} resizeMode="contain" />
      <Text style={styles.matchPercent}>
        {item.matchPercent ?? Math.round((item.matchScore ?? 0) * 100)}% similar
      </Text>
      <Text style={styles.matchTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.matchPrice}>${item.price}</Text>
    </TouchableOpacity>
  );

  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "there";

  const shopCategories = useMemo(() => getTopCategories(products, 8), [products]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.pageShell} testID="home-scroll" collapsable={false}>
        <View style={styles.hero} testID="screen-home">
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Luxury ease. Ambient AI.</Text>
          </View>
          <Text style={styles.greeting}>Welcome back, {displayName}</Text>
          <Text style={styles.subtitle}>
            Shopping that understands your intent before you explain it twice.
          </Text>
          <Text style={styles.heroTagline}>
            Browse, speak, or snap a reference photo across {catalogTotal || "300+"} live
            catalog items and let ShopEase narrow the right options for you.
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Discovery</Text>
              <Text style={styles.heroStatValue}>Text + voice + photo</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Search style</Text>
              <Text style={styles.heroStatValue}>Ambient AI guidance</Text>
            </View>
          </View>
        </View>

        {shopCategories.length > 0 ? (
          <View style={styles.categorySection}>
            <Text style={styles.sectionEyebrow}>Curated entry points</Text>
            <Text style={styles.sectionTitleLarge}>Start with how you think.</Text>
            <Text style={styles.sectionDescription}>
              Browse by department first, then shift into voice reasoning or visual matching
              only when you need more help.
            </Text>
            <CategoryFilterBar
              categories={shopCategories}
              selectedCategory={null}
              onSelect={(category) =>
                navigateToProductListWithCategory(navigation, category)
              }
            />
          </View>
        ) : null}

        <VoiceSearchCard
          onResults={(result) => {
            if (result.matches?.length) {
              navigateToProductListWithVoiceResults(navigation, {
                query: result.query,
                matches: result.matches,
              });
            }
          }}
        />

        <View style={styles.visualCard} testID="photo-search-section">
          <Text style={styles.sectionEyebrow}>Visual discovery</Text>
          <Text style={styles.sectionTitle}>Match the look from one reference image.</Text>
          <Text style={styles.sectionHint}>
            Bring a single product photo and ShopEase will match material, silhouette, and
            closest catalog items. Tip: Gallery - Pictures - ShopEaseTest (`npm run
            seed:emulator-photos`).
          </Text>

        <VisualSearchCategoryPrompt
          value={searchCategory}
          onChange={setSearchCategory}
        />

        <View style={styles.pickerRow}>
          <TouchableOpacity
            testID="photo-camera-button"
            style={styles.pickerBtn}
            onPress={() => pickImage("camera")}
            disabled={analyzing}
          >
            <Text style={styles.pickerBtnText}>Use camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="photo-gallery-button"
            style={[styles.pickerBtn, styles.pickerBtnSecondary]}
            onPress={() => pickImage("gallery")}
            disabled={analyzing}
          >
            <Text style={[styles.pickerBtnText, styles.pickerBtnTextSecondary]}>
              Open gallery
            </Text>
          </TouchableOpacity>
        </View>

        {searchError ? (
          <LuxuryErrorBanner
            title="Visual Search Unavailable"
            message={searchError}
            onRetry={() => {
              setSearchError(null);
              if (selectedVisualAsset) runVisualSearch(selectedVisualAsset);
            }}
            style={styles.errorMargin}
          />
        ) : null}

        {previewUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
            {analyzing ? (
              <LuxuryLoadingState label="Analyzing photo..." />
            ) : null}
          </View>
        ) : null}

        {!analyzing && topMatch?.image ? (
          <TouchableOpacity
            testID="photo-closest-match"
            style={styles.compareRow}
            onPress={() => openProduct(topMatch)}
            accessibilityRole="button"
            accessibilityLabel={`Open closest match: ${topMatch.title}`}
          >
            <View style={styles.compareCol}>
              <Text style={styles.compareLabel}>Your photo</Text>
              <Image source={{ uri: previewUri }} style={styles.compareThumb} resizeMode="cover" />
            </View>
            <Text style={styles.compareArrow}>→</Text>
            <View style={styles.compareCol}>
              <Text style={styles.compareLabel}>Closest match (tap)</Text>
              <Image source={{ uri: topMatch.image }} style={styles.compareThumb} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        ) : null}

        {!analyzing && attributes.length > 0 ? (
          <View style={styles.labelsWrap}>
            <Text style={styles.labelsHeading}>Detected attributes</Text>
            <View style={styles.labelChips}>
              {attributes.map((attr) => (
                <View key={`${attr.kind}-${attr.text}`} style={styles.chipAttr}>
                  <Text style={styles.chipText}>{attr.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {!analyzing && labels.length > 0 ? (
          <View style={styles.labelsWrap}>
            <Text style={styles.labelsHeading}>{buildVisualCueHeading(matches.length > 0)}</Text>
            <View style={styles.labelChips}>
              {labels.slice(0, 5).map((label) => (
                <View
                  key={`${label.text}-${label.source ?? "x"}`}
                  style={[
                    styles.chip,
                    label.source === "ai" ? styles.chipAi : styles.chipCatalog,
                  ]}
                >
                  <Text style={styles.chipText}>{label.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {!analyzing && outcome ? (
          <View
            style={[
              styles.resultBanner,
              outcome.tone === "success" && styles.resultBannerSuccess,
              outcome.tone === "info" && styles.resultBannerInfo,
              outcome.tone === "warning" && styles.resultBannerWarning,
            ]}
          >
            <Text style={styles.resultTitle}>{outcome.title}</Text>
            <Text style={styles.resultMessage}>{outcome.message}</Text>
          </View>
        ) : null}

        {!analyzing && matches.length > 0 ? (
          <View testID="photo-results-section">
            <Text style={styles.matchesHeading}>{buildVisualMatchesHeading()} (tap to open)</Text>
            <View style={styles.matchesRow}>
              {matches.map((item) => renderMatch(item))}
            </View>
            {searchHint ? (
              <TouchableOpacity
                testID="photo-see-all-results"
                style={styles.seeAllBtn}
                onPress={() =>
                  navigateToProductListWithMatchResults(navigation, {
                    query: searchHint,
                    matches,
                    source: "visual",
                  })
                }
              >
                <Text style={styles.seeAllText}>
                  See all results for "{searchHint}"
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {previewUri && !analyzing && matches.length === 0 && outcome ? (
          <TouchableOpacity
            style={styles.browseInlineBtn}
            onPress={() => navigateToProductList(navigation)}
          >
            <Text style={styles.browseInlineText}>Browse full catalog</Text>
          </TouchableOpacity>
        ) : null}

        {previewUri && !analyzing ? (
          <TouchableOpacity testID="photo-clear-search" onPress={clearSearch}>
            <Text style={styles.clearText}>Clear photo search</Text>
          </TouchableOpacity>
        ) : null}
      </View>

        <TouchableOpacity
          testID="browse-all-products"
          style={styles.browseBtn}
          onPress={() => navigateToProductList(navigation)}
        >
          <Text style={styles.browseBtnText}>Browse the full catalog</Text>
        </TouchableOpacity>

        <View style={styles.dealsSection}>
          <Text style={styles.sectionEyebrow}>Quick inspiration</Text>
          <Text style={styles.dealsHeading}>Curated promos that feel editorial, not noisy.</Text>
          <View style={styles.dealsRow}>
            {storePromos.slice(0, 2).map((promo) => (
              <View
                key={promo.id}
                style={[styles.dealCard, { borderTopColor: promo.accent }]}
              >
                <Text style={styles.dealBadge}>{promo.badge}</Text>
                <Text style={styles.dealTitle}>{promo.title}</Text>
                <Text style={styles.dealSub} numberOfLines={3}>
                  {promo.subtitle}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  pageShell: {
    gap: spacing.md,
  },
  hero: {
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: "hidden",
    ...shadows.floating,
  },
  heroGlowOne: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(183,146,103,0.28)",
  },
  heroGlowTwo: {
    position: "absolute",
    bottom: -50,
    left: -25,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(83,123,154,0.18)",
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,250,244,0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255,250,244,0.18)",
  },
  heroBadgeText: {
    color: colors.backgroundAccent,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
  },
  greeting: {
    fontSize: 31,
    fontWeight: "700",
    color: colors.white,
    fontFamily: typography.displayFamily,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    color: "#e7ddd2",
    marginTop: spacing.xs,
    lineHeight: 24,
  },
  heroTagline: {
    fontSize: 14,
    color: "#cbbfb1",
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroStatCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,250,244,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,250,244,0.12)",
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#cbbfb1",
    marginBottom: 6,
  },
  heroStatValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
    lineHeight: 20,
  },
  categorySection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: colors.accentWarm,
    marginBottom: 6,
  },
  sectionTitleLarge: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
    marginBottom: spacing.xs,
    lineHeight: 33,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  visualCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
    lineHeight: 31,
  },
  sectionHint: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  pickerRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pickerBtn: {
    flex: 1,
    backgroundColor: colors.surfaceInverse,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
    ...shadows.soft,
  },
  pickerBtnSecondary: {
    backgroundColor: colors.accentSoft,
  },
  pickerBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  pickerBtnTextSecondary: {
    color: colors.accentStrong,
  },
  previewWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.sm,
    position: "relative",
    borderWidth: 1,
    borderColor: colors.line,
  },
  preview: {
    width: "100%",
    height: 220,
    backgroundColor: colors.surfaceMuted,
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  analyzingText: {
    color: colors.white,
    fontWeight: "600",
  },
  labelsWrap: {
    marginBottom: spacing.sm,
  },
  labelsHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 6,
  },
  labelChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  chipAi: {
    backgroundColor: colors.accentWarmSoft,
  },
  chipCatalog: {
    backgroundColor: colors.accentSoft,
  },
  chipAttr: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  compareCol: {
    alignItems: "center",
    flex: 1,
  },
  compareLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 6,
  },
  compareThumb: {
    width: "100%",
    height: 96,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  compareArrow: {
    fontSize: 20,
    color: colors.accent,
    fontWeight: "700",
  },
  chipText: {
    fontSize: 12,
    color: colors.accentStrong,
    fontWeight: "600",
  },
  resultBanner: {
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  resultBannerSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: "#bfd6c8",
  },
  resultBannerInfo: {
    backgroundColor: colors.infoSoft,
    borderColor: "#c8d5de",
  },
  resultBannerWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: "#e9d0b6",
  },
  resultBannerError: {
    backgroundColor: colors.errorSoft,
    borderColor: "#edc7c3",
    marginBottom: spacing.sm,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  resultMessage: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
  },
  browseInlineBtn: {
    alignSelf: "flex-start",
    marginBottom: spacing.sm,
  },
  browseInlineText: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 14,
  },
  matchesHeading: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: spacing.xs,
    color: colors.text,
  },
  matchesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  matchCard: {
    width: 130,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.line,
  },
  matchImage: {
    width: "100%",
    height: 90,
    marginBottom: 4,
  },
  matchPercent: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    marginBottom: 2,
  },
  matchTitle: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 14,
  },
  matchPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accentStrong,
    marginTop: 4,
  },
  seeAllBtn: {
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  seeAllText: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 14,
  },
  clearText: {
    color: colors.textSoft,
    fontSize: 13,
    textAlign: "center",
  },
  browseBtn: {
    backgroundColor: colors.surfaceInverse,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    ...shadows.soft,
  },
  browseBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  dealsSection: {
    gap: spacing.sm,
  },
  dealsHeading: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
    lineHeight: 30,
  },
  dealsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dealCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  dealBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  dealSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  errorMargin: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});

export default HomeScreen;
