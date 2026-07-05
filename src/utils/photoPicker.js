import {
  launchCamera,
  launchImageLibrary,
} from "react-native-image-picker";
import { Alert, Platform } from "react-native";
import {
  ensureCameraPermission,
  ensureGalleryPermission,
} from "./mediaPermissions";

export const pickerOptions = {
  mediaType: "photo",
  quality: 0.85,
  maxWidth: 1280,
  maxHeight: 1280,
  includeBase64: true,
  selectionLimit: 1,
};

export const cameraOptions = {
  ...pickerOptions,
  saveToPhotos: false,
  cameraType: "back",
};

/** Android 13+ photo picker often returns uri without inline base64. */
async function readBase64FromUri(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.status !== 200 && xhr.status !== 0) {
        reject(new Error(`HTTP ${xhr.status}`));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== "string" || !dataUrl.includes(",")) {
          reject(new Error("Could not encode image"));
          return;
        }
        resolve(dataUrl.split(",")[1]);
      };
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = () => reject(new Error("xhr failed"));
    xhr.responseType = "blob";
    xhr.open("GET", uri);
    xhr.send();
  });
}

async function normalizeAsset(asset) {
  if (!asset?.uri) return null;
  if (asset.base64) return asset;
  try {
    const base64 = await readBase64FromUri(asset.uri);
    return { ...asset, base64 };
  } catch (err) {
    console.warn("photoPicker: base64 read failed", err?.message ?? err);
    if (Platform.OS === "android") {
      Alert.alert("Photo error", "Could not read image data. Try another photo.");
    }
    return null;
  }
}

/**
 * Open camera or gallery and return the first asset (uri + base64).
 */
export async function pickPhotoAsset(source) {
  const permitted =
    source === "camera"
      ? await ensureCameraPermission()
      : await ensureGalleryPermission();
  if (!permitted) {
    return null;
  }

  const launcher = source === "camera" ? launchCamera : launchImageLibrary;
  const options = source === "camera" ? cameraOptions : pickerOptions;

  return new Promise((resolve) => {
    launcher(options, async (response) => {
      if (response.didCancel) {
        resolve(null);
        return;
      }
      if (response.errorCode) {
        const hint =
          response.errorCode === "camera_unavailable"
            ? "Emulator camera not configured. Use Gallery → Pictures → ShopEaseTest."
            : (response.errorMessage ?? response.errorCode);
        Alert.alert("Photo error", hint);
        resolve(null);
        return;
      }
      const asset = response.assets?.[0];
      resolve(await normalizeAsset(asset));
    });
  });
}
