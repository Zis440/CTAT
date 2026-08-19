import {
  LayoutDashboard,
  Users,
  ClipboardPlus,
  History,
  FileText,
  Link,
  Wallet,
  CreditCard,
  LifeBuoy,
} from "lucide-react";
import type { NavGroup } from "@/components/layout/sidebarConfig";

export const ORG_STAFF_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/org-staff/dashboard" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Candidates", icon: Users, to: "/org-staff/candidates", permissionKey: "candidates" },
      { label: "Assessments", icon: ClipboardPlus, to: "/org-staff/session/new", permissionKey: "assessments" },
      { label: "Session History", icon: History, to: "/org-staff/session-history", permissionKey: "assessments" },
      { label: "Reports", icon: FileText, to: "/org-staff/reports", permissionKey: "reports" },
      { label: "Generated Links", icon: Link, to: "/org-staff/generated-links", permissionKey: "remote_assessment_link_management" },
    ],
  },
  {
    label: "Financial",
    items: [
      { label: "Wallet", icon: Wallet, to: "/org-staff/wallet", permissionKey: "can_view_wallet_history" },
      { label: "Recharge", icon: CreditCard, to: "/org-staff/recharge", permissionKey: "can_recharge" },
      { label: "Transactions", icon: History, to: "/org-staff/transactions", permissionKey: "can_view_wallet_history" },
    ],
  },
  {
    label: "Support & Feedback",
    items: [
      { label: "Contact Support", icon: LifeBuoy, to: "/org-staff/support" },
    ],
  },
];
