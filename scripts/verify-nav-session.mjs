#!/usr/bin/env node
/**
 * Verify navigation fixes + session/cart persistence on Android emulator.
 */
import { execSync } from "node:child_process";
import {
  screenshot,
  dumpUi,
  findNodes,
  tap,
  tapContentDesc,
  tapTab,
  tapText,
  sleep,
  loginIfNeeded,
  tapBrowseProducts,
  ensureAppForeground,
  launchApp,
  swipe,
  DEVICE,
  PACKAGE,
  ADB,
} from "./e2e-adb.mjs";

const EMAIL = "test@example.com";
const PASSWORD = "secret123";
const API = "http://127.0.0.1:5001";

const results = [];
const pass = (id, note) => {
  results.push({ id, status: "PASS", note });
  console.log(`✓ ${id}: ${note}`);
};
const fail = (id, note) => {
  results.push({ id, status: "FAIL", note });
  console.log(`✗ ${id}: ${note}`);
};
const info = (id, note) => {
  results.push({ id, status: "INFO", note });
  console.log(`ℹ ${id}: ${note}`);
};

async function api(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      return res.json();
    } catch (e) {
      lastErr = e;
      sleep(1000);
    }
  }
  throw lastErr;
}

function uiHas(text) {
  return findNodes(dumpUi(), { text }).length > 0;
}

function uiHasCartItems() {
  const xml = dumpUi();
  if (xml.includes("Your cart is empty.")) return false;
  if (xml.includes("Grand Total:")) return true;
  if (/Cart \(\d+ items\)/.test(xml)) return true;
  return findNodes(xml).some((n) => n.text?.includes("Grand Total"));
}

function uiOnLoginScreen() {
  const xml = dumpUi();
  return (
    xml.includes("login-email") ||
    findNodes(xml, { text: "Login" }).length > 0 ||
    findNodes(xml, { text: "Sign in" }).length > 0 ||
    xml.includes("Sign in ↓")
  );
}

function uiHasSearchBar() {
  const xml = dumpUi();
  return (
    findNodes(xml, { text: "Search products..." }).length > 0 ||
    findNodes(xml).some((n) => n.hint?.includes("Search products"))
  );
}

async function main() {
  console.log(`=== Setup on ${DEVICE} ===`);
  try {
    const health = await api("GET", "/health");
    if (!health.ok) throw new Error("API down");
    pass("api", "Server healthy");
  } catch (e) {
    fail("api", e.message);
    process.exit(1);
  }

  let token = (await api("POST", "/api/users/login", { email: EMAIL, password: PASSWORD })).token;
  await api("DELETE", "/api/cart/clear", null, token);

  execSync(`${ADB} shell pm clear ${PACKAGE}`);
  launchApp();
  sleep(8000);

  console.log("\n=== 1. Login ===");
  await loginIfNeeded({ email: EMAIL, password: PASSWORD });
  if (uiHas("What are you shopping for today?")) pass("login", "Reached home");
  else fail("login", "Not on home after login");

  console.log("\n=== 2. Add product + open PDP ===");
  tapBrowseProducts();
  sleep(3500);
  if (uiHasSearchBar()) pass("nav-home-to-list", "Browse all products opens catalog");
  else fail("nav-home-to-list", "Expected product list");

  swipe(720, 1400, 720, 600, 350);
  sleep(800);
  const xml = dumpUi();
  const firstProduct = findNodes(xml).find(
    (n) =>
      n.contentDesc &&
      n.contentDesc.length > 10 &&
      n.clickable &&
      !n.contentDesc.startsWith("Filter") &&
      !n.contentDesc.includes("Search by photo")
  );
  if (!firstProduct) fail("nav-list-to-pdp", "No product card found");
  else {
    tap(firstProduct.center.x, firstProduct.center.y);
    sleep(2500);
    if (uiHas("ADD TO CART") || uiHas("Add to Cart")) pass("nav-list-to-pdp", "Product detail visible");
    else fail("nav-list-to-pdp", "PDP not shown");
  }

  try {
    tapContentDesc("ADD TO CART");
  } catch {
    const add = findNodes(dumpUi(), { text: "Add to Cart" });
    if (add[0]) tap(add[0].center.x, add[0].center.y);
    else throw new Error("Add to Cart not found");
  }
  sleep(1500);
  const ok = findNodes(dumpUi(), { text: "OK" });
  if (ok.length) tap(ok[0].center.x, ok[0].center.y);
  sleep(1000);

  token = (await api("POST", "/api/users/login", { email: EMAIL, password: PASSWORD })).token;
  const cartAfterAdd = await api("GET", "/api/cart", null, token);
  if (cartAfterAdd.items?.length > 0) pass("cart-api-add", `Server cart has ${cartAfterAdd.items.length} item(s)`);
  else fail("cart-api-add", "Server cart empty after add");

  console.log("\n=== 3. Home → Product List (must NOT stay on PDP) ===");
  tapTab("home");
  sleep(2000);
  tapBrowseProducts();
  sleep(3500);
  screenshot("verify-home-to-list-after-pdp");
  if (uiHasSearchBar()) pass("nav-home-reset-stack", "Home returns to product list, not PDP");
  else if (uiHas("ADD TO CART")) fail("nav-home-reset-stack", "Still on PDP");
  else fail("nav-home-reset-stack", "Unexpected screen");

  console.log("\n=== 4. Cart tab shows items ===");
  tapTab("cart");
  sleep(3000);
  screenshot("verify-cart-with-items");
  if (uiHasCartItems()) pass("nav-cart-items", "Cart tab shows line items");
  else fail("nav-cart-items", "Cart state unclear");

  console.log("\n=== 5. Session: kill app + relaunch (auth + cart persist) ===");
  execSync(`${ADB} shell am force-stop ${PACKAGE}`);
  sleep(1000);
  ensureAppForeground();
  sleep(7000);
  screenshot("verify-after-relaunch");

  if (uiHas("Login")) fail("session-auth-persist", "Login screen after relaunch — auth not restored");
  else if (uiHas("What are you shopping for today?")) pass("session-auth-persist", "Still logged in after app kill");

  tapTab("cart");
  sleep(3000);
  token = (await api("POST", "/api/users/login", { email: EMAIL, password: PASSWORD })).token;
  const cartAfterRelaunch = await api("GET", "/api/cart", null, token);
  const cartUiEmpty = uiHas("Your cart is empty.");
  if (!cartUiEmpty && cartAfterRelaunch.items?.length > 0) {
    pass("session-cart-persist", `Cart restored: UI has items, API qty=${cartAfterRelaunch.items[0].quantity}`);
  } else if (cartAfterRelaunch.items?.length > 0 && cartUiEmpty) {
    fail("session-cart-persist", "API has cart but UI empty");
  } else {
    fail("session-cart-persist", `UI empty=${cartUiEmpty}, API items=${cartAfterRelaunch.items?.length ?? 0}`);
  }

  console.log("\n=== 6. Search is NOT persisted (expected) ===");
  tapTab("products");
  sleep(2500);
  tapTab("home");
  sleep(1500);
  tapBrowseProducts();
  sleep(3000);
  info("session-search", "Search/filter state is local React state only — not saved to AsyncStorage or API (by design)");

  console.log("\n=== 7. Logout clears server cart ===");
  tapTab("profile");
  sleep(2000);
  try {
    tapText("Logout");
  } catch {
    tapContentDesc("Logout");
  }
  sleep(6000);
  if (uiOnLoginScreen()) pass("logout-ui", "Back to login");
  else fail("logout-ui", "Not on login");

  token = (await api("POST", "/api/users/login", { email: EMAIL, password: PASSWORD })).token;
  const cartAfterLogout = await api("GET", "/api/cart", null, token);
  if (!cartAfterLogout.items?.length) pass("logout-clears-cart", "Server cart empty after logout");
  else fail("logout-clears-cart", `Server still has ${cartAfterLogout.items.length} items`);

  console.log("\n=== SUMMARY ===");
  const p = results.filter((r) => r.status === "PASS").length;
  const f = results.filter((r) => r.status === "FAIL").length;
  console.log(`PASS: ${p}  FAIL: ${f}`);
  results.forEach((r) => console.log(`  [${r.status}] ${r.id}: ${r.note}`));
  process.exit(f > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
