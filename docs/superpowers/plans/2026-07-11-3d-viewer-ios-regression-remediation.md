# 3D Viewer iOS Regression Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan is executed inline and sequentially (no subagent dispatch) per this project's standing convention — proceed straight through without pausing for check-ins, and stop only for a genuine blocker, not for routine confirmation.

**Goal:** Fix the confirmed iOS-only regression where the 3D product viewer silently never
renders (stuck loading forever), fix the Maestro assertion weakness that let it ship as "plan
complete" despite extensive coverage, and re-verify all 12 categories on both platforms with a
corrected assertion before PR #3 is allowed to merge.

**Architecture:** No new components. One CSP directive removed server-side
(`server/src/index.js`), one assertion block replaced in both platforms' `product-3d-viewer.yaml`
Maestro flows, then a full 12-category × 2-platform re-verification sweep plus the existing
regression suites, followed by a correction to the (currently inaccurate) plan-completion status
in `docs/superpowers/plans/2026-07-11-3d-product-models.md`.

**Tech Stack:** Express + Helmet (existing), Maestro (existing), no new dependencies.

## Global Constraints

- No fictional/fabricated data or behavior — every re-verification step uses real catalog
  products and real Maestro runs against the actual app; no result may be asserted without
  actually running it.
- One fix per commit, TDD-style (reproduce → fix → verify → commit) for the code changes; the
  re-verification tasks are verification-only (no code change) and only need a commit if a fix
  was required during them.
- Android and iOS Simulator cannot run simultaneously on this machine (memory constraint) —
  every task that needs a specific platform's device must ensure the other one is shut down
  first. iOS Simulator (`iPhone 17 Pro Max`, udid `7EABE577-D15B-4B90-848F-EDAC9BF2FC7A`) is
  already booted at plan start; run iOS re-verification (Task 3) before Android (Task 4).
- Known pre-existing failure to expect and ignore throughout: `npx jest`'s
  `goldenFixtures.test.js` fixture-file gap (confirmed unrelated to this branch via a `git stash`
  A/B test earlier this session).
- Known pre-existing Android flake to expect and retry past (force-stop + retry, not a
  regression): the gallery-picker "no crash, no dialog, picker just never opens" issue during
  `photo-search.yaml`/`ml-features-comprehensive.yaml`.
- PR #3 (`feature/static-product-catalog` → `main`) stays open and unmerged until every task in
  this plan is complete and green.

---

## Task 1: Commit the CSP fix

**Files:**
- Modify: `server/src/index.js` (already edited, uncommitted — around line 153-165)

**Interfaces:**
- Produces: a live server (already running, PID bound to port 5001) whose CSP response header no
  longer includes `upgrade-insecure-requests` — every later task in this plan depends on this
  being in place (it's what makes `"loaded"` achievable on iOS at all).

- [ ] **Step 1: Confirm the fix is already in place and the server already has it live**

```bash
grep -n "upgrade-insecure-requests" server/src/index.js
curl -sI "http://localhost:5001/assets/viewer/product-3d-viewer.html" | grep -i "content-security-policy"
```

Expected: the grep shows `"upgrade-insecure-requests": null,` inside the directives object; the
curl output's `Content-Security-Policy` header does NOT contain `upgrade-insecure-requests`
anywhere in its value. If the curl output still contains it, the running server process predates
the edit — kill and restart it:

```bash
lsof -iTCP:5001 -sTCP:LISTEN -P
kill <pid-from-above>
cd server && nohup node src/index.js > /private/tmp/server.log 2>&1 & disown
cd ..
sleep 2
curl -s http://localhost:5001/health
```

- [ ] **Step 2: Commit**

```bash
git add server/src/index.js
git commit -m "$(cat <<'EOF'
fix: drop upgrade-insecure-requests CSP directive, unblocks iOS 3D viewer

Helmet's default CSP directives include upgrade-insecure-requests,
which silently upgraded product-3d-viewer.html's own script fetches
(model-viewer.min.js, product-3d-viewer.js) to https:// -- fatal
against the plain-HTTP local dev server, since WKWebView enforces the
upgrade while Android WebView and Chrome both treat localhost/127.0.0.1
as already-trustworthy and never did. The requests vanished with zero
console output and zero server-log entries, leaving the viewer stuck
on "loading" forever with no error surfaced. Confirmed via server-log
diffing before/after and a live simulator screenshot.
EOF
)"
```

---

## Task 2: Strengthen the Maestro success assertion on both platforms

**Files:**
- Modify: `.maestro/android/product-3d-viewer.yaml` (last `extendedWaitUntil` block)
- Modify: `.maestro/ios/product-3d-viewer.yaml` (last `extendedWaitUntil` block)

**Interfaces:**
- Consumes: `product-3d-status` testID from `src/components/Product3DViewer.jsx` — a
  `<Text testID="product-3d-status" accessibilityValue={{text: status}}>{status}</Text>` element
  whose own rendered text content is the bridge's status string (`"loading"|"loaded"|"error"`).
- Produces: a `product-3d-viewer.yaml` flow (both platforms) whose final assertion can only pass
  if the bridge actually posted `{"type":"loaded"}` — every later re-verification task (Task 3,
  Task 4) depends on this being a real assertion, not the old trivially-satisfied one.

- [ ] **Step 1: Read the current last block of both files to confirm exact context to replace**

```bash
tail -10 .maestro/android/product-3d-viewer.yaml
tail -10 .maestro/ios/product-3d-viewer.yaml
```

Expected: both end with

```yaml
- extendedWaitUntil:
    visible:
      id: "product-3d-webview"
    timeout: 10000

- extendedWaitUntil:
    notVisible:
      id: "product-3d-retry"
    timeout: 30000
```

- [ ] **Step 2: Replace the weak assertion in both files**

In `.maestro/android/product-3d-viewer.yaml`, replace:

```yaml
- extendedWaitUntil:
    notVisible:
      id: "product-3d-retry"
    timeout: 30000
```

with:

```yaml
- extendedWaitUntil:
    visible:
      id: "product-3d-status"
      text: "loaded"
    timeout: 15000
```

Apply the identical replacement in `.maestro/ios/product-3d-viewer.yaml`.

- [ ] **Step 3: Sanity-check the new assertion against one already-known-good category before trusting it for the full sweep**

The iOS Simulator is already booted. Run footwear (a Phase-1 category, known to render correctly
now that Task 1's fix is live):

```bash
UDID="7EABE577-D15B-4B90-848F-EDAC9BF2FC7A"
printf '%s' "Nike Air Jordan 1 Red And Black" | xcrun simctl pbcopy "$UDID"
cat > .maestro/ios/_tmp-verify-3d.yaml <<'EOF'
appId: org.reactjs.native.example.EcommerceAppFullStack
---
- runFlow: login.yaml
- runFlow: product-3d-viewer.yaml
EOF
maestro test .maestro/ios/_tmp-verify-3d.yaml --device "$UDID" \
  --env CATEGORY="footwear" --env PRODUCT_ID="dj-88" --env PRODUCT_TITLE="Nike Air Jordan 1 Red And Black"
rm -f .maestro/ios/_tmp-verify-3d.yaml
```

Expected: exits 0, with `Assert that id: product-3d-status, text: loaded is visible... COMPLETED`
in the output (confirms the new assertion syntax is valid and actually observes the bridge
reaching `"loaded"`, not just that it doesn't error).

- [ ] **Step 4: Commit**

```bash
git add .maestro/android/product-3d-viewer.yaml .maestro/ios/product-3d-viewer.yaml
git commit -m "$(cat <<'EOF'
test: assert product-3d-status actually reaches "loaded", not just "no error"

The old assertion (retry button not visible) was trivially satisfied
by a viewer stuck permanently on "loading" as much as by a real
success -- it never proved the JS bridge fired. This is why the CSP
regression fixed in the previous commit shipped undetected across
every prior iOS Maestro run in this project's 3D-models plan.
EOF
)"
```

---

## Task 3: iOS full 12-category re-verification

**Files:** None (verification only, reusing `.maestro/ios/product-3d-viewer.yaml` from Task 2).

**Interfaces:**
- Consumes: the corrected assertion from Task 2.
- Produces: a pass/fail result per category, feeding Task 6's plan-doc correction.

- [ ] **Step 1: Run the flow once per category**

The iOS Simulator (`7EABE577-D15B-4B90-848F-EDAC9BF2FC7A`) is already booted. For each row below,
pre-populate the pasteboard with that category's title, then run the flow:

```
footwear          | dj-88  | Nike Air Jordan 1 Red And Black
electronics       | dj-78  | Apple MacBook Pro 14 Inch Space Grey
watches           | dj-93  | Brown Leather Belt Watch
bags-accessories  | dj-174 | Prada Women Bag
home-kitchen      | dj-11  | Annibale Colombo Bed
mens-clothing     | dj-83  | Blue & Black Check Shirt
womens-clothing   | dj-162 | Blue Frock
beauty-fragrances | dj-1   | Essence Mascara Lash Princess
sports-fitness    | dj-137 | American Football
automotive        | dj-168 | Charger SXT RWD
groceries         | dj-17  | Beef Steak
jewelry           | dj-182 | Green Crystal Earring
```

```bash
UDID="7EABE577-D15B-4B90-848F-EDAC9BF2FC7A"
cat > .maestro/ios/_tmp-verify-3d.yaml <<'EOF'
appId: org.reactjs.native.example.EcommerceAppFullStack
---
- runFlow: login.yaml
- runFlow: product-3d-viewer.yaml
EOF

# Repeat for each of the 12 rows above, substituting CATEGORY/PRODUCT_ID/PRODUCT_TITLE:
printf '%s' "<title>" | xcrun simctl pbcopy "$UDID"
maestro test .maestro/ios/_tmp-verify-3d.yaml --device "$UDID" \
  --env CATEGORY="<category>" --env PRODUCT_ID="<id>" --env PRODUCT_TITLE="<title>"

rm -f .maestro/ios/_tmp-verify-3d.yaml
```

(footwear was already run once in Task 2 Step 3 with the corrected assertion — that result may
be reused instead of re-running it here, but every other category must run fresh.)

Expected: all 12 exit 0, each with the `product-3d-status, text: loaded` assertion completing.

- [ ] **Step 2: Record the result**

No commit for this step — the pass/fail table is recorded in Task 6's plan-doc update. If any
category fails, stop and treat it as a blocker (do not proceed to Task 4) — investigate before
continuing, since a failure here would mean the CSP fix or the assertion itself has a gap this
plan didn't anticipate.

---

## Task 4: Android full 12-category re-verification

**Files:** None (verification only, reusing `.maestro/android/product-3d-viewer.yaml` from Task 2).

**Interfaces:**
- Consumes: the corrected assertion from Task 2.
- Produces: a pass/fail result per category, feeding Task 6's plan-doc correction.

- [ ] **Step 1: Shut down the iOS Simulator, boot the Android emulator**

```bash
xcrun simctl shutdown 7EABE577-D15B-4B90-848F-EDAC9BF2FC7A
emulator -avd Pixel_7_Pro &
disown
```

Wait for it to come up (`adb devices` shows `device`, not `offline`), then confirm the app is
installed and can launch (it was built and installed earlier in this project's session; no
rebuild is needed since only server-side and `.maestro/` files changed):

```bash
adb devices
adb shell am force-stop com.ecommerceappfullstack
```

- [ ] **Step 2: Run the flow once per category**

Same 12-row table as Task 3.

```bash
cat > .maestro/android/_tmp-verify-3d.yaml <<'EOF'
appId: com.ecommerceappfullstack
---
- runFlow: login.yaml
- runFlow: product-3d-viewer.yaml
EOF

# Repeat for each of the 12 rows, substituting CATEGORY/PRODUCT_ID/PRODUCT_TITLE:
adb shell am force-stop com.ecommerceappfullstack
maestro test .maestro/android/_tmp-verify-3d.yaml \
  --env CATEGORY="<category>" --env PRODUCT_ID="<id>" --env PRODUCT_TITLE="<title>"

rm -f .maestro/android/_tmp-verify-3d.yaml
```

Expected: all 12 exit 0, each with the `product-3d-status, text: loaded` assertion completing.
No live bug is expected here (Android was never affected by the CSP issue), but this run exists
to prove the new, stronger assertion works correctly on the platform already known-good, and to
close out full coverage.

- [ ] **Step 3: Record the result**

No commit for this step. If any category fails, stop and treat it as a blocker — an Android
failure here (previously always green under the old weak assertion) would indicate the new
assertion itself is miscalibrated (e.g. wrong timeout) rather than a real app regression; fix the
assertion and re-run before proceeding.

---

## Task 5: Full regression gate, both platforms

**Files:** None (verification only).

**Interfaces:**
- Consumes: the app and server as fixed/tested by Tasks 1-4.
- Produces: confirmation that nothing else broke, feeding Task 6's plan-doc correction.

- [ ] **Step 1: iOS regression gate**

```bash
UDID="7EABE577-D15B-4B90-848F-EDAC9BF2FC7A"
```

(iOS Simulator was shut down in Task 4 — reboot it first: `xcrun simctl boot "$UDID"`, wait a
few seconds, then proceed.)

```bash
for i in 1 2 3; do maestro test .maestro/ios/login.yaml --device "$UDID"; done

node scripts/seed-ios-sim-photos.mjs mens-clothing/sample-1.webp
cat > .maestro/ios/_tmp-photo-search.yaml <<'EOF'
appId: org.reactjs.native.example.EcommerceAppFullStack
---
- runFlow: login.yaml
- runFlow: photo-search.yaml
EOF
maestro test .maestro/ios/_tmp-photo-search.yaml --device "$UDID" --env EXPECTED_PRODUCT_TITLE="Blue & Black Check Shirt"

node scripts/seed-ios-sim-photos.mjs mens-clothing/sample-2.webp
maestro test .maestro/ios/_tmp-photo-search.yaml --device "$UDID" --env EXPECTED_PRODUCT_TITLE="Man Plaid Shirt"
rm -f .maestro/ios/_tmp-photo-search.yaml

maestro test .maestro/ios/ml-features-comprehensive.yaml --device "$UDID" --env EXPECTED_PRODUCT_TITLE="Man Plaid Shirt"

npm run maestro:ios
```

Expected: all exit 0.

- [ ] **Step 2: Android regression gate**

```bash
xcrun simctl shutdown 7EABE577-D15B-4B90-848F-EDAC9BF2FC7A
emulator -avd Pixel_7_Pro &
disown
# wait for `adb devices` to show `device`

for i in 1 2 3; do maestro test .maestro/android/login.yaml; done

node scripts/seed-emulator-photos.mjs mens-clothing/sample-1.webp
adb shell am force-stop com.ecommerceappfullstack
cat > .maestro/android/_tmp-photo-search.yaml <<'EOF'
appId: com.ecommerceappfullstack
---
- runFlow: login.yaml
- runFlow: photo-search.yaml
EOF
maestro test .maestro/android/_tmp-photo-search.yaml --env EXPECTED_PRODUCT_TITLE="Blue & Black Check Shirt"

node scripts/seed-emulator-photos.mjs mens-clothing/sample-2.webp
adb shell am force-stop com.ecommerceappfullstack
maestro test .maestro/android/_tmp-photo-search.yaml --env EXPECTED_PRODUCT_TITLE="Man Plaid Shirt"
rm -f .maestro/android/_tmp-photo-search.yaml

adb shell am force-stop com.ecommerceappfullstack
maestro test .maestro/android/ml-features-comprehensive.yaml --env EXPECTED_PRODUCT_TITLE="Man Plaid Shirt"

adb shell am force-stop com.ecommerceappfullstack
npm run maestro:android
```

Expected: all exit 0. If the gallery-picker flake recurs (documented pre-existing issue), force-
stop (`adb shell am force-stop com.ecommerceappfullstack`) and retry — not a regression.

- [ ] **Step 3: Jest**

```bash
npx jest
```

Expected: only the known pre-existing `goldenFixtures.test.js` failure; all else green.

No commit for this task — verification only.

---

## Task 6: Correct the plan document, final commit

**Files:**
- Modify: `docs/superpowers/plans/2026-07-11-3d-product-models.md`

**Interfaces:** None (documentation only).

- [ ] **Step 1: Replace the top-of-file STATUS line**

Find the current line near the top of the file:

```markdown
**STATUS: COMPLETE.** All 12 catalog categories (footwear, electronics, watches,
bags-accessories, home-kitchen, mens-clothing, womens-clothing, beauty-fragrances,
sports-fitness, automotive, groceries, jewelry) have a real, freely-licensed 3D model, viewable
via the Photos/3D toggle on every product's PDP, verified via Maestro on both Android and iOS,
with full regression suites green on both platforms (modulo the one known pre-existing
`goldenFixtures.test.js` gap).
```

Replace it with:

```markdown
**STATUS: COMPLETE** (corrected — see "Post-completion regression found and fixed" below). All
12 catalog categories have a real, freely-licensed 3D model, viewable via the Photos/3D toggle on
every product's PDP, verified via Maestro on both Android and iOS with the corrected assertion,
with full regression suites green on both platforms (modulo the one known pre-existing
`goldenFixtures.test.js` gap).

## Post-completion regression found and fixed

Between this plan's original "complete" declaration and merging PR #3, live manual testing on
the iOS Simulator found the 3D viewer never actually rendered on iOS — the model area stayed
permanently blank (no model, no error, no retry button) for every category tried.

**Root cause 1 (the bug):** `server/src/index.js`'s Helmet CSP config spread
`helmet.contentSecurityPolicy.getDefaultDirectives()`, which includes `upgrade-insecure-requests`
by default. This silently upgraded `product-3d-viewer.html`'s own subresource fetches
(`model-viewer.min.js`, `product-3d-viewer.js`) to `https://`, which failed dead silently against
the plain-HTTP local dev server. WKWebView enforces this CSP-driven upgrade; Android's WebView and
desktop Chrome (used for this plan's earlier CDP-based standalone verification) both treat
`http://localhost`/`127.0.0.1` as already-trustworthy and never upgrade — which is why this was
iOS-only and why it never showed up on Android or in the original standalone-browser check.
Fixed by adding `"upgrade-insecure-requests": null` to the directives object.

**Root cause 2 (why extensive Maestro testing across Stage 5 and Task 6.3 never caught it):**
`.maestro/ios/product-3d-viewer.yaml`'s success assertion was `extendedWaitUntil: notVisible:
id: "product-3d-retry"` — the retry button only renders on an explicit `{"type":"error"}` bridge
message. A viewer permanently stuck on `"loading"` (this bug) never posts an error either, so
"retry not visible" was trivially true in both the real-success and silent-failure cases. It
never actually proved `"loaded"` was reached. Fixed by asserting `product-3d-status`'s own
rendered text equals `"loaded"` directly (that testID's text content IS the bridge's status
string) — applied to both platforms' flows, though Android was never actually affected by the
CSP bug itself.

**Corrected re-verification:** all 12 categories re-run on both iOS and Android with the
corrected assertion, plus the full existing regression suites (login ×3, photo-search both
samples, ml-features-comprehensive, complete-e2e-clean, `npx jest`) on both platforms — all
green modulo the one known pre-existing `goldenFixtures.test.js` gap. See
`docs/superpowers/specs/2026-07-11-3d-viewer-ios-regression-remediation-design.md` and
`docs/superpowers/plans/2026-07-11-3d-viewer-ios-regression-remediation.md` for the full
investigation and fix record.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-07-11-3d-product-models.md
git commit -m "$(cat <<'EOF'
docs: correct 3D product models plan status -- iOS regression found and fixed

Discovered and fixed after the plan's original "complete" declaration,
before merging PR #3. See the remediation plan/spec for the full
investigation.
EOF
)"
```

- [ ] **Step 3: Mark this remediation plan's own status complete**

```bash
git log --oneline -8
```

Confirm the six task commits (Task 1's fix, Task 2's assertion fix, Task 6's doc correction —
Tasks 3/4/5 are verification-only with no commits) are present, then report completion: PR #3 is
now safe to merge per the previously-agreed post-merge cloud verification plan.
