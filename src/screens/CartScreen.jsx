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
import { navigateToCheckout } from "../navigation/productNavigation";

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

  const lineKey = useCallback(
    (item) => String(item.id ?? item.productId),
    []
  );

  const lineId = useCallback((item) => item.productId ?? item.id, []);

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.cartItem}>
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="contain" />
        <Text style={styles.name}>{"Name: " + item.title}</Text>
        <Text style={styles.price}>{"Price: $" + item.price}</Text>
        <Text style={styles.quantity}>{"Qty: " + item.quantity}</Text>
        <Text style={styles.subtotal}>
          {"Subtotal: $" + (item.price * item.quantity).toFixed(2)}
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            disabled={loading}
            onPress={() =>
              dispatch(
                adjustCartItemDelta({ productId: lineId(item), delta: 1 })
              )
            }
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            disabled={loading}
            onPress={() =>
              dispatch(
                adjustCartItemDelta({ productId: lineId(item), delta: -1 })
              )
            }
          >
            <Text style={styles.buttonText}>-</Text>
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
    ),
    [dispatch, lineId, loading]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Cart ({cartItems.length} items)</Text>
      {errorMessage ? (
        <>
          <Text style={styles.errorText}>
            {errorMessage}
            {isAuthError ? " Please log in again to refresh your cart." : ""}
          </Text>
          {!isAuthError ? (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => dispatch(fetchCart())}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}
      {loading && cartItems.length > 0 ? (
        <ActivityIndicator style={styles.inlineLoader} color="#007BFF" />
      ) : null}
      {cartItems.length === 0 ? (
        <Text style={styles.emptyText}>Your cart is empty.</Text>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={lineKey}
            renderItem={renderItem}
          />
          <View style={styles.totalContainer}>
            <Text style={styles.totalText}>
              Grand Total: ${grandTotal.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clearCartButton}
            disabled={loading}
            onPress={() => dispatch(clearCart())}
          >
            <Text style={styles.clearCartText}>Clear Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={() => navigateToCheckout(navigation)}
          >
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
  errorText: { color: "#c00", marginBottom: 8 },
  inlineLoader: { marginBottom: 8 },
  cartItem: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
  },
  buttonContainer: { flexDirection: "row", marginTop: 10, alignItems: "center" },
  button: {
    backgroundColor: "#007BFF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginRight: 5,
  },
  buttonText: { fontSize: 16, color: "white", fontWeight: "bold" },
  removeButton: {
    backgroundColor: "red",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 5,
  },
  removeText: { fontSize: 14, color: "white", fontWeight: "bold" },
  clearCartButton: {
    backgroundColor: "#FF3B30",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  clearCartText: { color: "white", fontSize: 16, fontWeight: "bold" },
  totalContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    elevation: 3,
  },
  totalText: { fontSize: 18, fontWeight: "bold", textAlign: "right" },
  checkoutButton: {
    backgroundColor: "#28A745",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  checkoutText: { color: "white", fontSize: 16, fontWeight: "bold" },
  image: { width: 80, height: 80, marginBottom: 10, borderRadius: 5 },
  price: { fontSize: 16, color: "green" },
  quantity: { fontSize: 16, marginBottom: 5, fontWeight: "bold" },
  name: { fontSize: 16, fontWeight: "bold" },
  subtotal: { fontSize: 16, fontWeight: "bold", color: "#555" },
  retryButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  retryText: { color: "white", fontSize: 14, fontWeight: "bold" },
});
