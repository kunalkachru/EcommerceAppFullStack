# Spec v1: S-82

## Goal
On the product list page, products whose `inventoryCount` is zero show a red `Out of stock` label directly under the price, and their Add to cart button is disabled. Products with stock greater than zero retain the current product-card appearance and an enabled Add to cart button.

## Acceptance checks
- AC-1: A product-list card with `inventoryCount` equal to `0` renders the exact text `Out of stock` directly under that product's price, with the label styled red (how to see it: test: src/screens/ProductListScreen.test.jsx)
- AC-2: A product-list card with `inventoryCount` equal to `0` renders its Add to cart button disabled and does not dispatch an add-to-cart action when the button is pressed (how to see it: test: src/screens/ProductListScreen.test.jsx)
- AC-3: A product-list card with `inventoryCount` greater than `0` does not render `Out of stock`, keeps the existing product-card content and styling, and renders an enabled Add to cart button that dispatches the existing add-to-cart action when pressed (how to see it: test: src/screens/ProductListScreen.test.jsx)
- AC-4: The product list page displays `Out of stock` for a zero-stock product on both a 390x844 phone viewport and a 1280x800 desktop viewport (how to see it: ui: /products, "Out of stock" text visible on the page)

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
