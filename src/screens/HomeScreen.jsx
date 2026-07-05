import React, { useState, useCallback, useMemo } from "react";
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
  navigateToProductListWithSearch,
  navigateToProductListWithCategory,
  navigateToProductListWithVoiceResults,
  navigateToProductListWithMatchResults,
} from "../navigation/productNavigation";
import CategoryFilterBar from "../components/CategoryFilterBar";
import VisualSearchCategoryPrompt from "../components/VisualSearchCategoryPrompt";
import VoiceSearchCard from "../components/VoiceSearchCard";
import { pickPhotoAsset } from "../utils/photoPicker";
import { storePromos } from "../data/promos";
import {
  buildVisualSearchOutcome,
  buildVisualSearchErrorMessage,
} from "../utils/visualSearchMessages";

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
          products,
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
    [products, searchCategory]
  );

  const pickImage = async (source) => {
    const asset = await pickPhotoAsset(source);
    if (asset) {
      runVisualSearch(asset);
    }
  };

  const clearSearch = () => {
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
      testID="screen-home"
      style={styles.container}
      contentContainerStyle={styles.content}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>ShopEase</Text>
        </View>
        <Text style={styles.greeting}>Hi, {displayName}</Text>
        <Text style={styles.subtitle}>What are you shopping for today?</Text>
        <Text style={styles.heroTagline}>
          Voice, AI reasoning, and photo search — one tap away.
        </Text>
      </View>

      {shopCategories.length > 0 ? (
        <View style={styles.categorySection}>
          <Text style={styles.dealsHeading}>Shop by category</Text>
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
        <Text style={styles.sectionTitle}>Search by photo</Text>
        <Text style={styles.sectionHint}>
          Snap one product — AI matches it across {catalogTotal || "300+"} catalog items.
          {"\n"}Tip: Gallery → Pictures → ShopEaseTest (npm run seed:emulator-photos).
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
            <Text style={styles.pickerBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="photo-gallery-button"
            style={[styles.pickerBtn, styles.pickerBtnSecondary]}
            onPress={() => pickImage("gallery")}
            disabled={analyzing}
          >
            <Text style={[styles.pickerBtnText, styles.pickerBtnTextSecondary]}>
              Gallery
            </Text>
          </TouchableOpacity>
        </View>

        {searchError ? (
          <View style={[styles.resultBanner, styles.resultBannerError]}>
            <Text style={styles.resultTitle}>Search unavailable</Text>
            <Text style={styles.resultMessage}>{searchError}</Text>
          </View>
        ) : null}

        {previewUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
            {analyzing ? (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={styles.analyzingText}>CLIP analysis…</Text>
              </View>
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
            <Text style={styles.labelsHeading}>
              {matches.length > 0 ? "Matched catalog items:" : "AI identified as:"}
            </Text>
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
            <Text style={styles.matchesHeading}>Best matches (tap to open)</Text>
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
        <Text style={styles.browseBtnText}>Browse all products</Text>
      </TouchableOpacity>

      <Text style={styles.dealsHeading}>Quick deals</Text>
      <View style={styles.dealsRow}>
        {storePromos.slice(0, 2).map((promo) => (
          <View
            key={promo.id}
            style={[styles.dealCard, { borderTopColor: promo.accent }]}
          >
            <Text style={styles.dealBadge}>{promo.badge}</Text>
            <Text style={styles.dealTitle}>{promo.title}</Text>
            <Text style={styles.dealSub} numberOfLines={2}>
              {promo.subtitle}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,123,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: "#7ec8ff",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 16,
    color: "#c8d0dc",
    marginTop: 4,
  },
  heroTagline: {
    fontSize: 14,
    color: "#9aa3af",
    marginTop: 10,
    lineHeight: 20,
  },
  categorySection: {
    marginBottom: 16,
  },
  visualCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  sectionHint: {
    fontSize: 14,
    color: "#5c6370",
    marginTop: 6,
    lineHeight: 20,
    marginBottom: 14,
  },
  pickerRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  pickerBtn: {
    flex: 1,
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  pickerBtnSecondary: {
    backgroundColor: "#e8f4fd",
  },
  pickerBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  pickerBtnTextSecondary: {
    color: "#007BFF",
  },
  previewWrap: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
  },
  preview: {
    width: "100%",
    height: 180,
    backgroundColor: "#e8ecf1",
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  analyzingText: {
    color: "#fff",
    fontWeight: "600",
  },
  labelsWrap: {
    marginBottom: 12,
  },
  labelsHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5c6370",
    marginBottom: 6,
  },
  labelChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipAi: {
    backgroundColor: "#fff3e6",
  },
  chipCatalog: {
    backgroundColor: "#e8f4fd",
  },
  chipAttr: {
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  compareCol: {
    alignItems: "center",
    flex: 1,
  },
  compareLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5c6370",
    marginBottom: 6,
  },
  compareThumb: {
    width: "100%",
    height: 88,
    borderRadius: 8,
    backgroundColor: "#e8ecf1",
  },
  compareArrow: {
    fontSize: 20,
    color: "#007BFF",
    fontWeight: "700",
  },
  chipText: {
    fontSize: 12,
    color: "#2c5282",
    fontWeight: "600",
  },
  resultBanner: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  resultBannerSuccess: {
    backgroundColor: "#ecfdf3",
    borderColor: "#a7f3d0",
  },
  resultBannerInfo: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  resultBannerWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  resultBannerError: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 6,
  },
  resultMessage: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 21,
  },
  browseInlineBtn: {
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  browseInlineText: {
    color: "#007BFF",
    fontWeight: "600",
    fontSize: 14,
  },
  matchesHeading: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1a1a2e",
  },
  matchesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 8,
  },
  matchCard: {
    width: 130,
    backgroundColor: "#f8f9fc",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e8ecf1",
  },
  matchImage: {
    width: "100%",
    height: 90,
    marginBottom: 4,
  },
  matchPercent: {
    fontSize: 11,
    fontWeight: "700",
    color: "#007BFF",
    marginBottom: 2,
  },
  matchTitle: {
    fontSize: 11,
    color: "#1a1a2e",
    lineHeight: 14,
  },
  matchPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#007BFF",
    marginTop: 4,
  },
  seeAllBtn: {
    marginTop: 4,
    marginBottom: 8,
  },
  seeAllText: {
    color: "#007BFF",
    fontWeight: "600",
    fontSize: 14,
  },
  clearText: {
    color: "#9aa3af",
    fontSize: 13,
    textAlign: "center",
  },
  browseBtn: {
    backgroundColor: "#1a1a2e",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  browseBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  dealsHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 10,
  },
  dealsRow: {
    flexDirection: "row",
    gap: 12,
  },
  dealCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 4,
  },
  dealBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#007BFF",
    marginBottom: 4,
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  dealSub: {
    fontSize: 12,
    color: "#5c6370",
    marginTop: 4,
    lineHeight: 16,
  },
});

export default HomeScreen;
