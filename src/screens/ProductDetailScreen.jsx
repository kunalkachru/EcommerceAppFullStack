import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../redux/cartSlice";
import SimilarProductsStrip from "../components/SimilarProductsStrip";
import { fetchSimilarProducts } from "../services/visualSearchService";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";

function buildPriceStory(price) {
  if (price < 40) return "Accessible pricing with standout style value.";
  if (price < 120) return "Balanced pricing for an easy everyday upgrade.";
  return "Premium pricing with a stronger statement-piece feel.";
}

function buildConciergeNotes(product, similarCount) {
  const notes = [];

  if (product.category) {
    notes.push(`Refined in the ${String(product.category).replace(/-/g, " ")} lane.`);
  }

  if (product.description) {
    const sentence = product.description.split(".")[0]?.trim();
    if (sentence) {
      notes.push(sentence.endsWith(".") ? sentence : `${sentence}.`);
    }
  }

  if (similarCount > 0) {
    notes.push(`${similarCount} visually similar alternatives are ready if you want to compare.`);
  }

  return notes.slice(0, 3);
}

const ProductDetailScreen = ({ route }) => {
  const { product } = route.params;
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const productImages = useMemo(() => {
    const raw = Array.isArray(product.images) ? product.images : [];
    const merged = [...new Set([...raw, product.image].filter(Boolean))];
    return merged.length ? merged : [product.image];
  }, [product]);
  const [activeImage, setActiveImage] = useState(productImages[0]);

  const productKey = String(product.id);
  const isCartPendingForProduct = useSelector(
    (state) => !!state.cart?.pendingByProduct?.[productKey]
  );

  const description = String(product.description || "").trim();
  const descriptionPreview =
    description.length <= 180 ? description : `${description.slice(0, 180)}…`;

  useEffect(() => {
    let cancelled = false;
    setSimilarLoading(true);

    fetchSimilarProducts(product.id, 8)
      .then((result) => {
        if (!cancelled) {
          setSimilar(result.matches ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSimilar([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSimilarLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [product.id]);

  useEffect(() => {
    setActiveImage(productImages[0]);
  }, [product.id, productImages]);

  const conciergeNotes = useMemo(
    () => buildConciergeNotes(product, similar.length),
    [product, similar.length]
  );

  const shoppingSignals = useMemo(
    () => [
      {
        label: "Price point",
        value: buildPriceStory(Number(product.price || 0)),
      },
      {
        label: "Category fit",
        value: product.category
          ? String(product.category).replace(/-/g, " ")
          : "General catalog item",
      },
      {
        label: "Comparison support",
        value: similarLoading
          ? "Preparing similar options..."
          : similar.length
            ? `${similar.length} related options ready to compare`
            : "No related options surfaced yet",
      },
    ],
    [product.category, product.price, similar.length, similarLoading]
  );

  const handleAddToCart = async () => {
    if (adding || isCartPendingForProduct) {
      return;
    }
    try {
      setAdding(true);
      await dispatch(addToCart(product)).unwrap();
      Alert.alert("Added to cart", "This item is now in your cart.");
    } catch (err) {
      let message = "Failed to add item to cart.";
      if (err && typeof err === "object") {
        if (typeof err.message === "string") {
          message = err.message;
        } else if (typeof err.code === "string" && err.code.startsWith("auth_")) {
          message = "Please log in again to add items to your cart.";
        }
      } else if (typeof err === "string") {
        message = err;
      }
      Alert.alert("Could not add to cart", message);
    } finally {
      setAdding(false);
    }
  };

  const openSimilar = (item) => {
    navigation.push("ProductDetail", { product: item });
  };

  const addButtonLabel = adding || isCartPendingForProduct ? "Adding..." : "Add to Cart";

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      testID="screen-product-detail"
    >
      <View style={styles.heroPanel}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>Product detail</Text>
        </View>

        <Image
          testID="pdp-hero-image"
          source={{ uri: activeImage }}
          style={styles.image}
          resizeMode="contain"
        />

        {productImages.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryRow}
          >
            {productImages.map((imageUrl, index) => {
              const selected = imageUrl === activeImage;
              return (
                <TouchableOpacity
                  key={`${product.id}-${imageUrl}-${index}`}
                  testID={`pdp-gallery-thumb-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`View gallery image ${index + 1}`}
                  onPress={() => setActiveImage(imageUrl)}
                  style={[
                    styles.galleryThumbButton,
                    selected && styles.galleryThumbButtonSelected,
                  ]}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.galleryThumbImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <Text style={styles.name}>{product.title}</Text>
        <Text style={styles.price}>${product.price}</Text>
        {product.category ? (
          <Text style={styles.category}>{String(product.category).replace(/-/g, " ")}</Text>
        ) : null}

        <Text style={styles.heroStory}>
          A calmer purchase surface with just enough context to decide quickly.
        </Text>

        <View style={styles.primaryActions}>
          <TouchableOpacity
            testID="pdp-add-to-cart"
            accessibilityLabel="Add to Cart"
            accessibilityRole="button"
            style={[
              styles.addToCartButton,
              (adding || isCartPendingForProduct) && styles.addToCartButtonDisabled,
            ]}
            onPress={handleAddToCart}
            disabled={adding || isCartPendingForProduct}
          >
            <Text style={styles.addToCartButtonText}>{addButtonLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.signalGrid}>
        {shoppingSignals.map((signal) => (
          <View key={signal.label} style={styles.signalCard}>
            <Text style={styles.signalLabel}>{signal.label}</Text>
            <Text style={styles.signalValue}>{signal.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>ShopEase insight</Text>
        <Text style={styles.sectionTitle}>Why this may work for you</Text>
        {conciergeNotes.map((note) => (
          <Text key={note} style={styles.noteText}>
            {`\u2022 ${note}`}
          </Text>
        ))}
      </View>

      <SimilarProductsStrip
        matches={similar}
        loading={similarLoading}
        onPressProduct={openSimilar}
      />

      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>Product story</Text>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {expanded ? description || "No description available." : descriptionPreview || "No description available."}
        </Text>
        {description.length > 180 ? (
          <TouchableOpacity onPress={() => setExpanded((value) => !value)}>
            <Text style={styles.readMore}>{expanded ? "Read less" : "Read more"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  heroPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.floating,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentWarmSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: colors.accentWarm,
  },
  image: {
    width: "100%",
    height: 280,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.lg,
  },
  galleryRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  galleryThumbButton: {
    width: 74,
    height: 74,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceMuted,
    padding: 4,
  },
  galleryThumbButtonSelected: {
    borderColor: colors.accentStrong,
    backgroundColor: colors.accentWarmSoft,
  },
  galleryThumbImage: {
    width: "100%",
    height: "100%",
    borderRadius: radius.sm,
  },
  name: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
    lineHeight: 38,
  },
  price: {
    fontSize: 28,
    color: colors.accentStrong,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  category: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    textTransform: "capitalize",
  },
  heroStory: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  primaryActions: {
    width: "100%",
    marginTop: spacing.lg,
  },
  addToCartButton: {
    width: "100%",
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    ...shadows.soft,
  },
  addToCartButtonDisabled: {
    backgroundColor: colors.textSoft,
  },
  addToCartButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  signalGrid: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  signalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  signalLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: colors.accentWarm,
    marginBottom: 6,
  },
  signalValue: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: spacing.md,
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
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
    lineHeight: 31,
    marginBottom: spacing.sm,
  },
  noteText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
  },
  readMore: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
});

export default ProductDetailScreen;
