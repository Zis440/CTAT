import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail, CheckCircle2, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { forgotPassword } from "@/services/authService";
import { useTheme } from "@/app/providers";

export function ForgotPasswordPage() {
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background font-sans px-4 py-12 relative">
      <Helmet>
        <title>Forgot Password | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-text hover:bg-primary/10 dark:hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
        >
          {theme === "dark" ? (
            <Moon className="h-5 w-5 text-accent" />
          ) : (
            <Sun className="h-5 w-5 text-accent" />
          )}
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-primary hover:bg-primary/10 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-border/50 shadow-sm transition-colors font-bold mb-6 w-max"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <Card className="border-primary/10 bg-background/85 backdrop-blur-xl shadow-2xl shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              {submitted ? "Check your inbox" : "Reset your password"}
            </CardTitle>
            <CardDescription className="text-text/60">
              {submitted
                ? `We've sent a reset link to ${email}`
                : "Enter your registered email address and we'll send you a reset link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-text/60 text-center leading-relaxed">
                  If this email is associated with a Psyichub account, you'll
                  receive a reset link within a few minutes. Check your spam folder
                  if you don't see it.
                </p>
                <Button variant="outline" className="mt-2 border-primary/15" asChild>
                  <Link to="/login">Return to Login</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="reset-email"
                    className="text-text/80 font-bold text-xs uppercase tracking-wider"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text/30" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 pl-9 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-background font-bold text-sm rounded-lg shadow-lg shadow-primary/20 transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
