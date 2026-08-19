import { apiClient } from "./apiClient";

export interface DashboardStats {
  total_patients: number;
  total_sessions: number;
  wallet_balance_paise: number;
  upcoming_appointments: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get<DashboardStats>("/dashboard/stats");
  return response.data;
};
