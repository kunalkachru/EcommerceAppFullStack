#!/usr/bin/env node
/** Focused cart E2E after login — run after fresh pm clear */
import {
  screenshot,
  dumpUi,
  findNodes,
  tap,
  tapContentDesc,
  tapTestId,
  tapTab,
  sleep,
  launchApp,
  loginIfNeeded,
} from "./e2e-adb.mjs";

const EMAIL = "test@example.com";
const PASSWORD = "secret123";
const API = "http://127.0.0.1:5001";

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

async function main() {
  await api(
    "DELETE",
    "/api/cart/clear",
    null,
    (await api("POST", "/api/users/login", { email: EMAIL, password: PASSWORD })).token
  );

  launchApp();
  sleep(6000);
  await loginIfNeeded({ email: EMAIL, password: PASSWORD });
  screenshot("flow-01-home");

  tapTestId("browse-all-products");
  sleep(2500);
  screenshot("flow-02-product-list");

  const xml = dumpUi();
  const firstProduct = findNodes(xml).find(
    (n) => n.text && n.text.length > 20 && !n.text.includes("catalog") && !n.text.includes("Search")
  );
  if (firstProduct) tap(firstProduct.center.x, firstProduct.center.y);
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

  tapTab("cart");
  sleep(2500);
  screenshot("flow-04-cart");

  const cartXml = dumpUi();
  console.log(
    "Cart UI texts:",
    findNodes(cartXml)
      .map((n) => n.text)
      .filter(Boolean)
      .slice(0, 20)
  );

  const plus = findNodes(cartXml, { text: "+" });
  if (plus.length) {
    tap(plus[0].center.x, plus[0].center.y);
    sleep(2000);
    screenshot("flow-05-cart-plus");
    const cart2 = await api("GET", "/api/cart", null, token);
    console.log("API cart after +:", JSON.stringify(cart2));
  }
}

main().catch(console.error);
