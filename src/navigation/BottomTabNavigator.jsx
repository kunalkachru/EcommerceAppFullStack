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
import CreditsScreen from "../screens/CreditsScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import OrderSummaryScreen from "../screens/OrderSummaryScreen";
import OrdersScreen from "../screens/OrdersScreen";
import { colors, radius, shadows, spacing } from "../theme/tokens";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const OrdersStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

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

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="Credits" component={CreditsScreen} />
    </ProfileStack.Navigator>
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

function iconNameForRoute(routeName, focused) {
  if (routeName === "Home") return focused ? "home" : "home-outline";
  if (routeName === "Products") return focused ? "grid" : "grid-outline";
  if (routeName === "Cart") return focused ? "bag" : "bag-outline";
  if (routeName === "Orders") return focused ? "receipt" : "receipt-outline";
  return focused ? "person" : "person-outline";
}

function renderTabBarIcon(routeName) {
  return function TabBarIcon({ color, size, focused }) {
    return (
      <Ionicons
        name={iconNameForRoute(routeName, focused)}
        size={size}
        color={color}
      />
    );
  };
}

const BottomTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: renderTabBarIcon(route.name),
      tabBarShowLabel: false,
      headerShown: false,
      sceneStyle: {
        backgroundColor: colors.background,
      },
      tabBarActiveTintColor: colors.accentStrong,
      tabBarInactiveTintColor: colors.textSoft,
      tabBarHideOnKeyboard: true,
      tabBarStyle: {
        position: "absolute",
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
        height: 72,
        borderRadius: radius.xl,
        paddingTop: 12,
        paddingBottom: 12,
        borderTopWidth: 0,
        backgroundColor: colors.surface,
        ...shadows.floating,
      },
      tabBarItemStyle: {
        borderRadius: radius.md,
      },
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
    <Tab.Screen name="Profile" component={ProfileStackScreen} options={{ tabBarButtonTestID: "tab-profile" }} />
  </Tab.Navigator>
);

export default BottomTabNavigator;
