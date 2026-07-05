#!/usr/bin/env node
/**
 * Pre-deploy gate: cloud API + CLIP + ML + search against Railway.
 * Retries transient failures (cold start, indexing) — blocks on real regressions.
 *
 * Usage:
 *   npm run verify:cloud:deploy-gate
 *   CLIP_WAIT_MS=600000 npm run verify:cloud:deploy-gate
 *
 * Env:
 *   CLIP_WAIT_MS     — max wait for CLIP index (default 600000 = 10 min)
 *   GATE_RETRY_MS    — pause between attempts (default 30000)
 *   GATE_MAX_ATTEMPTS — default 2
 *   DEPLOY_GATE_STRICT=1 — treat unknown failures as blocking (no retry)
 */
import { spawn } from "node:child_process";
import {
  classifyGateFailure,
  shouldRetry,
} from "./lib/gate-failure-classifier.mjs";

const CLIP_WAIT_MS = process.env.CLIP_WAIT_MS || "600000";
const RETRY_MS = Number(process.env.GATE_RETRY_MS || 30000);
const MAX_ATTEMPTS = Number(process.env.GATE_MAX_ATTEMPTS || 2);
const STRICT = process.env.DEPLOY_GATE_STRICT === "1";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runVerifyAll() {
  return new Promise((resolve) => {
    const chunks = [];
    const child = spawn("npm", ["run", "verify:cloud:all"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CLIP_WAIT_MS },
      shell: process.platform === "win32",
    });
    child.stdout.on("data", (d) => {
      process.stdout.write(d);
      chunks.push(d);
    });
    child.stderr.on("data", (d) => {
      process.stderr.write(d);
      chunks.push(d);
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output: Buffer.concat(chunks).toString("utf8") });
    });
  });
}

async function main() {
  console.log("=== Deploy gate: verify:cloud:all ===");
  console.log(`CLIP_WAIT_MS=${CLIP_WAIT_MS}  maxAttempts=${MAX_ATTEMPTS}\n`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      console.log(`\n--- Retry ${attempt}/${MAX_ATTEMPTS} after ${RETRY_MS / 1000}s ---\n`);
      await sleep(RETRY_MS);
    }

    const { code, output } = await runVerifyAll();
    if (code === 0) {
      console.log("\n✓ Deploy gate PASSED");
      process.exit(0);
    }

    const kind = classifyGateFailure(output);
    console.error(`\n✗ Attempt ${attempt} failed (classified: ${kind})`);

    if (kind === "blocking") {
      console.error("Blocking failure — fix API/config before deploy.");
      process.exit(1);
    }

    if (STRICT && kind === "unknown") {
      console.error("Unknown failure with DEPLOY_GATE_STRICT=1 — not retrying.");
      process.exit(1);
    }

    if (!shouldRetry(kind, attempt, MAX_ATTEMPTS)) {
      console.error(
        kind === "transient"
          ? "Transient failure persisted after retries — Railway may be down."
          : "Gate failed after retries."
      );
      process.exit(1);
    }

    console.error(
      kind === "transient"
        ? "Likely cold start / CLIP indexing — will retry."
        : "Unclassified failure — retrying once before blocking deploy."
    );
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
