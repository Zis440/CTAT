
import { apiClient } from "./apiClient";

export interface RCIDetailsResponse {
  found: boolean;
  practitioner_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  state?: string;
  qualification?: string;
  message?: string;
}

export interface RCICrossCheckResponse {
  matches_found: boolean;
  phone_match: boolean;
  email_match: boolean;
  address_match: boolean;
  rci_phone?: string;
  message?: string;
}

export interface BankVerifyResponse {
  verified: boolean;
  account_holder_name?: string;
  message?: string;
}

export interface PANVerifyResponse {
  verified: boolean;
  name_match: boolean;
  message?: string;
}

export async function fetchRCIDetails(rciNumber: string): Promise<RCIDetailsResponse> {
  const { data } = await apiClient.post<RCIDetailsResponse>("/signup-verify/rci-details", {
    rci_number: rciNumber,
  });
  return data;
}

export async function crossCheckRCI(payload: {
  rci_number: string;
  user_phone: string;
  user_email: string;
  user_address?: string;
}): Promise<RCICrossCheckResponse> {
  const { data } = await apiClient.post<RCICrossCheckResponse>("/signup-verify/rci-crosscheck", payload);
  return data;
}

export async function verifyBankAccount(payload: {
  account_number: string;
  ifsc_code: string;
  beneficiary_name: string;
}): Promise<BankVerifyResponse> {
  const { data } = await apiClient.post<BankVerifyResponse>("/signup-verify/bank", payload);
  return data;
}

export async function verifyPAN(payload: {
  pan_number: string;
  expected_name: string;
}): Promise<PANVerifyResponse> {
  const { data } = await apiClient.post<PANVerifyResponse>("/signup-verify/pan", payload);
  return data;
}
