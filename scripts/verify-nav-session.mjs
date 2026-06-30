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
  clearAndType,
  hideKeyboard,
  sleep,
  launchApp,
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
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function tapTab(i) {
  tap(180 + i * 360, 2980);
}

function tapEditText(i) {
  const nodes = findNodes(dumpUi(), { className: "EditText" });
  tap(nodes[i].center.x, nodes[i].center.y);
}

function uiHas(text) {
  return findNodes(dumpUi(), { text }).length > 0;
}

function uiHasSearchBar() {
  return findNodes(dumpUi(), { text: "Search products..." }).length > 0;
}

async function login() {
  for (let i = 0; i < 8; i++) {
    const xml = dumpUi();
    if (findNodes(xml, { contentDesc: "Login", clickable: true }).length) break;
    sleep(2000);
  }
  tapEditText(0);
  sleep(300);
  clearAndType(EMAIL);
  tapEditText(1);
  sleep(300);
  clearAndType(PASSWORD);
  hideKeyboard();
  sleep(500);
  try {
    tapContentDesc("Login");
  } catch {
    tap(720, 1806);
  }
  sleep(5000);
}

async function main() {
  console.log("=== Setup ===");
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

  execSync("adb -s emulator-5554 shell pm clear com.ecommerceappfullstack");
  launchApp();
  sleep(15000);

  console.log("\n=== 1. Login ===");
  await login();
  if (uiHas("Welcome to the E-Commerce App")) pass("login", "Reached home");
  else fail("login", "Not on home after login");

  console.log("\n=== 2. Add product + open PDP ===");
  tapContentDesc("GO TO PRODUCT LIST");
  sleep(3500);
  if (uiHasSearchBar()) pass("nav-home-to-list", "Go to Product List opens catalog");
  else fail("nav-home-to-list", `Expected product list, got: ${findNodes(dumpUi()).map((n) => n.text).filter(Boolean).slice(0, 8)}`);

  tap(360, 1200);
  sleep(2500);
  if (uiHas("ADD TO CART") || uiHas("Add to Cart")) pass("nav-list-to-pdp", "Product detail visible");
  else fail("nav-list-to-pdp", "PDP not shown");

  tapContentDesc("ADD TO CART");
  sleep(1500);
  const ok = findNodes(dumpUi(), { text: "OK" });
  if (ok.length) tap(ok[0].center.x, ok[0].center.y);
  sleep(1000);

  token = (await api("POST", "/api/users/login", { email: EMAIL, password: PASSWORD })).token;
  const cartAfterAdd = await api("GET", "/api/cart", null, token);
  if (cartAfterAdd.items?.length > 0) pass("cart-api-add", `Server cart has ${cartAfterAdd.items.length} item(s)`);
  else fail("cart-api-add", "Server cart empty after add");

  console.log("\n=== 3. Home → Product List (must NOT stay on PDP) ===");
  tapTab(0);
  sleep(2000);
  tapContentDesc("GO TO PRODUCT LIST");
  sleep(3500);
  screenshot("verify-home-to-list-after-pdp");
  if (uiHasSearchBar()) pass("nav-home-reset-stack", "Home button returns to product list, not PDP");
  else if (uiHas("ADD TO CART")) fail("nav-home-reset-stack", "Still on PDP (reviews/add to cart screen)");
  else fail("nav-home-reset-stack", "Unexpected screen");

  console.log("\n=== 4. Cart tab shows items ===");
  tapTab(2);
  sleep(3000);
  screenshot("verify-cart-with-items");
  if (uiHas("Your cart is empty.")) fail("nav-cart-items", "Cart empty after add");
  else if (uiHas("Cart (") && !uiHas("Cart (0 items)")) pass("nav-cart-items", "Cart tab shows line items");
  else fail("nav-cart-items", "Cart state unclear");

  console.log("\n=== 5. Session: kill app + relaunch (auth + cart persist) ===");
  execSync("adb -s emulator-5554 shell am force-stop com.ecommerceappfullstack");
  sleep(1000);
  launchApp();
  sleep(7000);
  screenshot("verify-after-relaunch");

  if (uiHas("Login")) fail("session-auth-persist", "Login screen after relaunch — auth not restored");
  else if (uiHas("Welcome to the E-Commerce App")) pass("session-auth-persist", "Still logged in after app kill");

  tapTab(2);
  sleep(3000);
  token = (await api("POST", "/api/users/login", { email: EMAIL, password: PASSWORD })).token;
  const cartAfterRelaunch = await api("GET", "/api/cart", null, token);
  const cartUiEmpty = uiHas("Your cart is empty.");
  if (!cartUiEmpty && cartAfterRelaunch.items?.length > 0) {
    pass("session-cart-persist", `Cart restored: UI has items, API qty=${cartAfterRelaunch.items[0].quantity}`);
  } else if (cartAfterRelaunch.items?.length > 0 && cartUiEmpty) {
    fail("session-cart-persist", "API has cart but UI empty (fetchCart on focus issue?)");
  } else {
    fail("session-cart-persist", `UI empty=${cartUiEmpty}, API items=${cartAfterRelaunch.items?.length ?? 0}`);
  }

  console.log("\n=== 6. Search is NOT persisted (expected) ===");
  tapTab(1);
  sleep(2500);
  tapTab(0);
  sleep(1500);
  tapContentDesc("GO TO PRODUCT LIST");
  sleep(3000);
  info("session-search", "Search/filter state is local React state only — not saved to AsyncStorage or API (by design)");

  console.log("\n=== 7. Logout clears server cart ===");
  tapTab(3);
  sleep(2000);
  tapContentDesc("Logout");
  sleep(4000);
  if (uiHas("Login")) pass("logout-ui", "Back to login");
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
