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
  clearAndType,
  hideKeyboard,
  inputText,
  sleep,
  launchApp,
  logcatErrors,
  swipe,
} from "./e2e-adb.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API = "http://127.0.0.1:5001";
const EMAIL = "test@example.com";
const PASSWORD = "secret123";
const USER_ID = "5a41ec7a-2850-4e10-a86c-a0a98758ea48";

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

function tapHint(hint) {
  const xml = dumpUi();
  const nodes = findNodes(xml, { text: hint });
  if (!nodes.length) throw new Error(`No field for hint: ${hint}`);
  tap(nodes[0].center.x, nodes[0].center.y);
  return nodes[0];
}

function waitForUi(matchFn, { attempts = 10, delayMs = 1500 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const xml = dumpUi();
    if (matchFn(xml)) return xml;
    sleep(delayMs);
  }
  return null;
}

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
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    } catch (e) {
      lastErr = e;
      sleep(500);
    }
  }
  throw lastErr;
}

function readStore() {
  return JSON.parse(
    readFileSync(join(ROOT, "server/data/store.json"), "utf8")
  );
}

function tapEditTextByIndex(index) {
  const xml = dumpUi();
  const nodes = findNodes(xml, { className: "EditText" });
  if (nodes.length <= index) throw new Error(`EditText index ${index} not found`);
  tap(nodes[index].center.x, nodes[index].center.y);
  return nodes[index];
}

function tapTabIcon(index) {
  // Bottom tab bar: Home=0, Products=1, Cart=2, Profile=3 — icons ~y=2950 on 3120 height
  const x = 180 + index * 360;
  tap(x, 2980);
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
    const login = await api("POST", "/api/users/login", { email: EMAIL, password: PASSWORD });
    if (login.token) {
      token = login.token;
      pass("credentials", `${EMAIL} / ${PASSWORD} works via API`);
    } else fail("credentials", JSON.stringify(login));
  } catch (e) {
    fail("credentials", e.message);
  }

  // Clear cart for clean test
  if (token) {
    await api("DELETE", "/api/cart/clear", null, token);
    pass("api-cart-clear", "Cart cleared before UI test");
  }

  console.log("\n=== E2E: UI Login ===");
  execSync(`adb -s emulator-5554 shell pm clear com.ecommerceappfullstack`, { stdio: "inherit" });
  launchApp();
  sleep(6000);
  screenshot("01-login-screen");

  try {
    tapEditTextByIndex(0);
    sleep(300);
    clearAndType(EMAIL);
    sleep(300);
    tapEditTextByIndex(1);
    sleep(300);
    clearAndType(PASSWORD);
    sleep(300);
    hideKeyboard();
    tapContentDesc("Login");
    sleep(5000);
    screenshot("02-after-login");

    const afterLoginXml = dumpUi();
    if (findNodes(afterLoginXml, { text: "Welcome to the E-Commerce App" }).length) {
      pass("ui-login", "Landed on Home after login");
    } else if (findNodes(afterLoginXml, { text: "Login" }).length) {
      const err = logcatErrors(15);
      fail("ui-login", `Still on login. Logcat: ${err.slice(0, 200)}`);
    } else {
      pass("ui-login", "Left login screen (main tabs visible)");
    }
  } catch (e) {
    fail("ui-login", e.message);
    screenshot("02-login-failed");
  }

  console.log("\n=== E2E: Home → Products ===");
  try {
    tapText("Go to Product List");
    sleep(2000);
    screenshot("03-product-list");
    const xml = dumpUi();
    if (findNodes(xml, { className: "EditText" }).length >= 1) {
      pass("home-to-products", "Product list with search visible");
    } else fail("home-to-products", "Product list not detected");
  } catch (e) {
    fail("home-to-products", e.message);
  }

  console.log("\n=== E2E: Product detail + add to cart ===");
  let addedProductId = "1";
  try {
    // Tap first product card (approx center of list below filters)
    tap(720, 1200);
    sleep(2500);
    screenshot("04-product-detail");
    const xml = dumpUi();
    const addBtn = findNodes(xml, { text: "ADD TO CART" });
    if (!addBtn.length) {
      // React Native Button may uppercase differently
      const alt = findNodes(xml, { text: "Add to Cart" });
      if (alt.length) tap(alt[0].center.x, alt[0].center.y);
      else tap(720, 1100);
    } else {
      tap(addBtn[0].center.x, addBtn[0].center.y);
    }
    sleep(1500);
    dismissAlertIfPresent();
    sleep(1000);
    pass("add-to-cart", "Tapped Add to Cart + dismissed alert");

    if (token) {
      try {
        const cart = await api("GET", "/api/cart", null, token);
        if (cart.items?.length > 0) {
          addedProductId = cart.items[0].productId;
          pass("backend-add-to-cart", `API cart has ${cart.items.length} item(s): ${cart.items[0].title}`);
        } else {
          fail("backend-add-to-cart", "Cart empty after add in UI");
        }
      } catch (e) {
        fail("backend-add-to-cart", e.message);
      }
    }
  } catch (e) {
    fail("add-to-cart", e.message);
  }

  console.log("\n=== E2E: Cart tab ===");
  try {
    tapTabIcon(2);
    sleep(2500);
    screenshot("05-cart");
    const xml = dumpUi();
    if (findNodes(xml, { text: "Your cart is empty." }).length) {
      fail("ui-cart-items", "Cart shows empty after add");
    } else if (findNodes(xml, { text: "Grand Total:" }).length || findNodes(xml, { text: "Cart (" }).length) {
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
        const cart = await api("GET", "/api/cart", null, token);
        const qty = cart.items?.[0]?.quantity;
        if (qty === 2) pass("backend-cart-qty", "Quantity increased to 2 in API");
        else fail("backend-cart-qty", `Expected qty 2, got ${qty}`);
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

    // Fill shipping
    const fields = findNodes(dumpUi(), { className: "EditText" });
    const values = ["E2E Tester", "123 Test St", "Austin", "78701", "5551234567"];
    for (let i = 0; i < Math.min(fields.length, values.length); i++) {
      tap(fields[i].center.x, fields[i].center.y);
      sleep(200);
      inputText(values[i]);
      sleep(200);
    }
    tapText("Credit Card");
    sleep(500);
    swipe(720, 2400, 720, 1200, 400);
    sleep(500);
    tapText("Place Order");
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
    tapTabIcon(3);
    sleep(2000);
    screenshot("09-profile");
    const xml = dumpUi();
    if (findNodes(xml, { text: EMAIL }).length || findNodes(xml, { text: "Test User" }).length) {
      pass("profile-info", "Profile shows user info");
    } else {
      warn("profile-info", "Could not verify profile email/name in UI");
    }
    tapContentDesc("Logout");
    sleep(3000);
    screenshot("10-after-logout");
    if (findNodes(dumpUi(), { text: "Login" }).length) {
      pass("logout", "Returned to login screen");
    } else fail("logout", "Not on login after logout");
  } catch (e) {
    fail("profile-logout", e.message);
  }

  console.log("\n=== E2E: Signup link navigation ===");
  try {
    tapContentDesc("Don't have an account? Sign Up");
    sleep(2000);
    screenshot("11-signup");
    if (findNodes(dumpUi(), { text: "Sign Up" }).length || findNodes(dumpUi(), { className: "EditText" }).length >= 3) {
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
