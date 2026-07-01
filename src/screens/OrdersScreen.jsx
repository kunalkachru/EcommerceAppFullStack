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
        // eslint-disable-next-line no-console
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#28A745" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Orders</Text>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {orders.length === 0 && !loading && !error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>
            Your orders will appear here after you place your first order.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#28A745" />
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
    padding: 16,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  listContent: {
    paddingVertical: 4,
  },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#28A745",
  },
  cardMeta: {
    fontSize: 14,
    color: "#777",
    marginBottom: 4,
  },
  cardStatus: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  cardItems: {
    fontSize: 14,
    color: "#555",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#555",
  },
  errorBox: {
    backgroundColor: "#ffecec",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  errorText: {
    color: "#cc0000",
    fontSize: 14,
  },
});

