/**
 * Lightweight REST API for the React Native ecommerce demo.
 * Persists users and carts to server/data/store.json.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  searchByImageBase64,
  warmVisualSearchIndex,
  getStatus,
} = require("./visualSearch");

const PORT = Number(process.env.PORT) || 5001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const DATA_PATH = path.join(__dirname, "..", "data", "store.json");

function loadStore() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { users: [], carts: {} };
  }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
}

let store = loadStore();

function normalizeCartItems(lines) {
  return (lines || []).map((line) => ({
    id: String(line.productId),
    productId: String(line.productId),
    title: line.title,
    price: Number(line.price),
    quantity: Number(line.quantity),
    image: line.image,
  }));
}

function getCartLines(userId) {
  if (!store.carts[userId]) store.carts[userId] = [];
  return store.carts[userId];
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use(morgan("tiny"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const visualSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many visual searches — try again shortly." },
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, visualSearch: getStatus() });
});

app.get("/api/visual-search/status", (_req, res) => {
  res.json(getStatus());
});

app.post("/api/visual-search", visualSearchLimiter, async (req, res) => {
  const { imageBase64 } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ message: "imageBase64 is required" });
  }
  if (imageBase64.length > 10_000_000) {
    return res.status(413).json({ message: "Image too large (max ~7MB)" });
  }
  try {
    const result = await searchByImageBase64(imageBase64, { limit: 8 });
    res.json(result);
  } catch (err) {
    console.error("[visual-search]", err);
    res.status(500).json({
      message: err.message || "Visual search failed",
    });
  }
});

app.post("/api/users/register", authLimiter, async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email, and password are required" });
  }
  const emailNorm = String(email).trim().toLowerCase();
  if (store.users.some((u) => u.email === emailNorm)) {
    return res.status(409).json({ message: "Email already registered" });
  }
  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = {
    _id: crypto.randomUUID(),
    name: String(name).trim(),
    email: emailNorm,
    passwordHash,
  };
  store.users.push(user);
  saveStore(store);

  const token = jwt.sign({ sub: user._id }, JWT_SECRET, { expiresIn: "14d" });
  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    token,
  });
});

app.post("/api/users/login", authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }
  const emailNorm = String(email).trim().toLowerCase();
  const user = store.users.find((u) => u.email === emailNorm);
  if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign({ sub: user._id }, JWT_SECRET, { expiresIn: "14d" });
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    token,
  });
});

app.get("/api/cart", authMiddleware, (req, res) => {
  const lines = getCartLines(req.userId);
  res.json({ items: normalizeCartItems(lines) });
});

app.post("/api/cart/", authMiddleware, (req, res) => {
  const { productId, quantity, name, price, image } = req.body || {};
  if (!productId) {
    return res.status(400).json({ message: "productId is required" });
  }
  const pid = String(productId);
  const lines = getCartLines(req.userId);
  const addQty = Math.max(1, Number(quantity) || 1);
  const existing = lines.find((l) => String(l.productId) === pid);
  if (existing) {
    existing.quantity += addQty;
  } else {
    lines.push({
      productId: pid,
      title: name || "Product",
      price: Number(price) || 0,
      image: image || "",
      quantity: addQty,
    });
  }
  saveStore(store);
  res.json({ items: normalizeCartItems(lines) });
});

app.patch("/api/cart/item/:productId", authMiddleware, (req, res) => {
  const pid = String(req.params.productId);
  const delta = Number(req.body?.delta);
  if (!Number.isFinite(delta) || delta === 0) {
    return res.status(400).json({ message: "delta must be a non-zero number" });
  }
  const lines = getCartLines(req.userId);
  const idx = lines.findIndex((l) => String(l.productId) === pid);
  if (idx === -1) {
    return res.status(404).json({ message: "Item not in cart" });
  }
  lines[idx].quantity += delta;
  if (lines[idx].quantity < 1) {
    lines.splice(idx, 1);
  }
  saveStore(store);
  res.json({ items: normalizeCartItems(lines) });
});

app.delete("/api/cart/remove/:productId", authMiddleware, (req, res) => {
  const pid = String(req.params.productId);
  const lines = getCartLines(req.userId);
  store.carts[req.userId] = lines.filter((l) => String(l.productId) !== pid);
  saveStore(store);
  res.json({ items: normalizeCartItems(store.carts[req.userId]) });
});

app.delete("/api/cart/clear", authMiddleware, (req, res) => {
  store.carts[req.userId] = [];
  saveStore(store);
  res.json({ items: [] });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Ecommerce API listening on http://0.0.0.0:${PORT}`);
  warmVisualSearchIndex();
});
