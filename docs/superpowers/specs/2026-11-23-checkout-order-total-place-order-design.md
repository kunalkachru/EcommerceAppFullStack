# Spec v1: S-163

## Goal
Update the checkout place-order button so its idle label includes the checkout grand total, formatted as currency after a centered dot, for example `Place Order · $9.99`. The amount must be the same computed total already used by the checkout summary and must update when cart contents or quantities change. Preserve the existing order-submission behavior, including the in-progress `Placing Order...` label and disabled state.

## Acceptance checks
- AC-1: Checkout renders the place-order button with the exact idle label `Place Order · $9.99` when the cart grand total is 9.99 (how to see it: test: __tests__/CheckoutScreen.test.js)
- AC-2: Checkout renders the place-order button amount from the computed cart grand total with two decimal places, including updated totals for multiple items or quantities (how to see it: test: __tests__/CheckoutScreen.test.js)
- AC-3: While an order is being submitted, the place-order button retains the existing `Placing Order...` label and disabled state (how to see it: test: __tests__/CheckoutScreen.test.js)
- AC-4: Existing checkout, cart, order creation, navigation, and other application behavior remains passing with the totalized place-order label (how to see it: test: the full suite)

## Affected areas
- (none)

## Risks
- (none)

## New packages
- (none)

## Choices
- (none)

## Assumptions
- (none)

## Docs used
- (none)
