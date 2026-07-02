import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../redux/authSlice";
import PromoCarousel from "../components/PromoCarousel";
import FeaturedProductsStrip from "../components/FeaturedProductsStrip";
import { storeUpdates } from "../data/promos";

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
          <Text style={styles.brand}>ShopEase</Text>
          <Text style={styles.tagline}>
            Deals, new arrivals & your cart — all in one place
          </Text>
          <TouchableOpacity style={styles.signInJump} onPress={scrollToSignIn}>
            <Text style={styles.signInJumpText}>Sign in ↓</Text>
          </TouchableOpacity>
        </View>

        <PromoCarousel />
        <FeaturedProductsStrip />

        <View style={styles.updatesBox}>
          {storeUpdates.map((line) => (
            <Text key={line} style={styles.updateLine}>
              • {line}
            </Text>
          ))}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.demoHint}>
            Demo account: test@example.com / secret123
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9aa3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            accessibilityLabel="Email"
            testID="login-email"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9aa3af"
            secureTextEntry
            autoComplete="off"
            textContentType="oneTimeCode"
            importantForAutofill="no"
            accessibilityLabel="Password"
            testID="login-password"
            value={password}
            onChangeText={setPassword}
          />

          {loading ? (
            <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              accessibilityLabel="Login"
              testID="login-submit"
            >
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            onPress={() => navigation.navigate("Signup")}
            accessibilityLabel="Sign Up"
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
    backgroundColor: "#f0f4f8",
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    marginBottom: 20,
    paddingTop: 8,
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a1a2e",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: "#5c6370",
    marginTop: 6,
    lineHeight: 22,
  },
  signInJump: {
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: "#007BFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  signInJumpText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  demoHint: {
    fontSize: 13,
    color: "#5c6370",
    marginBottom: 14,
    lineHeight: 18,
  },
  updatesBox: {
    backgroundColor: "#e8f4fd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#cce5ff",
  },
  updateLine: {
    fontSize: 13,
    color: "#2c5282",
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: "#1a1a2e",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#dde2e8",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#fafbfc",
    color: "#1a1a2e",
  },
  button: {
    backgroundColor: "#007BFF",
    padding: 14,
    borderRadius: 10,
    marginTop: 4,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  loader: {
    marginVertical: 12,
  },
  linkText: {
    marginTop: 16,
    fontSize: 15,
    color: "#007BFF",
    textAlign: "center",
  },
  errorText: {
    color: "#dc3545",
    marginTop: 10,
    textAlign: "center",
  },
});

export default LoginScreen;
