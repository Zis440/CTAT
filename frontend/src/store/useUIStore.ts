// ─── UI Store ───────────────────────────────────────────────────────────────
// Zustand store for global UI state (sidebar, modals, etc.).

import { create } from "zustand";

interface UIState {
  /** Whether the sidebar is collapsed */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  /** Override topbar back button behavior */
  topbarBackOverride: (() => void) | null;
  setTopbarBackOverride: (fn: (() => void) | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  topbarBackOverride: null,
  setTopbarBackOverride: (fn) => set({ topbarBackOverride: fn }),
}));
