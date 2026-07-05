import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const DIST_DIR = join(ROOT, "dist", "demo");
export const ANDROID_APK = join(DIST_DIR, "shopease-cloud-demo.apk");
export const IOS_SIM_ZIP = join(DIST_DIR, "shopease-cloud-demo-ios-sim.zip");
export const BUILD_META = join(DIST_DIR, "build-meta.json");

export { ROOT };
