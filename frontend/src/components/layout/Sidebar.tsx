// src/components/layout/Sidebar.tsx
// Role-aware sidebar router that selects the appropriate sidebar component.

import { useAuthStore } from "@/store/useAuthStore";
import { IndividualPsychologistSidebar } from "@/features/individual/layout/IndividualPsychologistSidebar";
import { ClinicAdminSidebar } from "@/features/clinic-admin/layout/ClinicAdminSidebar";
import { OrgAdminSidebar } from "@/features/org-admin/layout/OrgAdminSidebar";
import { SuperAdminSidebar } from "@/features/super-admin/layout/SuperAdminSidebar";
import { OrgStaffSidebar } from "@/features/org-staff/layout/OrgStaffSidebar";
import { ClinicStaffSidebar } from "@/features/clinic-staff/layout/ClinicStaffSidebar";

/**
 * AppSidebar - Main sidebar router component
 * Selects the appropriate sidebar based on the authenticated user's role.
 * - individual_psychologist -> IndividualPsychologistSidebar
 * - clinic_staff -> ClinicStaffSidebar
 * - clinic_admin -> ClinicAdminSidebar
 * - org_admin -> OrgAdminSidebar
 * - org_staff -> OrgStaffSidebar
 * - super_admin -> SuperAdminSidebar
 */
export function AppSidebar() {
  const { user } = useAuthStore();

  if (!user) return null;

  const role = user.role;

  if (role === "super_admin") {
    return <SuperAdminSidebar />;
  }

  if (role === "clinic_admin") {
    return <ClinicAdminSidebar />;
  }

  if (role === "org_admin") {
    return <OrgAdminSidebar />;
  }

  if (role === "org_staff") {
    return <OrgStaffSidebar />;
  }

  if (role === "clinic_staff") {
    return <ClinicStaffSidebar />;
  }

  // Default to Individual Psychologist sidebar for individual_psychologist
  return <IndividualPsychologistSidebar />;
}
