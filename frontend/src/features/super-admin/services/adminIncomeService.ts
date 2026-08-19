import { apiClient } from "@/services/apiClient";

export interface DailyIncome {
  date: string;
  amount_rupees: number;
}

export interface AdminWalletTransaction {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  type: string;
  amount_paise: number;
  amount_rupees: number;
  balance_after_paise: number;
  balance_after_rupees: number;
  description: string;
  razorpay_payment_id?: string;
  created_at: string;
}

export interface AdminIncomeOverview {
  total_revenue_rupees: number;
  monthly_revenue_rupees: number;
  weekly_revenue_rupees: number;
  today_revenue_rupees: number;
  daily_breakdown: DailyIncome[];
  recent_transactions: AdminWalletTransaction[];
}

export const adminIncomeService = {
  getOverview: async (): Promise<AdminIncomeOverview> => {
    const { data } = await apiClient.get("/admin/income/overview");
    if (data && data.recent_transactions) {
      data.recent_transactions.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
    return data;
  },
};
