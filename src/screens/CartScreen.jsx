import React, { useCallback, useEffect, useState } from "react";
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
  restoreCartSnapshot,
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
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false);
  const [clearSnapshot, setClearSnapshot] = useState(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [isCleared, setIsCleared] = useState(false);
  const [restoredItems, setRestoredItems] = useState(null);

  const visibleCartItems = isCleared ? [] : restoredItems || cartItems;

  useEffect(() => {
    if (!undoVisible) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setUndoVisible(false);
      setClearSnapshot(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [undoVisible]);

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

  const grandTotal = visibleCartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const totalItems = visibleCartItems.reduce((total, item) => total + item.quantity, 0);

  const lineKey = useCallback((item) => String(item.id ?? item.productId), []);

  const lineId = useCallback((item) => item.productId ?? item.id, []);

  const requestClear = useCallback(() => {
    setClearConfirmationOpen(true);
  }, []);

  const confirmClear = useCallback(async () => {
    const snapshot = visibleCartItems.map((item) => ({ ...item }));
    const result = await dispatch(clearCart());
    if (result?.type?.endsWith("/rejected")) {
      setClearConfirmationOpen(false);
      return;
    }

    setClearConfirmationOpen(false);
    setClearSnapshot(snapshot);
    setRestoredItems(null);
    setIsCleared(true);
    setUndoVisible(true);
  }, [dispatch, visibleCartItems]);

  const undoClear = useCallback(async () => {
    if (!clearSnapshot) {
      return;
    }

    const snapshot = clearSnapshot;
    setIsCleared(false);
    setRestoredItems(snapshot);
    setUndoVisible(false);
    setClearSnapshot(null);

    await dispatch(restoreCartSnapshot(snapshot));
    dispatch(fetchCart());
  }, [clearSnapshot, dispatch]);

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
              testID="cart-remove"
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

  if (visibleCartItems.length === 0) {
    return (
      <View style={styles.container} testID="screen-cart">
        <LuxurySectionCard style={styles.emptyCard}>
          <LuxuryEyebrow>Cart</LuxuryEyebrow>
          <LuxuryDisplayTitle style={styles.header}>Your bag is ready when you are.</LuxuryDisplayTitle>
          <LuxuryBodyText style={styles.emptyText}>
            Save pieces as you browse, then return here for a cleaner checkout moment.
          </LuxuryBodyText>
          <TouchableOpacity
            testID="cart-continue-shopping"
            style={styles.catalogButton}
            onPress={() => navigateToProductList(navigation)}
          >
            <Text style={styles.catalogButtonText}>Continue shopping</Text>
          </TouchableOpacity>
          {undoVisible ? (
            <View style={styles.undoBanner}>
              <Text style={styles.undoMessage}>Cart cleared.</Text>
              <TouchableOpacity testID="cart-undo" onPress={undoClear}>
                <Text style={styles.undoText}>Undo</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </LuxurySectionCard>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="screen-cart">
      <FlatList
        data={visibleCartItems}
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
              <LuxuryMetricCard label="Lines" value={String(visibleCartItems.length)} />
            </View>

            {errorMessage ? (
              <LuxuryErrorBanner
                title="Cart Error"
                message={errorMessage + (isAuthError ? " Please log in again to refresh your cart." : "")}
                onRetry={!isAuthError ? () => dispatch(fetchCart()) : undefined}
                style={styles.errorMargin}
              />
            ) : null}

            {loading && visibleCartItems.length > 0 ? (
              <LuxuryLoadingState label="Updating cart..." />
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerWrap}>
            <LuxurySectionCard style={styles.totalContainer}>
              <LuxuryEyebrow>Grand total</LuxuryEyebrow>
              <Text style={styles.totalText}>${grandTotal.toFixed(2)}</Text>
              <Text style={styles.shippingMessage}>Free shipping on orders over $50</Text>
              {grandTotal < 50 ? (
                <Text style={styles.shippingProgress}>
                  Spend ${(50 - grandTotal).toFixed(2)} more for free shipping.
                </Text>
              ) : null}
              <Text style={styles.totalHint}>
                Taxes and final delivery details are confirmed at checkout.
              </Text>
            </LuxurySectionCard>
            <TouchableOpacity
              testID="cart-clear"
              style={styles.clearCartButton}
              disabled={loading}
              onPress={requestClear}
            >
              <Text style={styles.clearCartText}>Clear cart</Text>
            </TouchableOpacity>
            {clearConfirmationOpen ? (
              <LuxurySectionCard style={styles.confirmationCard}>
                <Text style={styles.confirmationTitle}>Clear all items?</Text>
                <Text style={styles.confirmationMessage}>Choose whether to remove everything from your cart.</Text>
                <View style={styles.confirmationActions}>
                  <TouchableOpacity testID="cart-clear-all" style={styles.confirmButton} onPress={confirmClear}>
                    <Text style={styles.confirmButtonText}>Clear all</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="cart-keep-items" style={styles.keepButton} onPress={() => setClearConfirmationOpen(false)}>
                    <Text style={styles.keepButtonText}>Keep items</Text>
                  </TouchableOpacity>
                </View>
              </LuxurySectionCard>
            ) : null}
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
  shippingMessage: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700",
    marginTop: spacing.xs,
    textAlign: "right",
  },
  shippingProgress: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
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
  confirmationCard: {
    marginTop: spacing.sm,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  confirmationMessage: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  confirmationActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  confirmButton: {
    backgroundColor: colors.error,
    padding: spacing.sm,
    borderRadius: radius.pill,
  },
  confirmButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  keepButton: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radius.pill,
  },
  keepButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  undoBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
  },
  undoMessage: {
    color: colors.text,
  },
  undoText: {
    color: colors.accentStrong,
    fontWeight: "700",
  },
});

export default CartScreen;
