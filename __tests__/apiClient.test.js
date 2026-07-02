describe("apiClient auth failure handling", () => {
  let requestRejected;
  let responseRejected;
  let createdClient;

  beforeEach(() => {
    jest.resetModules();
    requestRejected = null;
    responseRejected = null;
    createdClient = null;

    jest.doMock("axios", () => ({
      create: jest.fn(() => {
        createdClient = {
          interceptors: {
            request: {
              use: jest.fn((_fulfilled, rejected) => {
                requestRejected = rejected;
              }),
            },
            response: {
              use: jest.fn((_fulfilled, rejected) => {
                responseRejected = rejected;
              }),
            },
          },
        };
        return createdClient;
      }),
    }));
  });

  it("calls the auth failure handler for protected auth token errors", async () => {
    const { setAuthFailureHandler } = require("../src/services/apiClient");
    require("../src/services/apiClient");

    const onAuthFailure = jest.fn(() => Promise.resolve());
    setAuthFailureHandler(onAuthFailure);

    const error = {
      config: { url: "/api/cart", headers: { Authorization: "Bearer stale-token" } },
      response: {
        status: 401,
        data: { code: "auth_invalid_token", message: "Invalid or expired token" },
      },
    };

    await expect(responseRejected(error)).rejects.toBe(error);
    expect(onAuthFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        response: expect.objectContaining({
          data: expect.objectContaining({
            code: "auth_invalid_token",
          }),
        }),
      })
    );
  });

  it("does not call the auth failure handler for login credential errors", async () => {
    const { setAuthFailureHandler } = require("../src/services/apiClient");
    require("../src/services/apiClient");

    const onAuthFailure = jest.fn(() => Promise.resolve());
    setAuthFailureHandler(onAuthFailure);

    const error = {
      config: { url: "/api/users/login", headers: {} },
      response: {
        status: 401,
        data: { message: "Invalid email or password" },
      },
    };

    await expect(responseRejected(error)).rejects.toBe(error);
    expect(onAuthFailure).not.toHaveBeenCalled();
  });
});
