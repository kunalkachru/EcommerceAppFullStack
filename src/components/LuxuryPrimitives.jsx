import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";

export function LuxuryEyebrow({ children, style }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function LuxuryDisplayTitle({ children, style }) {
  return <Text style={[styles.displayTitle, style]}>{children}</Text>;
}

export function LuxurySectionTitle({ children, style }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

export function LuxuryBodyText({ children, style }) {
  return <Text style={[styles.bodyText, style]}>{children}</Text>;
}

export function LuxurySectionCard({ eyebrow, title, children, style, muted = false }) {
  return (
    <View style={[styles.sectionCard, muted && styles.sectionCardMuted, style]}>
      {eyebrow ? <LuxuryEyebrow>{eyebrow}</LuxuryEyebrow> : null}
      {title ? <LuxurySectionTitle style={children ? styles.sectionTitleWithBody : null}>{title}</LuxurySectionTitle> : null}
      {children}
    </View>
  );
}

export function LuxuryMetricCard({ label, value, style, muted = false }) {
  return (
    <View style={[styles.metricCard, muted && styles.metricCardMuted, style]}>
      <LuxuryEyebrow style={styles.metricLabel}>{label}</LuxuryEyebrow>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: colors.accentWarm,
    marginBottom: 6,
  },
  displayTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
  },
  sectionTitleWithBody: {
    marginBottom: spacing.sm,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  sectionCardMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  metricCardMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  metricLabel: {
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
});
