jest.mock("../src/services/apiClient", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const apiClient = require("../src/services/apiClient").default;
const {
  createOrder,
  fetchOrders,
  fetchOrderById,
} = require("../src/services/ordersService");

describe("ordersService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an order via POST /api/orders", async () => {
    const payload = {
      items: [{ id: "1", productId: "1", title: "Test", price: 10, quantity: 2 }],
      shippingInfo: {
        name: "Test User",
        address: "123 Main St",
        city: "Town",
        zipCode: "12345",
        phone: "555-1234",
      },
      paymentMethod: "Credit Card",
      grandTotal: 20,
    };

    apiClient.post.mockResolvedValue({ data: { id: "order-1" } });

    const result = await createOrder(payload);

    expect(apiClient.post).toHaveBeenCalledWith("/api/orders", {
      items: payload.items,
      shippingInfo: payload.shippingInfo,
      paymentMethod: payload.paymentMethod,
      grandTotal: payload.grandTotal,
    });
    expect(result).toEqual({ id: "order-1" });
  });

  it("fetches orders via GET /api/orders", async () => {
    const orders = [{ id: "order-1" }, { id: "order-2" }];
    apiClient.get.mockResolvedValue({ data: { orders } });

    const result = await fetchOrders();

    expect(apiClient.get).toHaveBeenCalledWith("/api/orders");
    expect(result).toEqual(orders);
  });

  it("fetchOrders falls back to empty array when response missing orders", async () => {
    apiClient.get.mockResolvedValue({ data: {} });

    const result = await fetchOrders();

    expect(result).toEqual([]);
  });

  it("fetches a single order by id", async () => {
    const order = { id: "order/with-slash" };
    apiClient.get.mockResolvedValue({ data: order });

    const result = await fetchOrderById(order.id);

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/orders/order%2Fwith-slash"
    );
    expect(result).toEqual(order);
  });
});

