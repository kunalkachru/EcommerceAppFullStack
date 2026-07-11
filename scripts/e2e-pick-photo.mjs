/**
 * Pick a photo from the Android system gallery for E2E tests.
 */
import { dumpUi, findNodes, tap, sleep, dismissPhotoPermissionDialog } from "./e2e-adb.mjs";

export function pickPhotoFromGallery() {
  sleep(2000);
  dismissPhotoPermissionDialog();
  sleep(1500);

  let xml = dumpUi();

  const dismiss = findNodes(xml).find((n) => n.text === "Dismiss");
  if (dismiss?.center) {
    tap(dismiss.center.x, dismiss.center.y);
    sleep(800);
    xml = dumpUi();
  }

  const tiles = findNodes(xml)
    .filter(
      (n) =>
        n.center &&
        n.center.y > 1100 &&
        n.center.y < 2200 &&
        n.contentDesc?.includes("Photo taken")
    )
    .sort((a, b) => a.center.y - b.center.y || a.center.x - b.center.x);
  if (tiles[0]?.center) {
    tap(tiles[0].center.x, tiles[0].center.y);
  } else {
    tap(239, 1388);
  }
  sleep(1200);

  xml = dumpUi();
  const confirm = findNodes(xml).find(
    (n) => n.clickable && /^(Done|Select|Add)$/.test(n.text || "")
  );
  if (confirm?.center) {
    tap(confirm.center.x, confirm.center.y);
    sleep(1200);
  }

  for (let i = 0; i < 6; i++) {
    xml = dumpUi();
    if (
      xml.includes("com.ecommerceappfullstack") ||
      xml.includes("photo-closest-match") ||
      xml.includes("CLIP analysis") ||
      xml.includes("Search unavailable")
    ) {
      return;
    }
    sleep(700);
  }
}
