import {
  LayoutDashboard,
  Users,
  LifeBuoy,
  FileText,
  HeartPulse,
  Calendar,
  CreditCard,
  Building2,
  Link,
  UserCog,
  Wallet,
  History,
  ClipboardPlus,
} from "lucide-react";
import type { NavGroup } from "@/components/layout/sidebarConfig";

export const CLINIC_ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/clinic/dashboard" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Appointments", icon: Calendar, to: "/clinic/appointments" },
      { label: "Patients", icon: HeartPulse, to: "/clinic/patients" },
      { label: "Assessments", icon: ClipboardPlus, to: "/clinic/session/new" },
      { label: "Session History", icon: History, to: "/clinic/session-history" },
      { label: "Reports", icon: FileText, to: "/clinic/reports" },
      { label: "Generated Links", icon: Link, to: "/clinic/generated-links" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Staff", icon: Users, to: "/clinic/staff" },
      { label: "Clinic Profile", icon: Building2, to: "/clinic/profile" },
      { label: "Staff Settings", icon: UserCog, to: "/clinic/staff-settings" },
    ],
  },
  {
    label: "Financial",
    items: [
      { label: "Wallet", icon: Wallet, to: "/clinic/wallet" },
      { label: "Recharge", icon: CreditCard, to: "/clinic/recharge" },
      { label: "Transactions", icon: History, to: "/clinic/transactions" },
    ],
  },
  {
    label: "Support & Feedback",
    items: [
      { label: "Staff Support Requests", icon: LifeBuoy, to: "/clinic/support-requests" },
      { label: "Contact Support", icon: LifeBuoy, to: "/clinic/contact-support" },
    ],
  },
];
