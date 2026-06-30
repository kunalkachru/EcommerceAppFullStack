import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import cartReducer from "./cartSlice";
import { persistedAuthReducer } from "./authSlice";
import { catalogApi } from "./api/catalogApi";
import { setAuthTokenGetter } from "../services/apiClient";

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
};

const persistedCartReducer = persistReducer(persistConfig, cartReducer);

const store = configureStore({
  reducer: {
    cart: persistedCartReducer,
    auth: persistedAuthReducer,
    [catalogApi.reducerPath]: catalogApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(catalogApi.middleware),
});

setAuthTokenGetter(() => store.getState().auth?.token ?? null);

export const persistor = persistStore(store);

export default store;
