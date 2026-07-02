import React from "react";
import { CommonActions } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import HomeScreen from "../screens/HomeScreen";
import ProductListScreen from "../screens/ProductListScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import CartScreen from "../screens/CartScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import OrderSummaryScreen from "../screens/OrderSummaryScreen";
import OrdersScreen from "../screens/OrdersScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const OrdersStack = createNativeStackNavigator();

function ProductStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProductList" component={ProductListScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderSummary" component={OrderSummaryScreen} />
    </Stack.Navigator>
  );
}

function OrdersStackScreen() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="OrdersList" component={OrdersScreen} />
      <OrdersStack.Screen name="OrderSummary" component={OrderSummaryScreen} />
    </OrdersStack.Navigator>
  );
}

function productsTabListener({ navigation }) {
  return {
    tabPress: (e) => {
      const state = navigation.getState();
      const productsRoute = state.routes.find((r) => r.name === "Products");
      const stackIndex = productsRoute?.state?.index ?? 0;
      if (stackIndex > 0) {
        e.preventDefault();
        navigation.dispatch(
          CommonActions.navigate({
            name: "Products",
            params: { screen: "ProductList" },
          })
        );
      }
    },
  };
}

const BottomTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === "Home") iconName = "home";
        else if (route.name === "Products") iconName = "list";
        else if (route.name === "Cart") iconName = "cart";
        else if (route.name === "Orders") iconName = "receipt-outline";
        else if (route.name === "Profile") iconName = "person";
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarShowLabel: false,
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarButtonTestID: "tab-home" }} />
    <Tab.Screen
      name="Products"
      component={ProductStack}
      listeners={productsTabListener}
      options={{ tabBarButtonTestID: "tab-products" }}
    />
    <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarButtonTestID: "tab-cart" }} />
    <Tab.Screen name="Orders" component={OrdersStackScreen} options={{ tabBarButtonTestID: "tab-orders" }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarButtonTestID: "tab-profile" }} />
  </Tab.Navigator>
);

export default BottomTabNavigator;
