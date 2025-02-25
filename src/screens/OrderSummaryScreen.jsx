import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

const OrderSummaryScreen = ({ route }) => {
  const { shippingInfo, cartItems, grandTotal, paymentMethod } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Order Summary</Text>

      {/* Shipping Details */}
      <View style={styles.section}>
        <Text style={styles.subHeader}>📍 Shipping Details</Text>
        <Text style={styles.detailText}>{shippingInfo.name}</Text>
        <Text style={styles.detailText}>{shippingInfo.address}, {shippingInfo.city} - {shippingInfo.zipCode}</Text>
        <Text style={styles.detailText}>📞 {shippingInfo.phone}</Text>
      </View>

      {/* Payment Details */}
      <View style={styles.section}>
        <Text style={styles.subHeader}>💳 Payment Method</Text>
        <Text style={[styles.paymentMethod, styles.detailText]}>{paymentMethod}</Text>
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.subHeader}>🛒 Ordered Items</Text>
        <FlatList
          data={cartItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <Text style={styles.itemText}>{item.title} (x{item.quantity})</Text>
              <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          )}
        />
      </View>

      {/* Total Amount */}
      <Text style={styles.totalText}>💰 Total: ${grandTotal.toFixed(2)}</Text>
    </View>
  );
};

export default OrderSummaryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  section: { marginBottom: 15, padding: 15, backgroundColor: "#f9f9f9", borderRadius: 10 },
  subHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 5, color: "#333" },
  detailText: { fontSize: 16, color: "#555", marginBottom: 3 },
  paymentMethod: { fontWeight: "bold", color: "#28A745" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  itemText: { fontSize: 16 },
  itemPrice: { fontSize: 16, fontWeight: "bold", color: "#333" },
  totalText: { fontSize: 20, fontWeight: "bold", marginTop: 15, textAlign: "right", color: "#28A745" },
});


  