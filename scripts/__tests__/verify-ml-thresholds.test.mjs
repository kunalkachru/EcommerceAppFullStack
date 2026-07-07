import test from "node:test";
import assert from "node:assert/strict";

import { resolveClipIndexTarget } from "../lib/verify-ml-thresholds.mjs";

test("resolveClipIndexTarget caps the CLIP target at the observed catalog size", () => {
  assert.equal(resolveClipIndexTarget({ minIndex: 300, catalogCount: 252 }), 252);
});

test("resolveClipIndexTarget keeps the configured minimum when catalog is larger", () => {
  assert.equal(resolveClipIndexTarget({ minIndex: 300, catalogCount: 390 }), 300);
});
