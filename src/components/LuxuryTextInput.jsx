import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet, Animated } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";

const LuxuryTextInput = React.forwardRef(
  (
    {
      label,
      placeholder,
      value,
      onChangeText,
      error,
      keyboardType = "default",
      secureTextEntry = false,
      editable = true,
      testID,
      style,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const borderColorAnim = new Animated.Value(focused ? 1 : 0);

    const handleFocus = () => {
      setFocused(true);
      Animated.timing(borderColorAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    };

    const handleBlur = () => {
      setFocused(false);
      Animated.timing(borderColorAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    };

    const borderColor = borderColorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.line, colors.accentStrong],
    });

    return (
      <View style={[styles.container, style]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <Animated.View
          style={[
            styles.inputWrapper,
            {
              borderColor,
            },
            error && styles.inputWrapperError,
          ]}
        >
          <TextInput
            ref={ref}
            testID={testID}
            style={[styles.input, !editable && styles.inputDisabled]}
            placeholder={placeholder}
            placeholderTextColor={colors.textSoft}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            editable={editable}
            {...props}
          />
        </Animated.View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: typography.eyebrowSpacing,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    overflow: "hidden",
    ...shadows.card,
  },
  inputWrapperError: {
    borderColor: colors.errorSoft,
    backgroundColor: colors.errorSoft,
    opacity: 0.95,
  },
  input: {
    height: 48,
    fontSize: 16,
    color: colors.text,
    fontFamily: typography.bodyFamily,
    paddingVertical: spacing.sm,
  },
  inputDisabled: {
    color: colors.textSoft,
  },
  errorText: {
    fontSize: 12,
    color: colors.errorStrong,
    marginTop: spacing.xs,
    fontWeight: "500",
  },
});

LuxuryTextInput.displayName = "LuxuryTextInput";

export default LuxuryTextInput;
