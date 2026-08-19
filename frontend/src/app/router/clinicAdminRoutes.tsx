import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

import { ClinicDashboardPage } from "@/features/clinic-admin/pages/ClinicDashboardPage";
import { ClinicOrgProfilePage } from "@/features/clinic-admin/pages/ClinicOrgProfilePage";
import { ClinicStaffPage } from "@/features/clinic-admin/pages/ClinicStaffPage";
import { ClinicBillingPage } from "@/features/clinic-admin/pages/ClinicBillingPage";
import { ClinicPatientsPage } from "@/features/clinic-admin/pages/ClinicPatientsPage";
import { ClinicPatientDetailsPage } from "@/features/clinic-admin/pages/ClinicPatientDetailsPage";
import { ClinicStaffDetailsPage } from "@/features/clinic-admin/pages/ClinicStaffDetailsPage";
import { ClinicAppointmentsPage } from "@/features/clinic-admin/pages/ClinicAppointmentsPage";
import { ClinicAppointmentDetailsPage } from "@/features/clinic-admin/pages/ClinicAppointmentDetailsPage";
import { ClinicReportsPage } from "@/features/clinic-admin/pages/ClinicReportsPage";
import { ClinicSupportPage } from "@/features/clinic-admin/pages/ClinicSupportPage";
import { ClinicStaffSupportRequestsPage } from "@/features/clinic-admin/pages/ClinicStaffSupportRequestsPage";
import { ClinicSettingsPage } from "@/features/clinic-admin/pages/ClinicSettingsPage";
import { ClinicStaffSettingsPage } from "@/features/clinic-admin/pages/ClinicStaffSettingsPage";

import { AnalysisDashboard } from "@/features/assessment/tat/pages/ResultsDashboardPage";
import { SessionHistoryPage } from "@/features/assessment/tat/pages/SessionHistoryPage";
import { TestSelectorPage } from "@/features/assessment/TestSelectorPage";
import { IntakeView } from "\@/features/assessment/intake/PatientIntakePage";
import { SessionSetupView } from "@/features/assessment/tat/pages/SessionSetupPage";
import AssessmentLevel1 from "@/features/assessment/screening/level1/pages/AssessmentLevel1";
import Report from "@/features/assessment/screening/level1/pages/Report";
import VerificationQueue from "@/features/assessment/screening/level1/pages/VerificationQueue";
import { ActiveSession } from "@/features/assessment/tat/pages/ActiveSessionPage";
import { TATCardPreviewPage } from "@/features/assessment/tat/pages/TATCardPreviewPage";
import { ClinicWalletPage } from "@/features/clinic-admin/pages/ClinicWalletPage";
import { ClinicAdminGeneratedLinksPage } from "@/features/clinic-admin/pages/ClinicAdminGeneratedLinksPage";
import { ClinicWalletRechargePage } from "\@/features/clinic-admin/pages/ClinicWalletRechargePage";
import { ClinicWalletHistoryPage } from "\@/features/clinic-admin/pages/ClinicWalletHistoryPage";

export const clinicAdminRoutes = [
  {
    element: (
      <ProtectedRoute allowedRoles={["clinic_admin"]}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "clinic/dashboard", element: <ClinicDashboardPage /> },
      { path: "clinic/profile", element: <ClinicOrgProfilePage /> },
      { path: "clinic/staff", element: <ClinicStaffPage /> },
      { path: "clinic/staff/page/:pageId", element: <ClinicStaffPage /> },
      { path: "clinic/staff/:id/details", element: <ClinicStaffDetailsPage /> },
      { path: "clinic/transactions", element: <ClinicBillingPage /> },
      { path: "clinic/transactions/page/:pageId", element: <ClinicBillingPage /> },
      { path: "clinic/patients", element: <ClinicPatientsPage /> },
      { path: "clinic/patients/page/:pageId", element: <ClinicPatientsPage /> },
      { path: "clinic/patients/:id/details", element: <ClinicPatientDetailsPage /> },
      { path: "clinic/appointments", element: <ClinicAppointmentsPage /> },
      { path: "clinic/appointments/page/:pageId", element: <ClinicAppointmentsPage /> },
      { path: "clinic/appointments/:id", element: <ClinicAppointmentDetailsPage /> },
      { path: "clinic/reports", element: <ClinicReportsPage /> },
      { path: "clinic/reports/page/:pageId", element: <ClinicReportsPage /> },
      { path: "clinic/generated-links", element: <ClinicAdminGeneratedLinksPage /> },
      { path: "clinic/contact-support", element: <ClinicSupportPage /> },
      { path: "clinic/support-requests", element: <ClinicStaffSupportRequestsPage /> },
      { path: "clinic/staff-settings", element: <ClinicStaffSettingsPage /> },
      { path: "clinic/settings", element: <ClinicSettingsPage /> },

      { path: "clinic/dashboard-analysis", element: <AnalysisDashboard /> },
      { path: "clinic/session-history/result", element: <AnalysisDashboard /> },
      { path: "clinic/session/NI/report/synthesizing", element: <AnalysisDashboard /> },
      { path: "clinic/session/NI/report/:id", element: <AnalysisDashboard /> },
      { path: "clinic/session-history/:id/details", element: <AnalysisDashboard /> },
      { path: "clinic/session-history", element: <SessionHistoryPage /> },
      { path: "clinic/session-history/page/:pageId", element: <SessionHistoryPage /> },
      { path: "clinic/session/new", element: <TestSelectorPage /> },
      { path: "clinic/session/new/intake", element: <IntakeView /> },
      { path: "clinic/session/setup", element: <SessionSetupView /> },
      { path: "clinic/session/screening-tool", element: <AssessmentLevel1 /> },
      { path: "clinic/session/screening-tool/report/:id", element: <Report /> },
      { path: "clinic/session/screening-tool/history/:id/details", element: <Report /> },
      { path: "clinic/session/screening-tool/verification-queue", element: <VerificationQueue /> },
      { path: "clinic/session/active", element: <ActiveSession /> },
      { path: "clinic/cards", element: <TATCardPreviewPage /> },
      { path: "clinic/wallet", element: <ClinicWalletPage /> },
      { path: "clinic/recharge", element: <ClinicWalletRechargePage /> },
      { path: "clinic/wallet/history", element: <ClinicWalletHistoryPage /> },
      { path: "clinic/wallet/history/page/:pageId", element: <ClinicWalletHistoryPage /> },
    ],
  },
];
