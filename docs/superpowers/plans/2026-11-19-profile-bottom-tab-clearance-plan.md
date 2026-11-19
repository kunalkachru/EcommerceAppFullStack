# Plan: Make Profile content scrollable above the bottom tab bar

Implement the approved S-123 spec by placing both authenticated and signed-out Profile content in a scrollable container and reserving bottom content space for the overlaid tab bar, while preserving the existing actions and exact version label.

## T1: Add scrollable Profile content with bottom-tab clearance

Checks: AC-1, AC-2

Files:

- `src/screens/ProfileScreen.jsx`
- `__tests__/ProfileScreen.bottomInset.test.js`
- `__tests__/ProfileScreen.version.test.js`

Tests:

- `__tests__/ProfileScreen.bottomInset.test.js::scrolls profile content and leaves space for the bottom tab bar`
- `__tests__/ProfileScreen.version.test.js::renders the package version with the required label`
- `__tests__/ProfileScreen.version.test.js::renders the version after the existing profile actions`

How to show:

- Wrap the conditional Profile panel and the version label in a `ScrollView` that fills the screen, with content-container bottom padding of at least 120 points.
- Keep the authenticated Logout control and the exact `Version 0.0.1` label inside that scrollable content, with the version remaining after the existing profile actions.
- Preserve the screen's horizontal spacing and usable layout while ensuring the end of the scroll content can move the Logout and version line above the absolute-positioned tab bar.
- Run the focused tests to show the scroll container, required bottom inset, exact version text, and final content order.

## T2: Preserve Profile actions and navigation behavior

Checks: AC-3

Files:

- `src/screens/ProfileScreen.jsx`
- `__tests__/ProfileScreen.creditsLink.test.js`
- `__tests__/App.test.tsx`

Tests:

- `__tests__/ProfileScreen.creditsLink.test.js::preserves the optional credits navigation entry when credited models exist`
- `__tests__/ProfileScreen.creditsLink.test.js::preserves the hidden credits navigation entry when there are no credited models`
- `__tests__/ProfileScreen.creditsLink.test.js::preserves profile identity, order navigation, and logout behavior`
- `npx jest --ci --runInBand --forceExit`

How to show:

- Keep profile identity rendering, Orders navigation, conditional Credits navigation, and Logout dispatch behavior unchanged while moving the content into the scroll container.
- Run the focused behavior tests and then the full Jest suite to show the scroll and inset change introduces no regressions elsewhere in the app.
