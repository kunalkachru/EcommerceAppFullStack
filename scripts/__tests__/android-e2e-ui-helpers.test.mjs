import test from "node:test";
import assert from "node:assert/strict";

import {
  hasBundleLoadError,
  isAuthenticatedShell,
  isLoginScreen,
  isProductListScreen,
  isCartScreen,
  isOrdersScreen,
} from "../lib/android-e2e-ui-helpers.mjs";

test("hasBundleLoadError detects the React Native Metro red screen", () => {
  const xml = `
    <hierarchy>
      <node text="Unable to load script." />
      <node text="Make sure you're running Metro" />
      <node text="RELOAD (R,R)" clickable="true" />
    </hierarchy>
  `;

  assert.equal(hasBundleLoadError(xml), true);
});

test("isLoginScreen matches the redesigned login experience", () => {
  const xml = `
    <hierarchy>
      <node resource-id="login-email" />
      <node resource-id="login-password" />
      <node resource-id="login-submit" />
      <node text="Sign in ↓" />
    </hierarchy>
  `;

  assert.equal(isLoginScreen(xml), true);
  assert.equal(isAuthenticatedShell(xml), false);
});

test("isAuthenticatedShell accepts a scrolled Home screen from the redesigned app", () => {
  const xml = `
    <hierarchy>
      <node resource-id="tab-home" />
      <node text="Browse the full catalog" />
      <node text="Curated promos that feel editorial, not noisy." />
    </hierarchy>
  `;

  assert.equal(isAuthenticatedShell(xml), true);
});

test("screen detectors recognize redesigned product, cart, and orders shells", () => {
  const productXml = `
    <hierarchy>
      <node resource-id="screen-product-list" />
      <node resource-id="product-search-input" />
    </hierarchy>
  `;
  const cartXml = `
    <hierarchy>
      <node resource-id="screen-cart" />
      <node resource-id="cart-proceed-checkout" />
    </hierarchy>
  `;
  const ordersXml = `
    <hierarchy>
      <node resource-id="screen-orders" />
      <node text="Your after-purchase story, kept simple." />
    </hierarchy>
  `;

  assert.equal(isProductListScreen(productXml), true);
  assert.equal(isCartScreen(cartXml), true);
  assert.equal(isOrdersScreen(ordersXml), true);
});
