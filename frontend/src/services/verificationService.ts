
import { apiClient } from "./apiClient";
import type {
  VerificationRequirementsResponse,
  VerificationStatusResponse,
} from "@/types/auth";

export async function getVerificationRequirements(): Promise<VerificationRequirementsResponse> {
  const { data } = await apiClient.get<VerificationRequirementsResponse>(
    "/verification/requirements"
  );
  return data;
}

export async function uploadVerificationDocument(
  documentType: string,
  category: string,
  file: File
): Promise<{
  status: string;
  document_type: string;
  original_filename: string;
  file_path: string;
  document_status: string;
}> {
  const formData = new FormData();
  formData.append("document_type", documentType);
  formData.append("category", category);
  formData.append("file", file);

  const { data } = await apiClient.post("/verification/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getVerificationStatus(): Promise<VerificationStatusResponse> {
  const { data } = await apiClient.get<VerificationStatusResponse>(
    "/verification/status"
  );
  return data;
}

export async function submitForVerification(): Promise<{
  status: string;
  verification_status: string;
  message: string;
}> {
  const { data } = await apiClient.post("/verification/submit");
  return data;
}

export async function deleteVerificationDocument(documentType: string): Promise<{ status: string }> {
  const { data } = await apiClient.delete(`/verification/document/${documentType}`);
  return data;
}

export async function initDigilocker(): Promise<{
  success: boolean;
  url: string;
  txn_id: string;
  reference_id: string;
}> {
  const { data } = await apiClient.get("/verification/digilocker/init");
  return data;
}

export async function digilockerCallback(payload: {
  ref_id: string;
  txn_id: string;
  target_document_type: string;
}): Promise<{
  status: string;
  document: any;
}> {
  const { data } = await apiClient.post("/verification/digilocker/callback", payload);
  return data;
}

export async function getRciProfile(): Promise<{
  cv_uploaded: boolean;
  cv_filename: string | null;
  bio: string | null;
  is_rci_verified: boolean;
}> {
  const { data } = await apiClient.get("/verification/profile");
  return data;
}

export async function saveRciProfile(cv?: File, bio?: string): Promise<{
  status: string;
  cv_uploaded: boolean;
  cv_filename: string | null;
  bio: string | null;
  is_rci_verified: boolean;
  verification_status?: "pending" | "approved" | "rejected";
}> {
  const formData = new FormData();
  if (cv) {
    formData.append("cv", cv);
  }
  if (bio !== undefined) {
    formData.append("bio", bio);
  }

  const { data } = await apiClient.post("/verification/profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export async function removeRciCv(): Promise<{ status: string }> {
  const { data } = await apiClient.delete("/verification/profile/cv");
  return data;
}
