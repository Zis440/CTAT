import {
  LayoutDashboard,
  ClipboardPlus,
  History,
  Users,
  Settings,
  LifeBuoy,
  ShieldCheck,
  UserCog,
  Building,
  Building2,
  HeartPulse,
  Calendar,
  TrendingUp,
  Lock,
  Link,
  FileText,
} from "lucide-react";
import type { NavGroup } from "@/components/layout/sidebarConfig";

export const SUPER_ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/admin" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Appointments", icon: Calendar, to: "/admin/appointments" },
      { label: "Patient Management", icon: HeartPulse, to: "/admin/patients" },
      { label: "Candidate Management", icon: Users, to: "/admin/candidates" },
      { label: "Assessments", icon: ClipboardPlus, to: "/admin/assessments" },
      { label: "Session History", icon: History, to: "/admin/session/history" },
      { label: "Reports", icon: FileText, to: "/admin/reports" },
      { label: "Generated Links", icon: Link, to: "/admin/generated-links" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Clinic Management", icon: Building, to: "/admin/clinics" },
      { label: "Organization Management", icon: Building2, to: "/admin/organizations" },
      { label: "Staff Management", icon: Users, to: "/admin/staff" },
      { label: "User Management", icon: UserCog, to: "/admin/users" },
    ],
  },
  {
    label: "Financial",
    items: [
      { label: "Income", icon: TrendingUp, to: "/admin/income" },
      { label: "Transactions", icon: History, to: "/admin/transactions" },
    ],
  },
  {
    label: "Support & Feedback",
    items: [
      { label: "Support Requests", icon: LifeBuoy, to: "/admin/support" },
      { label: "Account Verification Queue", icon: ShieldCheck, to: "/admin/verification-queue", notificationKey: "account_verifications" },
      { label: "Report Verification Monitor", icon: ShieldCheck, to: "/admin/report-verification-monitor", notificationKey: "report_verifications" },
      { label: "Password Resets", icon: Lock, to: "/admin/password-resets" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", icon: Settings, to: "/admin/settings" },
    ],
  },
];
