import { apiClient } from "./apiClient";

export interface VerificationRequestItem {
  request_id: string;
  session_id: string;
  patient_name: string;
  created_at: string;
  assigned_at: string;
  status: string;
  report_pdf_path?: string;
  
  // Requesting user info
  requesting_user_name?: string;
  requesting_user_domain?: string;
  
  // Admin fields
  completed_at?: string;
  assignment_attempts?: number;
  psychologist_name?: string;
  psychologist_email?: string;
}

export const getPsychologistVerificationQueue = async (): Promise<VerificationRequestItem[]> => {
  const { data } = await apiClient.get("/psychologist-verification/queue");
  return data;
};

export const getPsychologistVerificationHistory = async (): Promise<VerificationRequestItem[]> => {
  const { data } = await apiClient.get("/psychologist-verification/history");
  return data;
};

export const approveVerificationRequest = async (requestId: string, notes: string = "") => {
  const { data } = await apiClient.post(`/psychologist-verification/${requestId}/approve`, null, {
    params: { notes }
  });
  return data;
};

export const rejectVerificationRequest = async (requestId: string) => {
  const { data } = await apiClient.post(`/psychologist-verification/${requestId}/reject`);
  return data;
};

export const getAdminVerificationMonitor = async (): Promise<VerificationRequestItem[]> => {
  const { data } = await apiClient.get("/psychologist-verification/admin/monitor");
  return data;
};

export const getAdminSingleVerificationRequest = async (requestId: string): Promise<VerificationRequestItem> => {
  const { data } = await apiClient.get(`/psychologist-verification/admin/request/${requestId}`);
  return data;
};

export const getEligiblePsychologists = async (): Promise<{id: string, name: string, email: string, rci_number: string}[]> => {
  const { data } = await apiClient.get('/psychologist-verification/admin/psychologists');
  return data;
};

export const getAllPsychologists = async (): Promise<{id: string, name: string, email: string, rci_number: string, verification_status: string}[]> => {
  const { data } = await apiClient.get('/psychologist-verification/admin/all-psychologists');
  return data;
};

export const reassignVerificationRequest = async (requestId: string, psychologistId?: string) => {
  const { data } = await apiClient.post(`/psychologist-verification/admin/request/${requestId}/reassign`, null, {
    params: psychologistId ? { psychologist_id: psychologistId } : undefined
  });
  return data;
};

export const cancelVerificationRequest = async (requestId: string) => {
  const { data } = await apiClient.post(`/psychologist-verification/admin/request/${requestId}/cancel`);
  return data;
};
