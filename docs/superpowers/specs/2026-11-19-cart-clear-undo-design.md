# Spec v1: AUT-182

## Goal
Change the cart's Clear cart action so a shopper must explicitly choose between Clear all and Keep items before anything is removed. After a successful clear, retain a snapshot of every cleared cart line and its quantity, show a short-lived confirmation message with an Undo action, and restore that exact snapshot when Undo is selected before the message expires. Keep items must leave the cart and server unchanged; a dismissed or expired undo message must not restore items automatically.

## Acceptance checks
- AC-1: Pressing Clear cart with at least one cart line opens a confirmation prompt containing the actions Clear all and Keep items, and does not dispatch the clear operation before either action is selected (how to see it: test: __tests__/CartScreen.test.js)
- AC-2: Selecting Keep items closes the confirmation prompt, leaves every cart line and quantity unchanged, and does not dispatch the clear operation (how to see it: test: __tests__/CartScreen.test.js)
- AC-3: Selecting Clear all dispatches the clear operation only after confirmation and, after a successful clear, renders the existing empty-cart state plus a short confirmation message with an Undo action (how to see it: test: __tests__/CartScreen.test.js)
- AC-4: The clear operation's undo snapshot contains every item from the cart at clear time, including each item's original quantity, and selecting Undo before the undo window expires restores the same items and quantities through the cart state and server API (how to see it: test: __tests__/cartSlice.test.js)
- AC-5: The Undo action is available only for a finite five-second window after a successful clear; after that window it is no longer rendered and selecting no action does not restore any item (how to see it: test: __tests__/CartScreen.test.js)
- AC-6: A failed clear request leaves the cart contents available, does not show a successful-clear undo message, and exposes the existing cart error state (how to see it: test: __tests__/cartSlice.test.js)
- AC-7: Existing cart quantity adjustment, item removal, checkout navigation, empty-cart shopping action, and free-shipping behavior remain passing after the confirmation and undo flow is added (how to see it: test: the full suite)

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
