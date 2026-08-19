import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

import { AnalysisDashboard } from "@/features/assessment/tat/pages/ResultsDashboardPage";
import { AppointmentsPage } from "@/features/individual/pages/AppointmentsPage";
import { IndividualAppointmentDetailsPage } from "@/features/individual/pages/IndividualAppointmentDetailsPage";
import { SessionHistoryPage } from "@/features/assessment/tat/pages/SessionHistoryPage";
import { TestSelectorPage } from "@/features/assessment/TestSelectorPage";
import { IntakeView } from "@/features/assessment/intake/PatientIntakePage";
import { SessionSetupView } from "@/features/assessment/tat/pages/SessionSetupPage";
import AssessmentLevel1 from "@/features/assessment/screening/level1/pages/AssessmentLevel1";
import Report from "@/features/assessment/screening/level1/pages/Report";
import { ActiveSession } from "@/features/assessment/tat/pages/ActiveSessionPage";
import { WalletPage } from "@/features/individual/pages/WalletPage";
import { WalletRechargePage } from "@/features/individual/pages/WalletRechargePage";
import { WalletHistoryPage } from "@/features/individual/pages/WalletHistoryPage";
import { SupportPage } from "@/features/individual/pages/SupportPage";
import { PatientsPage } from "@/features/individual/pages/PatientsListPage";
import { PatientDetailsPage } from "@/features/individual/pages/PatientDetailsPage";

import { ClinicReportsPage } from "@/features/clinic-admin/pages/ClinicReportsPage";
import { GenerateLinkPage } from "@/features/org-admin/pages/GenerateLinkPage";
import { ReportVerificationQueuePage } from "@/features/individual/pages/ReportVerificationQueuePage";

export const individualRoutes = [
  {
    element: (
      <ProtectedRoute allowedRoles={["individual_psychologist"]}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard", element: <AnalysisDashboard /> },
      { path: "session-history/result", element: <AnalysisDashboard /> },
      { path: "session/NI/report/synthesizing", element: <AnalysisDashboard /> },
      { path: "session/NI/report/:id", element: <AnalysisDashboard /> },
      { path: "session/history/:id/details", element: <AnalysisDashboard /> },
      { path: "appointments", element: <AppointmentsPage /> },
      { path: "appointments/:id", element: <IndividualAppointmentDetailsPage /> },
      { path: "appointments/page/:pageId", element: <AppointmentsPage /> },
      { path: "session/history", element: <SessionHistoryPage /> },
      { path: "session/history/page/:pageId", element: <SessionHistoryPage /> },
      { path: "session/new", element: <TestSelectorPage /> },
      { path: "session/new/intake", element: <IntakeView /> },
      { path: "session/setup", element: <SessionSetupView /> },
      { path: "session/screening-tool", element: <AssessmentLevel1 /> },
      { path: "session/screening-tool/report/:id", element: <Report /> },
      { path: "session/screening-tool/history/:id/details", element: <Report /> },
      { path: "session/active", element: <ActiveSession /> },
      { path: "wallet", element: <WalletPage /> },
      { path: "recharge", element: <WalletRechargePage /> },
      { path: "wallet/history", element: <WalletHistoryPage /> },
      { path: "wallet/history/page/:pageId", element: <WalletHistoryPage /> },
      { path: "support", element: <SupportPage /> },
      { path: "patients", element: <PatientsPage /> },
      { path: "patients/page/:pageId", element: <PatientsPage /> },
      { path: "patients/:patientId/details", element: <PatientDetailsPage /> },
      { path: "reports", element: <ClinicReportsPage /> },
      { path: "reports/page/:pageId", element: <ClinicReportsPage /> },
      { path: "generated-links", element: <GenerateLinkPage /> },

      { path: "verification-queue", element: <ReportVerificationQueuePage /> },
    ],
  },
];
