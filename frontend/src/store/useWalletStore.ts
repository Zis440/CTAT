
import { create } from "zustand";
import type { WalletBalance, Transaction } from "@/types/wallet";

interface WalletState {
  balance: WalletBalance | null;
  transactions: Transaction[];
  isLoading: boolean;

  lastFetched: number | null;

  setBalance: (balance: WalletBalance) => void;

  setTransactions: (transactions: Transaction[]) => void;

  setLoading: (isLoading: boolean) => void;

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
