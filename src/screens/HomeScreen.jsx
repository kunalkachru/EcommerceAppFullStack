import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import {
  launchCamera,
  launchImageLibrary,
} from "react-native-image-picker";
import { useCatalogProducts } from "../redux/api/catalogApi";
import { analyzeImageForProducts } from "../services/visualSearchService";
import {
  navigateToProductList,
  navigateToProductListWithSearch,
} from "../navigation/productNavigation";
import { storePromos } from "../data/promos";

const pickerOptions = {
  mediaType: "photo",
  quality: 0.85,
  maxWidth: 1280,
  maxHeight: 1280,
  includeBase64: true,
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const user = useSelector((state) => state.auth.user);
  const { products } = useCatalogProducts();

  const [previewUri, setPreviewUri] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [labels, setLabels] = useState([]);
  const [matches, setMatches] = useState([]);
  const [searchHint, setSearchHint] = useState("");

  const runVisualSearch = useCallback(
    async (asset) => {
      setPreviewUri(asset.uri);
      setAnalyzing(true);
      setLabels([]);
      setMatches([]);
      setSearchHint("");

      try {
        const result = await analyzeImageForProducts(
          asset.uri,
          products,
          asset.base64
        );
        setLabels(result.labels);
        setMatches(result.matches);
        setSearchHint(result.searchQuery);
      } catch (err) {
        console.warn("Visual search failed:", err);
        const message =
          err.response?.data?.message ||
          err.message ||
          "Could not analyze this image.";
        Alert.alert(
          "Visual search unavailable",
          `${message} Ensure the API server is running (npm run server).`
        );
        setPreviewUri(null);
      } finally {
        setAnalyzing(false);
      }
    },
    [products]
  );

  const pickImage = (source) => {
    const launcher = source === "camera" ? launchCamera : launchImageLibrary;
    launcher(pickerOptions, (response) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert("Photo error", response.errorMessage ?? response.errorCode);
        return;
      }
      const asset = response.assets?.[0];
      if (asset?.uri && asset?.base64) {
        runVisualSearch(asset);
      } else if (asset?.uri) {
        Alert.alert("Photo error", "Could not read image data. Try another photo.");
      }
    });
  };

  const clearSearch = () => {
    setPreviewUri(null);
    setLabels([]);
    setMatches([]);
    setSearchHint("");
  };

  const openProduct = (product) => {
    navigation.navigate("Products", {
      screen: "ProductDetail",
      params: { product },
    });
  };

  const renderMatch = ({ item }) => (
    <TouchableOpacity style={styles.matchCard} onPress={() => openProduct(item)}>
      <Image source={{ uri: item.image }} style={styles.matchImage} resizeMode="contain" />
      <Text style={styles.matchTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.matchPrice}>${item.price}</Text>
    </TouchableOpacity>
  );

  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "there";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hi, {displayName}</Text>
      <Text style={styles.subtitle}>What are you shopping for today?</Text>

      <View style={styles.visualCard}>
        <Text style={styles.sectionTitle}>Search by photo</Text>
        <Text style={styles.sectionHint}>
          Snap or upload a picture — CLIP AI on the server matches it to catalog photos and titles.
        </Text>

        <View style={styles.pickerRow}>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => pickImage("camera")}
            disabled={analyzing}
          >
            <Text style={styles.pickerBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pickerBtn, styles.pickerBtnSecondary]}
            onPress={() => pickImage("gallery")}
            disabled={analyzing}
          >
            <Text style={[styles.pickerBtnText, styles.pickerBtnTextSecondary]}>
              Gallery
            </Text>
          </TouchableOpacity>
        </View>

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

        {!analyzing && labels.length > 0 ? (
          <View style={styles.labelsWrap}>
            <Text style={styles.labelsHeading}>Detected:</Text>
            <View style={styles.labelChips}>
              {labels.slice(0, 5).map((label) => (
                <View key={label.text} style={styles.chip}>
                  <Text style={styles.chipText}>{label.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {!analyzing && matches.length > 0 ? (
          <>
            <Text style={styles.matchesHeading}>Best matches</Text>
            <FlatList
              data={matches}
              horizontal
              keyExtractor={(item) => String(item.id)}
              renderItem={renderMatch}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.matchesList}
            />
            {searchHint ? (
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() =>
                  navigateToProductListWithSearch(navigation, searchHint)
                }
              >
                <Text style={styles.seeAllText}>
                  See all results for "{searchHint}"
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}

        {!analyzing && previewUri && matches.length === 0 ? (
          <Text style={styles.noMatches}>
            No close matches — try another angle or browse the full catalog.
          </Text>
        ) : null}

        {previewUri && !analyzing ? (
          <TouchableOpacity onPress={clearSearch}>
            <Text style={styles.clearText}>Clear photo search</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
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
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a2e",
  },
  subtitle: {
    fontSize: 16,
    color: "#5c6370",
    marginTop: 4,
    marginBottom: 20,
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
    backgroundColor: "#e8f4fd",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    color: "#2c5282",
    fontWeight: "600",
  },
  matchesHeading: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1a1a2e",
  },
  matchesList: {
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
    marginBottom: 6,
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
  noMatches: {
    color: "#5c6370",
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
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
