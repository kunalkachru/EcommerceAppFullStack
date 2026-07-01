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

export function mapCartError(error, defaultMessage) {
  const response = error?.response;
  const data = response?.data || {};
  const status = response?.status;
  const rawCode = data.code;
  const isNetwork = !!error?.request && !response;

  const message =
    (typeof data.message === "string" && data.message) ||
    (typeof error?.message === "string" && error.message) ||
    defaultMessage ||
    "Cart request failed";

  let kind = "generic";
  let code = rawCode || "cart_generic_error";

  if (
    status === 401 ||
    rawCode?.startsWith("auth_") ||
    /token/i.test(message) ||
    /not authenticated/i.test(error?.message || "")
  ) {
    kind = "auth";
    if (!rawCode) {
      code = "auth_required";
    }
  } else if (isNetwork) {
    kind = "network";
    code = "network_error";
  } else if (
    status === 400 ||
    status === 422 ||
    (typeof rawCode === "string" && rawCode.startsWith("cart_invalid"))
  ) {
    kind = "validation";
    if (!rawCode) {
      code = "cart_validation_error";
    }
  }

  return {
    message,
    code,
    kind,
    status: typeof status === "number" ? status : null,
  };
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
      return rejectWithValue(
        mapCartError(error, "Failed to fetch cart")
      );
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
      return rejectWithValue(
        mapCartError(error, "Failed to add item to cart")
      );
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
      return rejectWithValue(
        mapCartError(error, "Failed to update cart")
      );
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
      return rejectWithValue(
        mapCartError(error, "Failed to remove item from cart")
      );
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
      return rejectWithValue(
        mapCartError(error, "Failed to clear cart")
      );
    }
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState: { cartItems: [], loading: false, error: null, pendingByProduct: {} },
  reducers: {
    clearCartLocal: (state) => {
      state.cartItems = [];
      state.error = null;
      state.pendingByProduct = {};
    },
  },
  extraReducers: (builder) => {
    const setPending = (state) => {
      state.loading = true;
      state.error = null;
    };
    const setRejected = (state, action) => {
      state.loading = false;
      if (action.payload && typeof action.payload === "object") {
        state.error = action.payload;
      } else if (typeof action.payload === "string") {
        state.error = {
          message: action.payload,
          code: "cart_generic_error",
          kind: "generic",
          status: null,
        };
      } else {
        state.error = {
          message: action.error?.message || "Cart error",
          code: "cart_generic_error",
          kind: "generic",
          status: null,
        };
      }
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
      // For addToCart we only track per-product pending state so that
      // global `loading` is not toggled and UI that relies on global
      // loading (like the Cart screen controls) is not blocked.
      .addCase(addToCart.pending, (state, action) => {
        state.error = null;
        const pid = action.meta?.arg?.id;
        if (pid != null) {
          state.pendingByProduct[String(pid)] = true;
        }
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        // Update items if payload provided, but do NOT modify global loading.
        if (action.payload && typeof action.payload === "object") {
          state.cartItems = action.payload.items ?? state.cartItems;
        }
        const pid = action.meta?.arg?.id;
        if (pid != null) {
          delete state.pendingByProduct[String(pid)];
        }
        // preserve existing loading state (do not set false here)
      })
      .addCase(addToCart.rejected, (state, action) => {
        // Set error information but do not toggle global loading here.
        if (action.payload && typeof action.payload === "object") {
          state.error = action.payload;
        } else if (typeof action.payload === "string") {
          state.error = {
            message: action.payload,
            code: "cart_generic_error",
            kind: "generic",
            status: null,
          };
        } else {
          state.error = {
            message: action.error?.message || "Cart error",
            code: "cart_generic_error",
            kind: "generic",
            status: null,
          };
        }
        const pid = action.meta?.arg?.id;
        if (pid != null) {
          delete state.pendingByProduct[String(pid)];
        }
      })
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
        state.pendingByProduct = {};
      })
      .addCase(clearCart.rejected, setRejected);
  },
});

export const { clearCartLocal } = cartSlice.actions;
export default cartSlice.reducer;
