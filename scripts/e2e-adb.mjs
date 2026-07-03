#!/usr/bin/env node
/**
 * Android emulator UI helpers for E2E flows (uiautomator + adb input).
 */
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCREENSHOT_DIR = join(ROOT, "docs", "e2e");

export const PACKAGE = "com.ecommerceappfullstack";
export const DEVICE = process.env.ADB_DEVICE || "emulator-5554";
export const ADB = `adb -s ${DEVICE}`;

function adb(cmd) {
  return execSync(`${ADB} ${cmd}`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

export function screenshot(name) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const path = join(SCREENSHOT_DIR, `${name}.png`);
  const buf = execSync(`${ADB} exec-out screencap -p`);
  writeFileSync(path, buf);
  console.log(`screenshot: ${path}`);
  return path;
}

export function dumpUi() {
  adb("shell uiautomator dump /sdcard/window_dump.xml");
  return adb("shell cat /sdcard/window_dump.xml");
}

function parseBounds(bounds) {
  const m = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!m) return null;
  const [, x1, y1, x2, y2] = m.map(Number);
  return { x: Math.floor((x1 + x2) / 2), y: Math.floor((y1 + y2) / 2), x1, y1, x2, y2 };
}

function parseNodeTag(tag) {
  const get = (attr) => {
    const m = tag.match(new RegExp(`${attr}="([^"]*)"`));
    return m ? m[1] : "";
  };
  return {
    text: get("text"),
    hint: get("hint"),
    contentDesc: get("content-desc"),
    resourceId: get("resource-id"),
    className: get("class"),
    clickable: get("clickable") === "true",
    bounds: get("bounds"),
  };
}

export function findNodes(xml, { text, contentDesc, className, clickable, testId } = {}) {
  const nodes = [];
  const re = /<node\b[^>]*>/g;
  let match;
  while ((match = re.exec(xml)) !== null) {
    const node = parseNodeTag(match[0]);
    if (text !== undefined && node.text !== text && node.hint !== text) continue;
    if (contentDesc !== undefined && node.contentDesc !== contentDesc) continue;
    if (className && !node.className.includes(className)) continue;
    if (clickable !== undefined && node.clickable !== clickable) continue;
    if (testId !== undefined && !resourceIdMatches(node.resourceId, testId)) continue;
    const center = parseBounds(node.bounds);
    if (center) nodes.push({ ...node, center });
  }
  return nodes;
}

function resourceIdMatches(resourceId, testId) {
  if (!resourceId) return false;
  return (
    resourceId === testId ||
    resourceId.endsWith(`:id/${testId}`) ||
    resourceId.endsWith(`/${testId}`)
  );
}

export function findByTestId(xml, testId, { clickable } = {}) {
  return findNodes(xml, { testId, clickable })[0] ?? null;
}

export function waitForTestId(testId, { timeoutMs = 15000, intervalMs = 500, clickable } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const node = findByTestId(dumpUi(), testId, { clickable });
    if (node) return node;
    sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for testID: ${testId}`);
}

export function waitForText(text, { timeoutMs = 15000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const xml = dumpUi();
    if (xml.includes(text) || findNodes(xml, { text }).length > 0) return xml;
    sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for text: ${text}`);
}

export function waitForAnyText(texts, { timeoutMs = 15000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const xml = dumpUi();
    for (const text of texts) {
      if (xml.includes(text) || findNodes(xml, { text }).length > 0) return { xml, text };
    }
    sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for any of: ${texts.join(", ")}`);
}

export function tap(x, y) {
  adb(`shell input tap ${x} ${y}`);
}

export function tapTestId(testId, opts = {}) {
  const node = waitForTestId(testId, opts);
  tap(node.center.x, node.center.y);
  return node;
}

export function tapTab(name) {
  return tapTestId(`tab-${name}`, { clickable: true });
}

export function tapContentDesc(desc) {
  const xml = dumpUi();
  const nodes = findNodes(xml, { contentDesc: desc, clickable: true });
  if (!nodes.length) throw new Error(`No clickable node for content-desc: ${desc}`);
  tap(nodes[0].center.x, nodes[0].center.y);
  return nodes[0];
}

export function hideKeyboard() {
  try {
    pressKey(4);
  } catch {
    /* ignore */
  }
  sleep(400);
}

export function clearField() {
  for (let i = 0; i < 60; i++) pressKey(67);
  sleep(100);
}

export function setClipboardText(text) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const b64Path = join(SCREENSHOT_DIR, ".adb-clipboard.b64");
  writeFileSync(b64Path, Buffer.from(String(text), "utf8").toString("base64"));
  spawnSync("adb", ["-s", DEVICE, "push", b64Path, "/sdcard/adb-clipboard.b64"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  const result = spawnSync(
    "adb",
    ["-s", DEVICE, "shell", 'cmd clipboard set-primary-clip "$(base64 -d /sdcard/adb-clipboard.b64)"'],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || "Failed to set clipboard");
  }
  sleep(150);
}

export function pasteFromClipboard(text) {
  setClipboardText(text);
  pressKey(279);
  sleep(200);
}

export function clearAndType(value) {
  clearField();
  if (!value) return;
  const str = String(value);
  const needsPaste = /['"\n\\]/.test(str) || /[^a-zA-Z0-9._\-@% ]/.test(str);
  if (needsPaste) {
    pasteFromClipboard(str);
    return;
  }
  if (str.length <= 40) {
    inputText(str);
    return;
  }
  for (let i = 0; i < str.length; i += 40) {
    inputText(str.slice(i, i + 40));
  }
}

export function tapText(text, opts = {}) {
  const xml = dumpUi();
  const nodes = findNodes(xml, { text, ...opts });
  if (!nodes.length) throw new Error(`No node for text/hint: ${text}`);
  const n = nodes[0];
  tap(n.center.x, n.center.y);
  return n;
}

export function tapClass(className) {
  const xml = dumpUi();
  const nodes = findNodes(xml, { className });
  if (!nodes.length) throw new Error(`No node for class: ${className}`);
  tap(nodes[0].center.x, nodes[0].center.y);
  return nodes[0];
}

export function inputText(value) {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/ /g, "%s")
    .replace(/@/g, "\\@")
    .replace(/'/g, "\\'");
  adb(`shell input text "${escaped}"`);
}

export function pressKey(keycode) {
  adb(`shell input keyevent ${keycode}`);
}

export function swipe(x1, y1, x2, y2, ms = 300) {
  adb(`shell input swipe ${x1} ${y1} ${x2} ${y2} ${ms}`);
}

export function sleep(ms) {
  execSync(`sleep ${ms / 1000}`);
}

export function launchApp() {
  adb(`shell am force-stop ${PACKAGE}`);
  adb(`shell am start -n ${PACKAGE}/.MainActivity`);
}

/** Bring app to foreground without clearing state (preferred when emulator is already running). */
export function ensureAppForeground() {
  adb(`shell am start -n ${PACKAGE}/.MainActivity`);
}

/** Back out of system sheets/pickers until main app tabs are visible again. */
export function recoverToApp({ maxBackPresses = 6 } = {}) {
  for (let i = 0; i < maxBackPresses; i++) {
    const xml = dumpUi();
    if (
      findByTestId(xml, "tab-home") ||
      xml.includes("What are you shopping for today?") ||
      findByTestId(xml, "voice-search-card")
    ) {
      return true;
    }
    const homeTab = findNodes(xml).find(
      (n) => (n.contentDesc === "Home" || n.text === "Home") && n.clickable
    );
    if (homeTab?.center) {
      tap(homeTab.center.x, homeTab.center.y);
      sleep(800);
      continue;
    }
    pressKey(4);
    sleep(600);
  }
  ensureAppForeground();
  sleep(2000);
  try {
    tapTab("home");
    return true;
  } catch {
    return Boolean(findByTestId(dumpUi(), "tab-home"));
  }
}

export function scrollToTestId(testId, { maxSwipes = 8 } = {}) {
  for (let i = 0; i < maxSwipes; i++) {
    const node = findByTestId(dumpUi(), testId);
    if (node) return node;
    swipe(720, 1600, 720, 650, 350);
    sleep(650);
  }
  return findByTestId(dumpUi(), testId);
}

export function logcatErrors(sinceSec = 30) {
  try {
    return execSync(
      `${ADB} logcat -d -t ${sinceSec * 20} | grep -iE 'ReactNativeJS.*(Error|error)|UnableToResolve|Add to Cart Error|Login API|Fetch Cart' || true`,
      { encoding: "utf8" }
    );
  } catch {
    return "";
  }
}

export function tapBrowseProducts() {
  for (let attempt = 0; attempt < 4; attempt++) {
    const xml = dumpUi();
    const byId = findByTestId(xml, "browse-all-products");
    if (byId) {
      tap(byId.center.x, byId.center.y);
      return;
    }
    const byText = findNodes(xml, { text: "Browse all products" });
    if (byText[0]) {
      tap(byText[0].center.x, byText[0].center.y);
      return;
    }
    swipe(720, 1600, 720, 400, 350);
    sleep(700);
  }
  tapText("Browse all products");
}

export function uiIncludes(...needles) {
  const xml = dumpUi();
  return needles.every((needle) => xml.includes(needle));
}

export async function loginIfNeeded({
  email = "test@example.com",
  password = "secret123",
} = {}) {
  let xml = dumpUi();
  if (
    findByTestId(xml, "browse-all-products") ||
    findByTestId(xml, "voice-search-card") ||
    findByTestId(xml, "tab-home") ||
    xml.includes("What are you shopping for today?")
  ) {
    return false;
  }

  const onSignupScreen =
    xml.includes("Create account") ||
    (findNodes(xml, { className: "EditText" }).length >= 3 && !findByTestId(xml, "login-email"));
  if (onSignupScreen) {
    pressKey(4);
    sleep(1500);
    xml = dumpUi();
  }

  const onLoginScreen =
    findByTestId(xml, "login-email") ||
    findByTestId(xml, "login-submit") ||
    xml.includes("Sign in ↓") ||
    (xml.includes("Sign in") && xml.includes("Password"));

  if (!onLoginScreen) {
    return false;
  }

  const scrollBtn = findNodes(xml).find((n) => n.text === "Sign in ↓" || n.text === "Sign in");
  if (scrollBtn?.center) tap(scrollBtn.center.x, scrollBtn.center.y);
  sleep(1200);

  try {
    tapTestId("login-email", { timeoutMs: 8000 });
  } catch {
    const edits = findNodes(dumpUi(), { className: "EditText" });
    if (!edits.length) throw new Error("Login email field not found");
    tap(edits[0].center.x, edits[0].center.y);
  }
  sleep(300);
  clearAndType(email);

  try {
    tapTestId("login-password", { timeoutMs: 8000 });
  } catch {
    const edits = findNodes(dumpUi(), { className: "EditText" });
    if (edits.length < 2) throw new Error("Login password field not found");
    tap(edits[1].center.x, edits[1].center.y);
  }
  sleep(300);
  clearAndType(password);
  hideKeyboard();

  try {
    tapTestId("login-submit", { timeoutMs: 5000 });
  } catch {
    const loginBtn = findNodes(dumpUi(), { text: "Login", clickable: true });
    if (loginBtn[0]) tap(loginBtn[0].center.x, loginBtn[0].center.y);
    else {
      try {
        tapContentDesc("Login");
      } catch {
        tapText("Login");
      }
    }
  }
  sleep(4000);
  const after = dumpUi();
  if (
    !findByTestId(after, "tab-home") &&
    !after.includes("What are you shopping for today?")
  ) {
    throw new Error("Login did not reach home screen");
  }
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  if (cmd === "screenshot") screenshot(process.argv[3] || "capture");
  else if (cmd === "tap") tapText(process.argv[3]);
  else console.log("Usage: e2e-adb.mjs screenshot|tap <text>");
}
