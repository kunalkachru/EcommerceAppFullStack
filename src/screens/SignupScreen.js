import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../redux/authSlice";
import LuxuryTextInput from "../components/LuxuryTextInput";
import { LuxuryErrorBanner, LuxuryLoadingState } from "../components/LuxuryStateIndicators";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";

const SignupScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user, token, loading, error } = useSelector((state) => state.auth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState(null);

  const handleSignup = () => {
    if (!name || !email || !password) {
      setValidationError("Please fill in all fields.");
      return;
    }
    setValidationError(null);
    dispatch(registerUser({ name, email, password }));
  };

  useEffect(() => {
    if (user) {
      navigation.replace("Main");
    }
  }, [user, token, loading, error, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlowPrimary} />
          <View style={styles.heroGlowSecondary} />
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>New member setup</Text>
          </View>
          <Text style={styles.heroTitle}>Create your concierge shopping account.</Text>
          <Text style={styles.heroBody}>
            Save carts across sessions, review lightweight orders, and bring voice or visual
            search into a single premium storefront.
          </Text>
          <View style={styles.heroPoints}>
            <Text style={styles.heroPoint}>- Private session storage for live LLM keys</Text>
            <Text style={styles.heroPoint}>- Cart sync and lightweight order history</Text>
            <Text style={styles.heroPoint}>- Voice reasoning and CLIP visual matching ready</Text>
          </View>
        </View>

        <View style={styles.formCard} testID="screen-signup">
          <Text style={styles.formEyebrow}>Account details</Text>
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.formBody}>
            Use any email for local development. The flow drops you straight into the live app.
          </Text>

          <LuxuryTextInput
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
          />

          <LuxuryTextInput
            label="Email"
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <LuxuryTextInput
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {validationError && (
            <LuxuryErrorBanner
              title="Validation Error"
              message={validationError}
              style={styles.errorMargin}
            />
          )}

          {error && (
            <LuxuryErrorBanner
              title="Signup Failed"
              message={error}
              style={styles.errorMargin}
            />
          )}

          {loading ? (
            <LuxuryLoadingState label="Creating account..." />
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Create account</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            testID="signup-login-link"
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.linkText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 48,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    marginBottom: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceInverse,
    ...shadows.floating,
  },
  heroGlowPrimary: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(183,146,103,0.3)",
    top: -40,
    right: -40,
  },
  heroGlowSecondary: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: "rgba(53,83,109,0.4)",
    bottom: -20,
    left: -10,
  },
  heroBadge: {
    alignSelf: "flex-start",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroBadgeText: {
    color: "#f6ede5",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700",
    color: colors.white,
    fontFamily: typography.displayFamily,
  },
  heroBody: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 24,
    color: "rgba(255,250,244,0.8)",
  },
  heroPoints: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  heroPoint: {
    color: "#ead8c3",
    fontSize: 13,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.floating,
  },
  formEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: colors.accentWarm,
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
    marginBottom: spacing.sm,
  },
  formBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 15,
    fontSize: 16,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.surfaceInverse,
    padding: 16,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
    width: "100%",
    alignItems: "center",
    ...shadows.soft,
  },
  disabledButton: {
    backgroundColor: colors.textSoft,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  linkText: {
    marginTop: spacing.lg,
    fontSize: 15,
    color: colors.accentStrong,
    textAlign: "center",
    fontWeight: "600",
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  errorMargin: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});

export default SignupScreen;
