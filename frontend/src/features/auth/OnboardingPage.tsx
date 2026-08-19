import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { LandingNavbar } from "../landing/components/LandingNavbar";
import { apiClient } from "@/services/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Footer } from "../landing/components/FooterSection";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
export function OnboardingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [gender, setGender] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { user } = useAuthStore();

  const getDashboardRoute = () => {
    if (!user) return "/dashboard";
    if (user.role === "super_admin") return "/admin";
    if (user.role === "clinic_admin") return "/clinic/dashboard";
    if (user.role === "clinic_staff") return "/clinic-staff/dashboard";
    if (user.role === "org_admin") return "/org/dashboard";
    if (user.role === "org_staff") return "/org-staff/dashboard";
    return "/dashboard";
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateOfBirth || !gender) return;

    setIsLoading(true);
    try {
      // YYYY-MM-DD format
      const dateStr = dateOfBirth.toISOString().split("T")[0];
      await apiClient.patch("/api/auth/me", {
        date_of_birth: dateStr,
        gender: gender,
      });
      toast.success("Profile completed successfully");
      navigate(getDashboardRoute());
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = dateOfBirth && gender;

  return (
    <div className="flex flex-col min-h-screen bg-background text-text font-sans selection:bg-primary selection:text-background transition-colors duration-300">
      <Helmet>
        <title>Onboarding | PsyicHub - Psychological Intelligence</title>
      </Helmet>
      <LandingNavbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 -left-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 -right-24 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[480px] relative z-10"
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
            <CardHeader className="text-center space-y-3 pb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2"
              >
                <Sparkles className="h-7 w-7 text-primary" />
              </motion.div>

              <CardTitle className="text-2xl font-extrabold text-text tracking-tight">
                Complete Your Profile
              </CardTitle>
              <CardDescription className="text-text/60 max-w-sm mx-auto">
                We need a few more details to personalize your clinical
                experience and ensure accurate assessment interpretations.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date of Birth */}
                <div className="space-y-2.5">
                  <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                    Date of Birth
                  </Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal bg-background/50 border-primary/15 hover:border-primary/30 hover:bg-background/70 transition-all",
                          !dateOfBirth && "text-text/40"
                        )}
                      >
                        <CalendarIcon className="mr-3 h-4 w-4 text-primary/60" />
                        {dateOfBirth ? formatDate(dateOfBirth) : "Select your date of birth"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-primary/10" align="start">
                      <Calendar
                        mode="single"
                        selected={dateOfBirth}
                        onSelect={(date) => {
                          setDateOfBirth(date);
                          setCalendarOpen(false);
                        }}
                        captionLayout="dropdown"
                        startMonth={new Date(1930, 0)}
                        endMonth={new Date()}
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Gender */}
                <div className="space-y-2.5">
                  <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                    Gender
                  </Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger
                      className={cn(
                        "w-full h-12 bg-background/50 border-primary/15 hover:border-primary/30 transition-all",
                        !gender && "text-text/40"
                      )}
                    >
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent className="border-primary/10">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Why we ask */}
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                  <p className="text-xs text-text/50 leading-relaxed">
                    <span className="font-bold text-primary/70">Why do we ask?</span>{" "}
                    Age and gender are used to apply normative calibration to assessment
                    scoring — ensuring interpretations align with developmental and
                    gender-appropriate clinical baselines. Your data remains private.
                  </p>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-background font-bold text-sm rounded-lg transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-40"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue to Dashboard
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>

                {/* Skip link */}
                <p className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate(getDashboardRoute())}
                    className="text-xs text-text/30 hover:text-text/50 font-medium transition-colors"
                  >
                    Skip for now
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-text/30 mt-6 font-medium">
            You can always update these details in{" "}
            <Link to="/settings" className="text-primary/60 hover:text-primary transition-colors">
              Settings
            </Link>
            .
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
