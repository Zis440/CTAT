import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { ModuleGuard } from "@/components/common/ModuleGuard";

import { AnalysisDashboard } from "@/features/assessment/tat/pages/ResultsDashboardPage";
import { OrgSessionHistoryPage } from "@/features/org-staff/pages/OrgSessionHistoryPage";
import { TestSelectorPage } from "@/features/assessment/TestSelectorPage";
import { IntakeView } from "@/features/assessment/intake/PatientIntakePage";
import { SessionSetupView } from "@/features/assessment/tat/pages/SessionSetupPage";
import AssessmentLevel1 from "@/features/assessment/screening/level1/pages/AssessmentLevel1";
import Report from "@/features/assessment/screening/level1/pages/Report";
import { ActiveSession } from "@/features/assessment/tat/pages/ActiveSessionPage";
import { TATCardPreviewPage } from "@/features/assessment/tat/pages/TATCardPreviewPage";
import { WalletPage } from "@/features/org-staff/pages/WalletPage";
import { WalletRechargePage } from "@/features/org-staff/pages/WalletRechargePage";
import { OrgTransactionsPage } from "@/features/org-staff/pages/OrgTransactionsPage";
import { SupportPage } from "@/features/org-staff/pages/SupportPage";
import { CandidatesPage } from "@/features/org-staff/pages/CandidatesListPage";
import { CandidateDetailsPage } from "@/features/org-staff/pages/CandidateDetailsPage";
import { OrgReportsPage } from "@/features/org-admin/pages/OrgReportsPage";
import { OrgAdminGeneratedLinksPage } from "@/features/org-admin/pages/OrgAdminGeneratedLinksPage";

export const orgStaffRoutes = [
  {
    element: (
      <ProtectedRoute allowedRoles={["org_staff"]}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "org-staff/dashboard", element: <AnalysisDashboard /> },
      { path: "org-staff/session-history/result", element: <AnalysisDashboard /> },
      { path: "org-staff/session/NI/report/synthesizing", element: <AnalysisDashboard /> },
      { path: "org-staff/session/NI/report/:id", element: <AnalysisDashboard /> },
      { path: "org-staff/session-history/:id/details", element: <AnalysisDashboard /> },
      { path: "org-staff/session-history", element: <ModuleGuard moduleKey="assessments"><OrgSessionHistoryPage /></ModuleGuard> },
      { path: "org-staff/session-history/page/:pageId", element: <ModuleGuard moduleKey="assessments"><OrgSessionHistoryPage /></ModuleGuard> },
      { path: "org-staff/session/new", element: <ModuleGuard moduleKey="assessments"><TestSelectorPage /></ModuleGuard> },
      { path: "org-staff/session/new/intake", element: <ModuleGuard moduleKey="assessments"><IntakeView /></ModuleGuard> },
      { path: "org-staff/session/setup", element: <ModuleGuard moduleKey="assessments"><SessionSetupView /></ModuleGuard> },
      { path: "org-staff/session/active", element: <ModuleGuard moduleKey="assessments"><ActiveSession /></ModuleGuard> },
      { path: "org-staff/cards", element: <TATCardPreviewPage /> },
      { path: "org-staff/wallet", element: <ModuleGuard moduleKey="can_view_wallet_history"><WalletPage /></ModuleGuard> },
      { path: "org-staff/recharge", element: <ModuleGuard moduleKey="can_recharge"><WalletRechargePage /></ModuleGuard> },
      { path: "org-staff/transactions", element: <ModuleGuard moduleKey="can_view_wallet_history"><OrgTransactionsPage /></ModuleGuard> },
      { path: "org-staff/transactions/page/:pageId", element: <ModuleGuard moduleKey="can_view_wallet_history"><OrgTransactionsPage /></ModuleGuard> },
      { path: "org-staff/session/screening-tool", element: <ModuleGuard moduleKey="assessments"><AssessmentLevel1 /></ModuleGuard> },
      { path: "org-staff/session/screening-tool/report/:id", element: <ModuleGuard moduleKey="assessments"><Report /></ModuleGuard> },
      { path: "org-staff/session/screening-tool/history/:id/details", element: <ModuleGuard moduleKey="assessments"><Report /></ModuleGuard> },
      { path: "org-staff/support", element: <SupportPage /> },
      { path: "org-staff/candidates", element: <ModuleGuard moduleKey="candidates"><CandidatesPage /></ModuleGuard> },
      { path: "org-staff/candidates/page/:pageId", element: <ModuleGuard moduleKey="candidates"><CandidatesPage /></ModuleGuard> },
      { path: "org-staff/candidates/:patientId/details", element: <ModuleGuard moduleKey="candidates"><CandidateDetailsPage /></ModuleGuard> },
      { path: "org-staff/reports", element: <ModuleGuard moduleKey="reports"><OrgReportsPage /></ModuleGuard> },
      { path: "org-staff/reports/page/:pageId", element: <ModuleGuard moduleKey="reports"><OrgReportsPage /></ModuleGuard> },
      { path: "org-staff/generated-links", element: <ModuleGuard moduleKey="remote_assessment_link_management"><OrgAdminGeneratedLinksPage /></ModuleGuard> },
    ],
  },
];
