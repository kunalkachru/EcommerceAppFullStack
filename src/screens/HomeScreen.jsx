import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { navigateToProductList } from "../navigation/productNavigation";

const HomeScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the E-Commerce App</Text>
      <Button
        title="Go to Product List"
        onPress={() => navigateToProductList(navigation)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 29,
    fontWeight: "bold",
    marginBottom: 20,
  },
});

export default HomeScreen;
