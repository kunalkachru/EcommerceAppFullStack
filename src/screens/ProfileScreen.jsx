import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../redux/authSlice";
import { MODEL_3D_CREDITS } from "../config/model3DCredits";
import { colors, radius, shadows, spacing } from "../theme/tokens";
import {
  LuxuryBodyText,
  LuxuryDisplayTitle,
  LuxuryEyebrow,
  LuxurySectionCard,
} from "../components/LuxuryPrimitives";

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  return (
    <View style={styles.container} testID="screen-profile">
      {user ? (
        <LuxurySectionCard style={styles.panel}>
          <LuxuryEyebrow>Profile</LuxuryEyebrow>
          <LuxuryDisplayTitle>Account, trust, and shopping memory.</LuxuryDisplayTitle>
          <LuxuryBodyText style={styles.body}>
            ShopEase keeps login simple while your cart, orders, and optional AI session stay
            connected to the same premium journey.
          </LuxuryBodyText>

          <LuxurySectionCard eyebrow="Primary identity" muted style={styles.identityCard}>
            <Text style={styles.identityName}>Name: {user.name}</Text>
            <Text style={styles.identityEmail}>Email: {user.email}</Text>
          </LuxurySectionCard>

          <View style={styles.detailRow}>
            <LuxurySectionCard style={styles.detailCard} eyebrow="Session privacy">
              <LuxuryBodyText style={styles.detailValue}>
                Live LLM keys stay in session memory only.
              </LuxuryBodyText>
            </LuxurySectionCard>
            <LuxurySectionCard style={styles.detailCard} eyebrow="Post-purchase">
              <LuxuryBodyText style={styles.detailValue}>
                Orders stay one tap away from this screen.
              </LuxuryBodyText>
            </LuxurySectionCard>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("Orders")}
          >
            <Text style={styles.secondaryButtonText}>Review orders</Text>
          </TouchableOpacity>

          {MODEL_3D_CREDITS.length > 0 ? (
            <TouchableOpacity
              testID="profile-credits-link"
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("Credits")}
            >
              <Text style={styles.secondaryButtonText}>3D model credits</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity testID="profile-logout" style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </LuxurySectionCard>
      ) : (
        <LuxurySectionCard style={styles.panel}>
          <LuxuryEyebrow>Profile</LuxuryEyebrow>
          <LuxuryDisplayTitle>You are currently signed out.</LuxuryDisplayTitle>
          <LuxuryBodyText style={styles.body}>
            Sign in to restore your cart, order history, and ambient AI shopping session.
          </LuxuryBodyText>
        </LuxurySectionCard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  panel: {
    borderRadius: radius.xl,
    ...shadows.floating,
  },
  body: {
    marginTop: spacing.sm,
  },
  identityCard: {
    marginTop: spacing.lg,
  },
  identityName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  identityEmail: {
    fontSize: 16,
    color: colors.textMuted,
  },
  detailRow: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  detailCard: {
  },
  detailValue: {
    lineHeight: 21,
  },
  secondaryButton: {
    marginTop: spacing.lg,
    paddingVertical: 15,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.accentSoft,
  },
  secondaryButtonText: {
    color: colors.accentStrong,
    fontSize: 15,
    fontWeight: "700",
  },
  button: {
    backgroundColor: colors.surfaceInverse,
    padding: 15,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    alignItems: "center",
    ...shadows.soft,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ProfileScreen;
