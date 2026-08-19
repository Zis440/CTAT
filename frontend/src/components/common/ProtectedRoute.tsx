// src/components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, useAuthHydrated } from '@/store/useAuthStore';
import type { UserRole } from '@/types/auth';
import { Loader2, ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If provided, user must have one of these roles */
  allowedRoles?: UserRole[];
  /**
   * If true, this route requires the user to be verified.
   * Unverified individual psychologists will see a blocking screen.
   */
  requireVerified?: boolean;
}

// ── Routes that require verification to access ────────────────────────────────
// Individual psychologists / clinic users must be approved before they can
// start, run, or view active assessment sessions.
const VERIFICATION_REQUIRED_PATHS = [
  "session/new",
  "session/new/intake",
  "session/setup",
  "session/active",
];

// Roles that are exempt from the verification gate (admins can always proceed)
const EXEMPT_ROLES = new Set(["super_admin", "clinic_admin"]);

// ── Blocked screen ────────────────────────────────────────────────────────────
function VerificationRequiredScreen() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-8 w-8 text-yellow-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight text-text">
            Verification Required
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your account is pending verification. You cannot start or perform
            any assessments until your documents have been reviewed and approved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="bg-primary hover:bg-primary/90 text-background font-bold"
            onClick={() => navigate("/verification")}
          >
            View Verification Status
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            className="border-primary/20 font-bold"
            onClick={() => {
              const { user } = useAuthStore.getState();
              let fallback = "/dashboard";
              if (user?.role === "super_admin") fallback = "/admin";
              else if (user?.role === "clinic_admin") fallback = "/clinic/dashboard";
              else if (user?.role === "clinic_staff") fallback = "/clinic-staff/dashboard";
              else if (user?.role === "org_admin") fallback = "/org/dashboard";
              else if (user?.role === "org_staff") fallback = "/org-staff/dashboard";
              navigate(fallback);
            }}
          >
            Go to Dashboard
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Our team reviews documents within 1–2 business days.
        </p>
      </div>
    </div>
  );
}

// ── Main guard ────────────────────────────────────────────────────────────────
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const hydrated = useAuthHydrated();
  const location = useLocation();

  // ── Wait for Zustand to finish hydrating from localStorage ──────────────
  // Without this gate, opening a new tab redirects to /login before the
  // persisted token/user are loaded — making it look like the session is lost.
  if (!hydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Preserve the intended destination for post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      let fallback = "/dashboard";
      if (user.role === "super_admin") fallback = "/admin";
      else if (user.role === "clinic_admin") fallback = "/clinic/dashboard";
      else if (user.role === "clinic_staff") fallback = "/clinic-staff/dashboard";
      else if (user.role === "org_admin") fallback = "/org/dashboard";
      else if (user.role === "org_staff") fallback = "/org-staff/dashboard";
      
      return <Navigate to={fallback} replace />;
    }
  }

  // ── Verification gate ───────────────────────────────────────────────────
  // Individual psychologists and clinic_staff cannot run assessments unless
  // their account has been approved. Admins are exempt.
  const currentPath = location.pathname.replace(/^\//, ""); // strip leading /
  const needsVerification = VERIFICATION_REQUIRED_PATHS.some((p) =>
    currentPath === p || currentPath.startsWith(p + "/")
  );

  if (
    needsVerification &&
    !EXEMPT_ROLES.has(user.role) &&
    user.verification_status !== "approved"
  ) {
    return <VerificationRequiredScreen />;
  }

  return <>{children}</>;
}
