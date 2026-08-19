import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { ModuleGuard } from "@/components/common/ModuleGuard";

import { AnalysisDashboard } from "@/features/assessment/tat/pages/ResultsDashboardPage";
import { AppointmentsPage } from "@/features/clinic-staff/pages/AppointmentsPage";
import { StaffAppointmentDetailsPage } from "@/features/clinic-staff/pages/StaffAppointmentDetailsPage";
import { ClinicSessionHistoryPage } from "@/features/clinic-staff/pages/ClinicSessionHistoryPage";
import { TestSelectorPage } from "@/features/assessment/TestSelectorPage";
import { IntakeView } from "@/features/assessment/intake/PatientIntakePage";
import { SessionSetupView } from "@/features/assessment/tat/pages/SessionSetupPage";
import AssessmentLevel1 from "@/features/assessment/screening/level1/pages/AssessmentLevel1";
import Report from "@/features/assessment/screening/level1/pages/Report";
import { ActiveSession } from "@/features/assessment/tat/pages/ActiveSessionPage";
import { TATCardPreviewPage } from "@/features/assessment/tat/pages/TATCardPreviewPage";
import { WalletPage } from "@/features/clinic-staff/pages/WalletPage";
import { WalletRechargePage } from "@/features/clinic-staff/pages/WalletRechargePage";
import { ClinicTransactionsPage } from "@/features/clinic-staff/pages/ClinicTransactionsPage";
import { SupportPage } from "@/features/clinic-staff/pages/SupportPage";
import { PatientsPage } from "@/features/clinic-staff/pages/PatientsListPage";
import { PatientDetailsPage } from "@/features/clinic-staff/pages/PatientDetailsPage";
import { ClinicReportsPage } from "@/features/clinic-admin/pages/ClinicReportsPage";
import { GenerateLinkPage } from "@/features/org-admin/pages/GenerateLinkPage";

export const clinicStaffRoutes = [
  {
    element: (
      <ProtectedRoute allowedRoles={["clinic_staff"]}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "clinic-staff/dashboard", element: <AnalysisDashboard /> },
      { path: "clinic-staff/session-history/result", element: <AnalysisDashboard /> },
      { path: "clinic-staff/session/NI/report/synthesizing", element: <AnalysisDashboard /> },
      { path: "clinic-staff/session/NI/report/:id", element: <AnalysisDashboard /> },
      { path: "clinic-staff/session-history/:id/details", element: <AnalysisDashboard /> },
      { path: "clinic-staff/appointments", element: <ModuleGuard moduleKey="appointments"><AppointmentsPage /></ModuleGuard> },
      { path: "clinic-staff/appointments/:id", element: <ModuleGuard moduleKey="appointments"><StaffAppointmentDetailsPage /></ModuleGuard> },
      { path: "clinic-staff/appointments/page/:pageId", element: <ModuleGuard moduleKey="appointments"><AppointmentsPage /></ModuleGuard> },
      { path: "clinic-staff/session-history", element: <ModuleGuard moduleKey="assessments"><ClinicSessionHistoryPage /></ModuleGuard> },
      { path: "clinic-staff/session-history/page/:pageId", element: <ModuleGuard moduleKey="assessments"><ClinicSessionHistoryPage /></ModuleGuard> },
      { path: "clinic-staff/session/new", element: <ModuleGuard moduleKey="assessments"><TestSelectorPage /></ModuleGuard> },
      { path: "clinic-staff/session/new/intake", element: <ModuleGuard moduleKey="assessments"><IntakeView /></ModuleGuard> },
      { path: "clinic-staff/session/setup", element: <ModuleGuard moduleKey="assessments"><SessionSetupView /></ModuleGuard> },
      { path: "clinic-staff/session/active", element: <ModuleGuard moduleKey="assessments"><ActiveSession /></ModuleGuard> },
      { path: "clinic-staff/cards", element: <TATCardPreviewPage /> },
      { path: "clinic-staff/wallet", element: <ModuleGuard moduleKey="can_view_wallet_history"><WalletPage /></ModuleGuard> },
      { path: "clinic-staff/recharge", element: <ModuleGuard moduleKey="can_recharge"><WalletRechargePage /></ModuleGuard> },
      { path: "clinic-staff/transactions", element: <ModuleGuard moduleKey="can_view_wallet_history"><ClinicTransactionsPage /></ModuleGuard> },
      { path: "clinic-staff/transactions/page/:pageId", element: <ModuleGuard moduleKey="can_view_wallet_history"><ClinicTransactionsPage /></ModuleGuard> },
      { path: "clinic-staff/session/screening-tool", element: <ModuleGuard moduleKey="assessments"><AssessmentLevel1 /></ModuleGuard> },
      { path: "clinic-staff/session/screening-tool/report/:id", element: <ModuleGuard moduleKey="assessments"><Report /></ModuleGuard> },
      { path: "clinic-staff/session/screening-tool/history/:id/details", element: <ModuleGuard moduleKey="assessments"><Report /></ModuleGuard> },
      { path: "clinic-staff/support", element: <SupportPage /> },
      { path: "clinic-staff/patients", element: <ModuleGuard moduleKey="patients"><PatientsPage /></ModuleGuard> },
      { path: "clinic-staff/patients/page/:pageId", element: <ModuleGuard moduleKey="patients"><PatientsPage /></ModuleGuard> },
      { path: "clinic-staff/patients/:patientId/details", element: <ModuleGuard moduleKey="patients"><PatientDetailsPage /></ModuleGuard> },
      { path: "clinic-staff/reports", element: <ModuleGuard moduleKey="reports"><ClinicReportsPage /></ModuleGuard> },
      { path: "clinic-staff/reports/page/:pageId", element: <ModuleGuard moduleKey="reports"><ClinicReportsPage /></ModuleGuard> },
      { path: "clinic-staff/generated-links", element: <ModuleGuard moduleKey="remote_assessment_link_management"><GenerateLinkPage /></ModuleGuard> },
    ],
  },
];
