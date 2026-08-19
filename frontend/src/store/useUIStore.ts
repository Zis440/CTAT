
import { create } from "zustand";

interface UIState {

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

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
