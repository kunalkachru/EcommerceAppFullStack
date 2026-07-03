#!/usr/bin/env node
/**
 * Emulator smoke test for catalog + ML UI (features 1–5).
 * Uses ensureAppForeground() — does not force-stop the app (safe when emulator is already running).
 */
import {
  screenshot,
  dumpUi,
  findNodes,
  tap,
  sleep,
  ensureAppForeground,
  tapTab,
  loginIfNeeded,
  uiIncludes,
  swipe,
  pressKey,
  recoverToApp,
  DEVICE,
} from "./e2e-adb.mjs";

const API = "http://127.0.0.1:5001";

const results = [];

function pass(id, d) {
  results.push({ id, ok: true, d });
  console.log(`✓ ${id}: ${d}`);
}
function fail(id, d) {
  results.push({ id, ok: false, d });
  console.error(`✗ ${id}: ${d}`);
}

function scrollHomeToPhotoSection() {
  for (let i = 0; i < 4; i++) {
    if (uiIncludes("Search by photo")) return;
    swipe(720, 1600, 720, 400, 350);
    sleep(700);
  }
}

function scrollProductListToItems() {
  swipe(720, 1400, 720, 600, 350);
  sleep(800);
}

function findClothesFilter(xml) {
  return findNodes(xml).find(
    (n) => n.contentDesc?.startsWith("Filter by clothes") && n.clickable
  );
}

function findFirstProductCard(xml) {
  return findNodes(xml).find(
    (n) =>
      n.contentDesc &&
      n.contentDesc.length > 10 &&
      n.clickable &&
      !n.contentDesc.startsWith("Filter") &&
      !n.contentDesc.includes("Search by photo") &&
      !n.contentDesc.includes("Add to Cart")
  );
}

function galleryPickerOpened(xml) {
  return (
    xml.includes("ShopEaseTest") ||
    xml.includes("Pictures") ||
    (xml.includes("Photos") && xml.includes("Albums")) ||
    xml.includes("Photo taken on") ||
    xml.includes("will only have access to the photos you select")
  );
}

function tapGalleryButton(xml) {
  const byId = findNodes(xml, { testId: "photo-gallery-button" });
  if (byId[0]) {
    tap(byId[0].center.x, byId[0].center.y);
    return "testID";
  }
  const byText = findNodes(xml, { text: "Gallery" });
  if (byText[0]) {
    tap(byText[0].center.x, byText[0].center.y);
    return "text";
  }
  return null;
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
  ensureAppForeground();
  sleep(2000);

  const meta = await fetch(`${API}/api/catalog/meta`).then((r) => r.json());
  if (meta.total >= 200) pass("catalog-meta", `${meta.total} products on server`);
  else fail("catalog-meta", `Only ${meta.total}`);

  await loginIfNeeded();
  sleep(1500);

  tapTab("products");
  sleep(2500);
  let xml = dumpUi();
  const countText = findNodes(xml).find((n) => n.text?.includes("products in catalog"));
  if (countText) pass("feature-catalog-ui", countText.text);
  else fail("feature-catalog-ui", "Catalog count not shown on Products screen");

  const cameraBtn = findNodes(xml, { contentDesc: "Search by photo" });
  if (cameraBtn.length) pass("feature-5-camera-icon", "Camera icon on product list");
  else fail("feature-5-camera-icon", "Camera icon missing");

  const clothesFilter = findClothesFilter(xml);
  if (clothesFilter?.center) {
    tap(clothesFilter.center.x, clothesFilter.center.y);
    sleep(1200);
    pass("feature-category-filter", `Category filter tappable (${clothesFilter.contentDesc})`);
  } else {
    fail("feature-category-filter", "Category filter not found");
  }

  tapTab("home");
  sleep(2000);
  scrollHomeToPhotoSection();
  xml = dumpUi();
  if (xml.includes("Search by photo") && xml.includes("Narrow search")) {
    pass("feature-3-home-narrow", "Category narrow chips on Home");
  } else {
    fail("feature-3-home-narrow", "Home visual search UI incomplete");
  }

  const galleryTap = tapGalleryButton(xml);
  if (galleryTap) {
    sleep(4000);
    xml = dumpUi();
    if (galleryPickerOpened(xml)) {
      pass("feature-2-gallery", `Gallery picker reachable (${galleryTap})`);
    } else {
      fail("feature-2-gallery", "Gallery picker did not open");
    }
    recoverToApp();
  } else {
    fail("feature-2-gallery", "Gallery button not found");
  }

  tapTab("products");
  sleep(1500);
  scrollProductListToItems();
  xml = dumpUi();
  const firstProduct = findFirstProductCard(xml);
  if (firstProduct) {
    tap(firstProduct.center.x, firstProduct.center.y);
    sleep(4000);
    if (waitForPdpSimilar()) {
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
