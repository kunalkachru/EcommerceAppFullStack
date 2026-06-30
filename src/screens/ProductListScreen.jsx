//get all categories from product json

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";
import Slider from "@react-native-community/slider";
import { useCatalogProducts } from "../redux/api/catalogApi";

const sortOptions = ["Default", "Price: Low to High", "Price: High to Low"];

const ProductListScreen = ({ navigation }) => {
  const { products, isLoading, error, isOfflineFallback, refetch } =
    useCatalogProducts();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("Default");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    const set = new Set(["All"]);
    products.forEach((item) => set.add(item.category));
    return [...set];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products.filter(
      (product) =>
        product.price >= priceRange[0] &&
        product.price <= priceRange[1] &&
        product.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedCategory !== "All") {
      list = list.filter((product) => product.category === selectedCategory);
    }

    if (sortOption === "Price: Low to High") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortOption === "Price: High to Low") {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, selectedCategory, sortOption, priceRange, searchQuery]);

  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.productContainer}
        onPress={() => navigation.navigate("ProductDetail", { product: item })}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.productImage}
          resizeMode="contain"
        />
        <Text style={styles.productName} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.productPrice}>${item.price}</Text>
      </TouchableOpacity>
    ),
    [navigation]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.statusText}>Loading catalog…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOfflineFallback ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Showing saved catalog (could not reach store API).
          </Text>
          <TouchableOpacity onPress={refetch}>
            <Text style={styles.bannerLink}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {error && !isOfflineFallback ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Could not load products.</Text>
          <TouchableOpacity onPress={refetch}>
            <Text style={styles.bannerLink}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.categoryContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.selectedCategory,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.selectedCategoryText,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterContainer}>
        <RNPickerSelect
          onValueChange={(value) => setSortOption(value)}
          items={sortOptions.map((option) => ({ label: option, value: option }))}
          style={pickerStyles}
          placeholder={{ label: "Sort by...", value: "Default" }}
        />
      </View>

      <View style={styles.priceFilterContainer}>
        <Text>
          Price: ${priceRange[0]} - ${priceRange[1]}
        </Text>
        <Slider
          style={{ width: 200, height: 40 }}
          minimumValue={0}
          maximumValue={500}
          step={10}
          value={priceRange[1]}
          onValueChange={(value) => setPriceRange([0, value])}
          minimumTrackTintColor="#007bff"
          maximumTrackTintColor="#ddd"
        />
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.row}
        initialNumToRender={10}
        windowSize={5}
        ListEmptyComponent={
          <Text style={styles.statusText}>No products match your filters.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f8f8f8",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  statusText: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
  banner: {
    backgroundColor: "#fff3cd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerText: {
    flex: 1,
    color: "#856404",
    fontSize: 13,
  },
  bannerLink: {
    color: "#007BFF",
    fontWeight: "bold",
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  searchBar: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
    borderRadius: 20,
    backgroundColor: "#ccc",
    marginLeft: 10,
  },
  clearButtonText: {
    fontSize: 18,
    color: "#fff",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 10,
  },
  categoryButton: {
    marginHorizontal: 5,
    marginBottom: 5,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#ddd",
  },
  selectedCategory: {
    backgroundColor: "#007bff",
  },
  categoryText: {
    fontSize: 14,
    color: "#000",
  },
  selectedCategoryText: {
    color: "#fff",
  },
  filterContainer: {
    marginBottom: 10,
  },
  priceFilterContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  row: {
    justifyContent: "space-between",
  },
  productContainer: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    width: "48%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
  },
  productName: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
    textAlign: "center",
  },
  productPrice: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },
});

const pickerStyles = {
  inputIOS: {
    fontSize: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
  },
  inputAndroid: {
    fontSize: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
  },
};

export default ProductListScreen;
