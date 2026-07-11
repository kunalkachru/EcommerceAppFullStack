#!/usr/bin/env node
/**
 * Emulator smoke test for catalog + ML UI (features 1–5).
 * Uses ensureAppForeground() — does not force-stop the app (safe when emulator is already running).
 */
import { execSync } from "node:child_process";
import {
  screenshot,
  dumpUi,
  findByTestId,
  findNodes,
  tap,
  sleep,
  ensureAppForeground,
  tapTab,
  loginIfNeeded,
  uiIncludes,
  swipe,
  recoverToApp,
  scrollToTestId,
  grantPhotoPermissions,
  DEVICE,
  ADB,
  PACKAGE,
  launchApp,
} from "./e2e-adb.mjs";
import { resolveApiUrl } from "./lib/cloud-api-url.mjs";
import { pickPhotoFromGallery } from "./e2e-pick-photo.mjs";
import {
  findFirstVisibleProductCard,
  homeVisualDiscoveryReady,
  findHomeVisualGalleryTrigger,
} from "./lib/verify-emulator-helpers.mjs";
import {
  shouldUseCloudApiTarget,
  withTemporaryApiTargetMode,
} from "./lib/api-target-config.mjs";

const API = resolveApiUrl();
const USE_CLOUD_APP_TARGET = shouldUseCloudApiTarget();

const results = [];

function pass(id, d) {
  results.push({ id, ok: true, d });
  console.log(`✓ ${id}: ${d}`);
}
function fail(id, d) {
  results.push({ id, ok: false, d });
  console.error(`✗ ${id}: ${d}`);
}

function scrollProductListToItems() {
  swipe(720, 1400, 720, 600, 350);
  sleep(800);
}

function scrollHomeToTop() {
  for (let i = 0; i < 4; i++) {
    swipe(720, 700, 720, 1900, 300);
    sleep(500);
  }
}

function findHomeGalleryButton(maxSwipes = 12) {
  for (let i = 0; i < maxSwipes; i += 1) {
    const xml = dumpUi();
    const byId = findByTestId(xml, "photo-gallery-button");
    if (byId) {
      return byId;
    }
    const byFallback = findHomeVisualGalleryTrigger(xml);
    if (byFallback?.center) {
      return byFallback;
    }
    swipe(720, 1600, 720, 650, 350);
    sleep(650);
  }
  return findHomeVisualGalleryTrigger(dumpUi());
}

function findVisibleCategoryFilter(xml) {
  return (
    findNodes(xml).find(
      (n) =>
        n.clickable &&
        /filter-category-/.test(n.resourceId || "") &&
        !/filter-category-all$/.test(n.resourceId || "")
    ) ||
    findNodes(xml).find(
      (n) => n.clickable && /filter-category-/.test(n.resourceId || "")
    )
  );
}

function findFirstProductCard(xml) {
  return findFirstVisibleProductCard(xml);
}

function photoSearchActiveOrRendered(xml) {
  return (
    findByTestId(xml, "photo-clear-search") ||
    findByTestId(xml, "photo-closest-match") ||
    findNodes(xml).some((n) => /photo-match-card/.test(n.resourceId || "")) ||
    xml.includes("CLIP analysis") ||
    xml.includes("Closest match") ||
    xml.includes("Best matches") ||
    xml.includes("Detected attributes")
  );
}

function waitForPhotoSearchState(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const xml = dumpUi();
    if (photoSearchActiveOrRendered(xml)) {
      return { ok: true, xml };
    }
    if (xml.includes("Search unavailable")) {
      return { ok: false, xml, reason: "Search unavailable" };
    }
    sleep(2000);
  }
  return { ok: false, xml: dumpUi(), reason: "Timed out waiting for photo search state" };
}

function waitForPdpSimilar(maxScrolls = 5) {
  for (let i = 0; i < maxScrolls; i++) {
    const xml = dumpUi();
    if (xml.includes("More like this")) return true;
    if (xml.includes("Add to Cart") || xml.includes("ADD TO CART")) {
      swipe(720, 1800, 720, 400, 350);
      sleep(900);
      continue;
    }
    break;
  }
  return dumpUi().includes("More like this");
}

async function main() {
  console.log(`Using Android device: ${DEVICE}`);
  grantPhotoPermissions();
  if (USE_CLOUD_APP_TARGET) {
    try {
      execSync(`${ADB} shell am force-stop ${PACKAGE}`, { stdio: "pipe" });
    } catch {
      // ignore
    }
    launchApp();
    sleep(7000);
  }
  ensureAppForeground();
  sleep(2000);
  recoverToApp({ maxBackPresses: 4 });
  sleep(1000);

  const meta = await fetch(`${API}/api/catalog/meta`).then((r) => r.json());
  if (meta.total >= 200) pass("catalog-meta", `${meta.total} products on server`);
  else fail("catalog-meta", `Only ${meta.total}`);

  await loginIfNeeded();
  sleep(1500);
  recoverToApp({ maxBackPresses: 4 });
  sleep(800);
  tapTab("home");
  sleep(800);
  scrollHomeToTop();
  sleep(2000);

  let galleryButton = findHomeGalleryButton();
  let xml = dumpUi();
  if (galleryButton && homeVisualDiscoveryReady(xml)) {
    pass("feature-3-home-narrow", "Category narrow chips on Home");
  } else {
    fail("feature-3-home-narrow", "Home visual search UI incomplete");
  }

  if (galleryButton && galleryButton.center) {
    tap(galleryButton.center.x, galleryButton.center.y);
    pickPhotoFromGallery();
    const photoState = waitForPhotoSearchState();
    if (photoState.ok) {
      pass("feature-2-gallery", "Gallery selection returned to home photo search");
    } else {
      fail("feature-2-gallery", photoState.reason);
    }
    recoverToApp();
  } else {
    fail("feature-2-gallery", "Gallery button not found");
  }

  sleep(800);

  tapTab("products");
  sleep(2500);
  xml = dumpUi();
  const countText = findNodes(xml).find((n) => n.text?.includes("products in catalog"));
  if (countText) pass("feature-catalog-ui", countText.text);
  else fail("feature-catalog-ui", "Catalog count not shown on Products screen");

  const cameraBtn = findNodes(xml, { contentDesc: "Search by photo" });
  if (cameraBtn.length) pass("feature-5-camera-icon", "Camera icon on product list");
  else fail("feature-5-camera-icon", "Camera icon missing");

  const categoryFilter = findVisibleCategoryFilter(xml);
  if (categoryFilter && categoryFilter.center) {
    tap(categoryFilter.center.x, categoryFilter.center.y);
    sleep(1200);
    pass(
      "feature-category-filter",
      `Category filter tappable (${categoryFilter.contentDesc || categoryFilter.resourceId})`
    );
  } else {
    fail("feature-category-filter", "Category filter not found");
  }

  tapTab("products");
  sleep(1500);
  scrollProductListToItems();
  xml = dumpUi();
  const firstProduct = findFirstProductCard(xml);
  if (firstProduct) {
    tap(firstProduct.center.x, firstProduct.center.y);
    sleep(4000);
    const openedPdp = dumpUi().includes("screen-product-detail");
    if (!openedPdp) {
      fail("feature-1-pdp-similar", "Product tap did not open PDP");
    } else if (waitForPdpSimilar()) {
      pass("feature-1-pdp-similar", `PDP shows More like this (${firstProduct.contentDesc})`);
    } else {
      fail("feature-1-pdp-similar", "Similar strip not visible on PDP");
    }
    screenshot("verify-pdp-similar");
  } else {
    fail("feature-1-pdp-similar", "Could not open a product");
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n--- Emulator: ${results.length - failed}/${results.length} passed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

const runner = () =>
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });

if (USE_CLOUD_APP_TARGET) {
  withTemporaryApiTargetMode("cloud", runner).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  runner();
}
