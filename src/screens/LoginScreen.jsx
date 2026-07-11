import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../redux/authSlice";
import PromoCarousel from "../components/PromoCarousel";
import FeaturedProductsStrip from "../components/FeaturedProductsStrip";
import LuxuryTextInput from "../components/LuxuryTextInput";
import { LuxuryErrorBanner, LuxuryLoadingState } from "../components/LuxuryStateIndicators";
import { storeUpdates } from "../data/promos";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";

const LoginScreen = ({ navigation }) => {
  const scrollRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.auth);

  const handleLogin = () => {
    dispatch(loginUser({ email, password }));
  };

  useEffect(() => {
    if (user) {
      navigation.replace("Main");
    }
  }, [user, navigation]);

  const scrollToSignIn = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlowPrimary} />
          <View style={styles.heroGlowSecondary} />
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Luxury ease. Ambient AI.</Text>
          </View>
          <Text style={styles.brand}>ShopEase</Text>
          <Text style={styles.tagline}>
            Personal shopping that feels calm, fast, and unexpectedly intelligent.
          </Text>
          <Text style={styles.heroBody}>
            Browse, speak, or bring a reference photo. The app keeps the journey light while
            voice reasoning and visual match help land the right product faster.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Discovery</Text>
              <Text style={styles.heroStatValue}>Text, voice, photo</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Session</Text>
              <Text style={styles.heroStatValue}>Private key memory only</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.signInJump} onPress={scrollToSignIn}>
            <Text style={styles.signInJumpText}>Sign in ↓</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Store pulse</Text>
          <Text style={styles.sectionTitle}>Fresh offers with a calmer storefront.</Text>
          <PromoCarousel />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Trending now</Text>
          <Text style={styles.sectionTitle}>A quick look before you sign in.</Text>
          <FeaturedProductsStrip />
        </View>

        <View style={styles.updatesBox}>
          <Text style={styles.sectionEyebrow}>Why shoppers stay</Text>
          {storeUpdates.map((line) => (
            <Text key={line} style={styles.updateLine}>
              - {line}
            </Text>
          ))}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formEyebrow}>Member access</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.demoHint}>
            Demo account: test@example.com / secret123
          </Text>

          <LuxuryTextInput
            label="Email"
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            testID="login-email"
            value={email}
            onChangeText={setEmail}
          />

          <LuxuryTextInput
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            autoComplete="off"
            textContentType="oneTimeCode"
            importantForAutofill="no"
            testID="login-password"
            value={password}
            onChangeText={setPassword}
          />

          {loading && (
            <LuxuryLoadingState label="Signing in..." />
          )}

          {!loading && (
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              accessibilityLabel="Login"
              testID="login-submit"
            >
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          )}

          {error && (
            <LuxuryErrorBanner
              title="Login Failed"
              message={error}
              style={styles.errorMargin}
            />
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate("Signup")}
            accessibilityLabel="Sign Up"
            testID="signup-link"
          >
            <Text style={styles.linkText}>
              Don't have an account? Sign Up
            </Text>
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
    paddingTop: spacing.xxl,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceInverse,
    ...shadows.floating,
  },
  heroGlowPrimary: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(183,146,103,0.28)",
    top: -60,
    right: -40,
  },
  heroGlowSecondary: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: "rgba(53,83,109,0.4)",
    bottom: -32,
    left: -24,
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
  brand: {
    fontSize: 38,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -1,
    fontFamily: typography.displayFamily,
  },
  tagline: {
    fontSize: 20,
    color: "#f4eadf",
    marginTop: spacing.xs,
    lineHeight: 28,
    fontWeight: "600",
  },
  heroBody: {
    fontSize: 15,
    color: "rgba(255,250,244,0.78)",
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  heroStats: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroStatCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,250,244,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: "#dac2a6",
    marginBottom: 6,
  },
  heroStatValue: {
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
  },
  signInJump: {
    alignSelf: "flex-start",
    marginTop: spacing.lg,
    backgroundColor: colors.accentWarm,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: radius.pill,
  },
  signInJumpText: {
    color: colors.surfaceInverse,
    fontWeight: "700",
    fontSize: 15,
  },
  sectionCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: colors.accentWarm,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    fontFamily: typography.displayFamily,
    lineHeight: 30,
    marginBottom: spacing.md,
  },
  demoHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  updatesBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  updateLine: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 22,
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
    marginBottom: spacing.sm,
    color: colors.text,
    fontFamily: typography.displayFamily,
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
    marginTop: 4,
    width: "100%",
    alignItems: "center",
    ...shadows.soft,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  loader: {
    marginVertical: 12,
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
    marginTop: spacing.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  errorMargin: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});

export default LoginScreen;
