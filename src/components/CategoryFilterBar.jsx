import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const CATEGORY_META = {
  All: { icon: "grid-outline", shortLabel: "All" },
  "men's clothing": { icon: "man-outline", shortLabel: "Men's" },
  "women's clothing": { icon: "woman-outline", shortLabel: "Women's" },
  clothes: { icon: "shirt-outline", shortLabel: "Clothes" },
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
            color={selected ? "#fff" : "#007BFF"}
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
    gap: 10,
    paddingVertical: 4,
    paddingRight: 8,
  },
  chip: {
    width: 88,
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dde2e8",
  },
  chipSelected: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "#1a1a2e",
    textAlign: "center",
    lineHeight: 14,
  },
  chipLabelSelected: {
    color: "#fff",
  },
});

export default CategoryFilterBar;
