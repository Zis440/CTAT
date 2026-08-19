// ─── Wallet Types ───────────────────────────────────────────────────────────
// Shared type definitions for wallet, transactions, and Razorpay integration.

export interface WalletBalance {
  balance_paise: number;
  balance_rupees: number;
  currency: string;
}

export type TransactionType = "credit" | "debit";
export type TransactionStatus = "success" | "pending" | "failed";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount_paise: number;
  amount_rupees: number;
  balance_after_paise: number;
  balance_after_rupees: number;
  description: string;
  created_at: string;
  razorpay_payment_id?: string;
}

/**
 * Convert paise to a formatted INR string.
 * e.g. 12500 → "₹125.00"
 */
export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
