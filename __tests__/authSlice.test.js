const mockRemoveItem = jest.fn(() => Promise.resolve());
const mockClearSessionLlmKey = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  removeItem: mockRemoveItem,
}));

jest.mock("../src/utils/llmSessionStore", () => ({
  clearSessionLlmKey: mockClearSessionLlmKey,
}));

jest.mock("../src/redux/cartSlice", () => ({
  clearCart: jest.fn(() => ({ type: "cart/clearCart" })),
  clearCartLocal: jest.fn(() => ({ type: "cart/clearCartLocal" })),
  fetchCart: jest.fn(() => ({ type: "cart/fetchCart" })),
}));

const authModule = require("../src/redux/authSlice");
const cartModule = require("../src/redux/cartSlice");

const { restoreSession } = authModule;

describe("restoreSession", () => {
  beforeEach(() => {
    mockRemoveItem.mockClear();
    mockClearSessionLlmKey.mockClear();
    cartModule.fetchCart.mockClear();
    cartModule.clearCartLocal.mockClear();
  });

  it("logs out a persisted session when startup cart fetch returns an auth error", async () => {
    const dispatch = jest
      .fn()
      .mockImplementationOnce(() => ({
        unwrap: () =>
          Promise.reject({
            kind: "auth",
            code: "auth_invalid_token",
            message: "Invalid or expired token",
          }),
      }))
      .mockImplementation((action) => action);

    const getState = () => ({
      auth: {
        user: { _id: "u1", email: "test@example.com" },
        token: "stale-token",
      },
    });

    const result = await restoreSession()(dispatch, getState);

    expect(cartModule.fetchCart).toHaveBeenCalledTimes(1);
    expect(cartModule.clearCartLocal).toHaveBeenCalledTimes(1);
    expect(mockRemoveItem).toHaveBeenCalledWith("persist:auth");
    expect(mockClearSessionLlmKey).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "cart/clearCartLocal" })
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth/logout" })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: "logged-out",
        reason: "auth_invalid_token",
      })
    );
  });

  it("keeps the persisted session when startup cart fetch fails for a non-auth reason", async () => {
    const dispatch = jest
      .fn()
      .mockImplementationOnce(() => ({
        unwrap: () =>
          Promise.reject({
            kind: "network",
            code: "network_error",
            message: "Network Error",
          }),
      }))
      .mockImplementation((action) => action);

    const getState = () => ({
      auth: {
        user: { _id: "u1", email: "test@example.com" },
        token: "maybe-valid-token",
      },
    });

    const result = await restoreSession()(dispatch, getState);

    expect(cartModule.fetchCart).toHaveBeenCalledTimes(1);
    expect(cartModule.clearCartLocal).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();
    expect(mockClearSessionLlmKey).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: "degraded",
        reason: "network_error",
      })
    );
  });
});
