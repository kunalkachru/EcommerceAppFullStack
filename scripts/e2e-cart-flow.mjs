#!/usr/bin/env node
/** Focused cart E2E after login — run after fresh pm clear */
import {
  screenshot, dumpUi, findNodes, tap, tapContentDesc, clearAndType,
  hideKeyboard, sleep, launchApp,
} from "./e2e-adb.mjs";

const EMAIL = "test@example.com";
const PASSWORD = "secret123";
const API = "http://127.0.0.1:5001";

async function api(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return res.json();
}

function tapEditText(i) {
  const nodes = findNodes(dumpUi(), { className: "EditText" });
  tap(nodes[i].center.x, nodes[i].center.y);
}

function tapTab(i) {
  tap(180 + i * 360, 2980);
}

async function login() {
  tapEditText(0);
  sleep(300);
  clearAndType(EMAIL);
  tapEditText(1);
  sleep(300);
  clearAndType(PASSWORD);
  hideKeyboard();
  tapContentDesc("Login");
  sleep(5000);
}

async function main() {
  await api("DELETE", "/api/cart/clear", null, (await api("POST", "/api/users/login", { email: EMAIL, password: PASSWORD })).token);

  launchApp();
  sleep(6000);
  await login();
  screenshot("flow-01-home");

  tapContentDesc("GO TO PRODUCT LIST");
  sleep(2500);
  screenshot("flow-02-product-list");

  // Tap first product in grid
  tap(360, 1100);
  sleep(2500);
  screenshot("flow-03-product-detail");

  tapContentDesc("ADD TO CART");
  sleep(1500);
  const ok = findNodes(dumpUi(), { text: "OK" });
  if (ok.length) tap(ok[0].center.x, ok[0].center.y);
  sleep(2000);

  const token = (await api("POST", "/api/users/login", { email: EMAIL, password: PASSWORD })).token;
  const cart = await api("GET", "/api/cart", null, token);
  console.log("API cart after add:", JSON.stringify(cart));

  tapTab(2);
  sleep(2500);
  screenshot("flow-04-cart");

  const xml = dumpUi();
  console.log("Cart UI texts:", findNodes(xml).map(n => n.text).filter(Boolean).slice(0, 20));

  // qty +
  const plus = findNodes(xml, { text: "+" });
  if (plus.length) {
    tap(plus[0].center.x, plus[0].center.y);
    sleep(2000);
    screenshot("flow-05-cart-plus");
    const cart2 = await api("GET", "/api/cart", null, token);
    console.log("API cart after +:", JSON.stringify(cart2));
  }
}

main().catch(console.error);
