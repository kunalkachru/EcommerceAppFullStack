import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import {
  adjustCartItemDelta,
  removeFromCart,
  clearCart,
  fetchCart,
} from "../redux/cartSlice";
import {
  navigateToCheckout,
  navigateToProductList,
} from "../navigation/productNavigation";
import { colors, radius, shadows, spacing } from "../theme/tokens";
import {
  LuxuryBodyText,
  LuxuryDisplayTitle,
  LuxuryEyebrow,
  LuxuryMetricCard,
  LuxurySectionCard,
} from "../components/LuxuryPrimitives";
import {
  LuxuryErrorBanner,
  LuxuryLoadingState,
  LuxuryEmptyState,
} from "../components/LuxuryStateIndicators";

const CartScreen = ({ navigation }) => {
  const { cartItems = [], loading, error } = useSelector((state) => state.cart);
  const token = useSelector((state) => state.auth?.token);
  const dispatch = useDispatch();

  const errorMessage =
    !error ? null : typeof error === "string" ? error : error.message || "Cart error";
  const isAuthError =
    !!error &&
    ((typeof error === "object" && error.kind === "auth") ||
      (typeof error?.code === "string" && error.code.startsWith("auth_")));

  useFocusEffect(
    useCallback(() => {
      if (token) {
        dispatch(fetchCart());
      }
    }, [dispatch, token])
  );

  const grandTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  const lineKey = useCallback((item) => String(item.id ?? item.productId), []);

  const lineId = useCallback((item) => item.productId ?? item.id, []);

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.cartItem}>
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="contain" />
        <View style={styles.itemContent}>
          <Text style={styles.name} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.metaText}>
            ${item.price} each
          </Text>
          <Text style={styles.subtotal}>
            Subtotal: ${(item.price * item.quantity).toFixed(2)}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              testID="cart-qty-plus"
              style={styles.qtyButton}
              disabled={loading}
              onPress={() =>
                dispatch(
                  adjustCartItemDelta({ productId: lineId(item), delta: 1 })
                )
              }
            >
              <Text style={styles.qtyButtonText}>+</Text>
            </TouchableOpacity>
            <View style={styles.qtyPill}>
              <Text style={styles.qtyValue}>Qty {item.quantity}</Text>
            </View>
            <TouchableOpacity
              style={styles.qtyButton}
              disabled={loading}
              onPress={() =>
                dispatch(
                  adjustCartItemDelta({ productId: lineId(item), delta: -1 })
                )
              }
            >
              <Text style={styles.qtyButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              disabled={loading}
              onPress={() => dispatch(removeFromCart(lineId(item)))}
            >
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [dispatch, lineId, loading]
  );

  if (cartItems.length === 0) {
    return (
      <View style={styles.container} testID="screen-cart">
        <LuxurySectionCard style={styles.emptyCard}>
          <LuxuryEyebrow>Cart</LuxuryEyebrow>
          <LuxuryDisplayTitle style={styles.header}>Your bag is ready when you are.</LuxuryDisplayTitle>
          <LuxuryBodyText style={styles.emptyText}>
            Save pieces as you browse, then return here for a cleaner checkout moment.
          </LuxuryBodyText>
          <TouchableOpacity
            style={styles.catalogButton}
            onPress={() => navigateToProductList(navigation)}
          >
            <Text style={styles.catalogButtonText}>Continue shopping</Text>
          </TouchableOpacity>
        </LuxurySectionCard>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="screen-cart">
      <FlatList
        data={cartItems}
        keyExtractor={lineKey}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <LuxuryEyebrow>Cart</LuxuryEyebrow>
            <LuxuryDisplayTitle style={styles.header}>A calmer path to checkout.</LuxuryDisplayTitle>
            <LuxuryBodyText style={styles.subheader}>
              Review quantity, compare totals, and move into checkout without extra clutter.
            </LuxuryBodyText>

            <View style={styles.metricsRow}>
              <LuxuryMetricCard label="Items" value={String(totalItems)} />
              <LuxuryMetricCard label="Lines" value={String(cartItems.length)} />
            </View>

            {errorMessage ? (
              <LuxuryErrorBanner
                title="Cart Error"
                message={errorMessage + (isAuthError ? " Please log in again to refresh your cart." : "")}
                onRetry={!isAuthError ? () => dispatch(fetchCart()) : undefined}
                style={styles.errorMargin}
              />
            ) : null}

            {loading && cartItems.length > 0 ? (
              <LuxuryLoadingState label="Updating cart..." />
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerWrap}>
            <LuxurySectionCard style={styles.totalContainer}>
              <LuxuryEyebrow>Grand total</LuxuryEyebrow>
              <Text style={styles.totalText}>${grandTotal.toFixed(2)}</Text>
              <Text style={styles.totalHint}>
                Taxes and final delivery details are confirmed at checkout.
              </Text>
            </LuxurySectionCard>
            <TouchableOpacity
              style={styles.clearCartButton}
              disabled={loading}
              onPress={() => dispatch(clearCart())}
            >
              <Text style={styles.clearCartText}>Clear cart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="cart-proceed-checkout"
              style={styles.checkoutButton}
              onPress={() => navigateToCheckout(navigation)}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  headerWrap: {
    marginBottom: spacing.sm,
  },
  header: {
    lineHeight: 35,
  },
  subheader: {
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorBanner: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: "#edc7c3",
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  inlineLoader: {
    marginBottom: spacing.sm,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  image: {
    width: 92,
    height: 92,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    marginRight: spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  subtotal: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accentStrong,
    marginBottom: spacing.sm,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  qtyButton: {
    backgroundColor: colors.surfaceInverse,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  qtyButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: "700",
  },
  qtyPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  qtyValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
  },
  removeButton: {
    backgroundColor: colors.errorSoft,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#edc7c3",
  },
  removeText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: "700",
  },
  footerWrap: {
    marginTop: spacing.sm,
  },
  totalContainer: {
    marginBottom: spacing.sm,
  },
  totalText: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
  },
  totalHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  clearCartButton: {
    backgroundColor: colors.errorSoft,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#edc7c3",
  },
  clearCartText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: "700",
  },
  checkoutButton: {
    backgroundColor: colors.surfaceInverse,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    alignItems: "center",
    ...shadows.soft,
  },
  checkoutText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  retryButton: {
    backgroundColor: colors.surfaceInverse,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyCard: {
    margin: spacing.lg,
    marginTop: spacing.xxl,
    borderRadius: radius.xl,
    ...shadows.floating,
  },
  emptyText: {
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  catalogButton: {
    backgroundColor: colors.surfaceInverse,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  catalogButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  errorMargin: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});

export default CartScreen;
