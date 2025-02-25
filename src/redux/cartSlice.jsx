// import { createSlice } from "@reduxjs/toolkit";


// const initialState = {
//   cartItems: [],
// };

// const cartSlice = createSlice({
//   name: "cart",
//   initialState,
//   reducers: {
//     addToCart: (state, action) => {
//         const existingItem = state.cartItems.find(item => item.id === action.payload.id);
//         if (existingItem) {
//             existingItem.quantity += 1; // Increase quantity if item exists
//         } else {
//             state.cartItems.push({ ...action.payload, quantity: 1 }); //Add new item with quantity 1
//         }
//     },
//     increaseQuantity: (state, action) => {
//         const item = state.cartItems.find(item => item.id === action.payload);
//         if (item) {
//             item.quantity += 1;
//         }
//     },
//     decreaseQuantity: (state, action) => {
//         const item = state.cartItems.find(item => item.id === action.payload);
//         if (item) {
//             if (item.quantity > 1) {
//             item.quantity -= 1; // Decrease quantity
//             } else {
//             state.cartItems = state.cartItems.filter(item => item.id !== action.payload); //Remove if quantity < 1
//             }
//         }
//     },
//     removeFromCart: (state, action) => {
//         state.cartItems = state.cartItems.filter(item => item.id !== action.payload);
//     },
//     clearCart: (state) => { 
//         state.cartItems = [];
//     },
//     },
// });

// export const { addToCart, increaseQuantity, decreaseQuantity, removeFromCart,clearCart } = cartSlice.actions;
// export default cartSlice.reducer;



// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axios from "axios";

// // Async Thunk: Fetch Cart from Backend
// export const fetchCart = createAsyncThunk(
//   "cart/fetchCart",
//   async (_, { getState, rejectWithValue }) => {
//     try {
//       const { auth } = getState(); // Get user token from auth state
//       if (!auth.token) throw new Error("User not authenticated");

//       const response = await axios.get("http://10.0.2.2:5001/api/cart", {
//         headers: { Authorization: `Bearer ${auth.token}` },
//       });

//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || "Failed to fetch cart");
//     }
//   }
// );

// // Async Thunk: Add Item to Cart
// export const addToCart = createAsyncThunk(
//   "cart/addToCart",
//   async (product, { getState, rejectWithValue }) => {
//     try {
//       const { auth } = getState();
//       if (!auth.token) throw new Error("User not authenticated");

//       const response = await axios.post(
//         "http://10.0.2.2:5001/api/cart/add",
//         { productId: product.id, quantity: 1 },
//         { headers: { Authorization: `Bearer ${auth.token}` } }
//       );

//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || "Failed to add item to cart");
//     }
//   }
// );

// // Async Thunk: Remove Item from Cart
// export const removeFromCart = createAsyncThunk(
//   "cart/removeFromCart",
//   async (productId, { getState, rejectWithValue }) => {
//     try {
//       const { auth } = getState();
//       if (!auth.token) throw new Error("User not authenticated");

//       await axios.delete(`http://10.0.2.2:5001/api/cart/remove/${productId}`, {
//         headers: { Authorization: `Bearer ${auth.token}` },
//       });

//       return productId;
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || "Failed to remove item from cart");
//     }
//   }
// );

// // Async Thunk: Clear Cart
// export const clearCart = createAsyncThunk(
//   "cart/clearCart",
//   async (_, { getState, rejectWithValue }) => {
//     try {
//       const { auth } = getState();
//       if (!auth.token) throw new Error("User not authenticated");

//       await axios.delete("http://10.0.2.2:5001/api/cart/clear", {
//         headers: { Authorization: `Bearer ${auth.token}` },
//       });

//       return [];
//     } catch (error) {
//       return rejectWithValue(error.response?.data?.message || "Failed to clear cart");
//     }
//   }
// );

// // Cart Slice
// const cartSlice = createSlice({
//   name: "cart",
//   initialState: { cartItems: [], loading: false, error: null },
//   reducers: {}, // No need for local reducers since API handles cart actions
//   extraReducers: (builder) => {
//     builder
//       .addCase(fetchCart.fulfilled, (state, action) => {
//         state.cartItems = action.payload.items;
//         state.loading = false;
//       })
//       .addCase(fetchCart.rejected, (state, action) => {
//         state.error = action.payload;
//         state.loading = false;
//       })
//       .addCase(addToCart.fulfilled, (state, action) => {
//         state.cartItems = action.payload.items;
//       })
//       .addCase(removeFromCart.fulfilled, (state, action) => {
//         state.cartItems = state.cartItems.filter((item) => item.productId !== action.payload);
//       })
//       .addCase(clearCart.fulfilled, (state) => {
//         state.cartItems = [];
//       });
//   },
// });

// export default cartSlice.reducer;


import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Fetch Cart from Backend
export const fetchCart = createAsyncThunk(
    "cart/fetchCart",
    async (_, { getState, rejectWithValue }) => {
        try {
            const { auth } = getState();
            if (!auth.token) throw new Error("User not authenticated");

            console.log("🔵 Fetching Cart from Server...");
            const response = await axios.get("http://10.0.2.2:5001/api/cart", {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            console.log("✅ Cart Data Received:", response.data);

            return response.data;
        } catch (error) {
            console.error("❌ Fetch Cart Error:", error.response?.data || error.message);
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

            //Convert productId to a string
            console.log(`🟡 Adding Product to Cart: ${product.id}`);
            const response = await axios.post(
                "http://10.0.2.2:5001/api/cart/",
                { productId: String(product.id), 
                  quantity: 1, 
                  name:product.title,
                  price:product.price,
                  image:product.image
                },
                { headers: { Authorization: `Bearer ${auth.token}` } }
            );
            console.log("✅ Product Added Successfully:", response.data);

            return response.data;
        } catch (error) {
            console.error("❌ Add to Cart Error:", error.response?.data || error.message);
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

            console.log(`🔴 Removing Product from Cart: ${productId}`);
            await axios.delete(`http://10.0.2.2:5001/api/cart/remove/${productId}`, {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            console.log("✅ Product Removed Successfully:", productId);

            return productId;
        } catch (error) {
            console.error("❌ Remove from Cart Error:", error.response?.data || error.message);
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

            console.log("🟠 Clearing Cart...");
            await axios.delete("http://10.0.2.2:5001/api/cart/clear", {
                headers: { Authorization: `Bearer ${auth.token}` },
            });
            console.log("✅ Cart Cleared Successfully");

            return [];
        } catch (error) {
            console.error("❌ Clear Cart Error:", error.response?.data || error.message);
            return rejectWithValue(error.response?.data?.message || "Failed to clear cart");
        }
    }
);

// Cart Slice
const cartSlice = createSlice({
    name: "cart",
    initialState: { cartItems: [], loading: false, error: null },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCart.fulfilled, (state, action) => {
                console.log("📦 Cart Updated in Redux:", action.payload);
                state.cartItems = action.payload.items;
                state.loading = false;
            })
            .addCase(addToCart.fulfilled, (state, action) => {
                console.log("🛒 Cart Updated After Adding:", action.payload);
                state.cartItems = action.payload.items;
            })
            .addCase(removeFromCart.fulfilled, (state, action) => {
                state.cartItems = state.cartItems.filter((item) => item.productId !== action.payload);
            })
            .addCase(clearCart.fulfilled, (state) => {
                console.log("🧹 Redux Cart Cleared");
                state.cartItems = [];
            });
    },
});

export default cartSlice.reducer;
