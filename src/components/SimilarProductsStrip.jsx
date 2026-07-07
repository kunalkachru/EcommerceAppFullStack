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
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";

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
        <Text style={styles.eyebrow}>Related finds</Text>
        <Text style={styles.heading}>{title}</Text>
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      </View>
    );
  }

  if (error || !matches.length) {
    return null;
  }

  return (
    <View style={styles.wrap} testID="pdp-similar-section">
      <Text style={styles.eyebrow}>Related finds</Text>
      <Text style={styles.heading}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {matches.map((item) => (
          <TouchableOpacity
            key={String(item.id)}
            testID={`pdp-similar-card-${item.id}`}
            style={styles.card}
            onPress={() => onPressProduct?.(item)}
            accessibilityRole="button"
            accessibilityLabel={`Open similar item: ${item.title}`}
            activeOpacity={0.88}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: colors.accentWarm,
    marginBottom: 6,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
    marginBottom: spacing.sm,
  },
  loader: {
    marginVertical: spacing.sm,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  card: {
    width: 148,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  image: {
    width: "100%",
    height: 104,
    marginBottom: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
  },
  percent: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  price: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accentStrong,
    marginTop: 4,
  },
});

export default SimilarProductsStrip;
