# Spec v1: S-119

## Goal
Update the Android job in the “Appetize demo deploy” GitHub workflow so it no longer invokes `android-actions/setup-android@v3`, whose default SDK package request includes the retired `tools` package. The workflow must use the supported Android SDK setup action, retain the pull-request trigger for changes to `.github/workflows/appetize-demo.yml`, and proceed to build the demo APK on a qualifying pull request.

## Acceptance checks
- AC-1: The Setup Android SDK step uses `android-actions/setup-android@v4` and does not use the retired v3 default (how to see it: test: __tests__/appetizeDemoWorkflow.test.js::Appetize demo Android workflow > AC-1: does not use setup-android v3's retired tools default)
- AC-2: A pull request targeting `main` that touches `.github/workflows/appetize-demo.yml` triggers the workflow, and the Android job contains the SDK setup step before the release demo APK build step (how to see it: test: __tests__/appetizeDemoWorkflow.test.js)
- AC-3: Existing behavior remains unchanged outside this workflow fix (how to see it: test: the full suite)

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
