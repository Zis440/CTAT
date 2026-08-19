import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { AdminGeneratedLinksPage } from "@/features/super-admin/pages/AdminGeneratedLinksPage";
import { AdminOrganizationManagementPage } from "@/features/super-admin/pages/AdminOrganizationManagementPage";
import { AdminOrganizationDetailsPage } from "@/features/super-admin/pages/AdminOrganizationDetailsPage";

import { AdminDashboardPage } from "@/features/super-admin/pages/AdminDashboardPage";
import { VerificationQueuePage } from "@/features/super-admin/pages/AdminVerificationQueuePage";
import { AdminReportVerificationMonitorPage } from "@/features/super-admin/pages/AdminReportVerificationMonitorPage";
import { AdminVerificationRequestDetailsPage } from "@/features/super-admin/pages/AdminVerificationRequestDetailsPage";
import { AdminAssessmentsPage } from "@/features/super-admin/pages/AdminAssessmentsPage";
import { AdminClinicsPage } from "@/features/super-admin/pages/AdminClinicsPage";
import { AdminClinicDetailsPage } from "@/features/super-admin/pages/AdminClinicDetailsPage";
import { UserManagementPage } from "@/features/super-admin/pages/AdminUserManagementPage";
import { AdminUserDetailsPage } from "@/features/super-admin/pages/AdminUserDetailsPage";
import { AdminPatientsPage } from "@/features/super-admin/pages/AdminPatientsPage";
import { AdminCandidatesPage } from "@/features/super-admin/pages/AdminCandidatesPage";
import { AdminPatientDetailsPage } from "@/features/super-admin/pages/AdminPatientDetailsPage";
import { AdminAppointmentsPage } from "@/features/super-admin/pages/AdminAppointmentsPage";
import { AdminAppointmentDetailsPage } from "@/features/super-admin/pages/AdminAppointmentDetailsPage";
import { AdminStaffPage } from "@/features/super-admin/pages/AdminStaffPage";
import { AdminStaffDetailsPage } from "@/features/super-admin/pages/AdminStaffDetailsPage";
import { AdminSupportPage } from "@/features/super-admin/pages/AdminSupportPage";
import { AdminPasswordResetsPage } from "@/features/super-admin/pages/AdminPasswordResetsPage";
import { AdminTransactionsPage } from "@/features/super-admin/pages/AdminTransactionsPage";
import { AdminIncomePage } from "@/features/super-admin/pages/AdminIncomePage";
import { AdminSettingsPage } from "@/features/super-admin/pages/AdminSettingsPage";
import { AnalysisDashboard } from "@/features/assessment/tat/pages/ResultsDashboardPage";
import { AdminSessionHistoryPage } from "@/features/super-admin/pages/AdminSessionHistoryPage";
import { AdminReportsPage } from "@/features/super-admin/pages/AdminReportsPage";
import Report from "@/features/assessment/screening/level1/pages/Report";

export const superAdminRoutes = [
  {
    element: (
      <ProtectedRoute allowedRoles={["super_admin"]}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "admin", element: <AdminDashboardPage /> },
      { path: "admin/verification-queue", element: <VerificationQueuePage /> },
      { path: "admin/report-verification-monitor", element: <AdminReportVerificationMonitorPage /> },
      { path: "admin/report-verification-monitor/:id", element: <AdminVerificationRequestDetailsPage /> },
      { path: "admin/assessments", element: <AdminAssessmentsPage /> },
      { path: "admin/clinics", element: <AdminClinicsPage /> },
      { path: "admin/clinics/page/:pageId", element: <AdminClinicsPage /> },
      { path: "admin/clinics/:id/details", element: <AdminClinicDetailsPage /> },
      { path: "admin/users", element: <UserManagementPage /> },
      { path: "admin/users/page/:pageId", element: <UserManagementPage /> },
      { path: "admin/users/:id/details", element: <AdminUserDetailsPage /> },
      { path: "admin/patients", element: <AdminPatientsPage /> },
      { path: "admin/patients/page/:pageId", element: <AdminPatientsPage /> },
      { path: "admin/patients/:id/details", element: <AdminPatientDetailsPage /> },
      { path: "admin/candidates", element: <AdminCandidatesPage /> },
      { path: "admin/candidates/page/:pageId", element: <AdminCandidatesPage /> },
      { path: "admin/candidates/:id/details", element: <AdminPatientDetailsPage /> },
      { path: "admin/appointments", element: <AdminAppointmentsPage /> },
      { path: "admin/appointments/page/:pageId", element: <AdminAppointmentsPage /> },
      { path: "admin/appointments/:id", element: <AdminAppointmentDetailsPage /> },
      { path: "admin/staff", element: <AdminStaffPage /> },
      { path: "admin/staff/page/:pageId", element: <AdminStaffPage /> },
      { path: "admin/staff/:id/details", element: <AdminStaffDetailsPage /> },
      { path: "admin/support", element: <AdminSupportPage /> },
      { path: "admin/password-resets", element: <AdminPasswordResetsPage /> },
      { path: "admin/transactions", element: <AdminTransactionsPage /> },
      { path: "admin/transactions/page/:pageId", element: <AdminTransactionsPage /> },
      { path: "admin/income", element: <AdminIncomePage /> },
      { path: "admin/settings", element: <AdminSettingsPage /> },

      { path: "admin/session-history/result", element: <AnalysisDashboard /> },
      { path: "admin/session/NI/report/synthesizing", element: <AnalysisDashboard /> },
      { path: "admin/session/NI/report/:id", element: <AnalysisDashboard /> },
      { path: "admin/session-history/:id/details", element: <AnalysisDashboard /> },
      { path: "admin/session/history", element: <AdminSessionHistoryPage /> },
      { path: "admin/session/history/page/:pageId", element: <AdminSessionHistoryPage /> },
      { path: "admin/reports", element: <AdminReportsPage /> },
      { path: "admin/reports/page/:pageId", element: <AdminReportsPage /> },
      { path: "admin/session/screening-tool/report/:id", element: <Report /> },
      { path: "admin/session/screening-tool/history/:id/details", element: <Report /> },
      { path: "admin/generated-links", element: <AdminGeneratedLinksPage /> },
      { path: "admin/organizations", element: <AdminOrganizationManagementPage /> },
      { path: "admin/organizations/page/:pageId", element: <AdminOrganizationManagementPage /> },
      { path: "admin/organizations/:id/details", element: <AdminOrganizationDetailsPage /> },
    ],
  },
];
