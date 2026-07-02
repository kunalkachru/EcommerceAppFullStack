import axios from "axios";
import { getApiBaseUrl } from "../config/api";

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
});

let getAuthToken = () => null;
let handleAuthFailure = null;
let authFailureInFlight = null;

/** Call once from store setup so requests include Bearer when logged in. */
export function setAuthTokenGetter(fn) {
  getAuthToken = typeof fn === "function" ? fn : () => null;
}

export function setAuthFailureHandler(fn) {
  handleAuthFailure = typeof fn === "function" ? fn : null;
}

export { getAuthToken };

function shouldTriggerAuthFailure(error) {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  const url = String(error?.config?.url || "");
  const isAuthRoute = url.includes("/api/users/login") || url.includes("/api/users/register");

  return (
    !isAuthRoute &&
    status === 401 &&
    typeof code === "string" &&
    code.startsWith("auth_")
  );
}

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (handleAuthFailure && shouldTriggerAuthFailure(error) && !authFailureInFlight) {
      authFailureInFlight = Promise.resolve(handleAuthFailure(error))
        .catch(() => undefined)
        .finally(() => {
          authFailureInFlight = null;
        });
      await authFailureInFlight;
    }
    return Promise.reject(error);
  }
);

export default apiClient;
