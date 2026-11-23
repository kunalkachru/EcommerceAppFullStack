# Plan: Show the checkout total on the place-order button

Implement the approved S-158 spec by deriving the idle button label from the checkout screen's existing `grandTotal`, formatting it to exactly two decimal places, and preserving the current placing, validation, order, cart, summary, and navigation behavior.

## T1: Add focused place-order total label tests

Checks: AC-1, AC-2

Files:

- Modify: `__tests__/CheckoutScreen.test.js`

Tests:

- `__tests__/CheckoutScreen.test.js::renders the place-order button with the exact formatted cart total`
- `__tests__/CheckoutScreen.test.js::updates the idle place-order label when cart contents and total change`

How to show:

- Render the checkout screen with the existing 9.99 fixture and inspect `testID="checkout-place-order"` to assert the exact `Place Order · $9.99` text.
- Vary the mocked cart contents across whole, fractional, and changed quantities so the assertions prove the label uses the current cart total and always has exactly two decimal places.
- Keep the existing renderer and mocks compatible with the screen's current React Native test setup.

## T2: Include the computed total in the idle place-order label

Checks: AC-1, AC-2, AC-3

Files:

- Modify: `src/screens/CheckoutScreen.jsx`
- Modify: `__tests__/CheckoutScreen.test.js`

Tests:

- `__tests__/CheckoutScreen.test.js::renders the place-order button with the exact formatted cart total`
- `__tests__/CheckoutScreen.test.js::updates the idle place-order label when cart contents and total change`
- `npx jest --ci --runInBand --forceExit __tests__/CheckoutScreen.test.js`

How to show:

- Change only the non-submitting button label to `Place Order · $${grandTotal.toFixed(2)}` using the existing computed `grandTotal`.
- Leave `Placing Order...`, the disabled state, press handler, validation, order payload, cart clearing, success state, summary, and navigation flow unchanged.
- Run the focused checkout test file and show the exact label and dynamic-total assertions passing.

## T3: Run full checkout and repository regression verification

Checks: AC-3

Files:

- `src/screens/CheckoutScreen.jsx`
- `__tests__/CheckoutScreen.test.js`

Tests:

- `npx jest --ci --runInBand --forceExit __tests__/CheckoutScreen.test.js`
- `npx jest --ci --runInBand --forceExit`

How to show:

- Run the focused checkout tests, then the complete Jest suite.
- Report passing coverage for existing checkout rendering and behavior plus the new label cases; record any unrelated pre-existing suite failures separately if encountered.
