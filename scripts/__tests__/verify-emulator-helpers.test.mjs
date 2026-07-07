import test from "node:test";
import assert from "node:assert/strict";

import {
  homeVisualDiscoveryReady,
  findFirstVisibleProductCard,
  findHomeVisualGalleryTrigger,
} from "../lib/verify-emulator-helpers.mjs";

test("homeVisualDiscoveryReady accepts the finalized home mockup section without relying on the eyebrow text", () => {
  const xml = `
    <hierarchy>
      <node resource-id="photo-search-section" />
      <node text="Match the look from one reference image." />
      <node text="Narrow search (optional)" />
      <node resource-id="photo-gallery-button" clickable="true" bounds="[120,1500][520,1640]" />
    </hierarchy>
  `;

  assert.equal(homeVisualDiscoveryReady(xml), true);
});

test("findHomeVisualGalleryTrigger falls back to the redesigned gallery CTA text when the test id is not exposed", () => {
  const xml = `
    <hierarchy>
      <node text="Narrow search (optional)" />
      <node text="Open gallery" clickable="true" bounds="[120,1500][520,1640]" />
    </hierarchy>
  `;

  const trigger = findHomeVisualGalleryTrigger(xml);
  assert.ok(trigger);
  assert.equal(trigger.text, "Open gallery");
});

test("findFirstVisibleProductCard ignores off-screen product cards and returns the first tappable visible card", () => {
  const xml = `
    <hierarchy>
      <node
        resource-id="product-list-item-es-14"
        content-desc="Classics High-Waisted Athletic Shorts"
        clickable="true"
        bounds="[102,2603][648,3120]"
      />
      <node
        resource-id="product-list-item-es-15"
        content-desc="Life Cycle Product Edited Name"
        clickable="true"
        bounds="[88,1320][640,1840]"
      />
      <node
        resource-id="product-list-item-es-16"
        content-desc="Another Visible Product"
        clickable="true"
        bounds="[712,1360][1248,1888]"
      />
    </hierarchy>
  `;

  const card = findFirstVisibleProductCard(xml);
  assert.ok(card);
  assert.equal(card.resourceId, "product-list-item-es-15");
  assert.equal(card.center.y < 2200, true);
});
