import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { VISUAL_SEARCH_GROUPS } from "../services/visualSearchService";
import { colors, radius, spacing } from "../theme/tokens";

const VisualSearchCategoryPrompt = ({ value, onChange }) => (
  <View style={styles.wrap}>
    <Text style={styles.label}>Narrow search (optional)</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {VISUAL_SEARCH_GROUPS.map((group) => {
        const selected = value === group.id;
        return (
          <Pressable
            key={group.id}
            testID={`visual-search-chip-${group.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Narrow visual search to ${group.label}`}
            onPress={() => onChange(group.id)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {group.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.xs,
    paddingRight: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipSelected: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
  },
});

export default VisualSearchCategoryPrompt;
