import {
  LayoutDashboard,
  ClipboardPlus,
  History,
  Users,
  Wallet,
  LifeBuoy,
  Calendar,
  CreditCard,
  FileText,
  Link,
  ShieldCheck,
} from "lucide-react";
import type { NavGroup } from "@/components/layout/sidebarConfig";

export const INDIVIDUAL_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Appointments", icon: Calendar, to: "/appointments" },
      { label: "Patients", icon: Users, to: "/patients" },
      { label: "Assessments", icon: ClipboardPlus, to: "/session/new" },
      { label: "Session History", icon: History, to: "/session/history" },
      { label: "Reports", icon: FileText, to: "/reports" },
      { label: "Generated Links", icon: Link, to: "/generated-links" },
    ],
  },
  {
    label: "Financial",
    items: [
      { label: "Wallet", icon: Wallet, to: "/wallet", roles: ["individual_psychologist"] },
      { label: "Recharge", icon: CreditCard, to: "/recharge", roles: ["individual_psychologist"] },
      { label: "Transactions", icon: History, to: "/wallet/history", roles: ["individual_psychologist", "clinic_staff_with_history"] },
    ],
  },
  {
    label: "Support & Feedback",
    items: [
      { label: "Contact Support", icon: LifeBuoy, to: "/support" },
      { label: "Verification", icon: ShieldCheck, to: "/verification", hideIfVerified: true, rciClinicalOnly: true },
      { label: "RCI Verification Queue", icon: ShieldCheck, to: "/verification-queue", verificationRequired: true, rciOnly: true, psyichubVerifiedOnly: true, notificationKey: "report_verifications" },
    ],
  },
];
