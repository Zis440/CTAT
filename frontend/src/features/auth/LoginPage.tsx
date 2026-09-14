import { useState } from "react";
import { useNavigate, Link, useLocation, Navigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { LandingNavbar } from "../landing/components/LandingNavbar";
import { Footer } from "../landing/components/FooterSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/ui/dot-pattern";

import { login } from "@/services/authService";
import { useAuthStore, useAuthHydrated } from "@/store/useAuthStore";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();

  const queryRedirect = new URLSearchParams(location.search).get("redirect");
  const from = queryRedirect || (location.state as any)?.from?.pathname || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleDemoSignIn = async () => {
    setIsDemoLoading(true);
    try {
      const res = await login({ email: "psyc@example.com", password: "password123" });
      setAuth(res.access_token, res.user);
      toast.success("Signed in with Individual Psychologist Demo Account!");
      const destination = from !== "/dashboard" ? from : "/dashboard";
      navigate(destination, { replace: true });
    } catch (err: any) {
      console.error("[LoginPage] Demo sign-in error:", err);
      toast.error(err?.response?.data?.detail || "Demo sign-in failed. Please try again.");
    } finally {
      setIsDemoLoading(false);
    }
  };

  if (hydrated && isAuthenticated && user) {
    let dest = "/dashboard";
    if (user.role === "super_admin") dest = "/admin";
    else if (user.role === "clinic_admin") dest = "/clinic/dashboard";
    else if (user.role === "clinic_staff") dest = "/clinic-staff/dashboard";
    else if (user.role === "org_admin") dest = "/org/dashboard";
    else if (user.role === "org_staff") dest = "/org-staff/dashboard";

    return <Navigate to={queryRedirect || dest} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {

      const res = await login({ email, password });
      setAuth(res.access_token, res.user);
      const fullName = [res.user.first_name, res.user.last_name].filter(Boolean).join(" ");
      toast.success(`Welcome back ${fullName}!`);

      let roleRedirect = "/dashboard";
      if (res.user.role === "super_admin") {
        roleRedirect = "/admin";
      } else if (res.user.role === "clinic_admin") {
        roleRedirect = "/clinic/dashboard";
      } else if (res.user.role === "clinic_staff") {
        roleRedirect = "/clinic-staff/dashboard";
      } else if (res.user.role === "org_admin") {
        roleRedirect = "/org/dashboard";
      } else if (res.user.role === "org_staff") {
        roleRedirect = "/org-staff/dashboard";
      }

      const destination = from !== "/dashboard" ? from : roleRedirect;
      navigate(destination, { replace: true });
    } catch (err: any) {
      console.error("[LoginPage] Login error object:", err, {
        code: err.code,
        message: err.message,
        isAxiosError: err.isAxiosError
      });
      if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout') || err.message?.includes('Network Error')) {
        toast.error("The server is still starting up. Please wait a moment and try again.");
      } else {
        toast.error(
          err?.response?.data?.detail ||
          "Sign-in failed. Check your credentials."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans transition-colors duration-300 relative">
      <Helmet>
        <title>Sign In | CoreTAT - Psychological Intelligence</title>
        <meta
          name="description"
          content="Sign in to your CoreTAT clinical dashboard."
        />
      </Helmet>

      <LandingNavbar />



      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
      </div>

      <main className="min-h-[100dvh] flex-1 flex relative z-10">

        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-20 lg:py-24">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full max-w-[480px]"
          >
            <Card className="border-primary/10 bg-background/85 backdrop-blur-xl shadow-2xl shadow-primary/5">
              <CardHeader className="space-y-1.5 pb-4">
                <CardTitle className="text-2xl font-extrabold tracking-tight">
                  CoreTAT Demo Access
                </CardTitle>
                <CardDescription className="text-text/60">
                  Instant one-click access to the psychological intelligence test environment
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-5">
                  <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Demo Account</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">Free Tier</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">psyc@example.com</p>
                    <p className="text-xs text-muted-foreground">Individual Psychologist • Rate Limited (No Payment Required)</p>
                  </div>

                  <Button
                    type="button"
                    disabled={isLoading || isDemoLoading}
                    onClick={handleDemoSignIn}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-background font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer"
                  >
                    {isDemoLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Launch One-Click Demo
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Hidden manual credential form (preserved, not deleted) */}
                <form onSubmit={handleLogin} className="space-y-5 hidden" aria-hidden="true">
                  <div className="space-y-2">
                    <Label
                      htmlFor="login-email"
                      className="text-text/80 font-bold text-xs uppercase tracking-wider"
                    >
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="login-password"
                        className="text-text/80 font-bold text-xs uppercase tracking-wider"
                      >
                        Password
                      </Label>
                      <Link
                        to="/auth/forgot-password"
                        className="text-xs text-primary hover:text-primary/80 font-bold transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        autoComplete="current-password"
                        className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 pr-10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text/40 hover:text-text/70 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || isDemoLoading}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-background font-bold text-sm rounded-lg transition-all shadow-lg shadow-primary/20"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Sign In <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Sign up hidden for now */}
                <p className="text-center text-sm text-text/50 mt-6 hidden">
                  Don&apos;t have an account?{" "}
                  <Link
                    to="/sign-up"
                    className="text-primary hover:text-primary/80 font-bold transition-colors"
                  >
                    Sign up
                  </Link>
                </p>
              </CardContent>
            </Card>

            <p className="text-xs text-text/30 mt-6 font-medium text-center">
              Clinical-grade psychological insights, secured and private.
            </p>
          </motion.div>
        </div>

        <div
          className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden p-6"
          aria-hidden="true"
        >

          <div className="absolute inset-4 flex items-center justify-center overflow-hidden">

            <div
              className="absolute top-0 bottom-0 right-0 w-[65%] z-10 pointer-events-none"
              style={{
                maskImage: 'radial-gradient(ellipse at 70% 50%, white 10%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(ellipse at 70% 50%, white 10%, transparent 70%)'
              }}
            >
              <DotPattern
                width={20}
                height={20}
                cx={1}
                cy={1}
                cr={1}
                className="absolute inset-0 opacity-100 dark:opacity-80 text-black/40 dark:text-primary/50"
              />
            </div>

            <div className="relative w-full max-w-xl xl:max-w-[650px] flex items-center justify-center">

              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                <div className="w-[450px] h-[450px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(206,17,38,0.22)_0%,rgba(255,56,77,0.08)_40%,transparent_70%)] blur-3xl pointer-events-none" />
              </div>

              <picture className="w-full flex items-center justify-center relative z-20">
                <source srcSet="/neural_laptop_animation.webp" type="image/webp" />
                <img
                  src="/neural_laptop_animation.gif"
                  alt="CoreTAT Neural Platform"
                  className="w-full object-contain pointer-events-none select-none"
                />
              </picture>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
