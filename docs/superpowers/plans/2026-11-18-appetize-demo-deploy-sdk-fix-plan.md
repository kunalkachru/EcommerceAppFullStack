# Appetize Demo Deploy SDK Fix Plan

Spec: `/work/docs/superpowers/specs/2026-11-18-appetize-demo-deploy-sdk-fix-design.md`

## T1: Extend workflow contract coverage for the PR Android build path

Checks: AC-1, AC-2

Files:
- Modify: `__tests__/appetizeDemoWorkflow.test.js`

Tests:
- `__tests__/appetizeDemoWorkflow.test.js::does not ask sdkmanager for the retired tools package`
- `__tests__/appetizeDemoWorkflow.test.js::includes the Android job in the pull-request path before building the demo APK`
- `__tests__/appetizeDemoWorkflow.test.js`

How to show:
- Keep the existing assertion that the Setup Android SDK step has a `with.packages` input and does not contain the retired `tools` package.
- Add workflow-structure assertions that the pull-request trigger includes `.github/workflows/appetize-demo.yml`, the Android job is eligible on the pull-request path, the SDK setup appears before the release demo APK step, and that step runs `npm run build:demo:apk`.
- Run the focused Jest file and show the assertions fail against the current workflow until the implementation task supplies the package list and preserves the expected PR build path.

## T2: Configure current Android SDK packages in the Appetize workflow

Checks: AC-1, AC-2

Files:
- Modify: `.github/workflows/appetize-demo.yml`

Tests:
- `__tests__/appetizeDemoWorkflow.test.js`
- `__tests__/appetizeDemoWorkflow.test.js::does not ask sdkmanager for the retired tools package`
- `__tests__/appetizeDemoWorkflow.test.js::includes the Android job in the pull-request path before building the demo APK`

How to show:
- Add a `with.packages` list to `android-actions/setup-android@v3` containing only current SDK packages required by the Android demo build; do not include the retired `tools` package.
- Preserve the existing pull-request trigger, Android job conditions, and step ordering so SDK setup completes before `Build release demo APK`, whose command remains `npm run build:demo:apk`.
- Use the focused workflow test to prove the retired-package failure is removed while the PR path still reaches the Android SDK setup and demo APK build.

## T3: Run focused and repository-wide acceptance verification

Checks: AC-1, AC-2, AC-3

Files:
- `.github/workflows/appetize-demo.yml`
- `__tests__/appetizeDemoWorkflow.test.js`

Tests:
- `npx jest --ci --runInBand --forceExit __tests__/appetizeDemoWorkflow.test.js`
- `npx jest --ci --runInBand --forceExit`

How to show:
- Run the focused workflow test and confirm the explicit SDK package, absence of `tools`, PR Android-job reachability, SDK-before-build ordering, and demo APK command assertions pass.
- Run the required full Jest suite from `/work` and confirm the workflow fix does not regress other tests; record any unrelated failure with its exact test identifier and cause without weakening these acceptance assertions.
- Treat the passing focused and full-suite checks as evidence that a PR touching `.github/workflows/appetize-demo.yml` can proceed through SDK installation and the demo APK build without the retired-package failure.

