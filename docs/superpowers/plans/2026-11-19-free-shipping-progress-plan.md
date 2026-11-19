# Plan: Add free-shipping progress beneath the cart total

Implement the approved AUT-174 spec by adding the exact free-shipping eligibility message beneath the cart grand total, showing the remaining amount when the total is below $50, and preserving current cart behavior.

## T1: Add focused cart threshold and message tests

Checks: AC-1, AC-2, AC-3

Files:

- Modify: `__tests__/CartScreen.test.js`

Tests:

- `__tests__/CartScreen.test.js::displays the free-shipping message beneath the grand total for a non-empty cart`
- `__tests__/CartScreen.test.js::displays the exact amount still needed when the cart total is below $50`
- `__tests__/CartScreen.test.js::does not display a positive amount still needed at exactly $50`

How to show:

- Make the cart fixture configurable by total, then render non-empty carts below $50 and at exactly $50.
- Assert the exact text `Free shipping on orders over $50` is present for each non-empty cart.
- Assert the below-threshold case includes the exact computed difference, including cents, and the exactly-$50 case contains no positive remaining amount.

## T2: Render free-shipping progress under the grand total

Checks: AC-1, AC-2, AC-3

Files:

- Modify: `src/screens/CartScreen.jsx`
- Modify: `__tests__/CartScreen.test.js`

Tests:

- `__tests__/CartScreen.test.js::displays the free-shipping message beneath the grand total for a non-empty cart`
- `__tests__/CartScreen.test.js::displays the exact amount still needed when the cart total is below $50`
- `__tests__/CartScreen.test.js::does not display a positive amount still needed at exactly $50`

How to show:

- Add the exact `Free shipping on orders over $50` message inside the existing total card, directly beneath the grand total and before the existing tax and delivery hint.
- Derive the remaining amount from the already calculated grand total using the $50 threshold, format it to two decimal places, and render it only while the total is below $50.
- Keep the message visible for every non-empty cart, including carts below and exactly at the threshold, without changing checkout, clear-cart, quantity, or empty-cart behavior.

## T3: Verify the cart change and full regression suite

Checks: AC-4

Files:

- `src/screens/CartScreen.jsx`
- `__tests__/CartScreen.test.js`

Tests:

- `npx jest --ci --runInBand --forceExit __tests__/CartScreen.test.js`
- `npx jest --ci --runInBand --forceExit`

How to show:

- Run the focused CartScreen tests to demonstrate the exact message, below-$50 calculation, and exactly-$50 boundary behavior.
- Run the full Jest command to show existing cart actions and the rest of the repository remain passing after the UI addition; report any unrelated pre-existing failures separately.
