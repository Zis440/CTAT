import { apiClient } from "./apiClient";

export interface AuditLog {
  id: string;
  user_id: string;
  target_user_id?: string;
  action: string;
  details?: Record<string, any>;
  timestamp: string;
  user_name?: string;
  user_role?: string;
}

export interface FetchAuditLogsParams {
  target_user_id?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export async function fetchAuditLogs(params: FetchAuditLogsParams = {}): Promise<AuditLog[]> {
  const { data } = await apiClient.get<AuditLog[]>("/audit-logs", { params });
  return data;
}
