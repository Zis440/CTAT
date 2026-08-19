import { apiClient } from "./apiClient";

export interface ClinicStats {
  total_staff: number;
  total_sessions: number;
  total_patients: number;
  wallet_balance_paise: number;
  monthly_growth: { month: string; patients: number }[];
  assessment_uses: { name: string; value: number; color: string }[];
  upcoming_appointments: { id: string; patient_name: string; psychologist_name: string; date: string; time: string }[];
  recent_transactions: { id: string; user_name: string; type: string; amount_rupees: number; created_at: string }[];
}

export const getClinicStats = async (): Promise<ClinicStats> => {
  const response = await apiClient.get<ClinicStats>("/clinic/stats");
  return response.data;
};

export interface ClinicProfile {
  clinic_id: string;
  clinic_name?: string | null;
  tagline?: string | null;
  contact_email?: string | null;
  support_phone?: string | null;
  logo_path?: string | null;
  cover_path?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
}

export interface ClinicProfileUpdate {
  clinic_name?: string;
  tagline?: string;
  contact_email?: string;
  support_phone?: string;
}

export const getClinicProfile = async (): Promise<ClinicProfile> => {
  const response = await apiClient.get<ClinicProfile>("/clinic/profile");
  return response.data;
};

export const updateClinicProfile = async (data: ClinicProfileUpdate): Promise<ClinicProfile> => {
  const response = await apiClient.put<ClinicProfile>("/clinic/profile", data);
  return response.data;
};

export const uploadClinicLogo = async (file: File): Promise<ClinicProfile> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<ClinicProfile>("/clinic/profile/logo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const uploadClinicCover = async (file: File): Promise<ClinicProfile> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<ClinicProfile>("/clinic/profile/cover", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
