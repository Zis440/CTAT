import { apiClient } from "@/services/apiClient";

export interface ClinicDailyIncome {
  date: string;
  amount_rupees: number;
}

export interface ClinicWalletTransaction {
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

export interface ClinicIncomeOverview {
  total_revenue_rupees: number;
  monthly_revenue_rupees: number;
  weekly_revenue_rupees: number;
  today_revenue_rupees: number;
  daily_breakdown: ClinicDailyIncome[];
  recent_transactions: ClinicWalletTransaction[];
}

export const clinicIncomeService = {
  getOverview: async (): Promise<ClinicIncomeOverview> => {
    const { data } = await apiClient.get("/clinic/income/overview");
    return data;
  },
};
