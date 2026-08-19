import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { useAuthStore } from "@/store/useAuthStore";
import { getMe } from "@/services/authService";

/**
 * OAuthCallbackPage — handles the redirect from the backend after OAuth consent.
 *
 * URL: /auth/oauth/callback?token=JWT  (success)
 * URL: /auth/oauth/callback?error=...  (failure)
 *
 * On success: stores the JWT, fetches user profile, navigates to /dashboard.
 * On failure: shows an error and redirects to /login.
 */

const ERROR_MESSAGES: Record<string, string> = {
  missing_params: "OAuth response was incomplete. Please try again.",
  no_email: "Your account does not have an email address. Please use a different provider.",
  exchange_failed: "Could not complete sign-in with the provider. Please try again.",
  access_denied: "You denied access. Sign-in was cancelled.",
};

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      const msg = ERROR_MESSAGES[error] || `Sign-in failed: ${error}`;
      setErrorMsg(msg);
      setStatus("error");
      toast.error(msg);
      setTimeout(() => navigate("/login", { replace: true }), 3000);
      return;
    }

    if (!token) {
      setErrorMsg("No authentication token received.");
      setStatus("error");
      toast.error("No authentication token received.");
      setTimeout(() => navigate("/login", { replace: true }), 3000);
      return;
    }

    // Store the token temporarily so apiClient includes it in the /me request
    const tempStore = useAuthStore.getState();
    tempStore.setAuth(token, {
      id: "",
      email: "",
      first_name: "",
      role: "individual_psychologist",
      account_type: "individual",
      verification_status: "not_submitted",
      is_active: true,
    });

    // Fetch the full user profile
    getMe()
      .then((user) => {
        setAuth(token, user);
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
        toast.success(`Welcome${fullName ? `, ${fullName}` : ""}!`);
        
        let dest = "/dashboard";
        if (user.role === "super_admin") dest = "/admin";
        else if (user.role === "clinic_admin") dest = "/clinic/dashboard";
        else if (user.role === "clinic_staff") dest = "/clinic-staff/dashboard";
        else if (user.role === "org_admin") dest = "/org/dashboard";
        else if (user.role === "org_staff") dest = "/org-staff/dashboard";
        
        navigate(dest, { replace: true });
      })
      .catch((err) => {
        console.error("OAuth callback: failed to fetch user profile", err);
        useAuthStore.getState().logout();
        setErrorMsg("Could not load your profile. Please try signing in again.");
        setStatus("error");
        toast.error("Profile fetch failed. Please try again.");
        setTimeout(() => navigate("/login", { replace: true }), 3000);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background font-sans">
      <Helmet>
        <title>Signing in… | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      {status === "loading" ? (
        <div className="flex flex-col items-center gap-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <p className="text-text/60 font-medium text-sm">
            Completing sign-in…
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 animate-in fade-in max-w-sm text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-text/80 font-medium text-sm">{errorMsg}</p>
          <p className="text-text/40 text-xs">Redirecting to login…</p>
        </div>
      )}
    </div>
  );
}
