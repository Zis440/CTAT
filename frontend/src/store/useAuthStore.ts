
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  token: string | null;
  user: AuthUser | null;

  isAuthenticated: boolean;

  seenVerificationStatus: string | null;

  setAuth: (token: string, user: AuthUser) => void;

  setUser: (user: AuthUser) => void;

  markVerificationSeen: (status: string) => void;

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
      name: "auth-storage",
    }
  )
);

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

export function useCurrentUser(): AuthUser | null {
  return useAuthStore((s) => s.user);
}
