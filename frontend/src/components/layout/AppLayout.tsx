
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { AppTopBar } from "./Topbar";
import { useUIStore } from "@/store/useUIStore";
import { useEffect, useRef } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { useAuthStore, isDemoAccount } from "@/store/useAuthStore";
import { getWalletBalance } from "@/services/walletService";
import { getMe } from "@/services/authService";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const { sidebarCollapsed } = useUIStore();
  const { user, setUser } = useAuthStore();
  const { setBalance } = useWalletStore();
  const profileSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDemo = isDemoAccount(user);

  useEffect(() => {
    if (!user) return;

    const syncProfile = async () => {
      try {
        const fresh = await getMe();

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

      }
    };

    syncProfile();

    profileSyncRef.current = setInterval(syncProfile, 30_000);
    return () => {
      if (profileSyncRef.current) clearInterval(profileSyncRef.current);
    };
  }, [user?.id]);

  useEffect(() => {
    const perms = user?.module_permissions;
    const isStaff = user?.role === "org_staff" || user?.role === "clinic_staff";
    if (!user || (isStaff && !perms?.can_view_wallet_history)) return;

    const fetchBalance = () =>
      getWalletBalance()
        .then(setBalance)
        .catch(() => {});

    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [user?.id, user?.module_permissions?.can_view_wallet_history]);

  return (
    <ErrorBoundary>
      <SidebarProvider defaultOpen={!sidebarCollapsed}>
        <div className={cn("flex h-screen w-full overflow-hidden bg-background", isDemo && "flex-row-reverse")}>
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
