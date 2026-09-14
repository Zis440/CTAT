
import axios from "axios";

import { getApiBaseUrl } from "@/lib/utils";

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 120_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {

  const raw = localStorage.getItem("auth-storage");
  if (raw) {
    try {
      const token = JSON.parse(raw).state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {

    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {

      const hadToken = error.config?.headers?.Authorization;
      if (hadToken && window.location.pathname !== "/login") {
        localStorage.removeItem("auth-storage");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
