import { apiClient } from "./apiClient";

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface SupportTicketCreate {
  subject: string;
  message: string;
}

export async function createTicket(payload: SupportTicketCreate): Promise<SupportTicket> {
  const response = await apiClient.post("/support", payload);
  return response.data;
}

export async function getTickets(): Promise<SupportTicket[]> {
  const response = await apiClient.get("/support");
  return response.data;
}

export interface SupportTicketAdmin extends SupportTicket {
  user_email: string;
  user_name: string;
}

export async function getAllTicketsAdmin(): Promise<SupportTicketAdmin[]> {
  const response = await apiClient.get("/support/admin-all");
  return response.data;
}

export async function getClinicStaffTickets(): Promise<SupportTicketAdmin[]> {
  const response = await apiClient.get("/support/clinic-staff");
  return response.data;
}

export async function updateTicketStatus(ticketId: string, status: "open" | "closed"): Promise<SupportTicket> {
  const response = await apiClient.patch(`/support/${ticketId}/status`, null, {
    params: { status }
  });
  return response.data;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name?: string;
  sender_role?: string;
  message: string;
  attachment_path?: string;
  created_at: string;
}

export async function getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
  const response = await apiClient.get(`/support/${ticketId}/messages`);
  return response.data;
}

export async function replyToTicket(ticketId: string, message: string, file?: File | null): Promise<SupportMessage> {
  const formData = new FormData();
  formData.append("message", message);
  if (file) {
    formData.append("file", file);
  }

  const response = await apiClient.post(`/support/${ticketId}/messages`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}
