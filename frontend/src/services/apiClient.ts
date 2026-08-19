// ─── API Client ─────────────────────────────────────────────────────────────
// Centralized Axios instance with JWT auth and error handling.

import axios from "axios";

import { getApiBaseUrl } from "@/lib/utils";

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 600_000, // 10-minute timeout — multicard + Ollama can take ~5 min
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: attach Bearer token ────────────────────────────────
apiClient.interceptors.request.use((config) => {
  // Lazy import to avoid circular dependency with useAuthStore
  const raw = localStorage.getItem("auth-storage");
  if (raw) {
    try {
      const token = JSON.parse(raw).state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Corrupted localStorage entry — ignore
    }
  }
  return config;
});

// ── Response interceptor: handle 401 (expired / invalid token) ──────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear auth and redirect if we're NOT on login-related pages.
      // Also only do this for requests that actually sent a token (i.e.
      // the user was supposed to be authenticated).  A 401 from the
      // login endpoint itself should NOT wipe the stored session of
      // another tab.
      const hadToken = error.config?.headers?.Authorization;
      if (hadToken && window.location.pathname !== "/login") {
        localStorage.removeItem("auth-storage");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
