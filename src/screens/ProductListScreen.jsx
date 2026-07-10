import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRoute } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Ionicons from "react-native-vector-icons/Ionicons";
import RNPickerSelect from "react-native-picker-select";
import Slider from "@react-native-community/slider";
import CategoryFilterBar from "../components/CategoryFilterBar";
import VisualSearchCategoryPrompt from "../components/VisualSearchCategoryPrompt";
import UnifiedFilterPanel from "../components/UnifiedFilterPanel";
import { LuxuryErrorBanner, LuxuryLoadingState, LuxuryEmptyState } from "../components/LuxuryStateIndicators";
import LlmSearchInviteBanner from "../components/LlmSearchInviteBanner";
import { useCatalogProducts, getTopCategories } from "../redux/api/catalogApi";
import { addToCart } from "../redux/cartSlice";
import { analyzeImageForProducts } from "../services/visualSearchService";
import {
  searchCatalog,
  matchIdsFromProducts,
} from "../services/catalogSearchService";
import { resolveDefaultLlmOptions } from "../utils/llmSearchDefaults";
import { pickPhotoAsset } from "../utils/photoPicker";
import { buildVisualSearchErrorMessage } from "../utils/visualSearchMessages";
import { buildAmbientSearchBanner } from "../utils/ambientAiNarratives";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";

const sortOptions = ["Default", "Price: Low to High", "Price: High to Low"];
const PRICE_MAX = 2000;

const ProductListScreen = ({ navigation }) => {
  const route = useRoute();
  const { products, isLoading, error, isOfflineFallback, refetch, catalogTotal } =
    useCatalogProducts();
  const user = useSelector((state) => state.auth.user);
  const userId = user?._id ?? user?.email ?? null;
  const [hasLlmKey, setHasLlmKey] = useState(false);

  useEffect(() => {
    let mounted = true;
    resolveDefaultLlmOptions(userId).then((opts) => {
      if (mounted) setHasLlmKey(Boolean(opts.apiKey));
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("Default");
  const [priceRange, setPriceRange] = useState([0, PRICE_MAX]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [visualSearching, setVisualSearching] = useState(false);
  const [visualBanner, setVisualBanner] = useState(null);
  const [visualError, setVisualError] = useState(null);
  const [voiceProductIds, setVoiceProductIds] = useState(null);
  const [voiceBanner, setVoiceBanner] = useState(null);
  const [searchSearching, setSearchSearching] = useState(false);
  const [searchPending, setSearchPending] = useState(false);
  const [selectedVisualAsset, setSelectedVisualAsset] = useState(null);

  const dispatch = useDispatch();
  const { pendingByProduct = {} } = useSelector((state) => state.cart || {});

  const SEARCH_DEBOUNCE_MS = 450;

  const categories = useMemo(
    () => ["All", ...getTopCategories(products, 9)],
    [products]
  );

  useEffect(() => {
    if (route.params?.resetSearch) {
      setSearchQuery("");
      setVoiceProductIds(null);
      setVoiceBanner(null);
    }
  }, [route.params?.resetSearch]);

  useEffect(() => {
    const category = route.params?.category;
    if (typeof category === "string" && categories.includes(category)) {
      setSelectedCategory(category);
    }
  }, [route.params?.category, categories]);

  useEffect(() => {
    const ids = route.params?.voiceProductIds;
    const vq = route.params?.voiceQuery;
    const source = route.params?.matchSource ?? "voice";
    if (Array.isArray(ids) && ids.length > 0) {
      setVoiceProductIds(new Set(ids.map(String)));
      setVoiceBanner(
        buildAmbientSearchBanner({
          mode: source === "visual" ? "photo" : "smart",
          query: vq,
          matchCount: ids.length,
          source: source === "smart" ? "llm" : "api",
        })
      );
      setSelectedCategory("All");
      setSearchQuery(vq || "");
    }
  }, [route.params?.voiceProductIds, route.params?.voiceQuery, route.params?.matchSource]);

  const clearSmartSearch = useCallback(() => {
    setSearchQuery("");
    setVoiceProductIds(null);
    setVoiceBanner(null);
    setVisualBanner(null);
    setSelectedVisualAsset(null);
  }, []);

  const runSmartSearch = useCallback(
    async (queryOverride) => {
      const q = String(queryOverride ?? searchQuery).trim();
      if (!q) {
        clearSmartSearch();
        return;
      }

      setSearchSearching(true);
      setVisualError(null);
      try {
        const llmOptions = await resolveDefaultLlmOptions(userId);
        const result = await searchCatalog(q, products, llmOptions);
        const matches = result.matches ?? [];
        setVoiceProductIds(matches.length ? matchIdsFromProducts(matches) : new Set());
        if (matches.length > 0) {
          const banner = buildAmbientSearchBanner({
            mode: "smart",
            query: q,
            matchCount: matches.length,
            source: result.source,
          });
          setVoiceBanner({
            ...banner,
            message:
              banner.message +
              (result.source === "offline" ? " Offline catalog fallback is active." : ""),
          });
          setSelectedCategory("All");
          const priceMax = result.parsed?.priceMax;
          if (Number.isFinite(priceMax) && priceMax < 1e6) {
            setPriceRange([0, Math.min(PRICE_MAX, priceMax)]);
          }
        } else {
          setVoiceBanner({
            title: "No close intent match yet",
            message: `No products matched "${q}". Try different words, a price cap, or a broader product type.`,
          });
        }
      } catch (err) {
        setVoiceProductIds(null);
        setVoiceBanner({
          title: "Search unavailable",
          message: err?.message || `Search failed for "${q}". Check connection and retry.`,
        });
      } finally {
        setSearchSearching(false);
      }
    },
    [searchQuery, products, clearSmartSearch, userId]
  );

  useEffect(() => {
    const pending = route.params?.pendingSearch;
    if (typeof pending === "string" && pending.trim()) {
      setSearchQuery(pending);
      runSmartSearch(pending);
    }
  }, [route.params?.pendingSearch, runSmartSearch]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchPending(false);
      return undefined;
    }

    setSearchPending(true);
    const timer = setTimeout(() => {
      setSearchPending(false);
      runSmartSearch(q);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery, runSmartSearch]);

  const filteredProducts = useMemo(() => {
    let list = products.filter(
      (product) =>
        product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    if (voiceProductIds != null) {
      list = list.filter((product) => voiceProductIds.has(String(product.id)));
    }

    if (selectedCategory !== "All" && voiceProductIds == null && !searchQuery.trim()) {
      list = list.filter((product) => product.category === selectedCategory);
    }

    if (sortOption === "Price: Low to High") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortOption === "Price: High to Low") {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, selectedCategory, sortOption, priceRange, searchQuery, voiceProductIds]);

  const handleAddToCart = useCallback(
    (product) => {
      const id = product?.id;
      if (id == null) {
        return;
      }
      const key = String(id);
      if (pendingByProduct[key]) {
        return;
      }
      dispatch(addToCart(product));
    },
    [dispatch, pendingByProduct]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const idKey = String(item.id);
      const isPending = !!pendingByProduct[idKey];
      return (
        <View style={styles.productContainer}>
          <TouchableOpacity
            style={styles.productInfo}
            onPress={() => navigation.navigate("ProductDetail", { product: item })}
            accessibilityLabel={item.title}
            accessibilityRole="button"
            testID={`product-list-item-${item.id}`}
          >
            <Image
              source={{ uri: item.image }}
              style={styles.productImage}
              resizeMode="contain"
            />
            <Text style={styles.productName} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.productPrice}>${item.price}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.addButton,
              isPending && styles.addButtonDisabled,
            ]}
            disabled={isPending}
            onPress={() => handleAddToCart(item)}
          >
            <Text style={styles.addButtonText}>{isPending ? "Adding…" : "Add"}</Text>
          </TouchableOpacity>
        </View>
      );
    },
    [handleAddToCart, navigation, pendingByProduct]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  const runVisualSearch = useCallback(
    async (asset) => {
      setVisualSearching(true);
      try {
        const result = await analyzeImageForProducts(
          asset.uri,
          null,
          asset.base64,
          { categoryFilter: searchCategory === "all" ? null : searchCategory }
        );
        if (result.matches?.length) {
          const hint =
            result.searchQuery ||
            result.matches[0].title.split(" ").slice(0, 3).join(" ");
          setSearchQuery(hint);
          setVoiceProductIds(matchIdsFromProducts(result.matches));
          setVoiceBanner(
            buildAmbientSearchBanner({
              mode: "photo",
              query: hint,
              matchCount: result.matches.length,
            })
          );
          setSelectedCategory("All");
        } else if (result.searchQuery) {
          setSearchQuery(result.searchQuery);
          await runSmartSearch(result.searchQuery);
          setVisualBanner(
            buildAmbientSearchBanner({
              mode: "photo-fallback",
              query: result.searchQuery,
            })
          );
        } else {
          setVisualBanner({
            title: "Could not refine this photo yet",
            message: "Try a clearer single-product image, better lighting, or browse by category first.",
          });
        }
      } catch (err) {
        setVisualError(buildVisualSearchErrorMessage(err));
      } finally {
        setVisualSearching(false);
      }
    },
    [searchCategory, runSmartSearch]
  );

  const pickVisualSearchAsset = useCallback(async (source) => {
    setVisualError(null);
    const asset = await pickPhotoAsset(source);
    if (asset) {
      setSelectedVisualAsset(asset);
    }
  }, []);

  useEffect(() => {
    if (!selectedVisualAsset) {
      return;
    }
    runVisualSearch(selectedVisualAsset);
  }, [selectedVisualAsset, searchCategory, runVisualSearch]);

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Search and discovery</Text>
        <Text style={styles.heroTitle}>Find the right product with less friction.</Text>
        <Text style={styles.heroDescription}>
          Type naturally, refine by price, or start from a reference photo. ShopEase keeps
          the catalog focused around your intent instead of forcing you through noisy filters.
        </Text>

        {isOfflineFallback ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Showing saved catalog (could not reach store API).
            </Text>
            <TouchableOpacity onPress={refetch}>
              <Text style={styles.bannerLink}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {error && !isOfflineFallback ? (
          <LuxuryErrorBanner
            title="Failed to Load Products"
            message={typeof error === 'string' ? error : error.message || 'Could not load products.'}
            onRetry={refetch}
            style={styles.errorMargin}
          />
        ) : null}

        <Text style={styles.catalogCount} accessibilityRole="header">
          {catalogTotal} products in catalog
        </Text>

        <Text style={styles.filterLabel}>Browse by category</Text>
        <CategoryFilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {!hasLlmKey && (
          <LlmSearchInviteBanner onPressSetup={() => navigation.navigate("Home")} />
        )}

        <View style={styles.searchContainer}>
          <TouchableOpacity
            testID="product-search-photo-button"
            style={styles.cameraBtn}
            onPress={() => pickVisualSearchAsset("gallery")}
            disabled={visualSearching || searchSearching}
            accessibilityLabel="Search by photo"
          >
            {visualSearching || searchSearching || searchPending ? (
              <ActivityIndicator size="small" color="#007BFF" />
            ) : (
              <Ionicons name="camera-outline" size={22} color="#007BFF" />
            )}
          </TouchableOpacity>
          <TextInput
            testID="product-search-input"
            style={styles.searchBar}
            placeholder="Search products... e.g. below 45"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              const hasQuery = text.trim().length > 0;
              setVoiceProductIds(hasQuery ? new Set() : null);
              setVoiceBanner(null);
            }}
            onSubmitEditing={() => runSmartSearch()}
            returnKeyType="search"
            editable={!searchSearching}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              testID="product-search-clear-button"
              onPress={clearSmartSearch}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {visualBanner ? (
          <View style={styles.visualBanner}>
            <Text style={styles.visualBannerTitle}>{visualBanner.title}</Text>
            <Text style={styles.visualBannerText}>{visualBanner.message}</Text>
            <TouchableOpacity onPress={() => setVisualBanner(null)}>
              <Text style={styles.bannerLink}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {voiceBanner ? (
          <View style={[styles.visualBanner, styles.voiceBanner]}>
            <Text style={styles.visualBannerTitle}>{voiceBanner.title}</Text>
            <Text style={styles.visualBannerText}>{voiceBanner.message}</Text>
            <TouchableOpacity
              onPress={clearSmartSearch}
            >
              <Text style={styles.bannerLink}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {visualError ? (
          <View style={[styles.banner, styles.visualErrorBanner]}>
            <Text style={styles.bannerText}>{visualError}</Text>
            <TouchableOpacity onPress={() => setVisualError(null)}>
              <Text style={styles.bannerLink}>OK</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <UnifiedFilterPanel
          sortOptions={sortOptions}
          sortOption={sortOption}
          onSortChange={setSortOption}
          priceRange={priceRange}
          onPriceChange={setPriceRange}
          priceMax={PRICE_MAX}
          searchCategory={searchCategory}
          onSearchCategoryChange={setSearchCategory}
        />
      </View>
    ),
    [
      categories,
      selectedCategory,
      searchQuery,
      sortOption,
      priceRange,
      isOfflineFallback,
      error,
      refetch,
      catalogTotal,
      searchCategory,
      visualSearching,
      visualBanner,
      visualError,
      searchSearching,
      searchPending,
      voiceBanner,
      clearSmartSearch,
      pickVisualSearchAsset,
      runSmartSearch,
    ]
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <LuxuryLoadingState label="Loading products..." />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="screen-product-list">
      <FlatList
        style={styles.list}
        data={filteredProducts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.row}
        initialNumToRender={10}
        windowSize={5}
        extraData={selectedCategory}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text style={styles.statusText}>
            {searchSearching || searchPending
              ? "Searching…"
              : searchQuery.trim() && voiceProductIds == null
                ? "Run a search or wait for results."
                : voiceProductIds != null
                  ? "No products match your search."
                  : "No products match your filters."}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: colors.accentWarm,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
    lineHeight: 33,
  },
  heroDescription: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  statusText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  banner: {
    backgroundColor: colors.warningSoft,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9d0b6",
  },
  bannerText: {
    flex: 1,
    color: colors.warning,
    fontSize: 13,
  },
  bannerLink: {
    color: colors.accent,
    fontWeight: "bold",
    marginLeft: 8,
  },
  catalogCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontWeight: "600",
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  cameraBtn: {
    paddingRight: 8,
    paddingVertical: 6,
  },
  visualBanner: {
    backgroundColor: colors.infoSoft,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "#c8d5de",
  },
  visualBannerTitle: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  visualBannerText: {
    color: colors.info,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  visualErrorBanner: {
    backgroundColor: colors.errorSoft,
    borderColor: "#edc7c3",
  },
  voiceBanner: {
    backgroundColor: colors.accentWarmSoft,
    borderColor: colors.lineStrong,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  searchBar: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: colors.text,
  },
  clearButton: {
    padding: 5,
    borderRadius: 20,
    backgroundColor: colors.textSoft,
    marginLeft: 10,
  },
  clearButtonText: {
    fontSize: 18,
    color: colors.white,
  },
  filterContainer: {
    marginBottom: spacing.sm,
  },
  priceFilterContainer: {
    alignItems: "center",
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  productContainer: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.lg,
    alignItems: "center",
    marginBottom: spacing.sm,
    width: "48%",
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  productInfo: {
    alignItems: "center",
  },
  productImage: {
    width: 116,
    height: 116,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  productName: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: spacing.xs,
    textAlign: "center",
    color: colors.text,
  },
  productPrice: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  addButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceInverse,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  addButtonDisabled: {
    backgroundColor: colors.textSoft,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  errorMargin: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});

const pickerStyles = {
  inputIOS: {
    fontSize: 16,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  inputAndroid: {
    fontSize: 16,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
};

export default ProductListScreen;
