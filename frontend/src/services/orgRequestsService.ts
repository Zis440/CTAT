import { apiClient } from "./apiClient";

export interface OrgAssessmentRequest {
  id: string;
  org_id: string;
  patient_id: string;
  assessment_id: number;
  assigned_psychologist_id: string | null;
  status: string;
  created_at: string;
  sla_deadline: string;
}

export async function createOrgAssessmentRequest(data: { patient_id: string; assessment_id: number }): Promise<OrgAssessmentRequest> {
  const response = await apiClient.post<OrgAssessmentRequest>("/org/requests/", data);
  return response.data;
}

export async function getOrgAssessmentRequests(): Promise<OrgAssessmentRequest[]> {
  const response = await apiClient.get<OrgAssessmentRequest[]>("/org/requests/");
  return response.data;
}
