import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardPlus,
  History,
  FileText,
  Link,
  Wallet,
  CreditCard,
  LifeBuoy,
} from "lucide-react";
import type { NavGroup } from "@/components/layout/sidebarConfig";

export const CLINIC_STAFF_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/clinic-staff/dashboard" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Appointments", icon: Calendar, to: "/clinic-staff/appointments", permissionKey: "appointments" },
      { label: "Patients", icon: Users, to: "/clinic-staff/patients", permissionKey: "patients" },
      { label: "Assessments", icon: ClipboardPlus, to: "/clinic-staff/session/new", permissionKey: "assessments" },
      { label: "Session History", icon: History, to: "/clinic-staff/session-history", permissionKey: "assessments" },
      { label: "Reports", icon: FileText, to: "/clinic-staff/reports", permissionKey: "reports" },
      { label: "Generated Links", icon: Link, to: "/clinic-staff/generated-links", permissionKey: "remote_assessment_link_management" },
    ],
  },
  {
    label: "Financial",
    items: [
      { label: "Wallet", icon: Wallet, to: "/clinic-staff/wallet", permissionKey: "can_view_wallet_history" },
      { label: "Recharge", icon: CreditCard, to: "/clinic-staff/recharge", permissionKey: "can_recharge" },
      { label: "Transactions", icon: History, to: "/clinic-staff/transactions", permissionKey: "can_view_wallet_history" },
    ],
  },
  {
    label: "Support & Feedback",
    items: [
      { label: "Contact Support", icon: LifeBuoy, to: "/clinic-staff/support" },
    ],
  },
];
