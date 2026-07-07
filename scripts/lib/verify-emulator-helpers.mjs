function parseBounds(bounds) {
  const match = String(bounds || "").match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) {
    return null;
  }
  const [, x1, y1, x2, y2] = match.map(Number);
  return {
    x1,
    y1,
    x2,
    y2,
    center: {
      x: Math.floor((x1 + x2) / 2),
      y: Math.floor((y1 + y2) / 2),
    },
  };
}

function parseNode(tag) {
  const get = (attr) => {
    const match = tag.match(new RegExp(`${attr}="([^"]*)"`, "i"));
    return match ? match[1] : "";
  };

  const bounds = parseBounds(get("bounds"));
  return {
    resourceId: get("resource-id"),
    contentDesc: get("content-desc"),
    text: get("text"),
    clickable: get("clickable") === "true",
    bounds,
    center: bounds?.center ?? null,
  };
}

function extractNodes(xml) {
  const nodes = [];
  const matches = String(xml || "").match(/<node\b[^>]*>/g) || [];
  for (const tag of matches) {
    nodes.push(parseNode(tag));
  }
  return nodes;
}

export function findHomeVisualGalleryTrigger(xml) {
  return (
    extractNodes(xml).find(
      (node) =>
        node.clickable &&
        node.resourceId === "photo-gallery-button"
    ) ||
    extractNodes(xml).find(
      (node) =>
        node.clickable &&
        /open gallery|gallery/i.test(node.text || node.contentDesc || "")
    ) ||
    null
  );
}

export function homeVisualDiscoveryReady(xml) {
  const hay = String(xml || "");
  const hasGallery = Boolean(findHomeVisualGalleryTrigger(xml));
  const hasSection =
    hay.includes("photo-search-section") ||
    hay.includes("Match the look from one reference image.");
  const hasNarrow =
    hay.includes("Narrow search") ||
    hay.includes("Bias the photo matcher");

  return hasGallery && (hasSection || hasNarrow);
}

export function findFirstVisibleProductCard(
  xml,
  { minY = 350, maxY = 2200 } = {}
) {
  return (
    extractNodes(xml)
      .filter(
        (node) =>
          node.clickable &&
          /^product-list-item-/.test(node.resourceId || "") &&
          (node.contentDesc || "").length > 10 &&
          node.center &&
          node.center.y >= minY &&
          node.center.y <= maxY
      )
      .sort((a, b) => a.center.y - b.center.y)[0] ?? null
  );
}
