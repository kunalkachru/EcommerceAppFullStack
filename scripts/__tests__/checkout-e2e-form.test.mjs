import test from "node:test";
import assert from "node:assert/strict";

import {
  CHECKOUT_SHIPPING_FIELDS,
  fillCheckoutShippingFields,
} from "../lib/checkout-e2e-form.mjs";

test("fillCheckoutShippingFields fills checkout fields in order and hides keyboard after each entry", async () => {
  const calls = [];
  const state = new Map();

  await fillCheckoutShippingFields({
    fillField(testId, value, options) {
      calls.push({ testId, value, options });
      state.set(testId, value);
    },
    readField(testId) {
      return state.get(testId) ?? "";
    },
    sleep() {},
  });

  assert.deepEqual(
    calls.map(({ testId, value, options }) => ({ testId, value, options })),
    CHECKOUT_SHIPPING_FIELDS.map(({ testId, value }) => ({
      testId,
      value,
      options: { hideKeyboardAfter: true },
    }))
  );
});

test("fillCheckoutShippingFields retries when a field does not persist on the first attempt", async () => {
  const attempts = new Map();
  const state = new Map();

  await fillCheckoutShippingFields({
    fillField(testId, value) {
      attempts.set(testId, (attempts.get(testId) ?? 0) + 1);

      if (testId === "checkout-field-zipcode" && attempts.get(testId) === 1) {
        state.set("checkout-field-city", value);
        state.set(testId, "Zip Code");
        return;
      }

      state.set(testId, value);
    },
    readField(testId) {
      return state.get(testId) ?? "";
    },
    sleep() {},
  });

  assert.equal(attempts.get("checkout-field-zipcode"), 2);
  assert.equal(state.get("checkout-field-city"), "78701");
  assert.equal(state.get("checkout-field-zipcode"), "78701");
});

test("fillCheckoutShippingFields throws when a field never persists", async () => {
  await assert.rejects(
    fillCheckoutShippingFields({
      fillField() {},
      readField() {
        return "";
      },
      sleep() {},
      maxAttempts: 2,
    }),
    /checkout-field-fullname/
  );
});
