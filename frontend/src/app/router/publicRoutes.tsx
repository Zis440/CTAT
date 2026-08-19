import { Navigate } from "react-router-dom";

// Public pages
import { AboutPage } from "@/features/landing/AboutPage";
import { DocsPage } from "@/features/landing/DocsPage";
import { PrivacyPage } from "@/features/legal/PrivacyPage";
import { TermsPage } from "@/features/legal/TermsPage";

// Auth pages
import { LoginPage } from "@/features/auth/LoginPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { OAuthCallbackPage } from "@/features/auth/OAuthCallbackPage";
import { DigilockerRedirect } from "@/features/auth/DigilockerRedirect";


// Anonymous Assessment
import { AnonymousAssessmentPage } from "@/features/assessment/anonymous/AnonymousAssessmentPage";

export const publicRoutes = [
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/team", element: <AboutPage /> },
  { path: "/about", element: <DocsPage /> },
  { path: "/how-to-use", element: <DocsPage /> },
  { path: "/privacy", element: <PrivacyPage /> },
  { path: "/terms", element: <TermsPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/sign-up", element: <SignupPage /> },
  { path: "/auth/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password/:token", element: <ResetPasswordPage /> },
  { path: "/auth/oauth/callback", element: <OAuthCallbackPage /> },
  { path: "/digilocker-redirect", element: <DigilockerRedirect /> },

  // Public Anonymous Assessment Link
  { path: "/assessment/:token", element: <AnonymousAssessmentPage /> },

];

