import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Fetch Cart from Backend
export const fetchCart = createAsyncThunk(
    "cart/fetchCart",
    async (_, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            if (!auth.token) throw new Error("User not authenticated");

            console.log("Fetching Cart from Server...");
            const response = await axios.get("http://10.0.2.2:5001/api/cart", {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            console.log("Cart Data Received:", response.data);

            return response.data;
        } catch (error) {
            console.error("Fetch Cart Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data?.message || "Failed to fetch cart");
        }
    }
);

// Add Item to Cart
export const addToCart = createAsyncThunk(
    "cart/addToCart",
    async (product, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            if (!auth.token) throw new Error("User not authenticated");

            console.log(`Adding Product to Cart: ${product.id}`);
            const response = await axios.post(
                "http://10.0.2.2:5001/api/cart/",
                {
                    productId: String(product.id),
                    quantity: 1,
                    name: product.title,
                    price: product.price,
                    image: product.image,
                },
                { headers: { Authorization: `Bearer ${auth.token}` } }
            );
            console.log("Product Added Successfully:", response.data);

            return response.data;
        } catch (error) {
            console.error("Add to Cart Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data?.message || "Failed to add item to cart");
        }
    }
);

// Remove Item from Cart
export const removeFromCart = createAsyncThunk(
    "cart/removeFromCart",
    async (productId, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            if (!auth.token) throw new Error("User not authenticated");

            console.log(`Removing Product from Cart: ${productId}`);
            await axios.delete(`http://10.0.2.2:5001/api/cart/remove/${productId}`, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            console.log("Product Removed Successfully:", productId);

            return productId;
        } catch (error) {
            console.error("Remove from Cart Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data?.message || "Failed to remove item from cart");
        }
    }
);

// Clear Cart
export const clearCart = createAsyncThunk(
    "cart/clearCart",
    async (_, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            if (!auth.token) throw new Error("User not authenticated");

            console.log("Clearing Cart...");
            await axios.delete("http://10.0.2.2:5001/api/cart/clear", {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            console.log("Cart Cleared Successfully");

            return [];
        } catch (error) {
            console.error("Clear Cart Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data?.message || "Failed to clear cart");
        }
    }
);

// Cart Slice
const cartSlice = createSlice({
    name: "cart",
    initialState: { cartItems: [], loading: false, error: null },
    reducers: {
        increaseQuantity: (state, action) => {
            const item = state.cartItems.find((item) => item.id === action.payload);
            if (item) {
                item.quantity += 1;
            }
        },
        decreaseQuantity: (state, action) => {
            const item = state.cartItems.find((item) => item.id === action.payload);
            if (item) {
                if (item.quantity > 1) {
                    item.quantity -= 1;
                } else {
                    state.cartItems = state.cartItems.filter((i) => i.id !== action.payload);
                }
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCart.fulfilled, (state, action) => {
                state.cartItems = action.payload.items;
                state.loading = false;
            })
            .addCase(addToCart.fulfilled, (state, action) => {
                state.cartItems = action.payload.items;
            })
            .addCase(removeFromCart.fulfilled, (state, action) => {
                state.cartItems = state.cartItems.filter((item) => item.productId !== action.payload);
            })
            .addCase(clearCart.fulfilled, (state) => {
                state.cartItems = [];
            });
    },
});

export const { increaseQuantity, decreaseQuantity } = cartSlice.actions;
export default cartSlice.reducer;
