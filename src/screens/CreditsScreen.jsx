import React from "react";
import { Text, StyleSheet, ScrollView } from "react-native";
import { MODEL_3D_CREDITS } from "../config/model3DCredits";
import { colors, radius, shadows, spacing } from "../theme/tokens";
import { LuxuryBodyText, LuxuryDisplayTitle, LuxuryEyebrow, LuxurySectionCard } from "../components/LuxuryPrimitives";

const CreditsScreen = () => (
  <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="screen-credits">
    <LuxuryEyebrow>Credits</LuxuryEyebrow>
    <LuxuryDisplayTitle>3D model credits.</LuxuryDisplayTitle>
    <LuxuryBodyText style={styles.intro}>
      Generic per-category 3D models used in the product viewer, credited per their license.
    </LuxuryBodyText>

    {MODEL_3D_CREDITS.map((credit) => (
      <LuxurySectionCard key={credit.category} style={styles.card} eyebrow={credit.category}>
        <Text style={styles.title}>{credit.title}</Text>
        <Text style={styles.detail}>{`Author: ${credit.author}`}</Text>
        <Text style={styles.detail}>{`License: ${credit.license}`}</Text>
        <Text style={styles.detail}>{credit.sourceUrl}</Text>
      </LuxurySectionCard>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 120,
  },
  intro: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    ...shadows.soft,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  detail: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 2,
  },
});

export default CreditsScreen;
