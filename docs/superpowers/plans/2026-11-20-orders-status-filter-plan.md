# Plan: Orders screen status filter

Implement the approved AUT-189 spec in the existing Orders screen without changing the orders fetch or navigation contract. Keep the fetched `orders` collection as the source for totals, latest-order content, refresh, and the existing no-order-history state; derive only the rendered list from the selected status. Use the screen's existing lowercase status values for matching while presenting the four requested title-cased labels.

## T1: Add status selection and filtered Orders list rendering

Checks: AC-1, AC-2, AC-3, AC-4, AC-5

Files:

- `src/screens/OrdersScreen.jsx`

Tests:

- `__tests__/OrdersScreen.statusFilter.test.js`

How to show: Add local selected-status state defaulting to All, render exactly All/Placed/Shipped/Delivered controls above the orders list, and derive a filtered list by matching each non-All selection to `orderStatus`. Render `No orders with this status` when a non-All filter has no matches and avoid rendering unrelated order cards. Keep the unfiltered orders array powering totals, latest order, card navigation to OrderSummary, loading, errors, refresh, and the existing no-order-history branch.

## T2: Add focused regression coverage and run the full Jest suite

Checks: AC-1, AC-2, AC-3, AC-4, AC-5

Files:

- `__tests__/OrdersScreen.statusFilter.test.js`

Tests:

- `__tests__/OrdersScreen.statusFilter.test.js`
- `npx jest --ci --runInBand --forceExit`

How to show: Mock the existing orders fetch and navigation, then verify the initial All selection and exact filter options, each status-specific result set, the no-match message with no unrelated card, All-mode order details and navigation, and unchanged loading/error/refresh/metrics/no-history behavior. The focused tests and full suite must pass.
