import {
  launchCamera,
  launchImageLibrary,
} from "react-native-image-picker";
import { Alert } from "react-native";
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
    launcher(options, (response) => {
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
      if (asset?.uri && asset?.base64) {
        resolve(asset);
        return;
      }
      if (asset?.uri) {
        Alert.alert("Photo error", "Could not read image data. Try another photo.");
      }
      resolve(null);
    });
  });
}
