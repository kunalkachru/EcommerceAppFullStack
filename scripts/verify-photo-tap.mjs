#!/usr/bin/env node
/** Quick gate: photo search → tap match by testID → PDP */
import { execSync } from "node:child_process";
import {
  loginIfNeeded,
  tapTab,
  dumpUi,
  findByTestId,
  findNodes,
  tap,
  sleep,
  swipe,
  grantPhotoPermissions,
  ensureAppForeground,
  scrollToTestId,
} from "./e2e-adb.mjs";
import { pickPhotoFromGallery } from "./e2e-pick-photo.mjs";

async function pickGalleryPhoto() {
  scrollToTestId("photo-gallery-button", { maxSwipes: 10 });
  const gallery = findByTestId(dumpUi(), "photo-gallery-button");
  tap(gallery.center.x, gallery.center.y);
  pickPhotoFromGallery();
  sleep(3000);
  // Retry once if we never left the picker
  const xml = dumpUi();
  if (xml.includes("photopicker") || xml.includes("Photos")) {
    console.log("Gallery still open — retrying pick…");
    pickPhotoFromGallery();
    sleep(3000);
  }
}

async function waitForPhotoResults(timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const xml = dumpUi();
    if (findByTestId(xml, "photo-results-section") || findByTestId(xml, "photo-closest-match")) {
      return xml;
    }
    if (
      findNodes(xml).some((n) => /photo-match-card/.test(n.resourceId || ""))
    ) {
      return xml;
    }
    if (findByTestId(xml, "photo-clear-search") && !xml.includes("CLIP analysis")) {
      // Preview loaded; results may render shortly
      sleep(3000);
      continue;
    }
    if (xml.includes("Search unavailable")) throw new Error("Search unavailable");
    if (xml.includes("CLIP analysis") || xml.includes("Analyzing")) {
      sleep(4000);
      continue;
    }
    sleep(2500);
  }
  throw new Error("Timed out waiting for photo results");
}

async function main() {
  grantPhotoPermissions();
  execSync(`adb -s ${process.env.ADB_DEVICE || "emulator-5554"} shell am force-stop com.ecommerceappfullstack`, {
    stdio: "ignore",
  });
  ensureAppForeground();
  sleep(3000);
  await loginIfNeeded();
  tapTab("home");
  sleep(1500);
  await pickGalleryPhoto();
  console.log("Waiting for CLIP…");
  await waitForPhotoResults();

  for (let i = 0; i < 6; i++) {
    swipe(720, 2400, 720, 900, 350);
    sleep(400);
  }
  let xml = dumpUi();

  const closest = findByTestId(xml, "photo-closest-match");
  if (closest?.center) {
    tap(closest.center.x, closest.center.y);
    sleep(3500);
    if (findByTestId(dumpUi(), "pdp-add-to-cart")) {
      console.log("✓ PASS: photo-closest-match → PDP");
      process.exit(0);
    }
  }

  const matchNodes = findNodes(xml).filter((n) =>
    /photo-match-card/.test(n.resourceId || "")
  );
  if (matchNodes[0]?.center) {
    tap(matchNodes[0].center.x, matchNodes[0].center.y);
    sleep(3500);
    if (findByTestId(dumpUi(), "pdp-add-to-cart")) {
      console.log(`✓ PASS: ${matchNodes[0].resourceId} → PDP`);
      process.exit(0);
    }
  }

  console.log("✗ FAIL: photo tap did not open PDP");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
