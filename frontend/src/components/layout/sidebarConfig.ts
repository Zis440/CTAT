
export interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  roles?: string[];
  permissionKey?: string;
  verificationRequired?: boolean;
  hideIfVerified?: boolean;
  rciClinicalOnly?: boolean;
  rciOnly?: boolean;
  psyichubVerifiedOnly?: boolean;
  notificationKey?: "account_verifications" | "report_verifications";
  children?: NavItem[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}
