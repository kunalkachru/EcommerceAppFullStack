#!/usr/bin/env node
/**
 * Emulator smoke test for catalog + ML UI (features 1–5).
 */
import {
  screenshot,
  dumpUi,
  findNodes,
  tap,
  sleep,
  launchApp,
} from "./e2e-adb.mjs";

const API = "http://127.0.0.1:5001";
const EMAIL = "test@example.com";
const PASSWORD = "secret123";

const results = [];

function pass(id, d) {
  results.push({ id, ok: true, d });
  console.log(`✓ ${id}: ${d}`);
}
function fail(id, d) {
  results.push({ id, ok: false, d });
  console.error(`✗ ${id}: ${d}`);
}

function tapTab(i) {
  tap(180 + i * 360, 2980);
}

function findByDesc(xml, desc) {
  const re = /<node\b[^>]*>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const tag = m[0];
    if (!tag.includes(`content-desc="${desc}"`) || !tag.includes('clickable="true"')) continue;
    const bm = tag.match(/bounds="([^"]+)"/);
    if (bm) {
      const b = bm[1].match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      return {
        x: Math.floor((+b[1] + +b[3]) / 2),
        y: Math.floor((+b[2] + +b[4]) / 2),
      };
    }
  }
  return null;
}

async function loginIfNeeded() {
  let xml = dumpUi();
  if (xml.includes("Sign in") || xml.includes("Email")) {
    const scrollBtn = findNodes(xml).find((n) => n.text === "Sign in ↓");
    if (scrollBtn?.center) tap(scrollBtn.center.x, scrollBtn.center.y);
    sleep(1500);
    xml = dumpUi();
    const edits = findNodes(xml, { className: "EditText" });
    if (edits.length >= 2) {
      tap(edits[0].center.x, edits[0].center.y);
      // use adb for email with @
      const { execSync } = await import("node:child_process");
      execSync(`adb -s emulator-5554 shell input text 'test@example.com'`);
      tap(edits[1].center.x, edits[1].center.y);
      execSync(`adb -s emulator-5554 shell input text 'secret123'`);
      const login = findNodes(dumpUi(), { text: "Login" });
      if (login[0]) tap(login[0].center.x, login[0].center.y);
      sleep(3000);
    }
  }
}

async function main() {
  launchApp();
  sleep(2500);

  const meta = await fetch(`${API}/api/catalog/meta`).then((r) => r.json());
  if (meta.total >= 200) pass("catalog-meta", `${meta.total} products on server`);
  else fail("catalog-meta", `Only ${meta.total}`);

  await loginIfNeeded();
  sleep(1500);

  tapTab(1);
  sleep(2500);
  let xml = dumpUi();
  const countText = findNodes(xml).find((n) => n.text?.includes("products in catalog"));
  if (countText) pass("feature-catalog-ui", countText.text);
  else fail("feature-catalog-ui", "Catalog count not shown on Products screen");

  const cameraBtn = findNodes(xml, { contentDesc: "Search by photo" });
  if (cameraBtn.length) pass("feature-5-camera-icon", "Camera icon on product list");
  else fail("feature-5-camera-icon", "Camera icon missing");

  const clothesFilter = findByDesc(xml, "Filter by clothes");
  if (clothesFilter) {
    tap(clothesFilter.x, clothesFilter.y);
    sleep(1200);
    pass("feature-category-filter", "Category filter tappable");
  } else {
    fail("feature-category-filter", "Category filter not found");
  }

  tapTab(0);
  sleep(2000);
  xml = dumpUi();
  if (xml.includes("Search by photo") && xml.includes("Narrow search")) {
    pass("feature-3-home-narrow", "Category narrow chips on Home");
  } else {
    fail("feature-3-home-narrow", "Home visual search UI incomplete");
  }

  const gallery = findNodes(xml, { text: "Gallery" });
  if (gallery[0]) {
    tap(gallery[0].center.x, gallery[0].center.y);
    sleep(4000);
    xml = dumpUi();
    if (xml.includes("ShopEaseTest") || xml.includes("Pictures")) {
      pass("feature-2-gallery", "Gallery picker reachable");
    } else {
      fail("feature-2-gallery", "Could not open gallery (may need manual pick)");
    }
  }

  tapTab(1);
  sleep(1500);
  xml = dumpUi();
  const firstProduct = findNodes(xml).find(
    (n) => n.text && n.text.length > 20 && !n.text.includes("catalog") && !n.text.includes("Search")
  );
  if (firstProduct) {
    tap(firstProduct.center.x, firstProduct.center.y);
    sleep(3000);
    xml = dumpUi();
    if (xml.includes("More like this")) {
      pass("feature-1-pdp-similar", "PDP shows More like this");
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
