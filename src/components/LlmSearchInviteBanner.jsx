import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, radius, spacing, typography } from "../theme/tokens";

const DISMISSED_KEY = "@shopease/llm-invite-banner-dismissed";

const LlmSearchInviteBanner = ({ onPressSetup }) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(DISMISSED_KEY).then((value) => {
      if (mounted) setDismissed(value === "true");
    });
    return () => {
      mounted = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, "true");
  }, []);

  if (dismissed) return null;

  return (
    <View style={styles.banner} testID="llm-invite-banner">
      <Text style={styles.text}>
        Add your API key for smarter search that understands full sentences.
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          testID="llm-invite-banner-setup"
          onPress={() => {
            dismiss();
            onPressSetup?.();
          }}
        >
          <Text style={styles.setupLink}>Set up</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="llm-invite-banner-dismiss" onPress={dismiss}>
          <Text style={styles.dismissLink}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  text: {
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
  },
  setupLink: {
    color: colors.accent,
    fontWeight: "600",
  },
  dismissLink: {
    color: colors.textMuted,
  },
});

export default LlmSearchInviteBanner;
