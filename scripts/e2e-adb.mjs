#!/usr/bin/env node
/**
 * Minimal Android emulator UI helpers for E2E flows (uiautomator + adb input).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCREENSHOT_DIR = join(ROOT, "docs", "e2e");
const DEVICE = process.env.ADB_DEVICE || "emulator-5554";
const ADB = `adb -s ${DEVICE}`;

function adb(cmd) {
  return execSync(`${ADB} ${cmd}`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
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
  const xml = adb("shell cat /sdcard/window_dump.xml");
  return xml;
}

function parseBounds(bounds) {
  const m = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!m) return null;
  const [, x1, y1, x2, y2] = m.map(Number);
  return { x: Math.floor((x1 + x2) / 2), y: Math.floor((y1 + y2) / 2), x1, y1, x2, y2 };
}

export function findNodes(xml, { text, contentDesc, className, clickable } = {}) {
  const nodes = [];
  const re = /<node\b[^>]*>/g;
  let match;
  while ((match = re.exec(xml)) !== null) {
    const tag = match[0];
    const get = (attr) => {
      const m = tag.match(new RegExp(`${attr}="([^"]*)"`));
      return m ? m[1] : "";
    };
    const node = {
      text: get("text"),
      hint: get("hint"),
      contentDesc: get("content-desc"),
      className: get("class"),
      clickable: get("clickable") === "true",
      bounds: get("bounds"),
    };
    if (text !== undefined && node.text !== text && node.hint !== text) continue;
    if (contentDesc !== undefined && node.contentDesc !== contentDesc) continue;
    if (className && !node.className.includes(className)) continue;
    if (clickable !== undefined && node.clickable !== clickable) continue;
    const center = parseBounds(node.bounds);
    if (center) nodes.push({ ...node, center });
  }
  return nodes;
}

export function tap(x, y) {
  adb(`shell input tap ${x} ${y}`);
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
    pressKey(4); // BACK
  } catch {
    /* ignore */
  }
  sleep(400);
}

export function clearAndType(value) {
  pressKey(279);
  for (let i = 0; i < 40; i++) pressKey(67);
  inputText(value);
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
  adb("shell am force-stop com.ecommerceappfullstack");
  adb("shell am start -n com.ecommerceappfullstack/.MainActivity");
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  if (cmd === "screenshot") screenshot(process.argv[3] || "capture");
  else if (cmd === "tap") tapText(process.argv[3]);
  else console.log("Usage: e2e-adb.mjs screenshot|tap <text>");
}
