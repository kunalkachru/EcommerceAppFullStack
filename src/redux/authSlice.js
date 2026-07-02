import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../services/apiClient";
import { clearCart, clearCartLocal, fetchCart } from "./cartSlice";
import { clearSessionLlmKey } from "../utils/llmSessionStore";

async function bootstrapCart(dispatch, token) {
  try {
    await dispatch(
      fetchCart({ authHeader: `Bearer ${token}` })
    ).unwrap();
  } catch {
    dispatch(clearCartLocal());
  }
}

function isAuthFailure(error) {
  return !!error && (
    (typeof error === "object" && error.kind === "auth") ||
    (typeof error?.code === "string" && error.code.startsWith("auth_"))
  );
}

async function clearPersistedSession(dispatch) {
  dispatch(clearCartLocal());
  await AsyncStorage.removeItem("persist:auth");
  clearSessionLlmKey();
  dispatch(authSlice.actions.logout());
}

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ name, email, password }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post("/api/users/register", {
        name,
        email,
        password,
      });

      const { _id, name: userName, email: userEmail, token } = response.data;
      await bootstrapCart(dispatch, token);

      return {
        user: { _id, name: userName, email: userEmail },
        token,
      };
    } catch (error) {
      console.error("Signup Error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Signup failed");
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post("/api/users/login", {
        email,
        password,
      });

      const { _id, name, email: userEmail, token } = response.data;
      await bootstrapCart(dispatch, token);

      return {
        user: { _id, name, email: userEmail },
        token,
      };
    } catch (error) {
      console.error("Login API Error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  }
);

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
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
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

export const restoreSession = () => async (dispatch, getState) => {
  const { user, token } = getState().auth || {};
  if (!user || !token) {
    return { status: "no-session" };
  }

  try {
    await dispatch(fetchCart()).unwrap();
    return { status: "restored" };
  } catch (error) {
    if (isAuthFailure(error)) {
      await clearPersistedSession(dispatch);
      return {
        status: "logged-out",
        reason: error.code || "auth_invalid_session",
      };
    }

    return {
      status: "degraded",
      reason: error?.code || "session_restore_failed",
    };
  }
};

export const forceLogoutUser = (reason = "auth_invalid_session") => async (dispatch) => {
  await clearPersistedSession(dispatch);
  return { status: "logged-out", reason };
};

export const logoutUser = () => async (dispatch, getState) => {
  const { token } = getState().auth;
  if (token) {
    try {
      await dispatch(clearCart()).unwrap();
    } catch {
      dispatch(clearCartLocal());
    }
  } else {
    dispatch(clearCartLocal());
  }
  await dispatch(forceLogoutUser("user_logout"));
};

const persistConfig = {
  key: "auth",
  storage: AsyncStorage,
  ...(process.env.NODE_ENV === "test" ? { timeout: 0 } : {}),
};
export const persistedAuthReducer = persistReducer(persistConfig, authSlice.reducer);

export default authSlice.reducer;
