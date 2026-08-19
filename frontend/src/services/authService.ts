
import { apiClient } from "./apiClient";
import type {
  AuthResponse,
  AuthUser,
  LoginPayload,
  RegisterIndividualPayload,
  RegisterClinicPayload,
  RegisterOrgPayload,
  VerificationUser,
} from "@/types/auth";

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  console.log("[authService] Calling POST /auth/login", payload);
  try {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", payload, {
      timeout: 15000,
    });
    console.log("[authService] Login successful", data);
    return data;
  } catch (error: any) {
    console.error("[authService] Login failed:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
}

export async function registerIndividual(
  payload: RegisterIndividualPayload
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(
    "/auth/register/individual",
    payload
  );
  return data;
}

export async function registerClinic(
  payload: RegisterClinicPayload
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(
    "/auth/register/clinic",
    payload
  );
  return data;
}

export async function registerOrganization(
  payload: RegisterOrgPayload
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(
    "/auth/register/organization",
    payload
  );
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(payload: { token: string; email: string; new_password: string; confirm_password: string }): Promise<void> {
  await apiClient.post("/auth/reset-password", payload);
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/auth/me");
  return data;
}

export async function updateProfile(
  payload: Partial<
    Pick<AuthUser, "title" | "first_name" | "last_name" | "email" | "date_of_birth" | "gender" | "phone" | "designation" | "professional_domain">
  >
): Promise<AuthUser> {
  const { data } = await apiClient.patch<AuthUser>("/auth/me", payload);
  return data;
}

export async function uploadAvatar(file: File): Promise<{ avatar_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<{ avatar_url: string }>("/auth/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export async function uploadSignature(file: File): Promise<{ status: string; message: string; e_signature_path?: string }> {
  const formData = new FormData();
  formData.append("e_signature", file);
  const { data } = await apiClient.post<{ status: string; message: string; e_signature_path?: string }>("/individual/e-signature", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export async function removeSignature(): Promise<{ status: string; message: string }> {
  const { data } = await apiClient.delete<{ status: string; message: string }>("/individual/e-signature");
  return data;
}

export async function changePassword(payload: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<void> {
  await apiClient.post("/auth/change-password", payload);
}

export async function getVerificationQueue(): Promise<VerificationUser[]> {
  const { data } = await apiClient.get<VerificationUser[]>(
    "/auth/verification-queue"
  );
  return data;
}

export async function verifyUser(
  userId: string,
  payload: { action: "approve" | "reject"; notes?: string }
): Promise<void> {
  await apiClient.patch(`/auth/verify/${userId}`, payload);
}

export async function addStaff(payload: {
  first_name: string;
  last_name?: string;
  email: string;
  password: string;
  phone: string;
  role_type: "staff_view" | "psychology_assessment";
  rci_number?: string;
}): Promise<AuthUser> {
  const { data } = await apiClient.post<AuthUser>("/auth/staff", payload);
  return data;
}

export async function getStaff(): Promise<AuthUser[]> {
  const { data } = await apiClient.get<AuthUser[]>("/auth/staff");
  return data;
}

export async function updateStaffPermissions(
  staffId: string,
  payload: { module_permissions: Record<string, boolean> }
): Promise<AuthUser> {
  const { data } = await apiClient.put<AuthUser>(`/auth/staff/${staffId}/permissions`, payload);
  return data;
}

export type { VerificationUser };
export const deleteAccount = async () => {
  const response = await apiClient.delete('/auth/me');
  return response.data;
};
