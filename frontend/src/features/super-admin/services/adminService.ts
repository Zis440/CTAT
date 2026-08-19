// src/features/admin/services/adminService.ts
// API calls for admin user management.

import { apiClient } from "@/services/apiClient";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  role: string;
  account_type: string;
  verification_status: string;
  clinic_id?: string;
  clinic_name?: string;
  roc_number?: string;
  specialization?: string;
  is_active: boolean;
  avatar_url?: string;
  oauth_provider?: string;
  can_assess?: boolean;
}

export interface PaginatedUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminPatient {
  id: string;
  user_id: string;
  user_email: string;
  provider_name?: string;
  clinic_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  total_sessions: number;
  created_at: string;
}

export interface AdminUpdatePatientRequest {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
  age?: number;
}

export interface PaginatedAdminPatientsResponse {
  patients: AdminPatient[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminClinic {
  id: string;
  admin_user_id: string;
  clinic_name: string;
  name?: string;
  clinic_type?: string;
  email: string;
  phone?: string;
  address?: string;
  roc_number?: string;
  verification_status: string;
  is_active: boolean;
  created_at: string;
  staff_count: number;
  patient_count: number;
  total_users?: number;
  total_patients?: number;
  total_sessions?: number;
}

export interface PaginatedAdminClinicsResponse {
  clinics: AdminClinic[];
  total: number;
  page: number;
  page_size: number;
}

export interface AppointmentAdminOut {
  id: string;
  psychologist_id: string;
  patient_id: string;
  clinic_id?: string;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  purpose?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  psychologist_name?: string;
  psychologist_email?: string;
  patient_name?: string;
  clinic_name?: string;
}

export interface UserFilters {
  page?: number;
  page_size?: number;
  search?: string;
  role?: string;
  verification_status?: string;
  is_active?: boolean;
  clinic_type?: string;
  patient_type?: string;
  account_type?: string;
}

export interface AdminUpdateUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  account_type?: string;
  verification_status?: string;
  is_active?: boolean;
  clinic_name?: string;
  specialization?: string;
  roc_number?: string;
  can_assess?: boolean;
}

export interface AdminCreateUserPayload {
  first_name: string;
  last_name?: string;
  email: string;
  password: string;
  role: string;
  clinic_name?: string;
  clinic_id?: string;
  role_type?: string;
  phone?: string;
  rci_number?: string;
}

// ── API Calls ───────────────────────────────────────────────────────────────

export async function fetchUsers(
  filters: UserFilters = {}
): Promise<PaginatedUsersResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  if (filters.search) params.set("search", filters.search);
  if (filters.role) params.set("role", filters.role);
  if (filters.verification_status)
    params.set("verification_status", filters.verification_status);
  if (filters.is_active !== undefined)
    params.set("is_active", String(filters.is_active));
  if (filters.account_type)
    params.set("account_type", filters.account_type);

  const { data } = await apiClient.get<PaginatedUsersResponse>(
    `/admin/users?${params.toString()}`
  );
  return data;
}

export async function fetchAdminPatients(
  filters: UserFilters = {}
): Promise<PaginatedAdminPatientsResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  if (filters.search) params.set("search", filters.search);
  if (filters.patient_type) params.set("patient_type", filters.patient_type);

  const { data } = await apiClient.get<PaginatedAdminPatientsResponse>(
    `/admin/patients?${params.toString()}`
  );
  return data;
}

export async function fetchAdminClinics(
  filters: UserFilters = {}
): Promise<PaginatedAdminClinicsResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  if (filters.search) params.set("search", filters.search);
  if (filters.verification_status)
    params.set("verification_status", filters.verification_status);
  if (filters.is_active !== undefined)
    params.set("is_active", String(filters.is_active));
  if (filters.clinic_type)
    params.set("clinic_type", filters.clinic_type);

  const { data } = await apiClient.get<PaginatedAdminClinicsResponse>(
    `/admin/clinics?${params.toString()}`
  );
  return data;
}

export async function fetchAdminOrganizations(
  filters: UserFilters = {}
): Promise<PaginatedAdminClinicsResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  if (filters.search) params.set("search", filters.search);
  if (filters.verification_status)
    params.set("verification_status", filters.verification_status);
  if (filters.is_active !== undefined)
    params.set("is_active", String(filters.is_active));

  const { data } = await apiClient.get<PaginatedAdminClinicsResponse>(
    `/admin/organizations?${params.toString()}`
  );
  return data;
}

export async function fetchAdminClinic(clinicId: string): Promise<AdminClinic> {
  const { data } = await apiClient.get<AdminClinic>(`/admin/clinics/${clinicId}`);
  return data;
}

export async function fetchAdminOrganization(orgId: string): Promise<AdminClinic> {
  const { data } = await apiClient.get<AdminClinic>(`/admin/organizations/${orgId}`);
  return data;
}

export async function updateAdminClinic(
  clinicId: string,
  payload: Partial<AdminClinic>
): Promise<AdminClinic> {
  const { data } = await apiClient.patch<AdminClinic>(
    `/admin/clinics/${clinicId}`,
    payload
  );
  return data;
}

export async function fetchUserDetail(userId: string): Promise<AdminUser> {
  const { data } = await apiClient.get<AdminUser>(`/admin/users/${userId}`);
  return data;
}

export async function updateUser(
  userId: string,
  payload: AdminUpdateUserPayload
): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(
    `/admin/users/${userId}`,
    payload
  );
  return data;
}

export async function deleteUser(
  userId: string,
  hard: boolean = false
): Promise<{ detail: string }> {
  const { data } = await apiClient.delete<{ detail: string }>(
    `/admin/users/${userId}?hard=${hard}`
  );
  return data;
}

export async function createUser(
  payload: AdminCreateUserPayload
): Promise<AdminUser> {
  const { data } = await apiClient.post<AdminUser>(
    "/admin/users",
    payload
  );
  return data;
}

export const fetchAdminPatientDetail = async (patientId: string): Promise<AdminPatient> => {
  const { data } = await apiClient.get(`/admin/patients/${patientId}`);
  return data;
};

export const updateAdminPatient = async (patientId: string, payload: AdminUpdatePatientRequest): Promise<AdminPatient> => {
  const { data } = await apiClient.patch(`/admin/patients/${patientId}`, payload);
  return data;
};

export const fetchAdminAppointments = async (): Promise<AppointmentAdminOut[]> => {
  const response = await apiClient.get('/appointments/admin-all');
  return response.data;
};

export const fetchAdminAppointmentById = async (id: string): Promise<AppointmentAdminOut> => {
  const response = await apiClient.get(`/appointments/admin/${id}`);
  return response.data;
};

export interface AdminUpdateAppointmentPayload {
  appointment_date?: string;  // "YYYY-MM-DD"
  start_time?: string;        // "HH:MM"
  duration_minutes?: number;
  status?: string;
  purpose?: string;
  notes?: string;
}

export const updateAdminAppointment = async (
  id: string,
  payload: AdminUpdateAppointmentPayload
): Promise<AppointmentAdminOut> => {
  const response = await apiClient.patch(`/appointments/${id}`, payload);
  return response.data;
};

export const deleteAdminAppointment = async (id: string): Promise<void> => {
  await apiClient.delete(`/appointments/${id}`);
};
