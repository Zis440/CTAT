import { apiClient } from "./apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Appointment {
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
}

export interface AppointmentAdmin extends Appointment {
  psychologist_name?: string;
  psychologist_email?: string;
  patient_name?: string;
  clinic_name?: string;
}

export interface AppointmentCreate {
  patient_id: string;
  psychologist_id?: string;
  appointment_date: string;    // "YYYY-MM-DD"
  start_time: string;          // "HH:MM"
  duration_minutes?: number;
  purpose?: string;
  notes?: string;
}

export interface AppointmentUpdate {
  patient_id?: string;
  appointment_date?: string;
  start_time?: string;
  duration_minutes?: number;
  status?: string;
  purpose?: string;
  notes?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function createAppointment(payload: AppointmentCreate): Promise<Appointment> {
  const { data } = await apiClient.post("/appointments", payload);
  return data;
}

export async function getAppointments(status?: string): Promise<Appointment[]> {
  const params = status ? { status } : {};
  const { data } = await apiClient.get("/appointments", { params });
  return data;
}

export async function getAppointmentById(id: string): Promise<AppointmentAdmin> {
  const { data } = await apiClient.get(`/appointments/${id}`);
  return data;
}

export async function updateAppointment(id: string, payload: AppointmentUpdate): Promise<Appointment> {
  const { data } = await apiClient.patch(`/appointments/${id}`, payload);
  return data;
}

export async function deleteAppointment(id: string): Promise<void> {
  await apiClient.delete(`/appointments/${id}`);
}

/** Super Admin — list ALL appointments platform-wide */
export async function getAllAppointmentsAdmin(): Promise<AppointmentAdmin[]> {
  const { data } = await apiClient.get("/appointments/admin-all");
  return data;
}

/** Clinic Admin — list clinic appointments */
export async function getClinicAppointments(): Promise<AppointmentAdmin[]> {
  const { data } = await apiClient.get("/appointments/clinic-all");
  return data;
}

/** Clinic Admin — get single appointment with detailed names */
export async function fetchClinicAppointmentById(id: string): Promise<AppointmentAdmin> {
  const { data } = await apiClient.get(`/appointments/clinic/${id}`);
  return data;
}
