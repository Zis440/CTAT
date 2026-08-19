// ─── Wallet Service ─────────────────────────────────────────────────────────
// API calls for wallet balance and transaction history (Razorpay integration).

import { apiClient } from "./apiClient";
import type { WalletBalance, Transaction } from "@/types/wallet";

// ─── Balance ────────────────────────────────────────────────────────────────

export async function getWalletBalance(): Promise<WalletBalance> {
  const { data } = await apiClient.get<WalletBalance>("/wallet/balance");
  return data;
}

// ─── Transactions ───────────────────────────────────────────────────────────

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
}

export async function getTransactions(
  limit: number = 20,
  offset: number = 0,
  type_filter?: string,
  date_from?: string,
  date_to?: string,
  search?: string,
  created_by_me?: boolean
): Promise<TransactionsResponse> {
  const { data } = await apiClient.get<TransactionsResponse>(
    "/wallet/transactions",
    { params: { limit, offset, type_filter, date_from, date_to, search, created_by_me } }
  );
  if (data && data.transactions) {
    data.transactions.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }
  return data;
}

// ─── Razorpay recharge ──────────────────────────────────────────────────────

export interface RazorpayOrderResponse {
  order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
}

export async function createRechargeOrder(
  amountPaise: number
): Promise<RazorpayOrderResponse> {
  const { data } = await apiClient.post<RazorpayOrderResponse>(
    "/wallet/recharge/create-order",
    { amount_rupees: amountPaise / 100 }
  );
  return data;
}

export async function confirmRechargePayment(
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string,
  amountRupees: number
): Promise<void> {
  await apiClient.post("/wallet/recharge/verify", {
    razorpay_payment_id: razorpayPaymentId,
    razorpay_order_id: razorpayOrderId,
    razorpay_signature: razorpaySignature,
    amount_rupees: amountRupees,
  });
}
