import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { getApiBaseUrl } from "../config/api";
import { resolveCategoryModelUrl } from "../config/category3DModels";
import { colors, radius, spacing } from "../theme/tokens";

function buildViewerPageUrl(modelUrl) {
  return `${getApiBaseUrl()}/assets/viewer/product-3d-viewer.html?model=${encodeURIComponent(modelUrl)}`;
}

const Product3DViewer = ({ category }) => {
  const modelUrl = useMemo(() => resolveCategoryModelUrl(category), [category]);
  const [status, setStatus] = useState("loading");
  const [webviewKey, setWebviewKey] = useState(0);

  if (!modelUrl) {
    return null;
  }

  const handleMessage = (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === "loaded") {
        setStatus("loaded");
      } else if (payload.type === "error") {
        setStatus("error");
      }
    } catch (err) {
      setStatus("error");
    }
  };

  const handleRetry = () => {
    setStatus("loading");
    setWebviewKey((key) => key + 1);
  };

  return (
    <View style={styles.container}>
      <Text
        testID="product-3d-status"
        accessibilityValue={{ text: status }}
        style={styles.hiddenStatus}
      >
        {status}
      </Text>

      <WebView
        key={webviewKey}
        testID="product-3d-webview"
        source={{ uri: buildViewerPageUrl(modelUrl) }}
        onMessage={handleMessage}
        style={styles.webview}
      />

      {status === "error" ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>3D view unavailable</Text>
          <TouchableOpacity testID="product-3d-retry" style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 280,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  hiddenStatus: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  errorText: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accentStrong,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
});

export default Product3DViewer;
