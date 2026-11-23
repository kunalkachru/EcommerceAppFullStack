# Checkout Order Total on Place-Order Button

Implement the approved S-163 spec by including the computed checkout grand total in the idle place-order button label while preserving submission-state behavior and existing checkout flows.

## T1: Add focused checkout button label and submission-state tests

Checks: AC-1, AC-2, AC-3

Files:
- Modify: `__tests__/CheckoutScreen.test.js`

Tests:
- `__tests__/CheckoutScreen.test.js::renders the exact place-order label with a $9.99 grand total`
- `__tests__/CheckoutScreen.test.js::updates the place-order amount for multiple items and quantities`
- `__tests__/CheckoutScreen.test.js::keeps the existing placing-order label and disabled state while submitting`
- `__tests__/CheckoutScreen.test.js`

How to show:
- Extend the existing renderer setup to inspect the `checkout-place-order` control and its child text.
- Cover the approved single-item fixture with the exact `Place Order · $9.99` label.
- Use a multi-item and quantity fixture, rerender or update the mocked cart selector, and assert the button reflects the recomputed grand total with exactly two decimal places.
- Mock a pending `createOrder` call, fill the existing required checkout fields, press the button, and assert the label remains `Placing Order...` and the control is disabled while the promise is unresolved.
- Keep the current keyboard-aware container regression assertion in the file.

## T2: Render the computed grand total in the idle place-order label

Checks: AC-1, AC-2, AC-3, AC-4

Files:
- Modify: `src/screens/CheckoutScreen.jsx`

Tests:
- `__tests__/CheckoutScreen.test.js::renders the exact place-order label with a $9.99 grand total`
- `__tests__/CheckoutScreen.test.js::updates the place-order amount for multiple items and quantities`
- `__tests__/CheckoutScreen.test.js::keeps the existing placing-order label and disabled state while submitting`

How to show:
- Keep the existing `grandTotal` calculation as the single source for the summary, order payload, and button amount.
- Format the idle button text as `Place Order · $${grandTotal.toFixed(2)}` so the centered dot and two decimal places are exact.
- Leave the submitting branch as `Placing Order...`, retain the existing disabled prop and disabled style, and do not alter validation, order creation, cart clearing, or navigation behavior.
- Confirm the label derives from current Redux cart contents on render so changed quantities or item combinations update the button together with the summary.

## T3: Run focused and repository-wide verification

Checks: AC-1, AC-2, AC-3, AC-4

Files:
- `src/screens/CheckoutScreen.jsx`
- `__tests__/CheckoutScreen.test.js`

Tests:
- `npx jest --ci --runInBand --forceExit __tests__/CheckoutScreen.test.js`
- `npx jest --ci --runInBand --forceExit`

How to show:
- Run the focused checkout test file and confirm exact idle formatting, recalculation for multiple items or quantities, and unchanged submitting behavior all pass.
- Run the required full Jest suite from `/work` and confirm existing checkout, cart, order creation, navigation, and application tests remain passing.
- If the repository-wide run exposes an unrelated pre-existing failure, record its exact test identifier and cause without weakening the S-163 assertions.
