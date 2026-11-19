# Spec v1: S-122

## Goal
Display the package version from `package.json` at the bottom of the Profile screen, formatted exactly as `Version 0.0.1` for the current package version. The version is informational, is not interactive, and must be rendered by the existing React Native Profile screen without adding a runtime dependency.

## Acceptance checks
- AC-1: The rendered Profile screen includes the exact text `Version 0.0.1`, sourced from the current `package.json` version (how to see it: test: __tests__/ProfileScreen.version.test.js)
- AC-2: The version text is rendered as the final content in the Profile screen after the existing profile actions, so it occupies the bottom position of the screen content (how to see it: test: __tests__/ProfileScreen.version.test.js)
- AC-3: The existing authenticated Profile screen behavior, including profile identity, order navigation, optional credits navigation, and logout, remains covered and passes with the version display present (how to see it: test: the full suite)

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
