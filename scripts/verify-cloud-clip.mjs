#!/usr/bin/env node
/**
 * Poll cloud API until CLIP model loads and index builds (or timeout).
 * Usage:
 *   npm run verify:cloud:clip
 *   API_URL=https://your-app.up.railway.app npm run verify:cloud:clip
 */
import { DEFAULT_CLOUD_API } from "./lib/cloud-api-url.mjs";
import { resolveClipIndexTarget } from "./lib/verify-ml-thresholds.mjs";

const BASE = process.env.API_URL || DEFAULT_CLOUD_API;
const MIN_INDEX = Number(process.env.MIN_CLIP_INDEX || 200);
const MAX_WAIT_MS = Number(process.env.CLIP_WAIT_MS || 900000);
const POLL_MS = 5000;

async function getStatus() {
  const res = await fetch(`${BASE}/api/visual-search/status`);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  console.log(`Cloud API: ${BASE}`);
  console.log(`Waiting for modelLoaded + indexCount ≥ ${MIN_INDEX} (max ${MAX_WAIT_MS / 1000}s)\n`);

  const start = Date.now();
  let last = null;
  let loggedAdjustment = false;

  while (Date.now() - start < MAX_WAIT_MS) {
    const { status, body } = await getStatus();
    if (status !== 200) {
      console.error(`✗ status HTTP ${status}`);
      process.exit(1);
    }
    last = body;
    const { modelLoaded, indexCount, catalogCount, indexing } = body;
    const target = resolveClipIndexTarget({ minIndex: MIN_INDEX, catalogCount });
    if (target < MIN_INDEX && !loggedAdjustment) {
      console.log(
        `\nℹ clip-index target adjusted to ${target} because catalog currently exposes ${catalogCount} products`
      );
      loggedAdjustment = true;
    }
    process.stdout.write(
      `  … modelLoaded=${modelLoaded} index=${indexCount}/${catalogCount || "?"} indexing=${indexing}\r`
    );
    if (modelLoaded && indexCount >= target) {
      console.log(`\n✓ CLIP ready — ${indexCount} products indexed`);
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  console.error(`\n✗ CLIP not ready after ${MAX_WAIT_MS / 1000}s`);
  console.error(JSON.stringify(last, null, 2));
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
