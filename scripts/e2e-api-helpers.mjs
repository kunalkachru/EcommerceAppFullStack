import { resolveApiUrl } from "./lib/cloud-api-url.mjs";

export const DEFAULT_EMAIL = "test@example.com";
export const DEFAULT_PASSWORD = "secret123";

export function createApiClient(baseUrl = resolveApiUrl()) {
  async function api(method, path, body, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        return text ? JSON.parse(text) : {};
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    throw lastErr;
  }

  async function login(email = DEFAULT_EMAIL, password = DEFAULT_PASSWORD) {
    const body = await api("POST", "/api/users/login", { email, password });
    return body.token || null;
  }

  /** Poll server cart — cloud HTTPS can lag briefly after UI actions. */
  async function waitForCart(
    token,
    { minItems = 1, minQty, timeoutMs = 15000, pollMs = 500 } = {}
  ) {
    const start = Date.now();
    let last = { items: [] };
    while (Date.now() - start < timeoutMs) {
      last = await api("GET", "/api/cart", null, token);
      const items = last.items ?? [];
      if (items.length >= minItems) {
        if (minQty == null || (items[0]?.quantity ?? 0) >= minQty) {
          return last;
        }
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
    return last;
  }

  return { api, login, waitForCart, baseUrl };
}
