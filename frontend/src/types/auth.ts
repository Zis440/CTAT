
export type UserRole =
  | "individual_psychologist"
  | "clinic_admin"
  | "clinic_staff"
  | "super_admin"
  | "org_admin"
  | "org_staff";

export const PUBLIC_ROLES: { value: UserRole; label: string; hint: string }[] = [
  {
    value: "individual_psychologist",
    label: "Individual Psychologist",
    hint: "Solo practitioner",
  },
  {
    value: "clinic_staff",
    label: "Clinic Staff",
    hint: "Clinic team member",
  },
];

export const ALL_ROLES: { value: UserRole; label: string; hint: string }[] = [
  ...PUBLIC_ROLES,
  {
    value: "clinic_admin",
    label: "Clinic Admin",
    hint: "Institution administrator",
  },
  {
    value: "super_admin",
    label: "Super Admin",
    hint: "Platform administrator",
  },
];

export type AccountType = "individual" | "clinic" | "organization";

export type VerificationStatus =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected";

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  title?: string;
  role: UserRole;
  account_type: AccountType;
  verification_status: VerificationStatus;
  professional_domain?: string;
  is_active: boolean;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  clinic_name?: string;
  clinic_type?: string;
  address?: string;
  roc_number?: string;
  rci_number?: string;
  specialization?: string;
  designation?: string;
  avatar_url?: string;
  e_signature_path?: string;
  module_permissions?: Record<string, boolean>;
  can_assess?: boolean;
  bio?: string;
  cv_path?: string;
  created_at?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  account_type?: string;
}

export interface RegisterIndividualPayload {
  first_name: string;
  last_name?: string;
  email: string;
  password: string;
  phone: string;
  phone_otp_token?: string;
  professional_domain?: string;
  rci_number?: string;
  specialization?: string;
  date_of_birth?: string;
  gender?: string;

  rci_crosscheck_passed?: boolean;
  aadhaar_number?: string;
  aadhaar_verified?: boolean;
  address?: string;
  terms_accepted: boolean;
  ai_disclaimer_accepted: boolean;
  refund_policy_accepted: boolean;
  professional_responsibility_accepted: boolean;
}

export interface RegisterClinicPayload {
  first_name: string;
  last_name?: string;
  email: string;
  password: string;
  phone: string;
  phone_otp_token?: string;
  clinic_name: string;
  clinic_type?: string;
  address?: string;
  roc_number?: string;
  date_of_birth?: string;
  gender?: string;

  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_verified?: boolean;
  company_pan?: string;
  pan_verified?: boolean;
  terms_accepted: boolean;
  ai_disclaimer_accepted: boolean;
  refund_policy_accepted: boolean;
  professional_responsibility_accepted: boolean;
}

export interface RegisterOrgPayload {
  first_name: string;
  last_name?: string;
  email: string;
  password: string;
  phone: string;
  phone_otp_token?: string;
  org_name: string;
  org_type?: string;
  address?: string;
  cin_number?: string;
  date_of_birth?: string;
  gender?: string;
  company_pan?: string;
  pan_verified?: boolean;
  terms_accepted: boolean;
  ai_disclaimer_accepted: boolean;
  refund_policy_accepted: boolean;
  professional_responsibility_accepted: boolean;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

export interface VerificationUser {
  id: string;
  first_name: string;
  last_name?: string;
  email: string;
  account_type: string;
  clinic_name?: string;
  clinic_type?: string;
  roc_number?: string;
  rci_number?: string;
  specialization?: string;
  verification_status: VerificationStatus;
  cv_path?: string;
  cv_original_filename?: string;
  bio?: string;
}

export type DocumentCategory = "professional" | "business" | "identity" | "compliance";

export interface DocumentRequirement {
  document_type: string;
  category: DocumentCategory;
  label: string;
  description?: string;
  is_required: boolean;
}

export interface VerificationRequirementsResponse {
  account_type: string;
  clinic_subtype: string | null;
  required: DocumentRequirement[];
  optional: DocumentRequirement[];
}

export interface UploadedDocument {
  id: string;
  document_type: string;
  document_category: DocumentCategory;
  original_filename?: string;
  status: "pending" | "approved" | "rejected";
  is_required: boolean;
  uploaded_at?: string;
  verification_notes?: string;
}

export interface VerificationStatusResponse {
  documents: UploadedDocument[];
  can_submit_review: boolean;
  verification_status: VerificationStatus;
  required_count: number;
  uploaded_required_count: number;
}
