#!/usr/bin/env node
/**
 * Batch visual-search evaluation across varied images.
 * Usage: node scripts/eval-visual-search.mjs
 */
import https from "https";
import http from "http";

const API = process.env.VISUAL_SEARCH_API || "http://127.0.0.1:5001/api/visual-search";

const CASES = [
  {
    id: "catalog-jacket",
    group: "in-catalog",
    expectId: 3,
    url: "https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_t.png",
    note: "Exact Mens Cotton Jacket product image",
  },
  {
    id: "catalog-backpack",
    group: "in-catalog",
    expectId: 1,
    url: "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png",
    note: "Exact backpack product image",
  },
  {
    id: "catalog-tshirt",
    group: "in-catalog",
    expectId: 2,
    url: "https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_t.png",
    note: "Exact t-shirt product image",
  },
  {
    id: "catalog-jewelry",
    group: "in-catalog",
    expectId: 8,
    url: "https://fakestoreapi.com/img/61sbMiUnoGL._AC_UL640_QL65_ML3_t.png",
    note: "Pierced Owl rose gold plated earrings",
    acceptTop3: [6, 7, 8],
  },
  {
    id: "catalog-monitor",
    group: "in-catalog",
    expectId: 14,
    url: "https://fakestoreapi.com/img/81Zt42ioCgL._AC_SX679_t.png",
    note: "Samsung monitor product image",
  },
  {
    id: "off-catalog-dog",
    group: "off-catalog",
    url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
    note: "Dog photo — not in FakeStore inventory",
  },
  {
    id: "off-catalog-pizza",
    group: "off-catalog",
    url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    note: "Pizza — food, not in inventory",
  },
  {
    id: "off-catalog-car",
    group: "off-catalog",
    url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400",
    note: "Sports car — not in inventory",
  },
  {
    id: "off-catalog-laptop-desk",
    group: "ambiguous",
    url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400",
    note: "Laptop on desk — electronics-adjacent but not exact SKU",
  },
  {
    id: "off-catalog-sneakers",
    group: "off-catalog",
    url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
    note: "Red sneakers — shoes category not in FakeStore",
  },
];

function fetchImageBase64(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, { headers: { "User-Agent": "visual-search-eval/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchImageBase64(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
      })
      .on("error", reject);
  });
}

async function search(base64) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64 }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function main() {
  console.log("Visual search evaluation\nAPI:", API, "\n");

  const rows = [];
  let catalogHits = 0;
  let catalogTotal = 0;

  for (const c of CASES) {
    process.stdout.write(`  ${c.id}... `);
    try {
      const b64 = await fetchImageBase64(c.url);
      const r = await search(b64);
      const top = r.matches?.[0];
      const top3 = (r.matches ?? []).slice(0, 3).map((m) => m.id);
      const hit =
        c.acceptTop3?.length
          ? c.acceptTop3.some((id) => top3.includes(id))
          : c.expectId != null && top3.includes(c.expectId);
      if (c.group === "in-catalog") {
        catalogTotal += 1;
        if (hit) catalogHits += 1;
      }

      const row = {
        id: c.id,
        group: c.group,
        status: r.resultStatus,
        identified: r.identification?.summary,
        idConfidence: r.identification?.probes?.[0]?.confidence,
        topMatch: top ? { id: top.id, title: top.title?.slice(0, 40), score: top.matchScore } : null,
        top3,
        hit,
        nearest: r.nearestMatch,
        probes: (r.identification?.probes ?? []).slice(0, 3),
        falsePositive: c.group === "off-catalog" && r.resultStatus === "found",
      };
      rows.push(row);
      console.log(
        hit ? "HIT" : r.resultStatus ?? "?",
        `| id=${row.identified ?? "?"} (${((row.idConfidence ?? 0) * 100).toFixed(0)}%)`,
        top ? `| top=${top.id}@${top.matchScore}` : "| no matches",
        row.falsePositive ? "| FALSE_POSITIVE" : ""
      );
    } catch (e) {
      rows.push({ id: c.id, group: c.group, error: e.message });
      console.log("ERR", e.message.slice(0, 60));
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`In-catalog top-3 hit rate: ${catalogHits}/${catalogTotal}`);
  const offCatalog = rows.filter((r) => r.group === "off-catalog" && !r.error);
  const falsePositives = offCatalog.filter((r) => r.falsePositive);
  console.log(`Off-catalog false positives (returned matches): ${falsePositives.length}/${offCatalog.length}`);
  if (falsePositives.length) {
    console.log("  →", falsePositives.map((r) => r.id).join(", "));
  }

  console.log("\n=== DETAIL ===");
  for (const r of rows) {
    console.log(JSON.stringify(r, null, 0));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
