import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

import { OrgDashboardPage } from "@/features/org-admin/pages/OrgDashboardPage";
import { OrgOrgProfilePage } from "@/features/org-admin/pages/OrgOrgProfilePage";
import { OrgStaffPage } from "@/features/org-admin/pages/OrgStaffPage";
import { OrgStaffDetailsPage } from "@/features/org-admin/pages/OrgStaffDetailsPage";
import { OrgBillingPage } from "@/features/org-admin/pages/OrgBillingPage";
import { OrgCandidatesPage } from "@/features/org-admin/pages/OrgCandidatesPage";
import { OrgCandidateDetailsPage } from "@/features/org-admin/pages/OrgCandidateDetailsPage";
import { OrgReportsPage } from "@/features/org-admin/pages/OrgReportsPage";
import { OrgSupportPage } from "@/features/org-admin/pages/OrgSupportPage";
import { OrgStaffSupportRequestsPage } from "@/features/org-admin/pages/OrgStaffSupportRequestsPage";
import { OrgSettingsPage } from "@/features/org-admin/pages/OrgSettingsPage";

import { AnalysisDashboard } from "@/features/assessment/tat/pages/ResultsDashboardPage";
import { SessionHistoryPage } from "@/features/assessment/tat/pages/SessionHistoryPage";
import { TestSelectorPage } from "@/features/assessment/TestSelectorPage";
import { IntakeView } from "\@/features/assessment/intake/PatientIntakePage";
import { SessionSetupView } from "@/features/assessment/tat/pages/SessionSetupPage";
import AssessmentLevel1 from "@/features/assessment/screening/level1/pages/AssessmentLevel1";
import Report from "@/features/assessment/screening/level1/pages/Report";
import VerificationQueue from "@/features/assessment/screening/level1/pages/VerificationQueue";
import { ActiveSession } from "@/features/assessment/tat/pages/ActiveSessionPage";
import { OrgWalletPage } from "\@/features/org-admin/pages/OrgWalletPage";
import { OrgWalletRechargePage } from "\@/features/org-admin/pages/OrgWalletRechargePage";
import { OrgAdminGeneratedLinksPage } from "@/features/org-admin/pages/OrgAdminGeneratedLinksPage";

export const orgAdminRoutes = [
  {
    element: (
      <ProtectedRoute allowedRoles={["org_admin"]}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "org/dashboard", element: <OrgDashboardPage /> },
      { path: "org/profile", element: <OrgOrgProfilePage /> },
      { path: "org/staff", element: <OrgStaffPage /> },
      { path: "org/staff/page/:pageId", element: <OrgStaffPage /> },
      { path: "org/staff/:id/details", element: <OrgStaffDetailsPage /> },
      { path: "org/transactions", element: <OrgBillingPage /> },
      { path: "org/transactions/page/:pageId", element: <OrgBillingPage /> },
      { path: "org/candidates", element: <OrgCandidatesPage /> },
      { path: "org/candidates/page/:pageId", element: <OrgCandidatesPage /> },
      { path: "org/candidates/:id/details", element: <OrgCandidateDetailsPage /> },
      { path: "org/reports", element: <OrgReportsPage /> },
      { path: "org/reports/page/:pageId", element: <OrgReportsPage /> },
      { path: "org/contact-support", element: <OrgSupportPage /> },
      { path: "org/support-requests", element: <OrgStaffSupportRequestsPage /> },
      { path: "org/staff-settings", element: <OrgSettingsPage /> },
      { path: "org/settings", element: <OrgSettingsPage /> },

      { path: "org/session-history/result", element: <AnalysisDashboard /> },
      { path: "org/session/NI/report/synthesizing", element: <AnalysisDashboard /> },
      { path: "org/session/NI/report/:id", element: <AnalysisDashboard /> },
      { path: "org/session-history/:id/details", element: <AnalysisDashboard /> },
      { path: "org/session-history", element: <SessionHistoryPage /> },
      { path: "org/session-history/page/:pageId", element: <SessionHistoryPage /> },
      { path: "org/session/new", element: <TestSelectorPage /> },
      { path: "org/session/new/intake", element: <IntakeView /> },
      { path: "org/session/setup", element: <SessionSetupView /> },
      { path: "org/session/screening-tool", element: <AssessmentLevel1 /> },
      { path: "org/session/screening-tool/report/:id", element: <Report /> },
      { path: "org/session/screening-tool/history/:id/details", element: <Report /> },
      { path: "org/session/screening-tool/verification-queue", element: <VerificationQueue /> },
      { path: "org/session/active", element: <ActiveSession /> },
      { path: "org/wallet", element: <OrgWalletPage /> },
      { path: "org/recharge", element: <OrgWalletRechargePage /> },
      { path: "org/generated-links", element: <OrgAdminGeneratedLinksPage /> },
    ],
  },
];
