# Plan: Show app version at the bottom of the Profile screen

Implement the approved S-122 spec by rendering the current root `package.json` version as a non-interactive `Version <version>` label after the existing Profile actions, while preserving both authenticated and signed-out behavior.

## T1: Render the package version after the Profile actions

Checks: AC-1, AC-2

Files:

- `src/screens/ProfileScreen.jsx`
- `package.json`

Tests:

- `__tests__/ProfileScreen.version.test.js::renders the package version with the required label`
- `__tests__/ProfileScreen.version.test.js::renders the version after the existing profile actions`

How to show:

- Read the version from the root `package.json` and render the exact current text `Version 0.0.1` in the Profile screen.
- Keep the label non-interactive and place it after the logout action in the authenticated panel so it is the final Profile content.
- Verify the focused test asserts the exact text and the rendered order relative to the existing action controls.

## T2: Preserve existing Profile behavior with the version present

Checks: AC-3

Files:

- `__tests__/ProfileScreen.version.test.js`
- `__tests__/ProfileScreen.creditsLink.test.js`
- `src/screens/ProfileScreen.jsx`

Tests:

- `__tests__/ProfileScreen.version.test.js`
- `__tests__/ProfileScreen.creditsLink.test.js`
- `npx jest --ci --runInBand --forceExit`

How to show:

- Exercise the authenticated Profile render and existing controls without changing their identity, order navigation, optional credits navigation, or logout behavior.
- Run the full Jest suite and confirm the version display does not regress the existing Profile coverage or other app behavior.
