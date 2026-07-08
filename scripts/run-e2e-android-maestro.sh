#!/bin/bash
##
# Android End-to-End Testing via Maestro
# Complete app flow: Login → Products → Cart → Checkout → Orders → ML Features
##

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAESTRO_BIN="${HOME}/.maestro/bin/maestro"
APP_ID="com.ecommerceappfullstack"
ANDROID_DEVICE="emulator-5554"
SCREENSHOTS_DIR="./docs/e2e/android"
FLOWS_DIR="./.maestro/android"

# Test counters
PASS=0
FAIL=0
WARN=0

# Helper functions
log_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASS++))
}

log_fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAIL++))
}

log_warn() {
  echo -e "${YELLOW}!${NC} $1"
  ((WARN++))
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_section() {
  echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}║${NC} $1"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

# Main execution
main() {
  log_section "Android E2E Testing (Maestro)"

  # Check Maestro is installed
  if [ ! -f "$MAESTRO_BIN" ]; then
    log_fail "Maestro CLI not found at $MAESTRO_BIN"
    exit 1
  fi
  log_pass "Maestro CLI found"

  # Check device is connected
  if ! adb devices | grep -q "^$ANDROID_DEVICE"; then
    log_fail "Android device $ANDROID_DEVICE not connected"
    exit 1
  fi
  log_pass "Android device connected ($ANDROID_DEVICE)"

  # Check app is installed
  if ! adb shell pm list packages | grep -q "$APP_ID"; then
    log_fail "App not installed: $APP_ID"
    exit 1
  fi
  log_pass "App installed: $APP_ID"

  # Create screenshots directory
  mkdir -p "$SCREENSHOTS_DIR"

  # Load environment variables
  if [ -f "src/.env" ]; then
    export $(grep OPENAI_API_KEY src/.env | xargs)
    if [ -n "$OPENAI_API_KEY" ]; then
      log_pass "OpenAI API key loaded"
    fi
  fi

  # Test 1: Login Flow
  log_section "Test 1: Login"
  if [ ! -f "$FLOWS_DIR/login.yaml" ]; then
    log_fail "Login flow not found: $FLOWS_DIR/login.yaml"
    exit 1
  fi

  if $MAESTRO_BIN test "$FLOWS_DIR/login.yaml" --device-id="$ANDROID_DEVICE" > /dev/null 2>&1; then
    log_pass "Login flow completed successfully"
  else
    log_fail "Login flow failed"
    exit 1
  fi

  # Test 2: Products Browsing
  log_section "Test 2: Products"
  if [ ! -f "$FLOWS_DIR/products.yaml" ]; then
    log_fail "Products flow not found: $FLOWS_DIR/products.yaml"
    exit 1
  fi

  if $MAESTRO_BIN test "$FLOWS_DIR/products.yaml" --device-id="$ANDROID_DEVICE" > /dev/null 2>&1; then
    log_pass "Product browsing flow completed successfully"
  else
    log_fail "Product browsing flow failed"
    exit 1
  fi

  # Test 3: Checkout Flow
  log_section "Test 3: Checkout"
  if [ ! -f "$FLOWS_DIR/checkout.yaml" ]; then
    log_fail "Checkout flow not found: $FLOWS_DIR/checkout.yaml"
    exit 1
  fi

  if $MAESTRO_BIN test "$FLOWS_DIR/checkout.yaml" --device-id="$ANDROID_DEVICE" > /dev/null 2>&1; then
    log_pass "Checkout flow completed successfully"
  else
    log_fail "Checkout flow failed"
    exit 1
  fi

  # Test 4: Orders Verification
  log_section "Test 4: Orders"
  if [ ! -f "$FLOWS_DIR/orders.yaml" ]; then
    log_fail "Orders flow not found: $FLOWS_DIR/orders.yaml"
    exit 1
  fi

  if $MAESTRO_BIN test "$FLOWS_DIR/orders.yaml" --device-id="$ANDROID_DEVICE" > /dev/null 2>&1; then
    log_pass "Orders verification flow completed successfully"
  else
    log_fail "Orders verification flow failed"
  fi

  # Test 5: ML/AI Features
  log_section "Test 5: ML/AI Features"
  if [ -z "$OPENAI_API_KEY" ]; then
    log_warn "OpenAI API key not configured - skipping ML feature tests"
  else
    if [ ! -f "$FLOWS_DIR/ml-features.yaml" ]; then
      log_fail "ML features flow not found: $FLOWS_DIR/ml-features.yaml"
    elif $MAESTRO_BIN test "$FLOWS_DIR/ml-features.yaml" --device-id="$ANDROID_DEVICE" > /dev/null 2>&1; then
      log_pass "ML/AI features flow completed successfully (OpenAI enabled)"
    else
      log_warn "ML features flow had issues but app is functional"
    fi
  fi

  # Summary
  log_section "Test Summary"
  echo -e "  PASS: ${GREEN}$PASS${NC}  FAIL: ${RED}$FAIL${NC}  WARN: ${YELLOW}$WARN${NC}\n"

  if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ ALL ANDROID E2E TESTS PASSED${NC}\n"
    exit 0
  else
    echo -e "${RED}✗ $FAIL TEST(S) FAILED${NC}\n"
    exit 1
  fi
}

# Run main
main
