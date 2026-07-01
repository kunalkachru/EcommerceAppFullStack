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
import { useCatalogProducts, getTopCategories } from "../redux/api/catalogApi";
import { addToCart } from "../redux/cartSlice";
import { analyzeImageForProducts } from "../services/visualSearchService";
import {
  searchCatalog,
  matchIdsFromProducts,
} from "../services/catalogSearchService";
import { pickPhotoAsset } from "../utils/photoPicker";
import { buildVisualSearchErrorMessage } from "../utils/visualSearchMessages";

const sortOptions = ["Default", "Price: Low to High", "Price: High to Low"];
const PRICE_MAX = 2000;

const ProductListScreen = ({ navigation }) => {
  const route = useRoute();
  const { products, isLoading, error, isOfflineFallback, refetch, catalogTotal } =
    useCatalogProducts();
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
      const label =
        source === "visual"
          ? "Photo search"
          : source === "smart"
            ? "Smart search"
            : "Voice search";
      setVoiceBanner(
        vq
          ? `${label}: "${vq}" — showing ${ids.length} matches`
          : `${label} — showing ${ids.length} matches`
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
        const result = await searchCatalog(q, products);
        const matches = result.matches ?? [];
        setVoiceProductIds(matches.length ? matchIdsFromProducts(matches) : null);
        if (matches.length > 0) {
          setVoiceBanner(
            `Smart search: "${q}" — ${matches.length} matches` +
              (result.source === "offline" ? " (offline)" : "")
          );
          setSelectedCategory("All");
          const priceMax = result.parsed?.priceMax;
          if (Number.isFinite(priceMax) && priceMax < 1e6) {
            setPriceRange([0, Math.min(PRICE_MAX, priceMax)]);
          }
        } else {
          setVoiceBanner(`No products matched "${q}". Try different words or a price.`);
        }
      } catch (err) {
        setVoiceProductIds(null);
        setVoiceBanner(err?.message || `Search failed for "${q}". Check connection and retry.`);
      } finally {
        setSearchSearching(false);
      }
    },
    [searchQuery, products, clearSmartSearch]
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

  const runVisualSearch = async (source) => {
    setVisualError(null);
    const asset = await pickPhotoAsset(source);
    if (!asset) {
      return;
    }

    setVisualSearching(true);
    try {
      const result = await analyzeImageForProducts(
        asset.uri,
        products,
        asset.base64,
        { categoryFilter: searchCategory === "all" ? null : searchCategory }
      );
      if (result.matches?.length) {
        const hint =
          result.searchQuery ||
          result.matches[0].title.split(" ").slice(0, 3).join(" ");
        setSearchQuery(hint);
        setVoiceProductIds(matchIdsFromProducts(result.matches));
        setVoiceBanner(`Photo search — ${result.matches.length} visual matches`);
        setSelectedCategory("All");
      } else if (result.searchQuery) {
        setSearchQuery(result.searchQuery);
        await runSmartSearch(result.searchQuery);
        setVisualBanner("No strong visual matches — ran text search instead.");
      } else {
        setVisualBanner("Could not match photo — try a clearer single-product image.");
      }
    } catch (err) {
      setVisualError(buildVisualSearchErrorMessage(err));
    } finally {
      setVisualSearching(false);
    }
  };

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
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
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Could not load products.</Text>
            <TouchableOpacity onPress={refetch}>
              <Text style={styles.bannerLink}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.catalogCount}>
          {catalogTotal} products in catalog
        </Text>

        <CategoryFilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <VisualSearchCategoryPrompt
          value={searchCategory}
          onChange={setSearchCategory}
        />

        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={() => runVisualSearch("gallery")}
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
            style={styles.searchBar}
            placeholder="Search products... e.g. below 45"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (!text.trim()) {
                setVoiceProductIds(null);
                setVoiceBanner(null);
              }
            }}
            onSubmitEditing={() => runSmartSearch()}
            returnKeyType="search"
            editable={!searchSearching}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={clearSmartSearch} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {visualBanner ? (
          <View style={styles.visualBanner}>
            <Text style={styles.visualBannerText}>{visualBanner}</Text>
            <TouchableOpacity onPress={() => setVisualBanner(null)}>
              <Text style={styles.bannerLink}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {voiceBanner ? (
          <View style={[styles.visualBanner, styles.voiceBanner]}>
            <Text style={styles.visualBannerText}>{voiceBanner}</Text>
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

        <View style={styles.filterContainer}>
          <RNPickerSelect
            onValueChange={(value) => setSortOption(value)}
            items={sortOptions.map((option) => ({
              label: option,
              value: option,
            }))}
            style={pickerStyles}
            placeholder={{ label: "Sort by...", value: "Default" }}
            value={sortOption}
          />
        </View>

        <View style={styles.priceFilterContainer}>
          <Text>
            Price: ${priceRange[0]} - ${priceRange[1]}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={PRICE_MAX}
            step={10}
            value={priceRange[1]}
            onValueChange={(value) => setPriceRange([0, value])}
            minimumTrackTintColor="#007bff"
            maximumTrackTintColor="#ddd"
          />
        </View>
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
      voiceBanner,
      clearSmartSearch,
      runSmartSearch,
    ]
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.statusText}>Loading catalog…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    backgroundColor: "#f8f8f8",
  },
  list: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 4,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  statusText: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    paddingHorizontal: 10,
  },
  banner: {
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerText: {
    flex: 1,
    color: "#856404",
    fontSize: 13,
  },
  bannerLink: {
    color: "#007BFF",
    fontWeight: "bold",
    marginLeft: 8,
  },
  catalogCount: {
    fontSize: 12,
    color: "#5c6370",
    marginBottom: 8,
    fontWeight: "600",
  },
  cameraBtn: {
    paddingRight: 8,
    paddingVertical: 6,
  },
  visualBanner: {
    backgroundColor: "#e8f4fd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  visualBannerText: {
    flex: 1,
    color: "#2c5282",
    fontSize: 13,
  },
  visualErrorBanner: {
    backgroundColor: "#fef2f2",
  },
  voiceBanner: {
    backgroundColor: "#f3e8ff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 10,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  searchBar: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
    borderRadius: 20,
    backgroundColor: "#ccc",
    marginLeft: 10,
  },
  clearButtonText: {
    fontSize: 18,
    color: "#fff",
  },
  filterContainer: {
    marginBottom: 10,
  },
  priceFilterContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  slider: {
    width: 200,
    height: 40,
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  productContainer: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    width: "48%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  productInfo: {
    alignItems: "center",
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  productName: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
    textAlign: "center",
  },
  productPrice: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },
  addButton: {
    marginTop: 8,
    backgroundColor: "#007BFF",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  addButtonDisabled: {
    backgroundColor: "#9bbcf5",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

const pickerStyles = {
  inputIOS: {
    fontSize: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
  },
  inputAndroid: {
    fontSize: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
  },
};

export default ProductListScreen;
