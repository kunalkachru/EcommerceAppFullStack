
import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import cartReducer from "./cartSlice";
import authReducer, { persistedAuthReducer } from "./authSlice"; // Import auth reducer

// 🔹 Persist configuration
const persistConfig = {
  key: "root",
  storage: AsyncStorage,
};

// Persisted cart reducer
const persistedCartReducer = persistReducer(persistConfig, cartReducer);

const store = configureStore({
  reducer: {
    cart: persistedCartReducer,
    auth: persistedAuthReducer, // Add authentication reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Required for Redux Persist
    }),
});

//Persistor
export const persistor = persistStore(store);

export default store;
