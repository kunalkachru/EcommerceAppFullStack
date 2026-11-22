# Plan: Add product stock messaging and sold-out handling

Implement the approved AUT-198 spec by using the product detail page's existing `inventoryCount` value to show exact low-stock messaging for counts 1–5 and to disable the cart action with a `Sold out` label at zero, while preserving normal add-to-cart behavior for positive stock.

## T1: Add focused product inventory behavior tests

Checks: AC-1, AC-2, AC-3, AC-4

Files:

- Create: `__tests__/ProductDetailScreen.inventory.test.js`

Tests:

- `__tests__/ProductDetailScreen.inventory.test.js::renders the exact low-stock message for inventory counts from 1 through 5`
- `__tests__/ProductDetailScreen.inventory.test.js::keeps Add to Cart and hides the low-stock message for inventory of 6 or more`
- `__tests__/ProductDetailScreen.inventory.test.js::disables the sold-out action and skips addToCart dispatch when inventory is zero`
- `__tests__/ProductDetailScreen.inventory.test.js::dispatches addToCart for positive inventory`

How to show:

- Render the product detail screen with representative products at each required inventory boundary and inspect the rendered text and button props.
- Mock `addToCart` and the dispatch/unwrap path so the zero-stock test proves no dispatch occurs, while the positive-stock test proves the existing action is dispatched.
- Assert the exact `Only N left`, `Add to Cart`, and `Sold out` strings, plus enabled/disabled state and absence of the low-stock message above five.

## T2: Implement inventory-aware product detail action state

Checks: AC-1, AC-2, AC-3, AC-4

Files:

- Modify: `src/screens/ProductDetailScreen.jsx`
- Modify: `__tests__/ProductDetailScreen.inventory.test.js`

Tests:

- `__tests__/ProductDetailScreen.inventory.test.js::renders the exact low-stock message for inventory counts from 1 through 5`
- `__tests__/ProductDetailScreen.inventory.test.js::keeps Add to Cart and hides the low-stock message for inventory of 6 or more`
- `__tests__/ProductDetailScreen.inventory.test.js::disables the sold-out action and skips addToCart dispatch when inventory is zero`
- `__tests__/ProductDetailScreen.inventory.test.js::dispatches addToCart for positive inventory`

How to show:

- Derive the stock state from `product.inventoryCount`, rendering `Only ${inventoryCount} left` only for counts 1 through 5.
- At zero, render `Sold out`, set the existing Add to Cart control disabled, and guard the handler so pressing it cannot dispatch `addToCart`.
- For positive counts, retain the existing `Add to Cart` label and dispatch flow; keep the current adding/pending protections and styling behavior intact.
- Preserve the existing product detail layout and legacy behavior for product fixtures that do not provide a stock count unless the implementation's existing catalog contract supplies one.

## T3: Run focused and full regression verification

Checks: AC-5

Files:

- `src/screens/ProductDetailScreen.jsx`
- `__tests__/ProductDetailScreen.inventory.test.js`
- `__tests__/ProductDetailScreen.test.js`

Tests:

- `npx jest --ci --runInBand --forceExit __tests__/ProductDetailScreen.inventory.test.js`
- `npx jest --ci --runInBand --forceExit`

How to show:

- Run the focused inventory test file to demonstrate all stock boundaries and dispatch behavior.
- Run the complete Jest suite to show existing product detail, catalog, cart, navigation, and checkout behavior has no new failures after the change; report any unrelated pre-existing failures separately.
