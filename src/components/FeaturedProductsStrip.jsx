import React from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import catalogFallback from "../data/catalog-fallback.json";

const ITEM_WIDTH = 120;
const featured = (catalogFallback?.products ?? []).slice(0, 6);

const FeaturedProductsStrip = () => (
  <View style={styles.wrap}>
    <Text style={styles.heading}>Trending now</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {featured.map((product) => (
        <View key={product.id} style={styles.card}>
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            resizeMode="contain"
          />
          <Text style={styles.price}>${product.price}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>
        </View>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 8,
  },
  card: {
    width: ITEM_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e8ecf1",
  },
  image: {
    width: "100%",
    height: 90,
    marginBottom: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#007BFF",
  },
  title: {
    fontSize: 11,
    color: "#5c6370",
    marginTop: 2,
    lineHeight: 14,
  },
});

export default FeaturedProductsStrip;
