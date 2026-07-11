import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { clearCart } from "../redux/cartSlice";
import { createOrder } from "../services/ordersService";
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
  LuxurySuccessConfirmation,
} from "../components/LuxuryStateIndicators";
import LuxuryTextInput from "../components/LuxuryTextInput";

const PAYMENT_OPTIONS = [
  { id: "Credit Card", label: "Credit Card", hint: "Fastest for a smooth checkout finish" },
  { id: "PayPal", label: "PayPal", hint: "Use your PayPal balance or saved funding source" },
  { id: "Cash on Delivery", label: "Cash on Delivery", hint: "Settle payment when the order arrives" },
];

const CheckoutScreen = ({ navigation }) => {
  const cartItems = useSelector((state) => state.cart?.cartItems || []);
  const grandTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const dispatch = useDispatch();

  const [shippingInfo, setShippingInfo] = useState({
    name: "",
    address: "",
    city: "",
    zipCode: "",
    phone: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const itemCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );

  const updateField = (field, value) => {
    setShippingInfo((current) => ({ ...current, [field]: value }));
  };

  const handlePlaceOrder = async () => {
    if (isPlacingOrder) {
      return;
    }

    if (
      !shippingInfo.name ||
      !shippingInfo.address ||
      !shippingInfo.city ||
      !shippingInfo.zipCode ||
      !shippingInfo.phone
    ) {
      setOrderError("Please fill in all the shipping details.");
      return;
    }

    if (!paymentMethod) {
      setOrderError("Please select a payment method.");
      return;
    }

    if (!cartItems.length) {
      setOrderError("Your cart is empty.");
      return;
    }

    try {
      setIsPlacingOrder(true);
      setOrderError(null);
      setOrderSuccess(false);
      const order = await createOrder({
        items: cartItems,
        shippingInfo,
        paymentMethod,
        grandTotal,
      });

      setOrderSuccess(true);
      dispatch(clearCart());

      setTimeout(() => {
        navigation.navigate("OrderSummary", {
          order,
        });
      }, 1500);
    } catch (error) {
      // Keep cart intact on failure.
      console.error("Place Order Error:", error?.response?.data || error?.message || error);
      const message =
        error?.response?.data?.message ||
        (typeof error?.message === "string" && error.message) ||
        "Failed to place order. Please try again.";
      setOrderError(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <KeyboardAvoidingView
      testID="screen-checkout"
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <LuxuryEyebrow>Checkout</LuxuryEyebrow>
        <LuxuryDisplayTitle>Finish the purchase with confidence.</LuxuryDisplayTitle>
        <LuxuryBodyText style={styles.intro}>
          Shipping details, payment preference, and order review live on one calmer surface.
        </LuxuryBodyText>

        <View style={styles.metricsRow}>
          <LuxuryMetricCard label="Items" value={String(itemCount)} />
          <LuxuryMetricCard label="Total" value={`$${grandTotal.toFixed(2)}`} />
        </View>

        {orderError && (
          <LuxuryErrorBanner
            title="Checkout Error"
            message={orderError}
            style={styles.stateMargin}
          />
        )}

        {orderSuccess && (
          <LuxurySuccessConfirmation
            title="Order Placed"
            message="Your order has been confirmed. Redirecting to summary..."
            style={styles.stateMargin}
          />
        )}

        {isPlacingOrder && (
          <LuxuryLoadingState label="Processing your order..." />
        )}

        <LuxurySectionCard eyebrow="Shipping" title="Delivery details" style={styles.sectionCard}>
          <View style={styles.form}>
            <LuxuryTextInput
              testID="checkout-field-fullname"
              label="Full Name"
              placeholder="Enter your full name"
              value={shippingInfo.name}
              onChangeText={(text) => updateField("name", text)}
            />
            <LuxuryTextInput
              testID="checkout-field-address"
              label="Address"
              placeholder="Enter your street address"
              value={shippingInfo.address}
              onChangeText={(text) => updateField("address", text)}
            />
            <LuxuryTextInput
              testID="checkout-field-city"
              label="City"
              placeholder="Enter your city"
              value={shippingInfo.city}
              onChangeText={(text) => updateField("city", text)}
            />
            <LuxuryTextInput
              testID="checkout-field-zipcode"
              label="Zip Code"
              placeholder="Enter your zip code"
              keyboardType="numeric"
              value={shippingInfo.zipCode}
              onChangeText={(text) => updateField("zipCode", text)}
            />
            <LuxuryTextInput
              testID="checkout-field-phone"
              label="Phone Number"
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              returnKeyType="done"
              blurOnSubmit
              value={shippingInfo.phone}
              onChangeText={(text) => updateField("phone", text)}
            />
          </View>
        </LuxurySectionCard>

        <LuxurySectionCard eyebrow="Payment" title="Select payment method" style={styles.sectionCard}>
          {PAYMENT_OPTIONS.map((option) => {
            const selected = paymentMethod === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                testID={
                  option.id === "Credit Card" ? "checkout-payment-credit-card" : undefined
                }
                style={[styles.paymentOption, selected && styles.paymentOptionSelected]}
                onPress={() => setPaymentMethod(option.id)}
              >
                <Text style={[styles.paymentText, selected && styles.paymentTextSelected]}>
                  {option.label}
                </Text>
                <Text style={[styles.paymentHint, selected && styles.paymentHintSelected]}>
                  {option.hint}
                </Text>
              </TouchableOpacity>
            );
          })}
        </LuxurySectionCard>

        <LuxurySectionCard eyebrow="Review" title="Order summary" style={styles.sectionCard}>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <Text style={styles.itemText}>{item.title} (x{item.quantity})</Text>
              <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          <Text style={styles.totalText}>Total: ${grandTotal.toFixed(2)}</Text>
          <Text style={styles.summaryHint}>
            Order placement remains lightweight; final confirmation appears on the next screen.
          </Text>
        </LuxurySectionCard>

        <TouchableOpacity
          testID="checkout-place-order"
          style={[styles.orderButton, isPlacingOrder && styles.orderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder}
        >
          <Text style={styles.orderButtonText}>
            {isPlacingOrder ? "Placing Order..." : "Place Order"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  intro: {
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  form: {
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
  },
  paymentOption: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  paymentOptionSelected: {
    backgroundColor: colors.surfaceInverse,
    borderColor: colors.surfaceInverse,
  },
  paymentText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  paymentTextSelected: {
    color: colors.white,
  },
  paymentHint: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginTop: 4,
  },
  paymentHintSelected: {
    color: "#ddd3c8",
  },
  orderItem: {
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
    marginTop: spacing.sm,
    textAlign: "right",
    color: colors.text,
  },
  summaryHint: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  orderButton: {
    backgroundColor: colors.surfaceInverse,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    ...shadows.soft,
  },
  orderButtonDisabled: {
    opacity: 0.7,
  },
  orderButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  stateMargin: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});

export default CheckoutScreen;
