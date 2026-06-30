import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../services/apiClient";

function authHeaders(getState, options = {}) {
  if (options.authHeader) {
    return { Authorization: options.authHeader };
  }
  const { auth } = getState();
  if (!auth?.token) {
    throw new Error("User not authenticated");
  }
  return { Authorization: `Bearer ${auth.token}` };
}

export const fetchCart = createAsyncThunk(
  "cart/fetchCart",
  async (options = {}, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.get("/api/cart", {
        headers: authHeaders(getState, options),
      });
      return response.data;
    } catch (error) {
      console.error("Fetch Cart Error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Failed to fetch cart");
    }
  }
);

export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async (product, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.post(
        "/api/cart/",
        {
          productId: String(product.id),
          quantity: 1,
          name: product.title,
          price: product.price,
          image: product.image,
        },
        { headers: authHeaders(getState) }
      );
      return response.data;
    } catch (error) {
      console.error("Add to Cart Error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Failed to add item to cart");
    }
  }
);

export const adjustCartItemDelta = createAsyncThunk(
  "cart/adjustCartItemDelta",
  async ({ productId, delta }, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.patch(
        `/api/cart/item/${productId}`,
        { delta },
        { headers: authHeaders(getState) }
      );
      return response.data;
    } catch (error) {
      console.error("Adjust Cart Error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Failed to update cart");
    }
  }
);

export const removeFromCart = createAsyncThunk(
  "cart/removeFromCart",
  async (productId, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/api/cart/remove/${productId}`, {
        headers: authHeaders(getState),
      });
      return response.data;
    } catch (error) {
      console.error("Remove from Cart Error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Failed to remove item from cart");
    }
  }
);

export const clearCart = createAsyncThunk(
  "cart/clearCart",
  async (_, { getState, rejectWithValue }) => {
    try {
      const response = await apiClient.delete("/api/cart/clear", {
        headers: authHeaders(getState),
      });
      return response.data;
    } catch (error) {
      console.error("Clear Cart Error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Failed to clear cart");
    }
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState: { cartItems: [], loading: false, error: null },
  reducers: {
    clearCartLocal: (state) => {
      state.cartItems = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const setPending = (state) => {
      state.loading = true;
      state.error = null;
    };
    const setRejected = (state, action) => {
      state.loading = false;
      state.error = action.payload;
    };
    const setItems = (state, action) => {
      state.cartItems = action.payload.items ?? [];
      state.loading = false;
      state.error = null;
    };

    builder
      .addCase(fetchCart.pending, setPending)
      .addCase(fetchCart.fulfilled, setItems)
      .addCase(fetchCart.rejected, setRejected)
      .addCase(addToCart.pending, setPending)
      .addCase(addToCart.fulfilled, setItems)
      .addCase(addToCart.rejected, setRejected)
      .addCase(adjustCartItemDelta.pending, setPending)
      .addCase(adjustCartItemDelta.fulfilled, setItems)
      .addCase(adjustCartItemDelta.rejected, setRejected)
      .addCase(removeFromCart.pending, setPending)
      .addCase(removeFromCart.fulfilled, setItems)
      .addCase(removeFromCart.rejected, setRejected)
      .addCase(clearCart.pending, setPending)
      .addCase(clearCart.fulfilled, (state) => {
        state.cartItems = [];
        state.loading = false;
        state.error = null;
      })
      .addCase(clearCart.rejected, setRejected);
  },
});

export const { clearCartLocal } = cartSlice.actions;
export default cartSlice.reducer;
