/**
 * Signup Verification Service
 * ============================
 * Frontend API client for the multi-step verification endpoints.
 * Used during signup to verify RCI details and Bank accounts.
 */

import { apiClient } from "./apiClient";

// ── Types ────────────────────────────────────────────────────────────────────

export interface RCIDetailsResponse {
  found: boolean;
  practitioner_name?: string;
  phone?: string;   // Masked
  email?: string;    // Masked
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
  rci_phone?: string;  // Masked
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

// ── API Calls ────────────────────────────────────────────────────────────────

/**
 * Fetch detailed RCI practitioner information from Neurofy.
 * Returns masked phone/email/address for cross-referencing.
 */
export async function fetchRCIDetails(rciNumber: string): Promise<RCIDetailsResponse> {
  const { data } = await apiClient.post<RCIDetailsResponse>("/signup-verify/rci-details", {
    rci_number: rciNumber,
  });
  return data;
}

/**
 * Cross-check user-entered details against the RCI record.
 * If matches_found is false, manual verification is required.
 */
export async function crossCheckRCI(payload: {
  rci_number: string;
  user_phone: string;
  user_email: string;
  user_address?: string;
}): Promise<RCICrossCheckResponse> {
  const { data } = await apiClient.post<RCICrossCheckResponse>("/signup-verify/rci-crosscheck", payload);
  return data;
}



/**
 * Verify a clinic bank account via Razorpay (penny drop).
 */
export async function verifyBankAccount(payload: {
  account_number: string;
  ifsc_code: string;
  beneficiary_name: string;
}): Promise<BankVerifyResponse> {
  const { data } = await apiClient.post<BankVerifyResponse>("/signup-verify/bank", payload);
  return data;
}

/**
 * Verify PAN number and match expected name (fallback if Bank Verification fails).
 */
export async function verifyPAN(payload: {
  pan_number: string;
  expected_name: string;
}): Promise<PANVerifyResponse> {
  const { data } = await apiClient.post<PANVerifyResponse>("/signup-verify/pan", payload);
  return data;
}
