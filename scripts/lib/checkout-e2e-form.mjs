export const CHECKOUT_SHIPPING_FIELDS = [
  { testId: "checkout-field-fullname", value: "E2E Tester" },
  { testId: "checkout-field-address", value: "123 Test St" },
  { testId: "checkout-field-city", value: "Austin" },
  { testId: "checkout-field-zipcode", value: "78701" },
  { testId: "checkout-field-phone", value: "5551234567" },
];

function normalizeFieldValue(value) {
  return String(value ?? "").trim();
}

export async function fillCheckoutShippingFields({
  fillField,
  readField,
  sleep = () => {},
  maxAttempts = 2,
} = {}) {
  for (const field of CHECKOUT_SHIPPING_FIELDS) {
    let persisted = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      fillField(field.testId, field.value, { hideKeyboardAfter: true });
      await sleep(350);

      if (normalizeFieldValue(readField(field.testId)) === field.value) {
        persisted = true;
        break;
      }
    }

    if (!persisted) {
      throw new Error(`Checkout field ${field.testId} did not persist after ${maxAttempts} attempts`);
    }
  }
}
