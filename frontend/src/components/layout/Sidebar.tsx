
import { useAuthStore } from "@/store/useAuthStore";
import { IndividualPsychologistSidebar } from "@/features/individual/layout/IndividualPsychologistSidebar";
import { ClinicAdminSidebar } from "@/features/clinic-admin/layout/ClinicAdminSidebar";
import { OrgAdminSidebar } from "@/features/org-admin/layout/OrgAdminSidebar";
import { SuperAdminSidebar } from "@/features/super-admin/layout/SuperAdminSidebar";
import { OrgStaffSidebar } from "@/features/org-staff/layout/OrgStaffSidebar";
import { ClinicStaffSidebar } from "@/features/clinic-staff/layout/ClinicStaffSidebar";

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

  return <IndividualPsychologistSidebar />;
}
