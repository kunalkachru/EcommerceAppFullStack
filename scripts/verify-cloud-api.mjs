#!/usr/bin/env node
/**
 * Smoke-test the deployed cloud API (Railway or API_URL override).
 * Usage:
 *   npm run verify:cloud
 *   API_URL=https://your-app.up.railway.app npm run verify:cloud
 */
import { DEFAULT_CLOUD_API } from "./lib/cloud-api-url.mjs";

const BASE =
  process.env.API_URL ||
  process.env.RAILWAY_URL ||
  DEFAULT_CLOUD_API;

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function post(path, payload) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

function ok(label, pass, detail = "") {
  const mark = pass ? "PASS" : "FAIL";
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

async function main() {
  console.log(`Cloud API: ${BASE}\n`);

  let passed = 0;
  let total = 0;

  total += 1;
  const health = await get("/health");
  if (ok("GET /health", health.status === 200 && health.body?.ok === true, `status ${health.status}`)) {
    passed += 1;
  }

  total += 1;
  const meta = await get("/api/catalog/meta");
  const metaOk =
    meta.status === 200 &&
    typeof meta.body === "object" &&
    !meta.body?.message?.includes("HTTP 403");
  if (ok("GET /api/catalog/meta", metaOk, meta.body?.total ? `${meta.body.total} products` : JSON.stringify(meta.body).slice(0, 80))) {
    passed += 1;
  }

  total += 1;
  let login = await post("/api/users/login", {
    email: "test@example.com",
    password: "secret123",
  });
  if (login.status === 401) {
    await post("/api/users/register", {
      name: "Test User",
      email: "test@example.com",
      password: "secret123",
    });
    login = await post("/api/users/login", {
      email: "test@example.com",
      password: "secret123",
    });
  }
  if (ok("POST /api/users/login", login.status === 200 && Boolean(login.body?.token), `status ${login.status}`)) {
    passed += 1;
  }

  total += 1;
  const token = login.body?.token;
  if (token) {
    const cart = await fetch(`${BASE}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (ok("GET /api/cart (auth)", cart.status === 200, `status ${cart.status}`)) {
      passed += 1;
    }
  } else {
    ok("GET /api/cart (auth)", false, "no token from login");
  }

  console.log(`\n${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
