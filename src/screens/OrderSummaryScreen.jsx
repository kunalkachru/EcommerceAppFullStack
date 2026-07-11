import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";

const OrderSummaryScreen = ({ route }) => {
  const params = route?.params || {};
  const order = params.order || null;

  const shippingInfo = order?.shippingInfo || params.shippingInfo || {};
  const items = order?.items || params.cartItems || [];
  const paymentMethod = order?.paymentMethod || params.paymentMethod || "";
  const totals = order?.totals || {};

  const computedTotal =
    typeof totals.grandTotal === "number"
      ? totals.grandTotal
      : items.reduce((total, item) => total + item.price * item.quantity, 0);

  const createdAt = order?.createdAt || null;
  const orderId = order?.id || null;
  const paymentStatus = order?.paymentStatus || "mocked_paid";
  const orderStatus = order?.orderStatus || "placed";

  return (
    <View style={styles.container} testID="screen-order-summary">
      <Text style={styles.eyebrow}>Order complete</Text>
      <Text style={styles.header}>Your order has been placed.</Text>

      {order && (
        <View style={styles.section}>
          <Text style={styles.subHeader}>Order details</Text>
          {orderId && <Text style={styles.detailText}>Order ID: {orderId}</Text>}
          {createdAt && (
            <Text style={styles.detailText}>
              Placed: {new Date(createdAt).toLocaleString()}
            </Text>
          )}
          <Text style={styles.detailText}>
            Status: {orderStatus} · Payment: {paymentStatus}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.subHeader}>Shipping details</Text>
        <Text style={styles.detailText}>{shippingInfo.name}</Text>
        <Text style={styles.detailText}>
          {shippingInfo.address}, {shippingInfo.city} - {shippingInfo.zipCode}
        </Text>
        <Text style={styles.detailText}>{shippingInfo.phone}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subHeader}>Payment method</Text>
        <Text style={[styles.paymentMethod, styles.detailText]}>{paymentMethod}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subHeader}>Ordered items</Text>
        <FlatList
          data={items}
          keyExtractor={(item, index) => item.id || item.productId || String(index)}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <Text style={styles.itemText}>
                {item.title} (x{item.quantity})
              </Text>
              <Text style={styles.itemPrice}>
                ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          )}
        />
      </View>

      <Text style={styles.totalText}>Total: ${computedTotal.toFixed(2)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: colors.accentWarm,
    marginBottom: 6,
  },
  header: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: spacing.md,
    color: colors.text,
    fontFamily: typography.displayFamily,
  },
  section: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  subHeader: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.xs,
    color: colors.text,
    fontFamily: typography.displayFamily,
  },
  detailText: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 4,
    lineHeight: 21,
  },
  paymentMethod: {
    fontWeight: "700",
    color: colors.accentStrong,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.accentStrong,
  },
  totalText: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "right",
    color: colors.text,
  },
});

export default OrderSummaryScreen;
