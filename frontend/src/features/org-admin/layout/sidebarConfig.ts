import {
  LayoutDashboard,
  Users,
  LifeBuoy,
  FileText,
  HeartPulse,
  CreditCard,
  Building2,
  Link as LinkIcon,
  Wallet,
  History,
  UserCog,
  ClipboardPlus,
} from "lucide-react";
import type { NavGroup } from "@/components/layout/sidebarConfig";

export const ORG_ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/org/dashboard" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Candidates", icon: HeartPulse, to: "/org/candidates" },
      { label: "Assessments", icon: ClipboardPlus, to: "/org/session/new" },
      { label: "Session History", icon: History, to: "/org/session-history" },
      { label: "Reports", icon: FileText, to: "/org/reports" },
      { label: "Generated Links", icon: LinkIcon, to: "/org/generated-links" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Staff", icon: Users, to: "/org/staff" },
      { label: "Org Profile", icon: Building2, to: "/org/profile" },
      { label: "Staff Settings", icon: UserCog, to: "/org/staff-settings" },
    ],
  },
  {
    label: "Financial",
    items: [
      { label: "Wallet", icon: Wallet, to: "/org/wallet" },
      { label: "Recharge", icon: CreditCard, to: "/org/recharge" },
      { label: "Transactions", icon: History, to: "/org/transactions" },
    ],
  },
  {
    label: "Support & Feedback",
    items: [
      { label: "Staff Support Requests", icon: LifeBuoy, to: "/org/support-requests" },
      { label: "Contact Support", icon: LifeBuoy, to: "/org/contact-support" },
    ],
  },
];
