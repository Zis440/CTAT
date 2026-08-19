import { useState } from "react";
import { useNavigate, Link, useLocation, Navigate } from "react-router-dom";
import { useTheme } from "@/app/providers";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
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
import { Backlight } from "@/components/ui/backlight";

import { login } from "@/services/authService";
import { useAuthStore, useAuthHydrated } from "@/store/useAuthStore";
import { BrainAnalysisUI } from "./components/BrainAnalysisUI";

export function LoginPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();

  const queryRedirect = new URLSearchParams(location.search).get("redirect");
  const from = queryRedirect || (location.state as any)?.from?.pathname || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
        <title>Sign In | PsyicHub - Psychological Intelligence</title>
        <meta
          name="description"
          content="Sign in to your Psyichub clinical dashboard."
        />
      </Helmet>

      <LandingNavbar />

      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <filter id="tint-light" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />

            <feColorMatrix type="matrix" values="
              0.365 0 0 0 0
              0 0.427 0 0 0
              0 0 0.110 0 0
              0 0 0 1 0
            " />
          </filter>
        </defs>
      </svg>

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
                  Welcome back
                </CardTitle>
                <CardDescription className="text-text/60">
                  Sign in to access your dashboard
                </CardDescription>
              </CardHeader>

              <CardContent>

                <form onSubmit={handleLogin} className="space-y-5">

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
                      required
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
                        required
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
                    disabled={isLoading}
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

                <p className="text-center text-sm text-text/50 mt-6">
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
          className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden p-4"
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

              <div className="absolute inset-0 z-15 pointer-events-none flex items-center justify-center">
                <Backlight className="w-full h-full absolute inset-0" blur={40}>
                  <div className="w-full h-full" style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent 65%, black 85%, transparent 100%)', maskImage: 'linear-gradient(to bottom, transparent 65%, black 85%, transparent 100%)' }}>
                    <img src="/login-art.png" alt="" className="w-full object-contain opacity-80" style={theme === 'light' ? { filter: 'url(#tint-light)' } : undefined} />
                  </div>
                </Backlight>
              </div>

              <img
                src="/login-art.png"
                alt="Login Art"
                className="w-full object-contain relative z-20 pointer-events-none"
                style={{
                  maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                  ...(theme === 'light' ? { filter: 'url(#tint-light)' } : {})
                }}
              />

              <div className="absolute inset-0 z-30 pointer-events-none">
                <BrainAnalysisUI />
              </div>

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
