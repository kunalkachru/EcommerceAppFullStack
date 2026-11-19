jest.mock("../src/services/apiClient", () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

const cartModule = require("../src/redux/cartSlice.jsx");

const cartReducer = cartModule.default;
const {
  addToCart,
  clearCart,
  mapCartError,
  restoreCartSnapshot,
} = cartModule;

describe("mapCartError", () => {
  it("marks auth errors from 401 as auth kind", () => {
    const error = {
      response: {
        status: 401,
        data: { message: "Missing token", code: "auth_missing_token" },
      },
    };

    const result = mapCartError(error, "Failed to add item");

    expect(result.kind).toBe("auth");
    expect(result.code).toBe("auth_missing_token");
    expect(result.status).toBe(401);
    expect(result.message).toMatch(/token/i);
  });

  it("marks network errors when there is a request but no response", () => {
    const error = {
      request: {},
      message: "Network Error",
    };

    const result = mapCartError(error, "Failed to add item");

    expect(result.kind).toBe("network");
    expect(result.code).toBe("network_error");
    expect(result.message.toLowerCase()).toContain("network");
  });

  it("falls back to generic kind when nothing else matches", () => {
    const error = {
      message: "Something went wrong",
    };

    const result = mapCartError(error, "Fallback message");

    expect(result.kind).toBe("generic");
    expect(result.code).toBe("cart_generic_error");
    expect(result.message).toBe("Something went wrong");
  });
});

describe("cart pendingByProduct", () => {
  it("initializes pendingByProduct map", () => {
    const initial = cartReducer(undefined, { type: "@@INIT" });
    expect(initial.pendingByProduct).toBeDefined();
    expect(initial.pendingByProduct).toEqual({});
  });

  it("marks product as pending on addToCart.pending and clears on fulfilled", () => {
    const product = { id: "p1" };

    const pendingState = cartReducer(undefined, {
      type: addToCart.pending.type,
      meta: { arg: product },
    });

    // addToCart.pending should not toggle global loading (tracked per-product)
    expect(pendingState.loading).toBe(false);
    expect(pendingState.pendingByProduct["p1"]).toBe(true);

    const fulfilledState = cartReducer(pendingState, {
      type: addToCart.fulfilled.type,
      payload: { items: [] },
      meta: { arg: product },
    });

    expect(fulfilledState.loading).toBe(false);
    expect(fulfilledState.pendingByProduct["p1"]).toBeUndefined();
  });

  it("clears pending flag on rejected", () => {
    const product = { id: "p2" };

    const pendingState = cartReducer(undefined, {
      type: addToCart.pending.type,
      meta: { arg: product },
    });

    expect(pendingState.pendingByProduct["p2"]).toBe(true);

    const rejectedState = cartReducer(pendingState, {
      type: addToCart.rejected.type,
      payload: { message: "Failed", code: "cart_generic_error" },
      meta: { arg: product },
    });

    expect(rejectedState.loading).toBe(false);
    expect(rejectedState.pendingByProduct["p2"]).toBeUndefined();
    expect(rejectedState.error).toMatchObject({
      message: "Failed",
      code: "cart_generic_error",
    });
  });
});

describe("cart clear undo", () => {
  const apiClient = require("../src/services/apiClient");
  const cartItems = [
    { id: "p1", productId: "p1", title: "One", price: 10, quantity: 2 },
    { id: "p2", productId: "p2", title: "Two", price: 20, quantity: 4 },
  ];

  beforeEach(() => {
    apiClient.delete.mockReset();
    apiClient.post.mockReset();
  });

  it("captures every cleared item and quantity for Undo", async () => {
    apiClient.delete.mockResolvedValue({ data: { items: [] } });
    const { configureStore } = require("@reduxjs/toolkit");
    const store = configureStore({
      reducer: { cart: cartReducer, auth: () => ({ token: "token-1" }) },
      preloadedState: {
        cart: { cartItems, loading: false, error: null, pendingByProduct: {} },
      },
    });

    await store.dispatch(clearCart());

    expect(store.getState().cart.cartItems).toEqual([]);
    expect(store.getState().cart.undoSnapshot).toEqual(cartItems);
    expect(store.getState().cart.undoSnapshot).not.toBe(cartItems);
  });

  it("restores the clear snapshot through the cart state and API", async () => {
    const restoredItems = cartItems.map((item) => ({ ...item }));
    apiClient.post
      .mockResolvedValueOnce({ data: { items: [restoredItems[0]] } })
      .mockResolvedValueOnce({ data: { items: restoredItems } });
    const { configureStore } = require("@reduxjs/toolkit");
    const store = configureStore({
      reducer: { cart: cartReducer, auth: () => ({ token: "token-1" }) },
      preloadedState: {
        cart: {
          cartItems: [],
          loading: false,
          error: null,
          pendingByProduct: {},
          undoSnapshot: restoredItems,
        },
      },
    });

    await store.dispatch(restoreCartSnapshot());

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/api/cart/",
      expect.objectContaining({ productId: "p1", quantity: 2 }),
      expect.any(Object)
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/api/cart/",
      expect.objectContaining({ productId: "p2", quantity: 4 }),
      expect.any(Object)
    );
    expect(store.getState().cart.cartItems).toEqual(restoredItems);
    expect(store.getState().cart.undoSnapshot).toBeNull();
  });

  it("does not retain a successful Undo snapshot when clear fails", async () => {
    apiClient.delete.mockRejectedValue({
      response: { status: 500, data: { message: "Clear failed" } },
    });
    const { configureStore } = require("@reduxjs/toolkit");
    const store = configureStore({
      reducer: { cart: cartReducer, auth: () => ({ token: "token-1" }) },
      preloadedState: {
        cart: { cartItems, loading: false, error: null, pendingByProduct: {} },
      },
    });

    await store.dispatch(clearCart());

    expect(store.getState().cart.cartItems).toEqual(cartItems);
    expect(store.getState().cart.undoSnapshot).toBeNull();
    expect(store.getState().cart.error).toMatchObject({ message: "Clear failed" });
  });
});
