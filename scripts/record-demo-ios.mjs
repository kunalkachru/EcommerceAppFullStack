#!/usr/bin/env node
/**
 * Record iOS demo videos with Maestro-driven UI + simctl recordVideo.
 *
 * LLM keys: read from src/.env at runtime (gitignored) — never stored in this file.
 *   OPENROUTER_API_KEY or OPENAI_API_KEY
 *
 * Prerequisites: booted iOS simulator, API + Metro, app installed (npm run ios).
 */
import { spawn, execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { loadClientEnv, resolveDemoLlmKey, CLIENT_ENV_PATH } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs", "demo", "videos");
const MAESTRO_DIR = join(ROOT, ".maestro");
const BUNDLE_ID = "org.reactjs.native.example.EcommerceAppFullStack";
const API = process.env.API_URL || "http://127.0.0.1:5001";

const MAESTRO =
  process.env.MAESTRO_PATH ||
  (existsSync(join(homedir(), ".maestro/bin/maestro"))
    ? join(homedir(), ".maestro/bin/maestro")
    : "maestro");

function sleep(ms) {
  execSync(`sleep ${ms / 1000}`);
}

function ensureBootedSimulator() {
  const out = execSync("xcrun simctl list devices booted", { encoding: "utf8" });
  if (!out.includes("Booted")) {
    throw new Error("No booted iOS simulator. Start iPhone simulator from Xcode.");
  }
}

async function ensureApi() {
  const res = await fetch(`${API}/health`).catch(() => null);
  if (!res?.ok) throw new Error("API not reachable at :5001 — run npm run server");
}

function runMaestro(flowFile, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  execSync(`"${MAESTRO}" test "${flowFile}"`, {
    cwd: MAESTRO_DIR,
    env,
    stdio: "inherit",
  });
}

async function recordWithMaestro(name, flowFile, extraEnv = {}) {
  mkdirSync(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, name);
  console.log(`\n▶ Recording ${name} → ${out}`);

  const proc = spawn("xcrun", ["simctl", "io", "booted", "recordVideo", "--force", out], {
    stdio: "ignore",
  });

  sleep(2000);
  try {
    runMaestro(flowFile, extraEnv);
  } finally {
    proc.kill("SIGINT");
    await new Promise((resolve) => proc.on("close", resolve));
  }

  console.log(`✓ Saved ${out}`);
}

async function main() {
  ensureBootedSimulator();
  await ensureApi();

  try {
    execSync(`xcrun simctl launch booted ${BUNDLE_ID}`, { stdio: "ignore" });
  } catch {
    console.warn("Launch failed — run: npx react-native run-ios --udid <booted-udid>");
  }

  const only = process.env.RECORD_ONLY || "";
  const clientEnv = loadClientEnv();
  const llmKey = resolveDemoLlmKey(clientEnv);

  if ((!only || only === "ml-features") && !llmKey) {
    console.warn(
      `\n⚠ ML demo: set OPENROUTER_API_KEY or OPENAI_API_KEY in ${CLIENT_ENV_PATH}\n`
    );
  }

  const maestroEnv = llmKey ? { DEMO_LLM_API_KEY: llmKey } : { DEMO_LLM_API_KEY: "" };

  if (!only || only === "app-flow") {
    await recordWithMaestro("app-flow-demo.mp4", "demo-app-flow.yaml");
  }
  if (!only || only === "ml-features") {
    await recordWithMaestro("ml-features-demo.mp4", "demo-ml-features.yaml", maestroEnv);
  }

  console.log("\nDone — docs/demo/videos/ (app-flow-demo.mp4, ml-features-demo.mp4)");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
