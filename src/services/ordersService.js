import apiClient from "./apiClient";

/**
 * Create an order for the authenticated user.
 * Payload should include:
 * - items: [{ id, productId, title, price, quantity, image }]
 * - shippingInfo: { name, address, city, zipCode, phone }
 * - paymentMethod: string
 * - grandTotal: number (optional, server recomputes totals)
 */
export async function createOrder(payload) {
  const { items, shippingInfo, paymentMethod, grandTotal } = payload || {};
  const { data } = await apiClient.post("/api/orders", {
    items,
    shippingInfo,
    paymentMethod,
    grandTotal,
  });
  return data;
}

/** Fetch all orders for the authenticated user, newest first. */
export async function fetchOrders() {
  const { data } = await apiClient.get("/api/orders");
  return data.orders ?? [];
}

/** Fetch a single order by id for the authenticated user. */
export async function fetchOrderById(id) {
  const { data } = await apiClient.get(`/api/orders/${encodeURIComponent(id)}`);
  return data;
}

