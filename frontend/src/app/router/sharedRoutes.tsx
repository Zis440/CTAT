import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { SettingsPage } from "@/features/individual/pages/SettingsPage";
import { DocVerificationPage } from "@/features/auth/VerificationPage";
import { NotificationsPage } from "@/features/notifications/pages/NotificationsPage";

export const sharedRoutes = [
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "settings", element: <SettingsPage /> },
      { path: "verification", element: <DocVerificationPage /> },
      { path: "notifications", element: <NotificationsPage /> },
    ],
  },
];
