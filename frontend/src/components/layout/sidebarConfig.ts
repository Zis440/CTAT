

export interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  roles?: string[];
  permissionKey?: string; // if set, item is hidden unless user.module_permissions[permissionKey] === true
  verificationRequired?: boolean; // if set to true, item is hidden unless user.verification_status === "approved"
  hideIfVerified?: boolean; // if set to true, item is hidden when user.verification_status === "approved"
  rciClinicalOnly?: boolean; // if set to true, item is hidden unless user is a Clinical Psychologist with an RCI number
  rciOnly?: boolean; // if set to true, item is hidden unless user has an RCI number
  psyichubVerifiedOnly?: boolean; // if set to true, item is hidden unless user has an RCI number, is approved, and has uploaded CV and Bio
  notificationKey?: "account_verifications" | "report_verifications"; // if set, shows a red dot if the respective count > 0
  children?: NavItem[]; // For collapsible sections
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}




