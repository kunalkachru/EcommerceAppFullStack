# Spec v1: AUT-189

## Goal
Extend the Orders screen so the fetched orders remain available while the displayed list can be narrowed by status. Add an above-list filter with the options All, Placed, Shipped, and Delivered; default to All, match each non-All option against the order's `orderStatus`, and show `No orders with this status` when the selected status has no matching orders. Preserve the existing unfiltered order list, order cards, totals, navigation, loading, error, refresh, and no-order-history behavior.

## Acceptance checks
- AC-1: The Orders screen renders an above-list status filter containing exactly the options All, Placed, Shipped, and Delivered, with All selected initially (how to see it: test: __tests__/OrdersScreen.statusFilter.test.js)
- AC-2: Selecting Placed, Shipped, or Delivered displays only orders whose `orderStatus` matches the selected status, while selecting All displays every fetched order (how to see it: test: __tests__/OrdersScreen.statusFilter.test.js)
- AC-3: When a selected non-All status has no matching orders, the Orders screen displays `No orders with this status` and does not display an order card for another status (how to see it: test: __tests__/OrdersScreen.statusFilter.test.js)
- AC-4: With All selected and fetched orders present, existing order cards remain rendered with their order details and remain navigable to OrderSummary (how to see it: test: __tests__/OrdersScreen.statusFilter.test.js)
- AC-5: Existing Orders screen behavior remains unchanged outside status filtering, including loading, fetch errors, pull-to-refresh, total metrics, the no-order-history state, and order-card rendering (how to see it: test: the full suite)

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
