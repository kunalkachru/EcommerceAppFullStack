import React from "react";
import {
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors, radius, shadows, spacing } from "../theme/tokens";

const CATEGORY_META = {
  All: { icon: "grid-outline", shortLabel: "All" },
  "men's clothing": { icon: "man-outline", shortLabel: "Men's" },
  "women's clothing": { icon: "woman-outline", shortLabel: "Women's" },
  clothes: { icon: "shirt-outline", shortLabel: "Clothes" },
  shoes: { icon: "footsteps-outline", shortLabel: "Shoes" },
  bags: { icon: "bag-handle-outline", shortLabel: "Bags" },
  jewelry: { icon: "diamond-outline", shortLabel: "Jewelry" },
  watches: { icon: "time-outline", shortLabel: "Watches" },
  jewelery: { icon: "diamond-outline", shortLabel: "Jewelry" },
  electronics: { icon: "phone-portrait-outline", shortLabel: "Tech" },
  beauty: { icon: "sparkles-outline", shortLabel: "Beauty" },
  fragrances: { icon: "flower-outline", shortLabel: "Scents" },
  groceries: { icon: "cart-outline", shortLabel: "Grocery" },
  furniture: { icon: "bed-outline", shortLabel: "Furniture" },
  laptops: { icon: "laptop-outline", shortLabel: "Laptops" },
  smartphones: { icon: "phone-portrait-outline", shortLabel: "Phones" },
  "kitchen-accessories": { icon: "restaurant-outline", shortLabel: "Kitchen" },
  "sports-accessories": { icon: "football-outline", shortLabel: "Sports" },
  "mobile-accessories": { icon: "headset-outline", shortLabel: "Accessories" },
  "home-decoration": { icon: "home-outline", shortLabel: "Home" },
  shoesk: { icon: "footsteps-outline", shortLabel: "Shoes" },
  automotive: { icon: "car-sport-outline", shortLabel: "Auto" },
};

function metaFor(category) {
  if (CATEGORY_META[category]) {
    return CATEGORY_META[category];
  }
  const short =
    category.length > 12 ? `${category.slice(0, 10)}…` : category;
  return {
    icon: "pricetag-outline",
    shortLabel: short.replace(/-/g, " "),
  };
}

const CategoryFilterBar = ({ categories, selectedCategory, onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.row}
    keyboardShouldPersistTaps="handled"
    nestedScrollEnabled
  >
    {categories.map((category) => {
      const selected = selectedCategory === category;
      const { icon, shortLabel } = metaFor(category);
      return (
        <Pressable
          key={category}
          testID={`filter-category-${category.toLowerCase().replace(/\s+/g, "-")}`}
          accessibilityRole="button"
          accessibilityLabel={`Filter by ${category}`}
          accessibilityState={{ selected }}
          onPress={() => onSelect(category)}
          style={({ pressed }) => [
            styles.chip,
            selected && styles.chipSelected,
            pressed && styles.chipPressed,
          ]}
        >
          <Ionicons
            name={icon}
            size={22}
            color={selected ? colors.white : colors.accent}
          />
          <Text
            style={[styles.chipLabel, selected && styles.chipLabelSelected]}
            numberOfLines={2}
          >
            {shortLabel}
          </Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xs,
  },
  chip: {
    width: 88,
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  chipSelected: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong,
  },
  chipPressed: {
    opacity: 0.92,
  },
  chipLabel: {
    marginTop: spacing.xs,
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    lineHeight: 14,
  },
  chipLabelSelected: {
    color: colors.white,
  },
});

export default CategoryFilterBar;
