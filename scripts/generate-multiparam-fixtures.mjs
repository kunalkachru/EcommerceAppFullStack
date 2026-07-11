#!/usr/bin/env node
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFixtures } from "./lib/multiparam-fixture-builder.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const catalog = JSON.parse(readFileSync(join(ROOT, "server", "catalog-static.json"), "utf8"));
const products = catalog.products;

const fixtures = buildFixtures(products);
const outDir = join(ROOT, "scripts", "fixtures");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "golden-multiparam-queries.json");
writeFileSync(outPath, JSON.stringify(fixtures, null, 2) + "\n");

console.log(`Wrote ${fixtures.length} fixtures to ${outPath}`);
fixtures.forEach((f) => console.log(`  ${f.id}: "${f.query}" -> ${f.expectedProductTitle ?? "(no match expected)"}`));
