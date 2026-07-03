#!/usr/bin/env node
/**
 * Record Android demo videos (<60s) via adb screenrecord + automated UI flow.
 */
import { spawn, execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dumpUi,
  findNodes,
  tap,
  tapContentDesc,
  tapTestId,
  tapTab,
  clearAndType,
  hideKeyboard,
  sleep,
  launchApp,
  swipe,
  loginIfNeeded,
  waitForAnyText,
  DEVICE,
  ADB,
} from "./e2e-adb.mjs";
import { loadClientEnv, resolveDemoLlmKey, CLIENT_ENV_PATH } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs", "demo", "videos");
const RECORD_SEC = 55;
const EMAIL = "test@example.com";
const PASSWORD = "secret123";
const API = "http://127.0.0.1:5001";

function adb(cmd) {
  return execSync(`${ADB} ${cmd}`, { encoding: "utf8" }).trim();
}

async function ensureApi() {
  const res = await fetch(`${API}/health`).catch(() => null);
  if (!res?.ok) throw new Error("API not reachable at :5001 — run npm run server");
}

function ensureDevice() {
  const devices = execSync("adb devices", { encoding: "utf8" });
  if (!devices.includes(DEVICE)) {
    throw new Error(`Device ${DEVICE} not found. Set ADB_DEVICE or start emulator.`);
  }
}

async function apiLogin() {
  const res = await fetch(`${API}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  return data.token;
}

async function clearCart() {
  try {
    const token = await apiLogin();
    if (token) {
      await fetch(`${API}/api/cart/clear`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    /* demo account may not exist yet */
  }
}

function tapSearchField() {
  for (let attempt = 0; attempt < 4; attempt++) {
    const xml = dumpUi();
    const edits = findNodes(xml, { className: "EditText" });
    const search = edits.find(
      (n) =>
        n.hint?.includes("Search products") ||
        n.text?.includes("Search products") ||
        n.text?.includes("below 45")
    );
    const target = search || edits[0];
    if (target) {
      tap(target.center.x, target.center.y);
      return;
    }
    swipe(720, 1200, 720, 600, 300);
    sleep(1200);
  }
  throw new Error("Product search field not found");
}

function enableLlmWithKeyFromEnv() {
  const key = resolveDemoLlmKey(loadClientEnv());
  if (!key) {
    console.warn(`⚠ No LLM key in ${CLIENT_ENV_PATH} — skipping LLM demo steps`);
    return false;
  }

  tapTab("home");
  sleep(2000);
  swipe(720, 1600, 720, 400, 400);
  sleep(800);

  tapTestId("llm-reasoning-switch");
  sleep(1000);

  tapTestId("voice-provider-openrouter");
  sleep(800);

  tapTestId("voice-api-key-input");
  sleep(300);
  clearAndType(key);
  hideKeyboard();

  tapTestId("voice-typed-query-input");
  sleep(300);
  clearAndType("it's a fifty dollars jacket blue please");
  hideKeyboard();

  tapTestId("voice-search-button");
  sleep(5000);
  return true;
}

function pickSeededGalleryPhoto() {
  tapTestId("photo-gallery-button");
  sleep(5000);
  const xml = dumpUi();
  const folder = findNodes(xml).find(
    (n) =>
      n.text?.includes("ShopEaseTest") ||
      n.contentDesc?.includes("ShopEaseTest") ||
      n.text?.includes("Pictures")
  );
  if (folder) {
    tap(folder.center.x, folder.center.y);
    sleep(2500);
  }
  const imageCell = findNodes(dumpUi()).find(
    (n) => n.className?.includes("Image") && n.clickable
  );
  if (imageCell) tap(imageCell.center.x, imageCell.center.y);
  sleep(6000);
  waitForAnyText(["Closest match", "Best matches"], { timeoutMs: 20000 });
}

async function recordVideo(name, flowFn) {
  mkdirSync(OUT_DIR, { recursive: true });
  const remote = `/sdcard/${name}`;
  const local = join(OUT_DIR, name);
  console.log(`\n▶ Recording ${name} (${RECORD_SEC}s max)...`);

  const proc = spawn(
    "adb",
    ["-s", DEVICE, "shell", "screenrecord", "--time-limit", String(RECORD_SEC), remote],
    { stdio: "ignore" }
  );

  sleep(1500);
  await flowFn();
  await new Promise((resolve) => {
    proc.on("close", resolve);
  });

  adb(`pull ${remote} "${local}"`);
  try {
    adb(`shell rm ${remote}`);
  } catch {
    /* ignore */
  }
  console.log(`✓ Saved ${local}`);
}

async function runAppFlowDemo() {
  launchApp();
  sleep(5000);
  await loginIfNeeded({ email: EMAIL, password: PASSWORD });

  tapTab("products");
  sleep(2500);
  const xml = dumpUi();
  const firstProduct = findNodes(xml).find(
    (n) => n.text && n.text.length > 20 && !n.text.includes("catalog") && !n.text.includes("Search")
  );
  if (firstProduct) tap(firstProduct.center.x, firstProduct.center.y);
  sleep(2500);

  try {
    tapContentDesc("ADD TO CART");
  } catch {
    const add = findNodes(dumpUi(), { text: "Add to Cart" });
    if (add[0]) tap(add[0].center.x, add[0].center.y);
  }
  sleep(1500);
  const ok = findNodes(dumpUi(), { text: "OK" });
  if (ok.length) tap(ok[0].center.x, ok[0].center.y);
  sleep(1500);

  tapTab("cart");
  sleep(2500);
  swipe(720, 2200, 720, 900, 400);
  sleep(500);

  const checkout = findNodes(dumpUi(), { text: "Proceed to Checkout" });
  if (checkout[0]) tap(checkout[0].center.x, checkout[0].center.y);
  sleep(2500);

  const fields = findNodes(dumpUi(), { className: "EditText" });
  const vals = ["Demo User", "1 Demo St", "Austin", "78701", "5551234567"];
  for (let i = 0; i < Math.min(vals.length, fields.length); i++) {
    tap(fields[i].center.x, fields[i].center.y);
    sleep(200);
    clearAndType(vals[i]);
    sleep(200);
  }
  hideKeyboard();
  swipe(720, 2400, 720, 1200, 400);
  sleep(400);
  try {
    tapContentDesc("Place Order");
  } catch {
    const place = findNodes(dumpUi(), { text: "Place Order" });
    if (place[0]) tap(place[0].center.x, place[0].center.y);
  }
  sleep(3000);

  tapTab("orders");
  sleep(4000);
}

async function runMlFeaturesDemo() {
  launchApp();
  sleep(5000);
  await loginIfNeeded({ email: EMAIL, password: PASSWORD });

  tapTab("products");
  sleep(4000);
  tapSearchField();
  sleep(400);
  clearAndType("wireless headphones below 100");
  hideKeyboard();
  sleep(4000);

  enableLlmWithKeyFromEnv();

  swipe(720, 1400, 720, 500, 350);
  sleep(800);
  pickSeededGalleryPhoto();

  swipe(720, 1600, 720, 500, 350);
  sleep(1500);

  tapTab("products");
  sleep(2000);
  tapSearchField();
  sleep(300);
  clearAndType("under 240 gaming monitor");
  hideKeyboard();
  sleep(5000);
}

async function main() {
  ensureDevice();
  await ensureApi();
  await clearCart();

  const only = process.env.RECORD_ONLY || "";
  if (!only || only === "app-flow") {
    await recordVideo("app-flow-demo.mp4", runAppFlowDemo);
  }
  if (!only || only === "ml-features") {
    await recordVideo("ml-features-demo.mp4", runMlFeaturesDemo);
  }

  console.log("\nDone — docs/demo/videos/ (app-flow-demo.mp4, ml-features-demo.mp4)");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
