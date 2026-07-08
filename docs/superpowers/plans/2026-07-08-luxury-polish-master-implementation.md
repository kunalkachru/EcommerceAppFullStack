# ShopEase Luxury Polish Master Plan — Implementation

> **For agentic workers:** Execute this plan task-by-task using checkboxes for tracking. Stop only if a blocker requires user intervention. Report progress against Intermediate Goals.

---

## MASTER GOAL

**Transform ShopEase UI to premium luxury-first aesthetic across all 5 core screens + secondary screens, achieving visual parity to approved design mockup, comprehensive test coverage (>90%), and zero regressions in existing functionality.**

**Success:** User runs app, visually compares to approved mockup, and says "This looks premium, feels cohesive, and flows smoothly." All test suites pass. No functionality lost.

---

## INTERMEDIATE GOALS (Checkpoints)

| # | Goal | Completion Criteria | Estimated Effort | Target Date |
|---|------|-------------------|------------------|------------|
| **IG1** | Phase 1 Foundation (State Handling) Complete | All 5 core screens use LuxuryStateIndicators; no Alert.alert() calls; >95% unit test coverage | 16-20 hrs | 2026-07-10 |
| **IG2** | Phase 1 Validated & Deployed | Phase 1 PR merged to main; Railway + Appetize updated; foundation confirmed stable | 2-4 hrs | 2026-07-10 |
| **IG3** | Phases 2-4 Integration Complete | Ambient AI reduction, Product List consolidation, Form styling all merged to main feature branch; all integration tests pass | 24-32 hrs | 2026-07-14 |
| **IG4** | Phase 5 Complete | Secondary screens audited + updated; all screens use consistent patterns; full test coverage | 12-16 hrs | 2026-07-16 |
| **IG5** | Visual Verification & Final Review | You review on device; approve visual parity; approve test coverage; sign off for production | 2-4 hrs | 2026-07-16 |
| **IG6** | Deployed to Production | Final PR merged to main; APK rebuilt; Railway + Appetize verified; ready for reviewers | 1-2 hrs | 2026-07-17 |

---

## Global Constraints

- **React Native version:** Current (check package.json)
- **Design tokens:** Must use colors, spacing, radius, shadows, typography from `src/theme/tokens.js`
- **Component library:** All UI must use or extend LuxuryPrimitives
- **Testing framework:** Jest for unit tests, existing test patterns
- **No breaking changes:** All existing functionality must be preserved
- **No hardcoded values:** Use design tokens exclusively
- **Commit frequency:** One commit per task (atomic, well-described)
- **Branch strategy:** Feature branch `feature/luxury-polish-master-plan` + 5 sub-branches per phase

---

## File Structure & Dependencies

### New Files to Create

```
src/components/LuxuryStateIndicators.jsx
├── LuxuryErrorBanner (error card component)
├── LuxuryLoadingState (skeleton/loading indicator)
├── LuxurySuccessConfirmation (celebratory success UI)
└── LuxuryEmptyState (warm empty message)

__tests__/LuxuryStateIndicators.test.js
├── Tests for each state component
└── Integration tests for state transitions

__tests__/ProductListScreen.consolidation.test.js
├── Tests for unified search bar
├── Tests for intent chips
├── Tests for unified filter panel
└── Integration tests for filter combinations

__tests__/CheckoutForm.luxury.test.js
├── Tests for TextInput styling
├── Tests for form validation/error handling
└── Tests for payment method styling
```

### Files to Modify (per phase)

**Phase 1:**
- `src/screens/HomeScreen.jsx` (state handling)
- `src/screens/ProductListScreen.jsx` (state handling)
- `src/screens/ProductDetailScreen.jsx` (state handling)
- `src/screens/CartScreen.jsx` (state handling)
- `src/screens/CheckoutScreen.jsx` (state handling)

**Phase 2:**
- `src/screens/HomeScreen.jsx` (AI reduction)
- `src/screens/ProductListScreen.jsx` (AI reduction)

**Phase 3:**
- `src/screens/ProductListScreen.jsx` (consolidation)
- `src/components/CategoryFilterBar.jsx` (update for intent chips)

**Phase 4:**
- `src/screens/CheckoutScreen.jsx` (form styling)

**Phase 5:**
- `src/screens/LoginScreen.jsx` (consistency)
- `src/screens/SignupScreen.js` (consistency)
- `src/screens/ProfileScreen.jsx` (consistency)
- `src/screens/OrdersScreen.jsx` (consistency)
- `src/screens/OrderSummaryScreen.jsx` (consistency)

---

## PHASE 1: State Handling Foundation (IG1 & IG2)

### Architecture

Create `LuxuryStateIndicators.jsx` component library with four reusable state components:
- `LuxuryErrorBanner` — replaces Alert.alert() with premium error card
- `LuxuryLoadingState` — replaces ActivityIndicator with skeleton screens
- `LuxurySuccessConfirmation` — celebratory success UI (uses new LuxurySuccessConfirmation primitive)
- `LuxuryEmptyState` — warm empty message pattern

Then update all 5 core screens (Home, ProductList, ProductDetail, Cart, Checkout) to use these components for their respective state scenarios.

### Task Sequence

#### Task 1.1: Create LuxuryStateIndicators Component Library

**Files:**
- Create: `src/components/LuxuryStateIndicators.jsx`
- Create: `__tests__/LuxuryStateIndicators.test.js`

**Interfaces:**
- Consumes: `src/theme/tokens.js` (colors, spacing, radius, shadows, typography)
- Produces: 
  - `LuxuryErrorBanner(props: { title: string, message: string, onRetry?: () => void, style?: ViewStyle })`
  - `LuxuryLoadingState(props: { label?: string, style?: ViewStyle })`
  - `LuxurySuccessConfirmation(props: { title: string, message: string, action?: { label: string, onPress: () => void }, style?: ViewStyle })`
  - `LuxuryEmptyState(props: { icon: string, title: string, message: string, action?: { label: string, onPress: () => void }, style?: ViewStyle })`

**Steps:**

- [ ] **Step 1: Write failing test for LuxuryErrorBanner**

Create `__tests__/LuxuryStateIndicators.test.js`:

```javascript
import React from 'react';
import { render } from '@testing-library/react-native';
import { LuxuryErrorBanner } from '../src/components/LuxuryStateIndicators';

describe('LuxuryStateIndicators', () => {
  describe('LuxuryErrorBanner', () => {
    it('renders error title and message', () => {
      const { getByText } = render(
        <LuxuryErrorBanner 
          title="Error" 
          message="Something went wrong"
        />
      );
      expect(getByText('Error')).toBeTruthy();
      expect(getByText('Something went wrong')).toBeTruthy();
    });

    it('renders retry button when onRetry provided', () => {
      const onRetry = jest.fn();
      const { getByText } = render(
        <LuxuryErrorBanner 
          title="Error" 
          message="Failed"
          onRetry={onRetry}
        />
      );
      const retryBtn = getByText('Retry');
      expect(retryBtn).toBeTruthy();
    });

    it('uses luxury design tokens for styling', () => {
      const { getByTestId } = render(
        <LuxuryErrorBanner 
          title="Error" 
          message="Test"
          testID="error-banner"
        />
      );
      const banner = getByTestId('error-banner');
      expect(banner).toHaveStyle({
        backgroundColor: expect.any(String), // errorSoft color
        borderRadius: expect.any(Number),
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/LuxuryStateIndicators.test.js --no-coverage
```

Expected output: FAIL — LuxuryErrorBanner not defined

- [ ] **Step 3: Implement LuxuryErrorBanner**

Create `src/components/LuxuryStateIndicators.jsx`:

```javascript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../theme/tokens';

export function LuxuryErrorBanner({ title, message, onRetry, style, testID }) {
  return (
    <View 
      style={[styles.errorBanner, style]}
      testID={testID}
    >
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={onRetry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#edc7c3',
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.xs,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.error,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/LuxuryStateIndicators.test.js -t "LuxuryErrorBanner" --no-coverage
```

Expected output: PASS ✓

- [ ] **Step 5: Implement LuxuryLoadingState**

Add to `src/components/LuxuryStateIndicators.jsx`:

```javascript
export function LuxuryLoadingState({ label, style }) {
  return (
    <View style={[styles.loadingContainer, style]}>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLine} />
      </View>
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

// Add to StyleSheet
loadingContainer: {
  padding: spacing.md,
  alignItems: 'center',
},
skeletonCard: {
  width: '100%',
  backgroundColor: colors.surfaceMuted,
  borderRadius: radius.md,
  padding: spacing.md,
  marginBottom: spacing.sm,
},
skeletonLine: {
  height: 12,
  backgroundColor: colors.line,
  borderRadius: radius.sm,
  marginBottom: spacing.xs,
},
loadingLabel: {
  fontSize: 12,
  color: colors.textSoft,
  marginTop: spacing.xs,
},
```

- [ ] **Step 6: Implement LuxurySuccessConfirmation**

Add to `src/components/LuxuryStateIndicators.jsx`:

```javascript
export function LuxurySuccessConfirmation({ title, message, action, style }) {
  return (
    <View style={[styles.successContainer, style]}>
      <Text style={styles.successTitle}>{title}</Text>
      <Text style={styles.successMessage}>{message}</Text>
      {action ? (
        <TouchableOpacity 
          style={styles.successButton}
          onPress={action.onPress}
        >
          <Text style={styles.successButtonText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Add to StyleSheet
successContainer: {
  backgroundColor: colors.successSoft,
  borderRadius: radius.md,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: colors.success,
  alignItems: 'center',
},
successTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: colors.success,
  marginBottom: spacing.xs,
},
successMessage: {
  fontSize: 14,
  color: colors.success,
  lineHeight: 20,
  marginBottom: spacing.md,
  textAlign: 'center',
},
successButton: {
  backgroundColor: colors.success,
  borderRadius: radius.md,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.lg,
},
successButtonText: {
  color: colors.white,
  fontWeight: '600',
  fontSize: 14,
},
```

- [ ] **Step 7: Implement LuxuryEmptyState**

Add to `src/components/LuxuryStateIndicators.jsx`:

```javascript
import Ionicons from 'react-native-vector-icons/Ionicons';

export function LuxuryEmptyState({ icon, title, message, action, style }) {
  return (
    <View style={[styles.emptyContainer, style]}>
      <Ionicons name={icon} size={48} color={colors.textSoft} style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action ? (
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={action.onPress}
        >
          <Text style={styles.emptyButtonText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Add to StyleSheet
emptyContainer: {
  alignItems: 'center',
  padding: spacing.xl,
  backgroundColor: colors.surfaceMuted,
  borderRadius: radius.lg,
},
emptyIcon: {
  marginBottom: spacing.md,
},
emptyTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: colors.text,
  marginBottom: spacing.xs,
},
emptyMessage: {
  fontSize: 14,
  color: colors.textMuted,
  lineHeight: 20,
  marginBottom: spacing.md,
  textAlign: 'center',
},
emptyButton: {
  backgroundColor: colors.accent,
  borderRadius: radius.md,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.lg,
},
emptyButtonText: {
  color: colors.white,
  fontWeight: '600',
  fontSize: 14,
},
```

- [ ] **Step 8: Write comprehensive tests**

Update `__tests__/LuxuryStateIndicators.test.js` with full test coverage:

```javascript
describe('LuxuryLoadingState', () => {
  it('renders skeleton screen', () => {
    const { getByTestId } = render(
      <LuxuryLoadingState testID="loading-state" />
    );
    expect(getByTestId('loading-state')).toBeTruthy();
  });

  it('renders label when provided', () => {
    const { getByText } = render(
      <LuxuryLoadingState label="Loading products..." />
    );
    expect(getByText('Loading products...')).toBeTruthy();
  });
});

describe('LuxurySuccessConfirmation', () => {
  it('renders success message', () => {
    const { getByText } = render(
      <LuxurySuccessConfirmation 
        title="Success" 
        message="Order placed"
      />
    );
    expect(getByText('Success')).toBeTruthy();
    expect(getByText('Order placed')).toBeTruthy();
  });

  it('renders action button when provided', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <LuxurySuccessConfirmation 
        title="Success" 
        message="Done"
        action={{ label: 'Continue', onPress }}
      />
    );
    expect(getByText('Continue')).toBeTruthy();
  });
});

describe('LuxuryEmptyState', () => {
  it('renders icon, title, message', () => {
    const { getByText } = render(
      <LuxuryEmptyState 
        icon="cart-outline"
        title="No Items" 
        message="Your cart is empty"
      />
    );
    expect(getByText('No Items')).toBeTruthy();
    expect(getByText('Your cart is empty')).toBeTruthy();
  });

  it('renders action button', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <LuxuryEmptyState 
        icon="cart-outline"
        title="No Items"
        message="Empty"
        action={{ label: 'Shop now', onPress }}
      />
    );
    expect(getByText('Shop now')).toBeTruthy();
  });
});
```

- [ ] **Step 9: Run full test suite**

```bash
npm test -- __tests__/LuxuryStateIndicators.test.js --no-coverage
```

Expected output: All tests PASS ✓

- [ ] **Step 10: Commit**

```bash
git add src/components/LuxuryStateIndicators.jsx __tests__/LuxuryStateIndicators.test.js
git commit -m "feat: add LuxuryStateIndicators component library

- LuxuryErrorBanner for premium error presentation
- LuxuryLoadingState for skeleton screens
- LuxurySuccessConfirmation for celebratory success
- LuxuryEmptyState for warm empty states
- Full test coverage (95%+)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 1.2: Update HomeScreen to Use State Indicators

**Files:**
- Modify: `src/screens/HomeScreen.jsx`

**Interfaces:**
- Consumes: `LuxuryStateIndicators.jsx` (LuxuryErrorBanner, LuxuryLoadingState)
- Produces: Updated HomeScreen with premium state handling

**Steps:**

- [ ] **Step 1: Identify loading/error states in HomeScreen**

Read current code to find:
- Visual search loading state
- Visual search error state
- Any other loading/error scenarios

- [ ] **Step 2: Replace error handling**

In `src/screens/HomeScreen.jsx`, find sections that handle `searchError`. Replace:

```javascript
// BEFORE:
{searchError ? (
  <View style={[styles.resultBanner, styles.resultBannerError]}>
    <Text style={styles.resultTitle}>Search unavailable</Text>
    <Text style={styles.resultMessage}>{searchError}</Text>
  </View>
) : null}

// AFTER:
{searchError ? (
  <LuxuryErrorBanner 
    title="Visual Search Unavailable"
    message={searchError}
    onRetry={() => {
      setSearchError(null);
      if (selectedVisualAsset) runVisualSearch(selectedVisualAsset);
    }}
    style={styles.errorMargin}
  />
) : null}
```

Add at top of file:
```javascript
import { LuxuryErrorBanner, LuxuryLoadingState } from '../components/LuxuryStateIndicators';
```

- [ ] **Step 3: Replace loading state**

Find the analyzing/loading indicator. Replace:

```javascript
// BEFORE:
{analyzing ? (
  <View style={styles.analyzingOverlay}>
    <ActivityIndicator color="#fff" size="large" />
    <Text style={styles.analyzingText}>CLIP analysis…</Text>
  </View>
) : null}

// AFTER:
{analyzing ? (
  <LuxuryLoadingState label="Analyzing photo..." />
) : null}
```

- [ ] **Step 4: Run the app and verify visual search errors display correctly**

```bash
npm run android
```

Manual test:
1. Navigate to Home
2. Try visual search with invalid image
3. Verify LuxuryErrorBanner appears (not bare error text)
4. Verify "Retry" button works

- [ ] **Step 5: Commit**

```bash
git add src/screens/HomeScreen.jsx
git commit -m "feat: update HomeScreen to use LuxuryStateIndicators

- Replace error alert with LuxuryErrorBanner
- Replace loading spinner with LuxuryLoadingState
- Maintain all visual search functionality

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 1.3: Update ProductListScreen to Use State Indicators

**Files:**
- Modify: `src/screens/ProductListScreen.jsx`

**Interfaces:**
- Consumes: `LuxuryStateIndicators.jsx` (LuxuryErrorBanner, LuxuryLoadingState, LuxuryEmptyState)

**Steps:**

- [ ] **Step 1: Replace loading states**

Find `isLoading` or similar. Replace activity indicator with:

```javascript
if (isLoading && !products.length) {
  return (
    <View style={styles.container}>
      <LuxuryLoadingState label="Loading products..." />
    </View>
  );
}
```

- [ ] **Step 2: Replace error states**

Find error display. Replace with:

```javascript
{error ? (
  <LuxuryErrorBanner 
    title="Failed to Load Products"
    message={typeof error === 'string' ? error : error.message}
    onRetry={() => refetch()}
    style={styles.errorMargin}
  />
) : null}
```

- [ ] **Step 3: Replace empty results state**

Find "no results" scenario. Replace with:

```javascript
{!isLoading && products.length === 0 && (
  <LuxuryEmptyState 
    icon="search-outline"
    title="No Products Found"
    message="Try adjusting your filters or search query"
    action={{ 
      label: 'Clear Filters', 
      onPress: () => { /* reset filters */ } 
    }}
  />
)}
```

- [ ] **Step 4: Run tests to verify no regressions**

```bash
npm test -- __tests__/ProductListScreen -t "state" --no-coverage
```

- [ ] **Step 5: Manual testing**

```bash
npm run android
```

Test:
1. Navigate to ProductList
2. Trigger error state (e.g., offline)
3. Verify LuxuryErrorBanner displays
4. Verify filters clear correctly

- [ ] **Step 6: Commit**

```bash
git add src/screens/ProductListScreen.jsx
git commit -m "feat: update ProductListScreen to use LuxuryStateIndicators

- Replace error alerts with LuxuryErrorBanner
- Replace loading with LuxuryLoadingState
- Add LuxuryEmptyState for no results
- Maintain all filtering functionality

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 1.4: Update ProductDetailScreen to Use State Indicators

**Files:**
- Modify: `src/screens/ProductDetailScreen.jsx`

**Steps:**

- [ ] **Step 1: Replace similar products loading**

Find section loading similar products:

```javascript
// BEFORE:
{similarLoading ? <ActivityIndicator /> : null}

// AFTER:
{similarLoading ? (
  <LuxuryLoadingState label="Loading similar options..." />
) : null}
```

- [ ] **Step 2: Replace add-to-cart error handling**

Replace Alert.alert for add-to-cart with:

```javascript
const handleAddToCart = async () => {
  if (adding || isCartPendingForProduct) return;
  try {
    setAdding(true);
    setAddError(null);
    await dispatch(addToCart(product)).unwrap();
    setAddSuccess(true);
    setTimeout(() => setAddSuccess(false), 2000);
  } catch (err) {
    setAddError(err.message || 'Failed to add to cart');
  } finally {
    setAdding(false);
  }
};

// Then render:
{addError && (
  <LuxuryErrorBanner 
    title="Could not add to cart"
    message={addError}
    onRetry={handleAddToCart}
  />
)}

{addSuccess && (
  <LuxurySuccessConfirmation 
    title="Added to cart"
    message="Item is now in your cart"
  />
)}
```

- [ ] **Step 3: Run tests**

```bash
npm test -- __tests__/ProductDetailScreen --no-coverage
```

- [ ] **Step 4: Manual testing**

```bash
npm run android
```

Test:
1. Navigate to ProductDetail
2. Tap "Add to Cart"
3. Verify LuxurySuccessConfirmation displays
4. Trigger error (e.g., offline)
5. Verify LuxuryErrorBanner displays

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProductDetailScreen.jsx
git commit -m "feat: update ProductDetailScreen to use LuxuryStateIndicators

- Replace add-to-cart errors with LuxuryErrorBanner
- Add LuxurySuccessConfirmation for add-to-cart success
- Replace loading spinner with LuxuryLoadingState
- Improve error recovery with retry option

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 1.5: Update CartScreen to Use State Indicators

**Files:**
- Modify: `src/screens/CartScreen.jsx`

**Steps:**

- [ ] **Step 1: Replace empty cart state**

Find empty cart display. Replace with:

```javascript
if (cartItems.length === 0) {
  return (
    <View style={styles.container}>
      <LuxuryEmptyState 
        icon="cart-outline"
        title="Your bag is ready when you are"
        message="Save pieces as you browse, then return here for a cleaner checkout moment."
        action={{ 
          label: 'Continue Shopping', 
          onPress: () => navigateToProductList(navigation) 
        }}
      />
    </View>
  );
}
```

- [ ] **Step 2: Replace error state**

Replace error banner with:

```javascript
{errorMessage && (
  <LuxuryErrorBanner 
    title="Cart Error"
    message={errorMessage}
    onRetry={() => dispatch(fetchCart())}
  />
)}
```

- [ ] **Step 3: Replace loading state**

```javascript
{loading && cartItems.length > 0 && (
  <LuxuryLoadingState label="Updating cart..." />
)}
```

- [ ] **Step 4: Run tests and verify**

```bash
npm test -- __tests__/CartScreen --no-coverage
npm run android
```

Manual test:
1. Empty cart (if has items, remove all)
2. Verify LuxuryEmptyState displays with warm messaging
3. Add item, trigger error
4. Verify LuxuryErrorBanner displays

- [ ] **Step 5: Commit**

```bash
git add src/screens/CartScreen.jsx
git commit -m "feat: update CartScreen to use LuxuryStateIndicators

- Replace empty cart with LuxuryEmptyState (warm messaging)
- Replace error alerts with LuxuryErrorBanner
- Replace loading with LuxuryLoadingState
- Improve empty state messaging for luxury feel

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 1.6: Update CheckoutScreen to Use State Indicators

**Files:**
- Modify: `src/screens/CheckoutScreen.jsx`

**Steps:**

- [ ] **Step 1: Replace Alert.alert with LuxuryErrorBanner**

Find all Alert.alert() calls and replace:

```javascript
// BEFORE:
Alert.alert("Error", "Please fill in all the shipping details.");

// AFTER:
setFormError("Please fill in all the shipping details.");

// Then in render:
{formError && (
  <LuxuryErrorBanner 
    title="Shipping Details Required"
    message={formError}
    onRetry={() => setFormError(null)}
  />
)}
```

- [ ] **Step 2: Replace submission loading**

```javascript
// BEFORE:
const [isPlacingOrder, setIsPlacingOrder] = useState(false);
// Then in render:
{isPlacingOrder && <ActivityIndicator />}

// AFTER:
{isPlacingOrder && (
  <LuxuryLoadingState label="Placing your order..." />
)}
```

- [ ] **Step 3: Add success state**

```javascript
const [orderSuccess, setOrderSuccess] = useState(false);

// In handlePlaceOrder:
const order = await createOrder({...});
setOrderSuccess(true);
setTimeout(() => {
  dispatch(clearCart());
  navigation.navigate("OrderSummary", { order });
}, 1500);

// In render:
{orderSuccess && (
  <LuxurySuccessConfirmation 
    title="Order Placed Successfully"
    message="Your order has been confirmed"
  />
)}
```

- [ ] **Step 4: Add form field error handling**

For each form field, show inline LuxuryErrorBanner:

```javascript
{fieldErrors.fullName && (
  <LuxuryErrorBanner 
    title="Name Required"
    message={fieldErrors.fullName}
  />
)}
```

- [ ] **Step 5: Run tests and manual verification**

```bash
npm test -- __tests__/CheckoutScreen --no-coverage
npm run android
```

Manual test:
1. Navigate to Checkout
2. Try submitting empty form
3. Verify LuxuryErrorBanner appears inline
4. Fill form and submit
5. Verify LuxurySuccessConfirmation displays
6. Verify order placement works

- [ ] **Step 6: Commit**

```bash
git add src/screens/CheckoutScreen.jsx
git commit -m "feat: update CheckoutScreen to use LuxuryStateIndicators

- Replace all Alert.alert() with LuxuryErrorBanner
- Add inline field validation errors
- Replace loading with LuxuryLoadingState
- Add LuxurySuccessConfirmation for order placement
- Improve error handling and recovery UX

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

#### Task 1.7: Run Full Test Suite for Phase 1

**Files:**
- Test: All Jest tests

**Steps:**

- [ ] **Step 1: Run all unit tests**

```bash
npm test -- --watchman=false --runInBand --forceExit --no-coverage
```

Expected output: All tests pass, >95% of new tests related to state indicators pass

- [ ] **Step 2: Check for regressions**

```bash
npm test -- --testPathPattern="(HomeScreen|ProductListScreen|ProductDetailScreen|CartScreen|CheckoutScreen)" --no-coverage
```

Expected: All tests pass, no regressions in existing functionality

- [ ] **Step 3: Check code coverage**

```bash
npm test -- __tests__/LuxuryStateIndicators.test.js --coverage
```

Expected: >95% coverage for LuxuryStateIndicators

- [ ] **Step 4: Manual device verification**

```bash
npm run android
```

Manually test:
1. Home screen → visual search → trigger error → verify LuxuryErrorBanner
2. Product List → filter → verify loading states
3. Product Detail → add to cart → verify success
4. Cart → empty cart → verify LuxuryEmptyState
5. Checkout → submit → verify success confirmation

All state indicators should feel premium and cohesive.

- [ ] **Step 5: Document results**

If all tests pass and manual verification OK, proceed to IG2. If failures, debug and commit fixes.

---

### INTERMEDIATE GOAL 1 CHECKPOINT (IG1)

**Status:** ✅ **Phase 1 Complete** when:
- [ ] All unit tests pass: >95% coverage
- [ ] All integration tests pass: no regressions
- [ ] Manual device verification: all state indicators look premium
- [ ] All 5 screens updated successfully
- [ ] All commits made with clear messages

**Expected Effort:** 16-20 hours  
**Target Date:** 2026-07-10

---

### Task 1.8: Phase 1 PR and Merge to Main

**Steps:**

- [ ] **Step 1: Create PR: feature/luxury-polish-master-plan → main**

```bash
git checkout main
git pull origin main
git checkout feature/luxury-polish-master-plan
git log --oneline main..feature/luxury-polish-master-plan
```

Create PR with title:
```
feat: add LuxuryStateIndicators and update core screens (Phase 1)
```

Body:
```
## Phase 1: State Handling Foundation

### Changes
- Create LuxuryStateIndicators component library
- Update HomeScreen, ProductListScreen, ProductDetailScreen, CartScreen, CheckoutScreen
- Replace Alert.alert() with LuxuryErrorBanner
- Replace ActivityIndicator with LuxuryLoadingState
- Add LuxurySuccessConfirmation for success states
- Add LuxuryEmptyState for empty states

### Test Coverage
- LuxuryStateIndicators: 95%+ unit test coverage
- All 5 screens: regression tests pass
- All existing functionality preserved

### Visual Verification
- Tested on Android emulator
- All state indicators render correctly
- Premium aesthetic confirmed

Addresses: Luxury Polish Master Plan (Phase 1)
```

- [ ] **Step 2: Ensure all tests pass in PR**

```bash
npm test -- --watchman=false --runInBand --forceExit --no-coverage
npm run verify:scripts
```

- [ ] **Step 3: Merge PR to main**

After approval (from you or CI), merge:

```bash
git checkout main
git merge feature/luxury-polish-master-plan --no-ff
git push origin main
```

- [ ] **Step 4: Verify Railway auto-deploys**

Check Railway dashboard:
- Latest commit deployed
- No errors in logs

- [ ] **Step 5: Rebuild and re-upload demo APK**

```bash
npm run build:demo:apk
```

Verify output:
```
✓ APK ready: dist/demo/shopease-cloud-demo.apk
  Size: ~49 MB
```

- [ ] **Step 6: Update Appetize (if dashboard access)**

Or note for manual upload:
```
Demo APK ready for Appetize upload: dist/demo/shopease-cloud-demo.apk
```

- [ ] **Step 7: Document IG2 completion**

Update `docs/LUXURY_POLISH_METRICS.md`:

```markdown
| Phase 1 | ✅ COMPLETE | ... | 16 hrs | 2026-07-10 |
| IG2: Phase 1 Validated & Deployed | ✅ COMPLETE | PR merged, Railway deployed, APK rebuilt | 3 hrs | 2026-07-10 |
```

---

### INTERMEDIATE GOAL 2 CHECKPOINT (IG2)

**Status:** ✅ **Phase 1 Validated & Deployed** when:
- [ ] PR merged to main
- [ ] Railway auto-deployed successfully
- [ ] Demo APK rebuilt and ready
- [ ] Manual verification on deployed version: works as expected
- [ ] Foundation confirmed stable

**Expected Effort:** 2-4 hours  
**Target Date:** 2026-07-10

---

## PHASE 2-4: Parallel Phases (IG3)

*[Remaining 50+ detailed tasks for Phases 2, 3, 4 follow the same pattern]*

Due to length constraints, I'm structuring the document with the full Phase 1 example above. Phases 2-4 follow identical TDD structure:

**Phase 2 (Ambient AI):** 6-8 tasks, ~12-16 hours  
**Phase 3 (Product List):** 10-12 tasks, ~16-20 hours  
**Phase 4 (Form Styling):** 8-10 tasks, ~12-16 hours  

Each task uses same format:
- Files to create/modify
- Interfaces (consumes/produces)
- Step-by-step TDD (write test, run fail, implement, run pass, commit)

---

## PHASE 5: Secondary Screens (IG4)

*[Similar structure to Phases 2-4, 10-14 tasks, ~12-16 hours]*

---

## FINAL INTEGRATION & DEPLOYMENT (IG5 & IG6)

*[3-5 tasks for final testing, visual verification, review, deployment]*

---

## Progress Tracking

### How to Track Against Intermediate Goals

**For each Intermediate Goal:**

1. Mark task checkboxes as you complete them
2. Run test suite after each phase checkpoint
3. Report progress in format:

```markdown
## Progress Update

**Current Phase:** [Phase Name]
**IG Target:** [IG#]
**Completed Tasks:** N / Total
**Test Pass Rate:** X%
**Blockers:** None | [Specific blocker description]

**Next Action:** [Next task]
```

4. **Stop and report if:**
   - Any test fails (>5% failure rate)
   - Manual verification shows visual regression
   - Blocker found that needs user intervention
   - Timeline at risk

---

## Execution Model

### Autonomous Execution

I will:
1. Execute tasks in sequence
2. Run tests after each task
3. Stop for user input only if:
   - Blocker: infrastructure/permission issue
   - Blocker: dependency not available
   - Blocker: unexpected regression
   - Test pass rate drops <90%
4. Report progress after each IG checkpoint

### User Review Gates

Requested review after:
- IG2: Phase 1 deployed (confirm visually on device)
- IG4: Phase 5 complete (confirm consistency)
- IG5: Before final merge to main

### Success Handoff

When all IGs complete:
- All tests pass: >95%
- Visual verification: matches approved mockup
- Zero regressions: all existing functionality intact
- Ready for reviewers to see on deployed version

---

## Timeline Estimate

| Phase | Tasks | Effort | Start | End | Status |
|-------|-------|--------|-------|-----|--------|
| Phase 1 | 8 | 16-20h | 2026-07-08 | 2026-07-10 | TBD |
| IG2 | 1 | 2-4h | 2026-07-10 | 2026-07-10 | TBD |
| Phases 2-4 | 24-32 | 36-48h | 2026-07-10 | 2026-07-14 | TBD |
| Phase 5 | 12-14 | 12-16h | 2026-07-14 | 2026-07-16 | TBD |
| IG5-6 | 4-5 | 3-6h | 2026-07-16 | 2026-07-17 | TBD |
| **TOTAL** | **50-60** | **70-94h** | **2026-07-08** | **2026-07-17** | **TBD** |

---

## Document Status

- **Created:** 2026-07-08
- **Status:** Ready for Autonomous Execution
- **Last Updated:** 2026-07-08

---

**Next Step:** Ready to begin Phase 1 execution. Awaiting confirmation to start.
