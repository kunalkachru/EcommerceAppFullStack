# Spec v1: S-123

## Goal
Make the authenticated and signed-out Profile screen content scrollable on a phone and reserve bottom space for the overlaid bottom tab bar. When the content is scrolled to its end, the Logout button and the exact `Version 0.0.1` line must be fully reachable and visible rather than covered by the tab bar.

## Acceptance checks
- AC-1: ProfileScreen uses a scrollable content container and provides at least 120 points of bottom content padding for bottom tab clearance, while keeping the Logout and version content in the scrollable content (how to see it: test: __tests__/ProfileScreen.bottomInset.test.js::ProfileScreen bottom tab clearance > AC-1: scrolls profile content and leaves space for the bottom tab bar)
- AC-2: The ProfileScreen version line remains the exact `Version 0.0.1` text and remains after the existing profile actions in the scrollable content (how to see it: test: __tests__/ProfileScreen.version.test.js)
- AC-3: Existing ProfileScreen identity, order navigation, optional credits navigation, and logout behavior remain passing after the scroll-container and bottom-inset change (how to see it: test: the full suite)

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
