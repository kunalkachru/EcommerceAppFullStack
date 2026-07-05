#!/usr/bin/env node
/**
 * @deprecated Use scripts/verify-photo-tap.mjs and .maestro/flows/04-photo-search.yaml
 * Verify photo search results on Home are tappable (emulator E2E).
 */
import {
  loginIfNeeded,
  tapTab,
  dumpUi,
  findNodes,
  tap,
  sleep,
  swipe,
  screenshot,
  findByTestId,
  ensureAppForeground,
  recoverToApp,
  grantPhotoPermissions,
  dismissPhotoPermissionDialog,
} from "./e2e-adb.mjs";

function scrollHomeToPhotoSection() {
  for (let i = 0; i < 10; i++) {
    const xml = dumpUi();
    if (findByTestId(xml, "photo-gallery-button")) return;
    swipe(720, 1600, 720, 400, 350);
    sleep(700);
  }
}

function pickBeachPhoto() {
  scrollHomeToPhotoSection();
  const gallery = findByTestId(dumpUi(), "photo-gallery-button");
  if (!gallery?.center) throw new Error("Gallery button not found");
  tap(gallery.center.x, gallery.center.y);
  sleep(2000);
  dismissPhotoPermissionDialog();
  sleep(2000);

  let picker = dumpUi();
  const album = findNodes(picker).find(
    (n) => n.text?.includes("ShopEaseTest") || n.contentDesc?.includes("ShopEaseTest")
  );
  if (album?.center) {
    tap(album.center.x, album.center.y);
    sleep(2500);
    picker = dumpUi();
  }

  const beach = findNodes(picker).find(
    (n) =>
      n.contentDesc?.includes("beach") ||
      n.contentDesc?.includes("15-off") ||
      n.contentDesc?.includes("Photo taken on")
  );
  const img = findNodes(picker).find(
    (n) => n.className?.includes("ImageView") && n.clickable && n.center
  );
  if (beach?.center) tap(beach.center.x, beach.center.y);
  else if (img?.center) tap(img.center.x, img.center.y);
  else tap(540, 720);
  sleep(1500);

  const confirm = findNodes(dumpUi()).find(
    (n) => n.text === "Done" || n.contentDesc?.includes("Select") || n.text === "Select"
  );
  if (confirm?.center) {
    tap(confirm.center.x, confirm.center.y);
    sleep(1500);
  }
}

async function waitForResults(timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const xml = dumpUi();
    if (xml.includes("Best matches") || xml.includes("Closest match")) return xml;
    if (xml.includes("Search unavailable")) throw new Error("Search unavailable");
    if (xml.includes("access photos") || xml.includes("photos and videos")) {
      dismissPhotoPermissionDialog();
      sleep(1500);
      continue;
    }
    if (xml.includes("CLIP analysis")) {
      sleep(3000);
      continue;
    }
    sleep(2000);
  }
  throw new Error("Timed out waiting for photo results");
}

function analyzeClickability(xml) {
  const laptopNodes = findNodes(xml).filter(
    (n) =>
      /laptop|macbook|notebook|ultrabook/i.test(n.text || n.contentDesc || "") &&
      (n.text || n.contentDesc)
  );
  const priceNodes = findNodes(xml).filter((n) => /^\$\d/.test(n.text || ""));
  const bestMatches = xml.includes("Best matches");
  const clickableProducts = findNodes(xml).filter(
    (n) =>
      n.clickable &&
      (n.className?.includes("ViewGroup") || n.className?.includes("Button")) &&
      (/laptop|macbook|\$\d/i.test(n.text || n.contentDesc || "") ||
        n.contentDesc?.length > 5)
  );
  return { laptopNodes, priceNodes, bestMatches, clickableProducts };
}

async function main() {
  console.log("=== Photo search clickability test (Pixel emulator) ===\n");
  grantPhotoPermissions();
  ensureAppForeground();
  sleep(2000);
  await loginIfNeeded();
  tapTab("home");
  sleep(1500);

  try {
    pickBeachPhoto();
  } catch (e) {
    console.warn("Gallery pick issue:", e.message);
    recoverToApp();
    throw e;
  }

  console.log("Waiting for CLIP results…");
  const resultsXml = await waitForResults();
  screenshot("photo-search-results");

  const { laptopNodes, priceNodes, bestMatches, clickableProducts } =
    analyzeClickability(resultsXml);

  console.log(`\nResults UI:`);
  console.log(`  Best matches section: ${bestMatches ? "yes" : "no"}`);
  console.log(`  Laptop-related text nodes: ${laptopNodes.length}`);
  laptopNodes.slice(0, 5).forEach((n) => {
    console.log(`    - "${(n.text || n.contentDesc).slice(0, 50)}" clickable=${n.clickable}`);
  });
  console.log(`  Price nodes ($…): ${priceNodes.length}`);
  priceNodes.slice(0, 3).forEach((n) => {
    console.log(`    - "${n.text}" clickable=${n.clickable} class=${n.className}`);
  });

  const tapTarget =
    laptopNodes.find((n) => n.clickable && n.center) ||
    priceNodes.find((n) => n.center) ||
    clickableProducts[0];

  if (!tapTarget?.center) {
    console.log("\n✗ FAIL: No obvious tappable product node in UI dump");
    process.exit(1);
  }

  console.log(`\nTapping: "${(tapTarget.text || tapTarget.contentDesc || "").slice(0, 40)}" at ${tapTarget.center.x},${tapTarget.center.y}`);
  tap(tapTarget.center.x, tapTarget.center.y);
  sleep(3500);
  const after = dumpUi();
  screenshot("after-product-tap");

  const onPdp =
    after.includes("Add to Cart") ||
    after.includes("More like this") ||
    after.includes("Description") ||
    findNodes(after).some((n) => n.text === "Add to Cart");

  if (onPdp) {
    console.log("\n✓ PASS: Tap opened product detail (Add to Cart / PDP visible)");
    process.exit(0);
  }

  console.log("\n✗ FAIL: Tap did NOT open product detail — likely ScrollView/FlatList touch issue");
  console.log("  Sample UI after tap:", after.slice(0, 500));
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
