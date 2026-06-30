import React, { useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { clearCart } from "../redux/cartSlice";

const CheckoutScreen = ({ navigation }) => {
  const cartItems = useSelector((state) => state.cart?.cartItems || []);
  const grandTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const dispatch = useDispatch();

  // State for shipping details
  const [shippingInfo, setShippingInfo] = useState({
    name: "",
    address: "",
    city: "",
    zipCode: "",
    phone: "",
  });

  // State for payment method
  const [paymentMethod, setPaymentMethod] = useState("");

  // Handle order placement
  const handlePlaceOrder = () => {
    if (!shippingInfo.name || !shippingInfo.address || !shippingInfo.city || !shippingInfo.zipCode || !shippingInfo.phone) {
      Alert.alert("Error", "Please fill in all the shipping details.");
      return;
    }

    if (!paymentMethod) {
      Alert.alert("Error", "Please select a payment method.");
      return;
    }

    navigation.navigate("OrderSummary", {
      shippingInfo,
      cartItems,
      grandTotal,
      paymentMethod,
    });

    dispatch(clearCart());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Checkout</Text>

      {/* Shipping Details Form */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={shippingInfo.name}
          onChangeText={(text) => setShippingInfo({ ...shippingInfo, name: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Address"
          value={shippingInfo.address}
          onChangeText={(text) => setShippingInfo({ ...shippingInfo, address: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="City"
          value={shippingInfo.city}
          onChangeText={(text) => setShippingInfo({ ...shippingInfo, city: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Zip Code"
          keyboardType="numeric"
          value={shippingInfo.zipCode}
          onChangeText={(text) => setShippingInfo({ ...shippingInfo, zipCode: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          value={shippingInfo.phone}
          onChangeText={(text) => setShippingInfo({ ...shippingInfo, phone: text })}
        />
      </View>

      {/* Payment Selection */}
      <Text style={styles.summaryHeader}>Select Payment Method</Text>
      <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod("Credit Card")}>
        <Text style={[styles.paymentText, paymentMethod === "Credit Card" && styles.selected]}>💳 Credit Card</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod("PayPal")}>
        <Text style={[styles.paymentText, paymentMethod === "PayPal" && styles.selected]}>💰 PayPal</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod("Cash on Delivery")}>
        <Text style={[styles.paymentText, paymentMethod === "Cash on Delivery" && styles.selected]}>🚚 Cash on Delivery</Text>
      </TouchableOpacity>

      {/* Order Summary */}
      <Text style={styles.summaryHeader}>Order Summary</Text>
      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.orderItem}>
            <Text style={styles.itemText}>{item.title} (x{item.quantity})</Text>
            <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        )}
      />
      <Text style={styles.totalText}>Total: ${grandTotal.toFixed(2)}</Text>

      {/* Place Order Button */}
      <TouchableOpacity style={styles.orderButton} onPress={handlePlaceOrder}>
        <Text style={styles.orderButtonText}>Place Order</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CheckoutScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  form: { marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  summaryHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  orderItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  itemText: { fontSize: 16 },
  itemPrice: { fontSize: 16, fontWeight: "bold" },
  totalText: { fontSize: 18, fontWeight: "bold", marginTop: 10, textAlign: "right" },
  orderButton: {
    backgroundColor: "#28A745",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  orderButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  paymentOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginVertical: 5,
  },
  paymentText: { fontSize: 16, textAlign: "center" },
  selected: { fontWeight: "bold", color: "#28A745" },
});
