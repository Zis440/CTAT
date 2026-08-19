import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/store/useAuthStore";

export interface PendingCounts {
  account_verifications: number;
  report_verifications: number;
  total: number;
}

export function usePendingCounts() {
  const { user } = useAuthStore();

  const isValidRole = user?.role && [
    "super_admin",
    "clinic_admin",
    "org_admin",
    "individual_psychologist"
  ].includes(user.role);

  return useQuery({
    queryKey: ["pendingCounts"],
    queryFn: async (): Promise<PendingCounts> => {
      const { data } = await apiClient.get<PendingCounts>("/notifications/pending-counts");
      return data;
    },
    enabled: !!user && isValidRole,
    refetchInterval: 60000,
  });
}
