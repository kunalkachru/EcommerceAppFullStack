import axios from "axios";
import { getApiBaseUrl } from "../config/api";

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
});

let getAuthToken = () => null;

/** Call once from store setup so requests include Bearer when logged in. */
export function setAuthTokenGetter(fn) {
  getAuthToken = typeof fn === "function" ? fn : () => null;
}

export { getAuthToken };

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
