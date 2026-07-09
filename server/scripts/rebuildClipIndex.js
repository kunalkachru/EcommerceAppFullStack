// server/scripts/rebuildClipIndex.js
const fs = require("fs");
const path = require("path");

const CACHE_PATH = path.join(__dirname, "..", "data", "clip-embeddings.json");
// warmVisualSearchIndex() takes no options (confirmed via its real signature,
// not assumed) -- force a clean rebuild by removing the cache file first.
if (fs.existsSync(CACHE_PATH)) {
  fs.unlinkSync(CACHE_PATH);
}

const { warmVisualSearchIndex } = require("../src/visualSearch");

async function main() {
  console.log("Rebuilding CLIP embedding index against catalog-static.json ...");
  const start = Date.now();
  await warmVisualSearchIndex();
  console.log(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error("CLIP rebuild failed:", err);
  process.exit(1);
});
