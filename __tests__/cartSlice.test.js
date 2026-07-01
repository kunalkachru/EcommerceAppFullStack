const cartModule = require("../src/redux/cartSlice.jsx");

const cartReducer = cartModule.default;
const { addToCart, mapCartError } = cartModule;

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

