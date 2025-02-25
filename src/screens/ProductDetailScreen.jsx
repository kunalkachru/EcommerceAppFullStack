import React, { useState } from "react";
import { Alert, View, Text, Image, Button, FlatList, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { useDispatch } from "react-redux";
import { addToCart } from "../redux/cartSlice";
import Icon from "react-native-vector-icons/FontAwesome"; // Star icons for ratings

const ProductDetailScreen = ({ route }) => {
    const { product } = route.params;
    const dispatch = useDispatch();
    const [expanded, setExpanded] = useState(false); // Toggle description expand/collapse

    const handleAddToCart = () => {
        dispatch(addToCart(product));
        Alert.alert("Item added to cart!");
    };

    // Sample reviews (replace with backend API later)
    const [reviews, setReviews] = useState([
        { id: 1, user: "John Doe", rating: 4, comment: "Great product!" },
        { id: 2, user: "Jane Smith", rating: 5, comment: "Loved it, highly recommend!" },
    ]);

    // New review input
    const [newReview, setNewReview] = useState({ user: "", rating: "", comment: "" });

    // Handle adding a review
    const handleAddReview = () => {
        const ratingNum = parseInt(newReview.rating);
        if (newReview.user && ratingNum >= 1 && ratingNum <= 5 && newReview.comment) {
            setReviews([...reviews, { id: Date.now(), user: newReview.user, rating: ratingNum, comment: newReview.comment }]);
            setNewReview({ user: "", rating: "", comment: "" });
        } else {
            Alert.alert("Please enter a valid name, rating (1-5), and comment.");
        }
    };

    // Function to render star rating
    const renderStars = (rating) => (
        <View style={styles.starsContainer}>
            {[...Array(5)].map((_, index) => (
                <Icon
                    key={index}
                    name={index < rating ? "star" : "star-o"}
                    size={18}
                    color="#FFD700"
                />
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Product Image */}
            <Image source={{ uri: product.image }} style={styles.image} />

            {/* Product Info */}
            <Text style={styles.name}>{product.title}</Text>
            <Text style={styles.price}>${product.price}</Text>

            {/* Product Description (Expandable) */}
            <View style={styles.descriptionContainer}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>
                    {expanded ? product.description : `${product.description.substring(0, 100)}...`}
                </Text>
                <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                    <Text style={styles.readMore}>{expanded ? "Read Less" : "Read More"}</Text>
                </TouchableOpacity>
            </View>

            {/* Add to Cart Button */}
            <Button title="Add to Cart" onPress={handleAddToCart} />

            {/* Reviews Section */}
            <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
            <FlatList
                data={reviews}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.reviewItem}>
                        <Text style={styles.reviewUser}>{item.user}</Text>
                        {renderStars(item.rating)}
                        <Text style={styles.reviewText}>{item.comment}</Text>
                    </View>
                )}
            />

            {/* Add a Review */}
            <Text style={styles.sectionTitle}>Write a Review</Text>
            <TextInput
                style={styles.input}
                placeholder="Your Name"
                value={newReview.user}
                onChangeText={(text) => setNewReview({ ...newReview, user: text })}
            />
            <TextInput
                style={styles.input}
                placeholder="Rating (1-5)"
                keyboardType="numeric"
                value={newReview.rating}
                onChangeText={(text) => setNewReview({ ...newReview, rating: text })}
            />
            <TextInput
                style={styles.input}
                placeholder="Your Review"
                multiline
                value={newReview.comment}
                onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
            />
            <Button title="Submit Review" onPress={handleAddReview} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        padding: 20,
        backgroundColor: "#fff",
    },
    image: {
        width: 220,
        height: 220,
        borderRadius: 10,
    },
    name: {
        fontSize: 22,
        fontWeight: "bold",
        marginTop: 10,
        textAlign: "center",
    },
    price: {
        fontSize: 20,
        color: "#28a745",
        fontWeight: "bold",
        marginTop: 5,
    },
    descriptionContainer: {
        width: "100%",
        marginVertical: 10,
        backgroundColor: "#f9f9f9",
        padding: 10,
        borderRadius: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 15,
        alignSelf: "flex-start",
    },
    description: {
        fontSize: 14,
        color: "#444",
        textAlign: "justify",
    },
    readMore: {
        fontSize: 14,
        color: "#007BFF",
        fontWeight: "bold",
        marginTop: 5,
    },
    reviewItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        width: "100%",
    },
    reviewUser: {
        fontWeight: "bold",
        fontSize: 16,
    },
    reviewText: {
        fontSize: 14,
        marginTop: 5,
        color: "#444",
    },
    starsContainer: {
        flexDirection: "row",
        marginTop: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 10,
        marginTop: 8,
        width: "100%",
        borderRadius: 5,
    },
});

export default ProductDetailScreen;

