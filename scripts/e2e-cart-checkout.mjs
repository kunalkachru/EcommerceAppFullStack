#!/usr/bin/env node
import {
  screenshot, dumpUi, findNodes, tap, tapContentDesc, clearAndType,
  hideKeyboard, sleep, swipe, tapTab,
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

function tapTabByName(name) {
  tapTab(name);
}

async function getToken() {
  return (await api("POST", "/api/users/login", { email: EMAIL, password: PASSWORD })).token;
}

async function main() {
  let token = await getToken();
  console.log("API cart at start:", await api("GET", "/api/cart", null, token));

  tapTabByName("cart");
  sleep(2500);
  screenshot("flow-04-cart");
  let xml = dumpUi();
  const cartTexts = findNodes(xml).map((n) => n.text).filter(Boolean);
  console.log("Cart UI:", cartTexts);

  const plus = findNodes(xml, { text: "+" });
  if (plus.length) {
    tap(plus[0].center.x, plus[0].center.y);
    sleep(2000);
    screenshot("flow-05-cart-plus");
    token = await getToken();
    console.log("After + API:", await api("GET", "/api/cart", null, token));
  }

  xml = dumpUi();
  const minus = findNodes(xml, { text: "-" });
  if (minus.length) {
    tap(minus[0].center.x, minus[0].center.y);
    sleep(2000);
    token = await getToken();
    console.log("After - API:", await api("GET", "/api/cart", null, token));
  }

  swipe(720, 2200, 720, 900, 400);
  sleep(500);
  xml = dumpUi();
  const checkout = findNodes(xml, { text: "Proceed to Checkout" });
  if (checkout.length) {
    tap(checkout[0].center.x, checkout[0].center.y);
    sleep(2500);
    screenshot("flow-06-checkout");
  }

  xml = dumpUi();
  const fields = findNodes(xml, { className: "EditText" });
  const vals = ["E2E Tester", "123 Test St", "Austin", "78701", "5551234567"];
  for (let i = 0; i < vals.length; i++) {
    tap(fields[i].center.x, fields[i].center.y);
    sleep(200);
    clearAndType(vals[i]);
    sleep(200);
  }
  hideKeyboard();

  try {
    tapContentDesc("💳 Credit Card");
  } catch {
    tap(720, 1400);
  }
  sleep(500);
  swipe(720, 2400, 720, 1200, 400);
  sleep(500);
  tapContentDesc("Place Order");
  sleep(2500);
  screenshot("flow-07-order-summary");
  console.log("Order summary UI:", findNodes(dumpUi()).map((n) => n.text).filter(Boolean).slice(0, 20));

  token = await getToken();
  console.log("Cart after order API:", await api("GET", "/api/cart", null, token));

  tapTabByName("profile");
  sleep(2000);
  screenshot("flow-08-profile");
  console.log("Profile UI:", findNodes(dumpUi()).map((n) => n.text).filter(Boolean));
}

main().catch(console.error);
