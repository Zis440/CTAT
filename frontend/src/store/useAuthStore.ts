// ─── Auth Store ─────────────────────────────────────────────────────────────
// Zustand store for authentication state with localStorage persistence.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** Computed: true when token and user are present */
  isAuthenticated: boolean;
  /** Tracks which verification_status the user has already seen (dismisses the sidebar dot) */
  seenVerificationStatus: string | null;

  /** Set both token and user after login / OAuth callback */
  setAuth: (token: string, user: AuthUser) => void;
  /** Update user object (e.g. after profile edit or verification) */
  setUser: (user: AuthUser) => void;
  /** Mark the current verification status as seen (clears the sidebar dot) */
  markVerificationSeen: (status: string) => void;
  /** Clear auth state on logout */
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      seenVerificationStatus: null,

      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      markVerificationSeen: (status) => set({ seenVerificationStatus: status }),
      logout: () => set({ token: null, user: null, isAuthenticated: false, seenVerificationStatus: null }),
    }),
    {
      name: "auth-storage", // localStorage key
    }
  )
);

// ── Hydration hook ──────────────────────────────────────────────────────────
// Uses Zustand v5's built-in persist.hasHydrated() + onFinishHydration()
// to reactively track when localStorage rehydration is complete.

import { useState, useEffect } from "react";

export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(
    useAuthStore.persist.hasHydrated()
  );

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsub;
  }, []);

  return hydrated;
}

// ── Convenience hooks ───────────────────────────────────────────────────────

/** Returns the current user or null — used by RoleGuard, ProtectedRoute */
export function useCurrentUser(): AuthUser | null {
  return useAuthStore((s) => s.user);
}
