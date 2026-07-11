import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, radius, shadows, spacing, typography } from '../theme/tokens';

export function LuxuryErrorBanner({ title, message, onRetry, style, testID }) {
  return (
    <View
      style={[styles.errorBanner, style]}
      testID={testID}
    >
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function LuxuryLoadingState({ label, style, testID }) {
  return (
    <View
      style={[styles.loadingContainer, style]}
      testID={testID}
    >
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
      </View>
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

export function LuxurySuccessConfirmation({ title, message, action, style, testID }) {
  return (
    <View style={[styles.successContainer, style]} testID={testID}>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
      </View>
      <Text style={styles.successTitle}>{title}</Text>
      <Text style={styles.successMessage}>{message}</Text>
      {action ? (
        <TouchableOpacity
          style={styles.successButton}
          onPress={action.onPress}
        >
          <Text style={styles.successButtonText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function LuxuryEmptyState({ icon, title, message, action, style, testID }) {
  return (
    <View style={[styles.emptyContainer, style]} testID={testID}>
      <Ionicons name={icon} size={48} color={colors.textSoft} style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action ? (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={action.onPress}
        >
          <Text style={styles.emptyButtonText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // LuxuryErrorBanner styles
  errorBanner: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#edc7c3',
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.xs,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.error,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },

  // LuxuryLoadingState styles
  loadingContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  skeletonCard: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: colors.line,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  skeletonLineShort: {
    width: '70%',
  },
  loadingLabel: {
    fontSize: 12,
    color: colors.textSoft,
    marginTop: spacing.xs,
  },

  // LuxurySuccessConfirmation styles
  successContainer: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  successMessage: {
    fontSize: 14,
    color: colors.success,
    lineHeight: 20,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  successButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },

  // LuxuryEmptyState styles
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
