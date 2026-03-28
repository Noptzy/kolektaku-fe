/**
 * Axios instance with:
 *  - Auth header injected from localStorage on every request
 *  - Automatic token refresh on 401 { expired: true }
 *  - Retry original request after token rotation
 */

import axios from "axios";
import { getTokens, setTokens, clearTokens, getAccessToken } from "./auth";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// ─── Request Interceptor ──────────────────────────────────────────────────
// Attach Bearer token before each request
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ─────────────────────────────────────────────────
// On 401 with { expired: true }, refresh tokens then retry
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Support both direct {expired: true} and wrapped {data: {expired: true}}
    const isExpiredError =
      error.response?.status === 401 && 
      (error.response?.data?.expired === true || error.response?.data?.data?.expired === true);

    if (isExpiredError && !originalRequest._retry) {
      console.log("[API] Access token expired, attempting refresh...");
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken } = getTokens();
      
      if (!refreshToken) {
        console.warn("[API] No refresh token found in storage.");
        return Promise.reject(error);
      }

      try {
        const { data: responseBody } = await axios.post(
          `${API_URL}/api/auth/refresh`,
          { refreshToken },
          { headers: { "Content-Type": "application/json" } },
        );

        // resHandler wraps data in .data
        const tokens = responseBody.data || responseBody;
        const newAccessToken = tokens.accessToken;
        const newRefreshToken = tokens.refreshToken;

        if (!newAccessToken) throw new Error("Failed to get new access token");

        console.log("[API] Token refreshed successfully.");
        setTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || refreshToken,
        });
        
        processQueue(null, newAccessToken);

        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("[API] Refresh token expired or invalid:", refreshError);
        processQueue(refreshError, null);
        clearTokens();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("open-login-modal"));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
