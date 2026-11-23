# Spec v1: S-158

## Goal
Update the checkout place-order button so its idle label includes the current order total in the format `Place Order · $N.NN`, using the same cart total already shown in the checkout summary. Preserve the existing submission behavior and all other checkout behavior.

## Acceptance checks
- AC-1: With cart items totaling 9.99, the enabled checkout place-order button renders the exact label `Place Order · $9.99` (how to see it: test: __tests__/CheckoutScreen.test.js)
- AC-2: With any cart total, the idle place-order button formats the computed total as a dollar amount with exactly two decimal places and uses the current cart total, including after cart contents change (how to see it: test: __tests__/CheckoutScreen.test.js)
- AC-3: The existing place-order submission, validation, order creation, cart clearing, checkout summary, and navigation behavior remains passing after the label change (how to see it: test: the full suite)

## Affected areas
- src/screens/CheckoutScreen.jsx` — idle place-order button label
- __tests__/CheckoutScreen.test.js` — focused label and total-format coverage

## Risks
- (none)

## New packages
- (none)

## Choices
- Use the existing computed cart `grandTotal` and existing two-decimal currency formatting.

## Assumptions
- The existing `Placing Order...` submission-state label remains unchanged while an order is being submitted.

## Docs used
- (none)
