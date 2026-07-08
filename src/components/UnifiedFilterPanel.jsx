import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import RNPickerSelect from "react-native-picker-select";
import Slider from "@react-native-community/slider";
import VisualSearchCategoryPrompt from "./VisualSearchCategoryPrompt";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";

const UnifiedFilterPanel = ({
  sortOptions,
  sortOption,
  onSortChange,
  priceRange,
  onPriceChange,
  priceMax,
  searchCategory,
  onSearchCategoryChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const activeFilterCount = [
    sortOption !== "Default" ? 1 : 0,
    priceRange[1] !== priceMax ? 1 : 0,
    searchCategory !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const pickerStyles = {
    inputIOS: {
      fontSize: 16,
      paddingVertical: 12,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.md,
      color: colors.text,
      backgroundColor: colors.surface,
      paddingRight: 30,
    },
    inputAndroid: {
      fontSize: 16,
      paddingVertical: 8,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.md,
      color: colors.text,
      backgroundColor: colors.surface,
    },
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Collapse filters" : "Expand filters"}
      >
        <View style={styles.headerLabel}>
          <Text style={styles.headerText}>Refine results</Text>
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.text}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort by</Text>
            <RNPickerSelect
              testID="unified-sort-picker"
              onValueChange={onSortChange}
              items={sortOptions.map((option) => ({
                label: option,
                value: option,
              }))}
              style={pickerStyles}
              placeholder={{ label: "Default", value: "Default" }}
              value={sortOption}
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>
              Price range: ${priceRange[0]} - ${priceRange[1]}
            </Text>
            <Slider
              testID="unified-price-slider"
              style={styles.slider}
              minimumValue={0}
              maximumValue={priceMax}
              step={10}
              value={priceRange[1]}
              onValueChange={(value) => onPriceChange([0, value])}
              minimumTrackTintColor={colors.accentStrong}
              maximumTrackTintColor={colors.line}
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Photo matcher category</Text>
            <VisualSearchCategoryPrompt
              value={searchCategory}
              onChange={onSearchCategoryChange}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    fontFamily: typography.displayFamily,
  },
  badge: {
    backgroundColor: colors.accentStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.white,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
  filterSection: {
    gap: spacing.sm,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: typography.eyebrowSpacing,
  },
  slider: {
    width: "100%",
    height: 40,
  },
});

export default UnifiedFilterPanel;
