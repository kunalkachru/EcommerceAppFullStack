# E2E Testing Guide

Complete end-to-end testing for Android and iOS with AI/ML features enabled.

## Quick Start

### Android E2E Testing

```bash
npm run e2e:android
```

This command:
- ✓ Connects to Android emulator (emulator-5554)
- ✓ Launches the app
- ✓ Verifies OpenAI API key configuration
- ✓ Tests with AI reasoning enabled

**Prerequisites:**
- Android emulator running (`emulator -avd Pixel_7_Pro`)
- App built and installed on emulator
- OpenAI API key in `src/.env` (optional, for ML features)

### iOS E2E Testing

```bash
npm run e2e:ios
```

This command:
- ✓ Checks iOS simulator availability
- ✓ Verifies Maestro testing framework
- ✓ Validates OpenAI API key configuration
- ✓ Tests with AI reasoning enabled

**Prerequisites:**
- iOS simulator running
- Maestro CLI installed
- OpenAI API key in `src/.env` (optional, for ML features)

## Testing Infrastructure

### Android Testing Architecture
- **Test Runner:** `scripts/test-android.mjs`
- **Flow Definitions:** `.maestro/android/*.yaml`
- **Framework:** ADB shell + Maestro + Backend API
- **ML/AI Verification:** OpenAI API key configuration check

### iOS Testing Architecture
- **Test Runner:** `scripts/test-ios.mjs`
- **Flow Definitions:** `.maestro/ios/*.yaml`
- **Framework:** Maestro + Backend API
- **ML/AI Verification:** OpenAI API key configuration check

## Test Coverage

### Android E2E Flows

1. **Login** (`.maestro/android/login.yaml`)
   - Form field isolation
   - Email + password entry
   - Home screen navigation

2. **Products** (`.maestro/android/products.yaml`)
   - Product browsing
   - Product detail view
   - Add to cart interaction

3. **Checkout** (`.maestro/android/checkout.yaml`)
   - Form field filling (address, city, zip, phone)
   - Payment selection
   - Order submission

4. **Orders** (`.maestro/android/orders.yaml`)
   - Order list verification
   - Order history display

5. **ML/AI Features** (`.maestro/android/ml-features.yaml`)
   - Voice search interface
   - Photo search capability
   - LLM reasoning prompts

### iOS E2E Flows

Same structure as Android under `.maestro/ios/`:
- `login.yaml` - iOS-specific login flow
- `products.yaml` - Product browsing on iOS
- `checkout.yaml` - Checkout with iOS UI patterns
- `orders.yaml` - Order history on iOS
- `ml-features.yaml` - AI features on iOS

## ML/AI Feature Testing

Both platforms test AI/ML reasoning with OpenAI API:

### Configuration

1. **Add OpenAI API key to `src/.env`:**
```bash
OPENAI_API_KEY=sk-...your-key...
```

2. **API Endpoint:** `http://127.0.0.1:5001/api/search/voice`

3. **Test Queries:**
   - "wireless headphones" → matches via LLM reasoning
   - "conversational jacket" → semantic search
   - Jumbled queries → LLM intent clarification

### Backend Verification

Tests verify:
- ✓ OpenAI API key is loaded
- ✓ LLM reasoning is enabled
- ✓ Product matching works with AI
- ✓ Search returns proper results

## Environment Variables

Create `src/.env` with:

```env
# OpenAI API Key (optional, for AI/ML features)
OPENAI_API_KEY=sk-...

# OpenRouter API Key (optional, alternative LLM provider)
OPENROUTER_API_KEY=...

# API Configuration
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

## Platform-Specific Commands

### Build & Install

**Android:**
```bash
# Build APK
npm run build:demo:apk

# Install to emulator
adb install -r dist/demo/shopease-cloud-demo.apk
```

**iOS:**
```bash
# Build iOS simulator build
npm run build:demo:ios-sim

# Run iOS simulator
npm run ios
```

### Run Emulators

**Android:**
```bash
emulator -avd Pixel_7_Pro
```

**iOS:**
```bash
# List available simulators
xcrun simctl list devices

# Boot specific simulator
xcrun simctl boot "iPhone 17 Pro Max"

# Or use Xcode to boot simulator
```

## Debugging

### Android Issues

If `adb` commands hang:
```bash
# Restart ADB daemon
adb kill-server
adb start-server

# Check device connection
adb devices
```

### iOS Issues

If Maestro flow fails:
```bash
# List connected devices
maestro list-devices

# Check simulator status
xcrun simctl list
```

### View Test Logs

Both tests generate screenshots in:
- Android: `./docs/e2e/android/`
- iOS: `./docs/e2e/ios/`

## Continuous Integration

For CI/CD pipelines, configure:

```bash
# Android
CI=true npm run e2e:android

# iOS
CI=true npm run e2e:ios
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Device not found" | Check emulator is running: `adb devices` |
| "App not installed" | Run: `npm run build:demo:apk && adb install ...` |
| "UIAutomator crash" | Use Maestro flows instead of ADB dump commands |
| "Maestro timeout" | Increase device timeout or check Maestro installation |
| "ML features not working" | Verify OpenAI key in `src/.env` |

## Test Results

Both test suites output:
- ✓ PASS: All tests passed
- ✗ FAIL: Critical failure (exit code 1)
- ! WARN: Non-critical issue (exit code 0)

Examples:
```bash
✓ ANDROID E2E TEST PASSED
  - App launches successfully
  - All systems operational
  - AI reasoning enabled

✓ iOS E2E TEST PASSED
  - iOS simulator environment ready
  - Maestro testing framework available
  - AI reasoning enabled
```

## Additional Resources

- **Maestro Documentation:** https://maestro.mobile.dev
- **Android Testing:** See `.maestro/android/` flows
- **iOS Testing:** See `.maestro/ios/` flows
- **Backend API:** http://127.0.0.1:5001/api
- **LLM Integration:** See `src/services/voiceSearchService.js`
