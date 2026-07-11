import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import StackNavigator from "./src/navigation/StackNavigator";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import store, { persistor } from "./src/redux/store";
import { forceLogoutUser, restoreSession } from "./src/redux/authSlice";
import { setAuthFailureHandler } from "./src/services/apiClient";
import { colors } from "./src/theme/tokens";
import { applyApiTarget } from "./src/config/apiTarget";

applyApiTarget();

const SessionBootstrap = ({ children }) => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutHandle;

    async function bootstrap() {
      if (user && token) {
        // Restore session with 5s timeout - don't block UI rendering if it hangs
        try {
          const restorePromise = dispatch(restoreSession());
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("restore_timeout")), 5000)
          );
          await Promise.race([restorePromise, timeoutPromise]);
        } catch (error) {
          // Silent fail - timeout or error on restore doesn't block app start
          console.log("Session restore failed or timed out, proceeding with app start");
        }
      }
      if (!cancelled) {
        setReady(true);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [dispatch, token, user]);

  useEffect(() => {
    setAuthFailureHandler((error) =>
      dispatch(
        forceLogoutUser(error?.response?.data?.code || "auth_invalid_session")
      )
    );
    return () => {
      setAuthFailureHandler(null);
    };
  }, [dispatch]);

  if (!ready) {
    return (
      <View style={styles.bootstrap}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return children;
};

const App = () => {
  console.log(global.HermesInternal ? "Hermes is enabled" : "Hermes is NOT enabled");

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SessionBootstrap>
          <NavigationContainer>
            <StackNavigator />
          </NavigationContainer>
        </SessionBootstrap>
      </PersistGate>
    </Provider>
  );
};

const styles = StyleSheet.create({
  bootstrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});

export default App;
