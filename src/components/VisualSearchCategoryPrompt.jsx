import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { VISUAL_SEARCH_GROUPS } from "../services/visualSearchService";

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
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5c6370",
    marginBottom: 8,
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f4f8",
    borderWidth: 1,
    borderColor: "#dde2e8",
  },
  chipSelected: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  chipTextSelected: {
    color: "#fff",
  },
});

export default VisualSearchCategoryPrompt;
