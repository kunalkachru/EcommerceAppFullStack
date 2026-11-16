# Product list out-of-stock indicator — implementation plan

## T1: Add focused product-card behavior tests

Checks: AC-1, AC-2, AC-3

Files:
- Create: `src/screens/ProductListScreen.test.jsx`

Tests:
- `src/screens/ProductListScreen.test.jsx::renders a red Out of stock label directly under the price for a zero-stock product`
- `src/screens/ProductListScreen.test.jsx::disables the add button and does not dispatch for a zero-stock product`
- `src/screens/ProductListScreen.test.jsx::keeps the in-stock card unchanged and dispatches add to cart from its enabled button`

How to show:
- Mock the catalog hook with deterministic zero-stock and positive-stock products, mock navigation and external controls, and capture the Redux dispatch function.
- Assert the zero-stock card places the exact `Out of stock` text immediately after its price and applies a red text style.
- Locate each card's add control, assert the zero-stock control is disabled, invoke its press callback as a defensive handler test, and verify no add-to-cart action is dispatched.
- Assert the positive-stock card has no out-of-stock label, retains its existing name/price/image and button presentation, has an enabled add control, and dispatches the existing `addToCart` action when pressed.

## T2: Implement zero-stock product-card presentation and interaction rules

Checks: AC-1, AC-2, AC-3

Files:
- Modify: `src/screens/ProductListScreen.jsx`

Tests:
- `src/screens/ProductListScreen.test.jsx`
- `src/screens/ProductListScreen.test.jsx::renders a red Out of stock label directly under the price for a zero-stock product`
- `src/screens/ProductListScreen.test.jsx::disables the add button and does not dispatch for a zero-stock product`
- `src/screens/ProductListScreen.test.jsx::keeps the in-stock card unchanged and dispatches add to cart from its enabled button`

How to show:
- Derive an `item.inventoryCount === 0` flag in the existing product-card renderer, render the exact label immediately below the price only for that case, and add a dedicated red label style without changing the in-stock card styles.
- Set the existing Add control's `disabled` prop and disabled visual treatment for zero-stock products, and guard the shared add handler so a zero-stock press cannot dispatch even if the callback is invoked directly.
- Preserve the existing pending/add-to-cart behavior for products whose inventory count is greater than zero.

## T3: Verify focused behavior, regression coverage, and both required viewports

Checks: AC-1, AC-2, AC-3, AC-4

Files:
- `src/screens/ProductListScreen.jsx`
- `src/screens/ProductListScreen.test.jsx`

Tests:
- `npx jest --ci --runInBand --forceExit src/screens/ProductListScreen.test.jsx`
- `npx jest --ci --runInBand --forceExit`

How to show:
- Run the three named focused tests and confirm the zero-stock label, red styling, disabled/no-dispatch behavior, and unchanged enabled in-stock behavior.
- Run the repository Jest command to catch regressions in the existing product-list and cart behavior; report unrelated pre-existing failures separately.
- In the product-list UI at `/products`, seed or select a zero-stock product and capture the exact `Out of stock` text visible below its price at both a 390x844 phone viewport and a 1280x800 desktop viewport.
