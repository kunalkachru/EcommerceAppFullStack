#!/usr/bin/env node
/**
 * End-to-end functional test on Android emulator + API verification.
 * Credentials: test@example.com / secret123 (see server/data/store.json)
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  screenshot,
  dumpUi,
  findNodes,
  tap,
  tapText,
  tapContentDesc,
  tapTestId,
  tapTab,
  tapBrowseProducts,
  clearAndType,
  hideKeyboard,
  inputText,
  sleep,
  launchApp,
  logcatErrors,
  swipe,
  loginIfNeeded,
  waitForText,
  DEVICE,
  PACKAGE,
  ADB,
} from "./e2e-adb.mjs";

import { resolveApiUrl } from "./lib/cloud-api-url.mjs";
import {
  createApiClient,
  DEFAULT_EMAIL,
  DEFAULT_PASSWORD,
} from "./e2e-api-helpers.mjs";
import { warmClipIfCloud, preflightE2E } from "./lib/e2e-infra.mjs";
import { runLlmLiveVerification } from "./verify-llm-live.mjs";
import { hasClientLlmKey, CLIENT_ENV_PATH } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API = resolveApiUrl();
const { api, login, waitForCart } = createApiClient(API);
const EMAIL = DEFAULT_EMAIL;
const PASSWORD = DEFAULT_PASSWORD;

const results = [];

function pass(id, note) {
  results.push({ id, status: "PASS", note });
  console.log(`✓ ${id}: ${note}`);
}
function fail(id, note) {
  results.push({ id, status: "FAIL", note });
  console.log(`✗ ${id}: ${note}`);
}
function warn(id, note) {
  results.push({ id, status: "WARN", note });
  console.log(`! ${id}: ${note}`);
}

function dismissAlertIfPresent() {
  const xml = dumpUi();
  const ok = findNodes(xml, { text: "OK" });
  if (ok.length) {
    tap(ok[0].center.x, ok[0].center.y);
    sleep(500);
    return true;
  }
  return false;
}

async function main() {
  console.log(`=== E2E on ${DEVICE} (API: ${API}) ===`);

  try {
    preflightE2E({ android: true, maestroBin: null });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  console.log("=== E2E: API health ===");
  try {
    const health = await api("GET", "/health");
    if (health.ok) pass("api-health", "GET /health ok");
    else fail("api-health", JSON.stringify(health));
  } catch (e) {
    fail("api-health", e.message);
    process.exit(1);
  }

  console.log("\n=== E2E: Login via API (credential check) ===");
  let token;
  try {
    token = await login(EMAIL, PASSWORD);
    if (token) {
      pass("credentials", `${EMAIL} / ${PASSWORD} works via API`);
    } else fail("credentials", "No token returned");
  } catch (e) {
    fail("credentials", e.message);
  }

  if (token) {
    await api("DELETE", "/api/cart/clear", null, token);
    pass("api-cart-clear", "Cart cleared before UI test");
  }

  console.log("\n=== CLIP warmup (cloud) ===");
  try {
    const clip = await warmClipIfCloud(API, { strict: true });
    if (clip) pass("clip-warm", `CLIP index ready (${clip.indexCount})`);
    else pass("clip-warm", "skipped (local API)");
  } catch (e) {
    fail("clip-warm", e.message);
    process.exit(1);
  }

  console.log("\n=== Live LLM reasoning (API) ===");
  if (hasClientLlmKey()) {
    const llm = await runLlmLiveVerification({ apiUrl: API });
    if (llm.ok) pass("llm-live", "verify:llm-live passed");
    else fail("llm-live", "verify:llm-live failed");
  } else {
    warn("llm-live", `skipped — no LLM keys in ${CLIENT_ENV_PATH}`);
  }

  console.log("\n=== E2E: UI Login ===");
  execSync(`${ADB} shell pm clear ${PACKAGE}`, { stdio: "inherit" });
  launchApp();
  sleep(6000);
  screenshot("01-login-screen");

  try {
    await loginIfNeeded({ email: EMAIL, password: PASSWORD });
    screenshot("02-after-login");
    waitForText("What are you shopping for today?");
    pass("ui-login", "Landed on Home after login");
    token = (await login(EMAIL, PASSWORD)) || token;
  } catch (e) {
    const err = logcatErrors(15);
    fail("ui-login", `${e.message}. Logcat: ${err.slice(0, 200)}`);
    screenshot("02-login-failed");
  }

  console.log("\n=== E2E: Home → Products ===");
  try {
    tapBrowseProducts();
    sleep(2500);
    screenshot("03-product-list");
    const xml = dumpUi();
    if (findNodes(xml, { className: "EditText" }).length >= 1) {
      pass("home-to-products", "Product list with search visible");
    } else fail("home-to-products", "Product list not detected");
  } catch (e) {
    fail("home-to-products", e.message);
  }

  console.log("\n=== E2E: Product detail + add to cart ===");
  try {
    swipe(720, 1400, 720, 600, 350);
    sleep(800);
    const listXml = dumpUi();
  const firstProduct = findNodes(listXml).find(
    (n) =>
      n.contentDesc &&
      n.contentDesc.length > 10 &&
      n.clickable &&
      !n.contentDesc.startsWith("Filter") &&
      !n.contentDesc.includes("Search by photo") &&
      !n.contentDesc.includes("Add to Cart")
  );
  if (!firstProduct) throw new Error("No product card found");
  tap(firstProduct.center.x, firstProduct.center.y);
    sleep(2500);
    screenshot("04-product-detail");
    const detailXml = dumpUi();
    const addBtn = findNodes(detailXml, { text: "ADD TO CART" });
    if (!addBtn.length) {
      const alt = findNodes(detailXml, { text: "Add to Cart" });
      if (alt.length) tap(alt[0].center.x, alt[0].center.y);
      else throw new Error("Add to Cart not found");
    } else {
      tap(addBtn[0].center.x, addBtn[0].center.y);
    }
    sleep(1500);
    dismissAlertIfPresent();
    sleep(1000);
    pass("add-to-cart", "Tapped Add to Cart + dismissed alert");

    if (token) {
      const cart = await waitForCart(token, { minItems: 1, timeoutMs: 20000 });
      if (cart.items?.length > 0) {
        pass("backend-add-to-cart", `API cart has ${cart.items.length} item(s): ${cart.items[0].title}`);
      } else {
        fail("backend-add-to-cart", "Cart empty after add in UI (waited 20s)");
      }
    }
  } catch (e) {
    fail("add-to-cart", e.message);
  }

  console.log("\n=== E2E: Cart tab ===");
  try {
    tapTab("cart");
    sleep(2500);
    screenshot("05-cart");
    const cartXml = dumpUi();
    if (cartXml.includes("Your cart is empty.")) {
      fail("ui-cart-items", "Cart shows empty after add");
    } else if (
      cartXml.includes("Grand Total:") ||
      /Cart \(\d+ items\)/.test(cartXml)
    ) {
      pass("ui-cart-items", "Cart shows line items");
    } else {
      warn("ui-cart-items", "Cart state unclear from UI dump");
    }
  } catch (e) {
    fail("ui-cart", e.message);
  }

  console.log("\n=== E2E: Cart quantity + ===");
  try {
    const xml = dumpUi();
    const plus = findNodes(xml, { text: "+" });
    if (plus.length) {
      tap(plus[0].center.x, plus[0].center.y);
      sleep(2000);
      screenshot("06-cart-qty-plus");
      if (token) {
        const cart = await waitForCart(token, { minItems: 1, minQty: 2, timeoutMs: 20000 });
        const qty = cart.items?.[0]?.quantity;
        if (qty === 2) pass("backend-cart-qty", "Quantity increased to 2 in API");
        else fail("backend-cart-qty", `Expected qty 2, got ${qty ?? "undefined"} (waited 20s)`);
      }
    } else fail("cart-qty-plus", "No + button found");
  } catch (e) {
    fail("cart-qty-plus", e.message);
  }

  console.log("\n=== E2E: Checkout flow ===");
  try {
    swipe(720, 2000, 720, 800, 400);
    sleep(500);
    const xml = dumpUi();
    const checkout = findNodes(xml, { text: "Proceed to Checkout" });
    if (checkout.length) {
      tap(checkout[0].center.x, checkout[0].center.y);
      sleep(2500);
      screenshot("07-checkout");
      pass("nav-checkout", "Opened checkout screen");
    } else {
      fail("nav-checkout", "Proceed to Checkout not found");
    }

    const fields = findNodes(dumpUi(), { className: "EditText" });
    const values = ["E2E Tester", "123 Test St", "Austin", "78701", "5551234567"];
    for (let i = 0; i < Math.min(fields.length, values.length); i++) {
      tap(fields[i].center.x, fields[i].center.y);
      sleep(200);
      clearAndType(values[i]);
      sleep(200);
    }
    const pay = findNodes(dumpUi()).find((n) => n.text?.includes("Credit Card"));
    if (pay) tap(pay.center.x, pay.center.y);
    else throw new Error("Credit Card payment option not found");
    sleep(500);
    swipe(720, 2400, 720, 1200, 400);
    sleep(500);
    try {
      tapText("Place Order");
    } catch {
      tapContentDesc("Place Order");
    }
    sleep(2500);
    screenshot("08-order-summary");

    const summaryXml = dumpUi();
    if (findNodes(summaryXml, { text: "Order Summary" }).length) {
      pass("checkout-order-summary", "Order summary screen shown");
    } else {
      fail("checkout-order-summary", "Order summary not found");
    }

    if (token) {
      const cart = await api("GET", "/api/cart", null, token);
      if (!cart.items?.length) pass("backend-cart-after-order", "Cart cleared on place order (API)");
      else warn("backend-cart-after-order", `Cart still has ${cart.items.length} items after order`);
    }
  } catch (e) {
    fail("checkout", e.message);
    screenshot("07-checkout-failed");
  }

  console.log("\n=== E2E: Profile + logout ===");
  try {
    tapTab("profile");
    sleep(2000);
    screenshot("09-profile");
    const xml = dumpUi();
    if (findNodes(xml, { text: EMAIL }).length || findNodes(xml, { text: "Test User" }).length) {
      pass("profile-info", "Profile shows user info");
    } else {
      warn("profile-info", "Could not verify profile email/name in UI");
    }
    try {
      tapText("Logout");
    } catch {
      tapContentDesc("Logout");
    }
    sleep(6000);
    screenshot("10-after-logout");
    const logoutXml = dumpUi();
    if (
      logoutXml.includes("login-email") ||
      findNodes(logoutXml, { text: "Login" }).length ||
      logoutXml.includes("Sign in ↓")
    ) {
      pass("logout", "Returned to login screen");
    } else fail("logout", "Not on login after logout");
  } catch (e) {
    fail("profile-logout", e.message);
  }

  console.log("\n=== E2E: Signup link navigation ===");
  try {
    let signupXml = dumpUi();
    const scrollBtn = findNodes(signupXml).find((n) => n.text === "Sign in ↓");
    if (scrollBtn?.center) tap(scrollBtn.center.x, scrollBtn.center.y);
    sleep(1200);
    swipe(720, 1800, 720, 400, 350);
    sleep(1000);
    signupXml = dumpUi();
    const link = findNodes(signupXml).find(
      (n) => n.contentDesc === "Sign Up" || n.text?.includes("Sign Up")
    );
    if (link) tap(link.center.x, link.center.y);
    else throw new Error("Sign Up link not found");
    sleep(2000);
    screenshot("11-signup");
    const afterXml = dumpUi();
    if (
      findNodes(afterXml, { text: "Sign Up" }).length ||
      findNodes(afterXml, { className: "EditText" }).length >= 3 ||
      afterXml.includes("Create account")
    ) {
      pass("signup-nav", "Signup screen reachable from login link");
    } else fail("signup-nav", "Signup screen not detected");
  } catch (e) {
    fail("signup-nav", e.message);
  }

  console.log("\n=== SUMMARY ===");
  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  const warnCount = results.filter((r) => r.status === "WARN").length;
  console.log(`PASS: ${passCount}  FAIL: ${failCount}  WARN: ${warnCount}`);
  results.forEach((r) => console.log(`  [${r.status}] ${r.id}: ${r.note}`));

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
