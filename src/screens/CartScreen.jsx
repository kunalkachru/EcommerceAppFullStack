import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { increaseQuantity, decreaseQuantity, removeFromCart, clearCart } from "../redux/cartSlice";

const CartScreen = ({ navigation }) => {
  const cartItems = useSelector((state) => state.cart?.cartItems || []);
  const dispatch = useDispatch();

  // Calculate Grand Total
  const grandTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Cart ({cartItems.length} items)</Text>
      {cartItems.length === 0 ? (
        <Text style={styles.emptyText}>Your cart is empty.</Text>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <Image source={{ uri: item.image }} style={styles.image} />
                <Text style={styles.name}>{'Name: ' + item.title}</Text>
                <Text style={styles.price}>{'Price: $' + item.price}</Text>
                <Text style={styles.quantity}>{'Qty: ' + item.quantity}</Text>
                <Text style={styles.subtotal}>{'Subtotal: $' + (item.price * item.quantity).toFixed(2)}</Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.button} onPress={() => dispatch(increaseQuantity(item.id))}>
                    <Text style={styles.buttonText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.button} onPress={() => dispatch(decreaseQuantity(item.id))}>
                    <Text style={styles.buttonText}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeButton} onPress={() => dispatch(removeFromCart(item.id))}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>Grand Total: ${grandTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.clearCartButton} onPress={() => dispatch(clearCart())}>
            <Text style={styles.clearCartText}>Clear Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkoutButton} onPress={() => 
            /*navigation.navigate("Checkout")*/
            navigation.navigate("Products", { screen: "Checkout" })}>
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

export default CartScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f9f9f9" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  emptyText: { fontSize: 16, textAlign: "center", marginTop: 50, color: "gray" },
  cartItem: { backgroundColor: "white", padding: 15, borderRadius: 10, marginBottom: 10, elevation: 3 },
  buttonContainer: { flexDirection: "row", marginTop: 10, alignItems: "center" },
  button: { backgroundColor: "#007BFF", paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5, marginRight: 5 },
  buttonText: { fontSize: 16, color: "white", fontWeight: "bold" },
  removeButton: { backgroundColor: "red", paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5, marginLeft: 5 },
  removeText: { fontSize: 14, color: "white", fontWeight: "bold" },
  clearCartButton: { backgroundColor: "#FF3B30", padding: 12, borderRadius: 8, marginTop: 20, alignItems: "center" },
  clearCartText: { color: "white", fontSize: 16, fontWeight: "bold" },
  totalContainer: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginVertical: 10, elevation: 3 },
  totalText: { fontSize: 18, fontWeight: "bold", textAlign: "right" },
  checkoutButton: { backgroundColor: "#28A745", padding: 15, borderRadius: 8, marginTop: 20, alignItems: "center" },
  checkoutText: { color: "white", fontSize: 16, fontWeight: "bold" },
  image: { width: 80, height: 80, marginBottom: 10, borderRadius: 5 },
  price: { fontSize: 16, color: "green" },
  quantity: { fontSize: 16, marginBottom: 5, fontWeight: "bold" },
  name: { fontSize: 16, fontWeight: "bold" },
  subtotal: { fontSize: 16, fontWeight: "bold", color: "#555" },
});

