import React, { useEffect, useState } from "react";
import {
  Alert,
  View,
  Text,
  Image,
  Button,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../redux/cartSlice";
import Icon from "react-native-vector-icons/FontAwesome";
import SimilarProductsStrip from "../components/SimilarProductsStrip";
import { fetchSimilarProducts } from "../services/visualSearchService";

const ProductDetailScreen = ({ route }) => {
  const { product } = route.params;
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(true);
   const [adding, setAdding] = useState(false);

  const productKey = String(product.id);
  const isCartPendingForProduct = useSelector(
    (state) => !!state.cart?.pendingByProduct?.[productKey]
  );

  const description = product.description || "";
  const descriptionPreview =
    description.length <= 120 ? description : `${description.slice(0, 120)}…`;

  useEffect(() => {
    let cancelled = false;
    setSimilarLoading(true);
    fetchSimilarProducts(product.id, 8)
      .then((result) => {
        if (!cancelled) {
          setSimilar(result.matches ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSimilar([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSimilarLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const handleAddToCart = async () => {
    if (adding || isCartPendingForProduct) {
      return;
    }
    try {
      setAdding(true);
      await dispatch(addToCart(product)).unwrap();
      Alert.alert("Added to cart", "This item is now in your cart.");
    } catch (err) {
      let message = "Failed to add item to cart.";
      if (err && typeof err === "object") {
        if (typeof err.message === "string") {
          message = err.message;
        } else if (typeof err.code === "string" && err.code.startsWith("auth_")) {
          message = "Please log in again to add items to your cart.";
        }
      } else if (typeof err === "string") {
        message = err;
      }
      Alert.alert("Could not add to cart", message);
    } finally {
      setAdding(false);
    }
  };

  const [reviews, setReviews] = useState([
    { id: 1, user: "John Doe", rating: 4, comment: "Great product!" },
    { id: 2, user: "Jane Smith", rating: 5, comment: "Loved it, highly recommend!" },
  ]);
  const [newReview, setNewReview] = useState({ user: "", rating: "", comment: "" });

  const handleAddReview = () => {
    const ratingNum = parseInt(newReview.rating, 10);
    if (newReview.user && ratingNum >= 1 && ratingNum <= 5 && newReview.comment) {
      setReviews([
        ...reviews,
        { id: Date.now(), user: newReview.user, rating: ratingNum, comment: newReview.comment },
      ]);
      setNewReview({ user: "", rating: "", comment: "" });
    } else {
      Alert.alert("Please enter a valid name, rating (1-5), and comment.");
    }
  };

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

  const openSimilar = (item) => {
    navigation.push("ProductDetail", { product: item });
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Image source={{ uri: product.image }} style={styles.image} resizeMode="contain" />

      <Text style={styles.name}>{product.title}</Text>
      <Text style={styles.price}>${product.price}</Text>
      {product.category ? (
        <Text style={styles.category}>{product.category}</Text>
      ) : null}

      <SimilarProductsStrip
        matches={similar}
        loading={similarLoading}
        onPressProduct={openSimilar}
      />

      <View style={styles.descriptionContainer}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {expanded ? description : descriptionPreview}
        </Text>
        {description.length > 120 ? (
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={styles.readMore}>{expanded ? "Read Less" : "Read More"}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Button
        title={adding || isCartPendingForProduct ? "Adding..." : "Add to Cart"}
        onPress={handleAddToCart}
        disabled={adding || isCartPendingForProduct}
      />

      <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
      {reviews.map((item) => (
        <View key={item.id} style={styles.reviewItem}>
          <Text style={styles.reviewUser}>{item.user}</Text>
          {renderStars(item.rating)}
          <Text style={styles.reviewText}>{item.comment}</Text>
        </View>
      ))}

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 40,
  },
  image: {
    width: 220,
    height: 220,
    borderRadius: 10,
    backgroundColor: "#f0f4f8",
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
  category: {
    fontSize: 13,
    color: "#5c6370",
    marginTop: 4,
    textTransform: "capitalize",
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
