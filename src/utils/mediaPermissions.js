import { Platform, PermissionsAndroid, Alert, Linking } from "react-native";

async function requestAndroidPermission(permission, { title, message }) {
  const existing = await PermissionsAndroid.check(permission);
  if (existing) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission, {
    title,
    message,
    buttonPositive: "Allow",
    buttonNegative: "Deny",
  });

  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return true;
  }

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    Alert.alert(
      "Permission required",
      `${message} You can enable it in app Settings.`,
      [
        { text: "Open Settings", onPress: () => Linking.openSettings() },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }

  return false;
}

/** Camera — needed for Take Photo on Android. */
export async function ensureCameraPermission() {
  if (Platform.OS !== "android") {
    return true;
  }
  return requestAndroidPermission(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: "Camera access",
    message: "Allow camera access to photograph products for visual search.",
  });
}

/** Gallery / files — needed for picking existing photos on Android. */
export async function ensureGalleryPermission() {
  if (Platform.OS !== "android") {
    return true;
  }
  const permission =
    Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  return requestAndroidPermission(permission, {
    title: "Photos access",
    message: "Allow access to your photos to search products from your gallery.",
  });
}

/** Microphone — voice shopping search. */
export async function ensureMicrophonePermission() {
  if (Platform.OS !== "android") {
    return true;
  }
  return requestAndroidPermission(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: "Microphone access",
    message: "Allow microphone access to search products by voice.",
  });
}
