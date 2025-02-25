//get all categories from product json

// let allcategories = ['All'] 
// products.filter((item) => {
//     allcategories.push(item.category)
// })
// const categories = [...new Set(allcategories)];

import React, { useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import RNPickerSelect from "react-native-picker-select";
import Slider from "@react-native-community/slider";
import products from '../data/products';
import BottomTabNavigator from '../navigation/BottomTabNavigator'

const categoriesSet = new Set(['All']); 
products.forEach((item) => {
    categoriesSet.add(item.category)
})
const categories = [...categoriesSet]


const sortOptions = ["Default", "Price: Low to High", "Price: High to Low"];

const ProductListScreen = ({ navigation }) => {
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [sortOption, setSortOption] = useState("Default");
    const [priceRange, setPriceRange] = useState([0, 500]);
    const [searchQuery, setSearchQuery] = useState("");

    // Apply filtering based on category, search, and price
    let filteredProducts = products.filter(
        (product) =>
            product.price >= priceRange[0] &&
            product.price <= priceRange[1] &&
            product.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedCategory !== "All") {
        filteredProducts = filteredProducts.filter((product) => product.category === selectedCategory);
    }

    // Apply sorting
    if (sortOption === "Price: Low to High") {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (sortOption === "Price: High to Low") {
        filteredProducts.sort((a, b) => b.price - a.price);
    }

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.productContainer}
            onPress={() => navigation.navigate("ProductDetail", { product: item })}
        >
            <Image source={{ uri: item.image }} style={styles.productImage} />
            <Text style={styles.productName}>{item.title}</Text>
            <Text style={styles.productPrice}>${item.price}</Text>
        </TouchableOpacity>
    );

    return (
        <>
            <View style={styles.container}>

                {/* Category Filters */}
                <View style={styles.categoryContainer}>
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category}
                            style={[styles.categoryButton, selectedCategory === category && styles.selectedCategory]}
                            onPress={() => setSelectedCategory(category)}
                        >
                            <Text style={[styles.categoryText, selectedCategory === category && styles.selectedCategoryText]}>
                                {category}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchBar}
                        placeholder="Search products..."
                        value={searchQuery}
                        onChangeText={(text) => setSearchQuery(text)}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                            <Text style={styles.clearButtonText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                

                {/* Sorting Dropdown */}
                <View style={styles.filterContainer}>
                    <RNPickerSelect
                        onValueChange={(value) => setSortOption(value)}
                        items={sortOptions.map((option) => ({ label: option, value: option }))}
                        style={pickerStyles}
                        placeholder={{ label: "Sort by...", value: "Default" }}
                    />
                </View>

                {/* Price Slider */}
                <View style={styles.priceFilterContainer}>
                    <Text>Price: ${priceRange[0]} - ${priceRange[1]}</Text>
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

                {/* Product List */}
                <FlatList
                    data={filteredProducts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                />
            </View>
            {/* <BottomTabNavigator/> */}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: "#f8f8f8",
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
        justifyContent: "center",
        marginBottom: 10,
    },
    categoryButton: {
        marginHorizontal: 5,
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
    },
    productName: {
        fontSize: 14,
        fontWeight: "bold",
        marginTop: 5,
    },
    productPrice: {
        fontSize: 12,
        color: "#555",
        marginTop: 2,
    },
});

const pickerStyles = {
    inputIOS: { fontSize: 16, padding: 10, borderWidth: 1, borderColor: "#ddd", borderRadius: 5 },
    inputAndroid: { fontSize: 16, padding: 10, borderWidth: 1, borderColor: "#ddd", borderRadius: 5 },
};

export default ProductListScreen;

