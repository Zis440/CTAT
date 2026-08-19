// src/components/layout/AppLayout.tsx
// The primary authenticated application shell.
// Wraps all protected routes with sidebar + top bar.
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { AppTopBar } from "./Topbar";
import { useUIStore } from "@/store/useUIStore";
import { useEffect, useRef } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { useAuthStore } from "@/store/useAuthStore";
import { getWalletBalance } from "@/services/walletService";
import { getMe } from "@/services/authService";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export function AppLayout() {
  const { sidebarCollapsed } = useUIStore();
  const { user, setUser } = useAuthStore();
  const { setBalance } = useWalletStore();
  const profileSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Periodic profile sync ───────────────────────────────────────────────
  // Re-fetch the user profile every 30 s so that changes made by the admin
  // (e.g. verification_status approve / reject) are reflected in the UI
  // without requiring the individual user to log out and back in.
  useEffect(() => {
    if (!user) return;

    const syncProfile = async () => {
      try {
        const fresh = await getMe();
        // Only update store if something actually changed to avoid re-renders
        if (
          fresh.verification_status !== user.verification_status ||
          fresh.is_active !== user.is_active ||
          fresh.role !== user.role ||
          fresh.first_name !== user.first_name ||
          fresh.email !== user.email ||
          fresh.can_assess !== user.can_assess ||
          JSON.stringify(fresh.module_permissions) !== JSON.stringify(user.module_permissions)
        ) {
          setUser(fresh);
        }
      } catch {
        // Silently fail — token may have expired, network issue, etc.
      }
    };

    // Initial sync on mount
    syncProfile();

    // Then every 30 seconds
    profileSyncRef.current = setInterval(syncProfile, 30_000);
    return () => {
      if (profileSyncRef.current) clearInterval(profileSyncRef.current);
    };
  }, [user?.id]); // Only re-setup when user identity changes, not on every field update

  // Fetch wallet balance on mount and every 30s
  useEffect(() => {
    const perms = user?.module_permissions;
    const isStaff = user?.role === "org_staff" || user?.role === "clinic_staff";
    if (!user || (isStaff && !perms?.can_view_wallet_history)) return;

    const fetchBalance = () =>
      getWalletBalance()
        .then(setBalance)
        .catch(() => {});

    fetchBalance(); // always refresh on mount
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [user?.id, user?.module_permissions?.can_view_wallet_history]);

  return (
    <ErrorBoundary>
      <SidebarProvider defaultOpen={!sidebarCollapsed}>
        <div className="flex h-screen w-full overflow-hidden bg-background">
          <AppSidebar />

          <SidebarInset className="flex flex-col min-w-0 flex-1 overflow-hidden relative">
            <AppTopBar />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
              <div className="max-w-7xl mx-auto w-full">
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ErrorBoundary>
  );
}
