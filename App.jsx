import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import StackNavigator from "./src/navigation/StackNavigator";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import store, { persistor } from "./src/redux/store";
import { restoreSession } from "./src/redux/authSlice";

const SessionBootstrap = ({ children }) => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (user && token) {
        await dispatch(restoreSession());
      }
      if (!cancelled) {
        setReady(true);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [dispatch, token, user]);

  if (!ready) {
    return (
      <View style={styles.bootstrap}>
        <ActivityIndicator size="large" color="#007BFF" />
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
    backgroundColor: "#f0f4f8",
  },
});

export default App;
