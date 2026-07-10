// server/scripts/lib/imageIntegrity.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Comfortably above the confirmed-dead escuelajs/imgur placeholder stub (503 bytes,
// verified live this session) and comfortably below every confirmed-real product photo
// size seen this session (several KB or more). See the plan's Global Constraints.
const PLACEHOLDER_SIZE_THRESHOLD_BYTES = 2048;

function hashImage(absolutePath) {
  const buf = fs.readFileSync(absolutePath);
  return crypto.createHash("md5").update(buf).digest("hex");
}

function isLikelyPlaceholder(buffer) {
  return buffer.length < PLACEHOLDER_SIZE_THRESHOLD_BYTES;
}

function findDuplicateGroups(products, repoRoot) {
  const byHash = new Map();
  for (const product of products) {
    const img = product.images?.[0];
    if (!img) continue;
    const absolutePath = path.join(repoRoot, img);
    if (!fs.existsSync(absolutePath)) continue;
    const buf = fs.readFileSync(absolutePath);
    const hash = crypto.createHash("md5").update(buf).digest("hex");
    if (!byHash.has(hash)) byHash.set(hash, { hash, size: buf.length, members: [] });
    byHash.get(hash).members.push(product);
  }
  return [...byHash.values()].filter((g) => g.members.length > 1);
}

function isRealSource(product) {
  return /^(dj|fs)-/.test(product.id);
}

function classifyDuplicateGroups(groups) {
  const needsFix = [];
  const legitimateOriginals = [];
  for (const { size, members } of groups) {
    const realMembers = members.filter(isRealSource);
    const nonRealMembers = members.filter((p) => !isRealSource(p));
    if (size < PLACEHOLDER_SIZE_THRESHOLD_BYTES) {
      needsFix.push(...members);
    } else if (realMembers.length === 1 && nonRealMembers.length >= 1) {
      legitimateOriginals.push(realMembers[0]);
      needsFix.push(...nonRealMembers);
    } else {
      needsFix.push(...members);
    }
  }
  return { needsFix, legitimateOriginals };
}

module.exports = {
  PLACEHOLDER_SIZE_THRESHOLD_BYTES,
  hashImage,
  isLikelyPlaceholder,
  findDuplicateGroups,
  classifyDuplicateGroups,
};
