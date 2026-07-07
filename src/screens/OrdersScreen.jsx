import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { fetchOrders } from "../services/ordersService";
import { colors, radius, shadows, spacing, typography } from "../theme/tokens";
import { navigateToProductList } from "../navigation/productNavigation";
import {
  LuxuryBodyText,
  LuxuryDisplayTitle,
  LuxuryEyebrow,
  LuxuryMetricCard,
  LuxurySectionCard,
} from "../components/LuxuryPrimitives";

const OrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadOrders = useCallback(
    async (opts = {}) => {
      if (!opts.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await fetchOrders();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fetch Orders Error:", err?.response?.data || err?.message || err);
        const message =
          err?.response?.data?.message ||
          (typeof err?.message === "string" && err.message) ||
          "Failed to load orders.";
        setError(message);
      } finally {
        if (!opts.silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOrders({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadOrders]);

  const renderOrder = ({ item }) => {
    const createdAt = item?.createdAt ? new Date(item.createdAt) : null;
    const total =
      typeof item?.totals?.grandTotal === "number"
        ? item.totals.grandTotal
        : (item.items || []).reduce(
            (sum, line) => sum + Number(line.price || 0) * Number(line.quantity || 0),
            0
          );

    const shortId = String(item.id || "").slice(0, 8);
    const status = item.orderStatus || "placed";
    const paymentStatus = item.paymentStatus || "mocked_paid";

    return (
      <TouchableOpacity
        style={styles.card}
        testID={`order-card-${item.id}`}
        onPress={() => navigation.navigate("OrderSummary", { order: item })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Order #{shortId || "N/A"}</Text>
          <Text style={styles.cardAmount}>${total.toFixed(2)}</Text>
        </View>
        <Text style={styles.cardMeta}>
          {createdAt ? createdAt.toLocaleString() : "Date unavailable"}
        </Text>
        <Text style={styles.cardStatus}>
          Status: {status} · Payment: {paymentStatus}
        </Text>
        <Text style={styles.cardItems}>
          {Array.isArray(item.items) ? item.items.length : 0} item
          {Array.isArray(item.items) && item.items.length === 1 ? "" : "s"}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading && !orders.length && !error) {
    return (
      <View style={styles.center} testID="screen-orders">
        <ActivityIndicator size="large" color="#28A745" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  const totalOrders = orders.length;
  const totalSpend = orders.reduce((sum, order) => {
    const grandTotal =
      typeof order?.totals?.grandTotal === "number"
        ? order.totals.grandTotal
        : (order.items || []).reduce(
            (lineSum, line) => lineSum + Number(line.price || 0) * Number(line.quantity || 0),
            0
          );
    return sum + grandTotal;
  }, 0);
  const latestOrder = orders[0];

  return (
    <View style={styles.container} testID="screen-orders">
      <LuxurySectionCard style={styles.heroCard}>
        <LuxuryEyebrow>Orders</LuxuryEyebrow>
        <LuxuryDisplayTitle>Your after-purchase story, kept simple.</LuxuryDisplayTitle>
        <LuxuryBodyText style={styles.subheader}>
          Review placed orders, revisit shipping details, and keep the post-purchase flow as
          polished as discovery.
        </LuxuryBodyText>
        <View style={styles.metricsRow}>
          <LuxuryMetricCard label="Total orders" value={String(totalOrders)} muted />
          <LuxuryMetricCard label="Lifetime spend" value={`$${totalSpend.toFixed(2)}`} muted />
        </View>
        {latestOrder ? (
          <View style={styles.latestCard}>
            <Text style={styles.latestLabel}>Latest order</Text>
            <Text style={styles.latestValue}>
              #{String(latestOrder.id || "").slice(0, 8)} · {latestOrder.items?.length || 0} item
              {(latestOrder.items?.length || 0) === 1 ? "" : "s"}
            </Text>
          </View>
        ) : null}
      </LuxurySectionCard>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {orders.length === 0 && !loading && !error ? (
        <LuxurySectionCard style={styles.emptyState}>
          <LuxuryEyebrow style={styles.emptyEyebrow}>No order history yet</LuxuryEyebrow>
          <LuxuryDisplayTitle style={styles.emptyTitle}>Your first order will appear here.</LuxuryDisplayTitle>
          <LuxuryBodyText style={styles.emptySubtitle}>
            Place something from the catalog and come back for a cleaner order recap and
            shipping summary.
          </LuxuryBodyText>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigateToProductList(navigation)}
          >
            <Text style={styles.emptyButtonText}>Browse products</Text>
          </TouchableOpacity>
        </LuxurySectionCard>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentStrong} />
          }
        />
      )}
    </View>
  );
};

export default OrdersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  heroCard: {
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    ...shadows.floating,
  },
  subheader: {
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  latestCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
  },
  latestLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: typography.eyebrowSpacing,
    textTransform: "uppercase",
    color: colors.accentStrong,
    marginBottom: 6,
  },
  latestValue: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  listContent: {
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accentStrong,
  },
  cardMeta: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  cardStatus: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  cardItems: {
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: radius.xl,
    paddingVertical: spacing.xxl,
    ...shadows.card,
  },
  emptyTitle: {
    lineHeight: 35,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceInverse,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorBox: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "#edc7c3",
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
});
