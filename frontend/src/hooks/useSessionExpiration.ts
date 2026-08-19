import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

const EXPIRATION_MS = 24 * 60 * 60 * 1000;

export function useSessionExpiration() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.removeItem("auth-last-activity");
      return;
    }

    const lastActivity = localStorage.getItem("auth-last-activity");

    if (lastActivity) {
      const isExpired = Date.now() - parseInt(lastActivity, 10) > EXPIRATION_MS;
      if (isExpired) {
        logout();
        localStorage.removeItem("auth-last-activity");
        return;
      }
    }

    localStorage.setItem("auth-last-activity", Date.now().toString());
  }, [isAuthenticated, logout]);
}
