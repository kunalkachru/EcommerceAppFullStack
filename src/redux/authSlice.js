// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import { persistReducer } from "redux-persist";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import axios from "axios";
// import { clearCart } from "./cartSlice"; // Import clearCart action

// //Async Thunk for user registration
// export const registerUser = createAsyncThunk(
//   "auth/registerUser",
//   async ({ name, email, password }, { rejectWithValue }) => {
//     try {
//       console.log("Registering user:", name, email, password);
//       const response = await axios.post("http://10.0.2.2:5001/api/users/register", {
//         name,
//         email,
//         password,
//       });

//       console.log("Signup Response:", response.data);

//       return {
//         user: {
//           _id: response.data._id,
//           name: response.data.name,
//           email: response.data.email,
//         },
//         token: response.data.token,
//       };
//     } catch (error) {
//         console.error("Signup Error:", error.response?.data || error.message);
//         return rejectWithValue(error.response?.data?.message || "Signup failed");
//     }
//   }
// );

// // Async Thunk for user login
// export const loginUser = createAsyncThunk(
//   "auth/loginUser",
//   async ({ email, password }, { rejectWithValue }) => {
//     try {
//       console.log("Sending login request to server:", email, password);
//       const response = await axios.post("http://10.0.2.2:5001/api/users/login", {
//         email,
//         password,
//       });

//       console.log("Login Response:", response.data);

//       return {
//         user: {
//           _id: response.data._id,
//           name: response.data.name,
//           email: response.data.email,
//         },
//         token: response.data.token,
//       };
//     } catch (error) {
//       console.error("Login API Error:", error.response?.data || error.message);
//       return rejectWithValue(error.response?.data?.message || "Login failed");
//     }
//   }
// );

// // Initial authentication state
// const initialState = {
//   user: null,
//   token: null,
//   loading: false,
//   error: null,
// };

// // Create authentication slice
// const authSlice = createSlice({
//   name: "auth",
//   initialState,
//   reducers: {
//     logout: (state) => {
//       state.user = null;
//       state.token = null;
//       state.loading = false;
//       state.error = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       // Signup cases
//       .addCase(registerUser.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(registerUser.fulfilled, (state, action) => {
//         console.log('authSlice::registerUser');
//         state.loading = false;
//         state.user = action.payload.user;
//         state.token = action.payload.token;
//       })
//       .addCase(registerUser.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload;
//       })
//       // Login cases
//       .addCase(loginUser.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(loginUser.fulfilled, (state, action) => {
//         state.loading = false;
//         state.user = action.payload.user;
//         state.token = action.payload.token;
//       })
//       .addCase(loginUser.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload;
//       });
//   },
// });

// // Extract logout action
// const { logout } = authSlice.actions;

// // Thunk to handle logout and clear cart
// export const logoutUser = () => async (dispatch) => {
//   console.log('Redux::logoutUser !');
//   await AsyncStorage.removeItem("persist:auth"); // Remove persisted auth state
//   dispatch(clearCart()); // Clear the cart
//   dispatch(logout()); // Dispatch logout action from authSlice
// };

// // Persist authentication state
// const persistConfig = {
//   key: "auth",
//   storage: AsyncStorage,
// };
// export const persistedAuthReducer = persistReducer(persistConfig, authSlice.reducer);

// export default authSlice.reducer;

// ///DO NOT DELETE ABOVE 

// // import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// // import { persistReducer } from "redux-persist";
// // import AsyncStorage from "@react-native-async-storage/async-storage";
// // import axios from "axios";
// // import { clearCart, fetchCart } from "./cartSlice"; // Import cart actions

// // // Async Thunk for Login
// // export const loginUser = createAsyncThunk(
// //   "auth/loginUser",
// //   async ({ email, password }, { dispatch, rejectWithValue }) => {
// //     try {
// //       console.log("Sending login request to server:", email, password);
// //       const response = await axios.post("http://10.0.2.2:5001/api/users/login", {
// //         email,
// //         password,
// //       });

// //       console.log("Login Response:", response.data);

// //       // Fetch the user's cart after login
// //       dispatch(fetchCart());

// //       return {
// //         user: {
// //           _id: response.data._id,
// //           name: response.data.name,
// //           email: response.data.email,
// //         },
// //         token: response.data.token,
// //       };
// //     } catch (error) {
// //       console.error("Login API Error:", error.response?.data || error.message);
// //       return rejectWithValue(error.response?.data?.message || "Login failed");
// //     }
// //   }
// // );

// // // Auth Slice
// // const authSlice = createSlice({
// //   name: "auth",
// //   initialState: { user: null, token: null, loading: false, error: null },
// //   reducers: {
// //     logout: (state) => {
// //       state.user = null;
// //       state.token = null;
// //       state.loading = false;
// //       state.error = null;
// //     },
// //   },
// //   extraReducers: (builder) => {
// //     builder
// //       .addCase(loginUser.fulfilled, (state, action) => {
// //         state.loading = false;
// //         state.user = action.payload.user;
// //         state.token = action.payload.token;
// //       })
// //       .addCase(loginUser.rejected, (state, action) => {
// //         state.loading = false;
// //         state.error = action.payload;
// //       });
// //   },
// // });

// // // Thunk for Logout (Clears Cart)
// // export const logoutUser = () => async (dispatch) => {
// //   console.log("Redux::logoutUser !");
// //   await AsyncStorage.removeItem("persist:auth");
// //   dispatch(clearCart()); // Clears the user's cart on logout
// //   dispatch(authSlice.actions.logout());
// // };

// // // Persist Auth
// // const persistConfig = {
// //   key: "auth",
// //   storage: AsyncStorage,
// // };
// // export const persistedAuthReducer = persistReducer(persistConfig, authSlice.reducer);

// // export default authSlice.reducer;


import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { clearCart, fetchCart } from "./cartSlice";

// Login User
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { dispatch, rejectWithValue }) => {
    try {
      console.log(`🔵 Logging in User: ${email}`);
      const response = await axios.post("http://10.0.2.2:5001/api/users/login", {
        email,
        password,
      });

      console.log("✅ Login Successful:", response.data);

      dispatch(fetchCart()); // Fetch user's cart immediately after login

      return {
        user: {
          _id: response.data._id,
          name: response.data.name,
          email: response.data.email,
        },
        token: response.data.token,
      };
    } catch (error) {
      console.error("❌ Login API Error:", error.response?.data || error.message);
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
      console.log("🔴 Logging out user...");
      state.user = null;
      state.token = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.fulfilled, (state, action) => {
        console.log("🟢 User Data Saved in Redux:", action.payload);
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        console.error("❌ Redux Login Error:", action.payload);
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Logout User (Clears Cart)
export const logoutUser = () => async (dispatch) => {
  console.log("🔴 Logging Out...");
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


