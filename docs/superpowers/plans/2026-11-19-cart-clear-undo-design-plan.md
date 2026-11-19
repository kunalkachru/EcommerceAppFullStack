# Plan: Confirm cart clearing and restore cleared items with Undo

Implement the approved AUT-182 spec by gating Clear cart behind an explicit confirmation, preserving the exact cleared-line snapshot, and offering a five-second Undo flow while retaining existing cart behavior.

## T1: Add focused confirmation, undo-window, and regression tests

Checks: AC-1, AC-2, AC-3, AC-5, AC-7

Files:

- Modify: `__tests__/CartScreen.test.js`

Tests:

- `__tests__/CartScreen.test.js::opens the clear confirmation with Clear all and Keep items without dispatching clearCart`
- `__tests__/CartScreen.test.js::keeps cart items unchanged when Keep items is selected`
- `__tests__/CartScreen.test.js::clears only after Clear all is selected and renders the empty state with Undo`
- `__tests__/CartScreen.test.js::removes Undo after five seconds without restoring items`
- `__tests__/CartScreen.test.js::keeps checkout, quantity, removal, empty-cart shopping, and free-shipping behavior available`

How to show:

- Mock the dispatch function and control cart fixtures so the tests can press Clear cart, inspect the confirmation actions, and verify no clear action is dispatched before a choice.
- Assert Keep items closes the prompt without changing the fixture or dispatching the clear thunk, and Clear all dispatches it only after confirmation.
- Use fake timers to prove the successful-clear message exposes Undo for five seconds and disappears afterward without an automatic restore.
- Preserve assertions for checkout navigation, quantity adjustment, item removal, empty-cart shopping, and the existing free-shipping messages.

## T2: Implement cart clear snapshot and Undo state transitions

Checks: AC-3, AC-4, AC-6

Files:

- Modify: `src/redux/cartSlice.jsx`
- Modify: `__tests__/cartSlice.test.js`

Tests:

- `__tests__/cartSlice.test.js::captures every cleared item and quantity for Undo`
- `__tests__/cartSlice.test.js::restores the clear snapshot through the cart state and API`
- `__tests__/cartSlice.test.js::does not retain a successful Undo snapshot when clear fails`
- `npx jest --ci --runInBand --forceExit __tests__/cartSlice.test.js`

How to show:

- Extend the clear thunk/reducer flow to retain an immutable snapshot of all cart lines at clear time, including original quantities, and expose a restore action/thunk that writes those lines back through the existing cart API contract.
- Clear the snapshot on expiry or after Undo is consumed, while leaving the existing rejected-state error mapping and original cart contents intact on failed clear requests.
- Test the exact multi-line, multi-quantity snapshot and verify the restore request and resulting state preserve item identity and quantities.

## T3: Add the confirmation prompt and five-second Undo experience

Checks: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6

Files:

- Modify: `src/screens/CartScreen.jsx`
- Modify: `__tests__/CartScreen.test.js`

Tests:

- `__tests__/CartScreen.test.js::opens the clear confirmation with Clear all and Keep items without dispatching clearCart`
- `__tests__/CartScreen.test.js::keeps cart items unchanged when Keep items is selected`
- `__tests__/CartScreen.test.js::clears only after Clear all is selected and renders the empty state with Undo`
- `__tests__/CartScreen.test.js::restores cleared items when Undo is selected before the deadline`
- `__tests__/CartScreen.test.js::shows the existing cart error instead of Undo after a failed clear`

How to show:

- Replace the direct Clear cart dispatch with a prompt containing the exact Clear all and Keep items actions; Keep items must dismiss the prompt without dispatching.
- After a fulfilled clear, render the existing empty-cart state with a short confirmation message and Undo action, dispatching the snapshot restore before the five-second deadline.
- Start and clean up the expiry timer so Undo is unavailable after five seconds, and do not restore anything automatically when it expires or is dismissed.
- Keep loading/error handling and existing cart controls consistent with the current screen, including failed-clear error rendering.

## T4: Verify focused behavior and full Jest regression coverage

Checks: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7

Files:

- `src/screens/CartScreen.jsx`
- `src/redux/cartSlice.jsx`
- `__tests__/CartScreen.test.js`
- `__tests__/cartSlice.test.js`

Tests:

- `npx jest --ci --runInBand --forceExit __tests__/CartScreen.test.js`
- `npx jest --ci --runInBand --forceExit __tests__/cartSlice.test.js`
- `npx jest --ci --runInBand --forceExit`

How to show:

- Run the focused screen and slice suites to demonstrate confirmation gating, unchanged Keep items behavior, successful clear feedback, exact quantity restoration, five-second expiry, and failed-clear handling.
- Run the full Jest command to prove existing quantity adjustment, item removal, checkout navigation, empty-cart shopping, free-shipping behavior, and unrelated repository tests remain passing; report unrelated pre-existing failures separately.
