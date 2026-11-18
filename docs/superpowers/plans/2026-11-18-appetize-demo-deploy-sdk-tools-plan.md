## T1: Update the Android SDK setup action and workflow checks

Checks: AC-1, AC-2
Files:
- `.github/workflows/appetize-demo.yml`
- `__tests__/appetizeDemoWorkflow.test.js`
Tests:
- `__tests__/appetizeDemoWorkflow.test.js::Appetize demo Android workflow > AC-1: does not use setup-android v3's retired tools default`
- `__tests__/appetizeDemoWorkflow.test.js`
How to show:
Change only the Android job's Setup Android SDK action from `android-actions/setup-android@v3` to `@v4`. Preserve the pull-request trigger targeting `main` with `.github/workflows/appetize-demo.yml` in its paths, and verify the Android SDK setup step remains before the release demo APK build step. Keep the focused test aligned with those workflow properties and show it passing.

## T2: Run the regression suite for unchanged behavior

Checks: AC-3
Files:
- `.github/workflows/appetize-demo.yml`
- `__tests__/appetizeDemoWorkflow.test.js`
Tests:
- `__tests__/appetizeDemoWorkflow.test.js`
- `npx jest --ci --runInBand --forceExit`
How to show:
Run the focused workflow test and the repository's full Jest suite, confirming the SDK action update does not regress behavior outside the workflow fix.
