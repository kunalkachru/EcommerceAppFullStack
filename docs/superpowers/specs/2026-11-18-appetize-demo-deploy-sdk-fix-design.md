# Spec v1: S-121

## Goal
Fix the `Appetize demo deploy` GitHub workflow's Android SDK setup so `android-actions/setup-android@v3` receives an explicit list of current SDK packages and does not request the retired `tools` package. When a pull request touches `.github/workflows/appetize-demo.yml`, the Android job must complete SDK installation and proceed to build the demo APK.

## Acceptance checks
- AC-1: The Android SDK setup step declares a `packages` input and does not ask sdkmanager for the retired `tools` package (how to see it: test: __tests__/appetizeDemoWorkflow.test.js::Appetize demo Android SDK setup > does not ask sdkmanager for the retired tools package)
- AC-2: The pull-request workflow path includes the Android job, whose SDK setup completes before the release demo APK build step and whose build step invokes the demo APK build command (how to see it: test: __tests__/appetizeDemoWorkflow.test.js)
- AC-3: A pull request touching `.github/workflows/appetize-demo.yml` can run the Android job through SDK installation and demo APK build without the retired-package failure (how to see it: test: the full suite)

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
