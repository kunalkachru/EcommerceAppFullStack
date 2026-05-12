import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { clearCart, fetchCart } from "./cartSlice";

// Register User
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      console.log("Registering user:", name, email, password);
      const response = await axios.post("http://10.0.2.2:5001/api/users/register", {
        name,
        email,
        password,
      });

      console.log("Signup Response:", response.data);

      return {
        user: {
          _id: response.data._id,
          name: response.data.name,
          email: response.data.email,
        },
        token: response.data.token,
      };
    } catch (error) {
      console.error("Signup Error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Signup failed");
    }
  }
);

// Login User
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { dispatch, rejectWithValue }) => {
    try {
      console.log(`Logging in User: ${email}`);
      const response = await axios.post("http://10.0.2.2:5001/api/users/login", {
        email,
        password,
      });

      console.log("Login Successful:", response.data);

      dispatch(fetchCart());

      return {
        user: {
          _id: response.data._id,
          name: response.data.name,
          email: response.data.email,
        },
        token: response.data.token,
      };
    } catch (error) {
      console.error("Login API Error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  }
);

// Auth Slice
const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, token: null, loading: false, error: null },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Signup cases
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login cases
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Logout User (Clears Cart)
export const logoutUser = () => async (dispatch) => {
  await AsyncStorage.removeItem("persist:auth");
  dispatch(clearCart());
  dispatch(authSlice.actions.logout());
};

// Persist Auth
const persistConfig = {
  key: "auth",
  storage: AsyncStorage,
};
export const persistedAuthReducer = persistReducer(persistConfig, authSlice.reducer);

export default authSlice.reducer;
