# Spec v1: AUT-174

## Goal
On the cart screen, display the exact free-shipping eligibility message beneath the grand total. When the grand total is below $50, also display the remaining dollar amount needed to reach the $50 threshold, calculated from the current cart total.

## Acceptance checks
- AC-1: A non-empty cart displays `Free shipping on orders over $50` beneath the grand total (how to see it: test: __tests__/CartScreen.test.js)
- AC-2: A non-empty cart whose grand total is below $50 displays the exact dollar amount equal to $50 minus the current grand total as the amount still needed for free shipping (how to see it: test: __tests__/CartScreen.test.js)
- AC-3: A non-empty cart whose grand total is exactly $50 displays the free-shipping message and does not display a positive amount still needed (how to see it: test: __tests__/CartScreen.test.js)
- AC-4: Existing cart behavior remains passing after the free-shipping progress is added (how to see it: test: the full suite)

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
