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
  searchByVoiceQuery,
  findSimilarProducts,
  warmVisualSearchIndex,
  getStatus,
  CATEGORY_GROUPS,
} = require("./visualSearch");
const {
  fetchCatalog,
  getCatalogMeta,
  getProductById,
} = require("./catalogService");
const {
  buildClientLlmOptions,
  scrubLlmSecretsFromRequest,
  scrubKeyMaterial,
} = require("./llmKeySecurity");
const { getSearchRuntimeConfig } = require("./runtime/searchRuntimeConfig");
const {
  toLegacyTextSearchResponse,
  toLegacyVisualSearchResponse,
} = require("./search/contracts/legacyAdapters");
const {
  searchCatalogByText,
} = require("./search/orchestrators/searchCatalogByText");
const {
  searchCatalogByImage,
} = require("./search/orchestrators/searchCatalogByImage");

const runtimeConfig = getSearchRuntimeConfig();
const PORT = runtimeConfig.port;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const DATA_PATH = path.join(__dirname, "..", "data", "store.json");

function loadStore() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { users: [], carts: {}, orders: {} };
  }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
}

let store = loadStore();

// Ensure new keys exist on older persisted stores.
if (!store.carts) store.carts = {};
if (!store.orders) store.orders = {};

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

function getUserOrders(userId) {
  if (!store.orders[userId]) store.orders[userId] = [];
  return store.orders[userId];
}

function cartValidationError(res, message, code) {
  return res.status(400).json({
    message,
    code: code || "cart_validation_error",
  });
}

function orderValidationError(res, message, code) {
  return res.status(400).json({
    message,
    code: code || "order_validation_error",
  });
}

function computeOrderTotals(items) {
  const safeItems = Array.isArray(items) ? items : [];
  let subtotal = 0;
  for (const line of safeItems) {
    const price = Number(line?.price);
    const qty = Number(line?.quantity);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty <= 0) {
      continue;
    }
    subtotal += price * qty;
  }
  const taxRate = 0.1;
  const tax = Number((subtotal * taxRate).toFixed(2));
  const shipping = 0;
  const grandTotal = Number((subtotal + tax + shipping).toFixed(2));
  return { subtotal, tax, shipping, grandTotal };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Missing token", code: "auth_missing_token" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    const isExpired = err && err.name === "TokenExpiredError";
    return res.status(401).json({
      message: isExpired
        ? "Session expired. Please log in again."
        : "Invalid or expired token",
      code: isExpired ? "auth_token_expired" : "auth_invalid_token",
    });
  }
}

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use(morgan((tokens, req, res) => {
  const url = tokens.url(req, res) || "";
  const safeUrl = url.replace(/llmApiKey=[^&]+/gi, "llmApiKey=[REDACTED]");
  return [
    tokens.method(req, res),
    safeUrl,
    tokens.status(req, res),
    tokens.res(req, res, "content-length"),
    "-",
    tokens["response-time"](req, res),
    "ms",
  ].join(" ");
}));

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

app.get("/api/catalog/meta", async (_req, res) => {
  try {
    await fetchCatalog();
    res.json(getCatalogMeta());
  } catch (err) {
    res.status(500).json({ message: err.message || "Catalog unavailable" });
  }
});

app.get("/api/catalog/products", async (_req, res) => {
  try {
    const products = await fetchCatalog();
    res.json({ products, meta: getCatalogMeta() });
  } catch (err) {
    res.status(500).json({ message: err.message || "Catalog unavailable" });
  }
});

app.get("/api/catalog/products/:id", async (req, res) => {
  try {
    await fetchCatalog();
    const product = getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message || "Catalog unavailable" });
  }
});

app.get("/api/visual-search/similar/:productId", async (req, res) => {
  try {
    const limit = Math.min(12, Number(req.query.limit) || 8);
    const result = await findSimilarProducts(req.params.productId, { limit });
    if (!result.product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(result);
  } catch (err) {
    console.error("[visual-search/similar]", err);
    res.status(500).json({ message: err.message || "Similar search failed" });
  }
});

app.get("/api/visual-search/category-groups", (_req, res) => {
  res.json({ groups: CATEGORY_GROUPS });
});

app.get("/api/search/voice/config", (_req, res) => {
  const { DEFAULT_MODEL, DEFAULT_BASE_URL } = require("./voiceQueryLLM");
  const { LLM_PROVIDERS } = require("./llmProviders");
  res.json({
    requiresClientKey: true,
    defaultModel: DEFAULT_MODEL,
    defaultBaseUrl: DEFAULT_BASE_URL,
    keyTransport: "X-LLM-Api-Key",
    keyPersistence: "session-only-client",
    voiceToText: "device-free",
    providers: LLM_PROVIDERS,
    gmailNote:
      "Apps cannot sign into your Gmail for OpenAI billing. Use each provider’s API key (you may sign in with Google on their website first).",
  });
});

app.post("/api/search/voice", visualSearchLimiter, handleNaturalSearch);
app.post("/api/search/natural", visualSearchLimiter, handleNaturalSearch);

async function handleNaturalSearch(req, res) {
  const { query, useLlmReasoning } = req.body || {};
  if (!query || typeof query !== "string" || !query.trim()) {
    scrubLlmSecretsFromRequest(req);
    return res.status(400).json({ message: "query is required" });
  }
  if (query.length > 2000) {
    scrubLlmSecretsFromRequest(req);
    return res.status(413).json({ message: "Query too long" });
  }

  const built = buildClientLlmOptions(req, {
    useLlmReasoning: useLlmReasoning === true,
  });
  if (!built.ok) {
    scrubLlmSecretsFromRequest(req);
    return res.status(built.status).json({ message: built.message, code: built.code });
  }

  try {
    const result = await searchCatalogByText(
      query.trim(),
      {
        searchByNaturalLanguage: require("./naturalSearch").searchByNaturalLanguage,
        textDeps: {
          ensureIndex: require("./visualSearch").ensureIndex,
          loadClip: require("./visualSearch").loadClip,
          embedText: require("./visualSearch").embedText,
          cosine: require("./visualSearch").cosine,
          CACHE_MODEL_KEY: require("./visualSearch").CACHE_MODEL_KEY,
        },
      },
      {
        limit: 30,
        llmOptions: built.options,
      }
    );
    res.json(toLegacyTextSearchResponse(result));
  } catch (err) {
    console.error(
      "[voice-search]",
      err.code === "llm_key_required" ? err.code : scrubKeyMaterial(err.message)
    );
    const status = err.code === "llm_key_required" ? 400 : 500;
    res.status(status).json({
      message: scrubKeyMaterial(err.message || "Voice search failed"),
      code: err.code,
    });
  } finally {
    if (built.options) {
      built.options.apiKey = "";
    }
    scrubLlmSecretsFromRequest(req);
  }
}

app.post("/api/visual-search", visualSearchLimiter, async (req, res) => {
  const { imageBase64, categoryFilter } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ message: "imageBase64 is required" });
  }
  if (imageBase64.length > 10_000_000) {
    return res.status(413).json({ message: "Image too large (max ~7MB)" });
  }
  try {
    const result = await searchCatalogByImage(
      imageBase64,
      {
        searchByImageBase64,
        searchByNaturalLanguage: require("./naturalSearch").searchByNaturalLanguage,
        textDeps: {
          ensureIndex: require("./visualSearch").ensureIndex,
          loadClip: require("./visualSearch").loadClip,
          embedText: require("./visualSearch").embedText,
          cosine: require("./visualSearch").cosine,
          CACHE_MODEL_KEY: require("./visualSearch").CACHE_MODEL_KEY,
        },
      },
      {
        limit: 8,
        categoryFilter: categoryFilter || null,
      }
    );
    res.json(toLegacyVisualSearchResponse(result));
  } catch (err) {
    console.error("[visual-search]", err);
    const status = err.code === "too_blurry" || err.code === "too_small" ? 422 : 500;
    res.status(status).json({
      message: err.message || "Visual search failed",
      code: err.code,
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
  if (productId == null) {
    return cartValidationError(res, "productId is required", "cart_product_id_required");
  }
  // Accept string or number values for productId; coerce to trimmed string and
  // validate non-empty. This keeps behavior compatible while being slightly
  // more permissive about incoming types.
  const pid = String(productId).trim();
  if (!pid) {
    return cartValidationError(res, "productId is required", "cart_product_id_required");
  }

  const qtyNum = quantity == null ? 1 : Number(quantity);
  if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
    return cartValidationError(
      res,
      "quantity must be a positive number",
      "cart_invalid_quantity"
    );
  }

  const priceNum = price == null ? 0 : Number(price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return cartValidationError(
      res,
      "price must be a non-negative number",
      "cart_invalid_price"
    );
  }

  if (name != null && typeof name !== "string") {
    return cartValidationError(res, "name must be a string", "cart_invalid_title");
  }

  if (image != null && typeof image !== "string") {
    return cartValidationError(res, "image must be a string URL", "cart_invalid_image");
  }

  const lines = getCartLines(req.userId);
  const addQty = Math.max(1, Math.floor(qtyNum) || 1);
  const existing = lines.find((l) => String(l.productId) === pid);
  if (existing) {
    existing.quantity += addQty;
  } else {
    lines.push({
      productId: pid,
      title: name || "Product",
      price: priceNum,
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

app.post("/api/orders", authMiddleware, (req, res) => {
  const { items, shippingInfo, paymentMethod } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return orderValidationError(
      res,
      "items must be a non-empty array",
      "order_items_required"
    );
  }

  const normalizedItems = [];
  for (let i = 0; i < items.length; i++) {
    const raw = items[i] || {};
    const idx = `items[${i}]`;

    const rawProductId = raw.productId != null ? raw.productId : raw.id;
    if (rawProductId == null) {
      return orderValidationError(
        res,
        `${idx}.productId is required`,
        "order_product_id_required"
      );
    }
    const productId = String(rawProductId).trim();
    if (!productId) {
      return orderValidationError(
        res,
        `${idx}.productId is required`,
        "order_product_id_required"
      );
    }

    const priceNum = Number(raw.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return orderValidationError(
        res,
        `${idx}.price must be a non-negative number`,
        "order_invalid_price"
      );
    }

    const quantityNum = Number(raw.quantity);
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      return orderValidationError(
        res,
        `${idx}.quantity must be a positive number`,
        "order_invalid_quantity"
      );
    }

    const title =
      raw.title != null && typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : "Product";
    const image =
      raw.image != null && typeof raw.image === "string" ? raw.image : "";

    const normalized = {
      id: productId,
      productId,
      title,
      price: priceNum,
      quantity: Math.max(1, Math.floor(quantityNum) || 1),
      image,
    };
    normalizedItems.push(normalized);
  }

  if (!shippingInfo || typeof shippingInfo !== "object") {
    return orderValidationError(
      res,
      "shippingInfo is required",
      "order_shipping_required"
    );
  }

  const requiredFields = ["name", "address", "city", "zipCode", "phone"];
  const cleanShipping = {};
  for (const field of requiredFields) {
    const raw = shippingInfo[field];
    const value = raw == null ? "" : String(raw).trim();
    if (!value) {
      return orderValidationError(
        res,
        `shippingInfo.${field} is required`,
        "order_invalid_shipping"
      );
    }
    cleanShipping[field] = value;
  }

  if (!paymentMethod || typeof paymentMethod !== "string" || !paymentMethod.trim()) {
    return orderValidationError(
      res,
      "paymentMethod is required",
      "order_payment_method_required"
    );
  }

  const totals = computeOrderTotals(normalizedItems);

  const order = {
    id: crypto.randomUUID(),
    userId: req.userId,
    items: normalizedItems,
    shippingInfo: cleanShipping,
    paymentMethod: paymentMethod.trim(),
    totals,
    paymentStatus: "mocked_paid",
    orderStatus: "placed",
    createdAt: new Date().toISOString(),
  };

  const userOrders = getUserOrders(req.userId);
  userOrders.push(order);
  saveStore(store);

  res.status(201).json(order);
});

app.get("/api/orders", authMiddleware, (req, res) => {
  const userOrders = getUserOrders(req.userId).slice();
  userOrders.sort((a, b) => {
    const aTime = a?.createdAt ? Date.parse(a.createdAt) || 0 : 0;
    const bTime = b?.createdAt ? Date.parse(b.createdAt) || 0 : 0;
    return bTime - aTime;
  });
  res.json({ orders: userOrders });
});

app.get("/api/orders/:id", authMiddleware, (req, res) => {
  const orders = getUserOrders(req.userId);
  const order = orders.find((o) => String(o.id) === String(req.params.id));
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  res.json(order);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Ecommerce API listening on http://0.0.0.0:${PORT} (${runtimeConfig.runtimeName})`
  );
  if (process.env.SKIP_CLIP_WARMUP !== "1") {
    warmVisualSearchIndex();
  }
});
