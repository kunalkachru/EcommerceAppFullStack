import React from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

const SimilarProductsStrip = ({
  matches = [],
  loading = false,
  error = null,
  onPressProduct,
  title = "More like this",
}) => {
  if (loading) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.heading}>{title}</Text>
        <ActivityIndicator color="#007BFF" style={styles.loader} />
      </View>
    );
  }

  if (error || !matches.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {matches.map((item) => (
          <TouchableOpacity
            key={String(item.id)}
            style={styles.card}
            onPress={() => onPressProduct?.(item)}
          >
            <Image source={{ uri: item.image }} style={styles.image} resizeMode="contain" />
            <Text style={styles.percent}>{item.matchPercent ?? Math.round((item.matchScore ?? 0) * 100)}% match</Text>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.price}>${item.price}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    marginBottom: 8,
  },
  heading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 10,
  },
  loader: {
    marginVertical: 12,
  },
  row: {
    gap: 10,
    paddingRight: 8,
  },
  card: {
    width: 130,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e8ecf1",
  },
  image: {
    width: "100%",
    height: 90,
    marginBottom: 4,
    backgroundColor: "#f0f4f8",
  },
  percent: {
    fontSize: 11,
    fontWeight: "700",
    color: "#007BFF",
    marginBottom: 2,
  },
  title: {
    fontSize: 11,
    color: "#1a1a2e",
    lineHeight: 14,
  },
  price: {
    fontSize: 13,
    fontWeight: "700",
    color: "#007BFF",
    marginTop: 4,
  },
});

export default SimilarProductsStrip;
