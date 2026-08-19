// ─── Wallet Store ───────────────────────────────────────────────────────────
// Zustand store for wallet balance and transaction state.

import { create } from "zustand";
import type { WalletBalance, Transaction } from "@/types/wallet";

interface WalletState {
  balance: WalletBalance | null;
  transactions: Transaction[];
  isLoading: boolean;
  /** Timestamp of last balance fetch (for cache invalidation) */
  lastFetched: number | null;

  /** Update wallet balance (called after fetching from API) */
  setBalance: (balance: WalletBalance) => void;
  /** Update transactions list */
  setTransactions: (transactions: Transaction[]) => void;
  /** Set loading state */
  setLoading: (isLoading: boolean) => void;
  /** Clear all wallet state on logout */
  clearBalance: () => void;
}

export const useWalletStore = create<WalletState>()((set) => ({
  balance: null,
  transactions: [],
  isLoading: false,
  lastFetched: null,

  setBalance: (balance) => set({ balance, lastFetched: Date.now() }),
  setTransactions: (transactions) => set({ transactions }),
  setLoading: (isLoading) => set({ isLoading }),
  clearBalance: () => set({ balance: null, transactions: [], isLoading: false, lastFetched: null }),
}));
