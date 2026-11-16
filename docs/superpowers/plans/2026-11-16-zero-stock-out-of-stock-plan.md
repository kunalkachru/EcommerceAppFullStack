# Zero-stock product-list behavior — implementation plan

## T1: Add product-list acceptance tests for stock-state cards

Checks: AC-1, AC-2, AC-3, AC-4, AC-5

Files:
- Create: `src/screens/ProductListScreen.test.jsx`

Tests:
- `src/screens/ProductListScreen.test.jsx::renders Out of stock below the price in the error color for a zero-stock product`
- `src/screens/ProductListScreen.test.jsx::disables the zero-stock Add button without dispatching addToCart`
- `src/screens/ProductListScreen.test.jsx::keeps an in-stock product unchanged and dispatches addToCart`
- `src/screens/ProductListScreen.test.jsx::preserves product card content and ordering for mixed stock states`

How to show:
- Render the screen with deterministic products containing one `inventoryCount: 0` item and one item with `inventoryCount > 0`, while mocking the catalog hook, Redux dispatch/selector, navigation, and unrelated search controls as needed.
- Assert the exact `Out of stock` text is present only on the zero-stock card, immediately after that card's price, and that its style resolves to `colors.error` rather than the price/body color.
- Invoke each card's Add control through its rendered props; assert the zero-stock control has `disabled: true` and does not dispatch, while the in-stock control remains enabled and dispatches the existing `addToCart` action.
- Assert both cards retain their existing title, image source, price, card identifiers, and source order; do not add any ordering or layout change to the requirement.

## T2: Render and enforce zero-stock state in product cards

Checks: AC-1, AC-2, AC-3, AC-4, AC-5

Files:
- Modify: `src/screens/ProductListScreen.jsx`

Tests:
- `src/screens/ProductListScreen.test.jsx`
- `src/screens/ProductListScreen.test.jsx::renders Out of stock below the price in the error color for a zero-stock product`
- `src/screens/ProductListScreen.test.jsx::disables the zero-stock Add button without dispatching addToCart`
- `src/screens/ProductListScreen.test.jsx::keeps an in-stock product unchanged and dispatches addToCart`
- `src/screens/ProductListScreen.test.jsx::preserves product card content and ordering for mixed stock states`

How to show:
- Derive an `isOutOfStock` flag from the card item's `inventoryCount === 0` and conditionally render the exact `Out of stock` label directly after the existing price, using `colors.error` in a dedicated label style.
- Set the existing Add `TouchableOpacity` disabled state from both zero-stock status and the existing pending state, preserving the current pending label/style and add-to-cart callback for in-stock products.
- Keep the existing product data, FlatList filtering/sorting, card title/image/price markup, layout, and order unchanged; zero-stock handling must be presentation and interaction gating only.

## T3: Verify the complete acceptance suite

Checks: AC-1, AC-2, AC-3, AC-4, AC-5

Files:
- `src/screens/ProductListScreen.jsx`
- `src/screens/ProductListScreen.test.jsx`

Tests:
- `npx jest --ci --runInBand --forceExit src/screens/ProductListScreen.test.jsx`
- `npx jest --ci --runInBand --forceExit`

How to show:
- Run the focused test file and confirm all named zero-stock, in-stock, styling, interaction, and ordering assertions pass.
- Run the repository Jest command and confirm the new screen coverage does not regress existing tests; report unrelated pre-existing failures separately if any occur.
- Confirm the final implementation satisfies AC-1 through AC-5 with no new acceptance checks required.
