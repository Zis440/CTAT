import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Loader2, User, Building2, CheckCircle2, XCircle, ExternalLink, ShieldCheck, CreditCard, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { registerIndividual, registerClinic, registerOrganization } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { getApiBaseUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { sendOTP, verifyOTP, verifyPhoneWithBackend } from "@/lib/phoneOtp";
import { verifyBankAccount } from "@/services/signupVerifyService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LandingNavbar } from "../landing/components/LandingNavbar";
import { Footer } from "../landing/components/FooterSection";

type AccountTypeOption = "individual" | "clinic" | "organization";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  show: boolean;
  onToggle: () => void;
}

function PasswordInput({
  id, value, onChange, placeholder = "••••••••", show, onToggle,
}: PasswordInputProps) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={8}
        className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 pr-10 transition-all"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text/40 hover:text-text/70 transition-colors"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-text/80 font-bold text-xs uppercase tracking-wider"
    >
      {children}
    </Label>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s: { setAuth: any; }) => s.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accountType, setAccountType] = useState<AccountTypeOption>("individual");

  const [indDesignation, setIndDesignation] = useState("");
  const [indFirstName, setIndFirstName] = useState("");
  const [indLastName, setIndLastName] = useState("");
  const [indEmail, setIndEmail] = useState("");
  const [indPassword, setIndPassword] = useState("");
  const [indConfirm, setIndConfirm] = useState("");
  const [indRci, setIndRci] = useState("");
  const [indNoRci, setIndNoRci] = useState(false);
  const [rciVerifying, setRciVerifying] = useState(false);
  const [rciVerified, setRciVerified] = useState<{ verified: boolean; practitioner_name?: string | null; message?: string; name_match?: boolean; phone_match?: boolean; address_match?: boolean; } | null>(null);
  const [indPhone, setIndPhone] = useState("");
  const [indDob, setIndDob] = useState<Date | undefined>(undefined);
  const [indGender, setIndGender] = useState("");
  const [indProfessionalDomain, setIndProfessionalDomain] = useState("");

  useEffect(() => {
    if (indProfessionalDomain === "Clinical Psychologist" && indNoRci) {
      setIndNoRci(false);
    }
  }, [indProfessionalDomain, indNoRci]);

  const [clinicDesignation, setClinicDesignation] = useState("");
  const [clinicFirstName, setClinicFirstName] = useState("");
  const [clinicLastName, setClinicLastName] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [clinicPassword, setClinicPassword] = useState("");
  const [clinicConfirm, setClinicConfirm] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicType, setClinicType] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicDob, setClinicDob] = useState<Date | undefined>(undefined);
  const [clinicGender, setClinicGender] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [aiDisclaimerAccepted, setAiDisclaimerAccepted] = useState(false);
  const [refundAccepted, setRefundAccepted] = useState(false);
  const [professionalResponsibilityAccepted, setProfessionalResponsibilityAccepted] = useState(false);

  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  const resetOtpState = useCallback(() => {
    setOtpSent(false);
    setOtpCode("");
    setOtpVerified(false);
    setOtpToken(null);
    setOtpError(null);
  }, []);

  const handleSendOTP = async () => {
    const phone = accountType === "individual" ? indPhone : clinicPhone;
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    setOtpSending(true);
    setOtpError(null);
    try {
      await sendOTP(phone, "recaptcha-container");
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success("OTP sent to your phone!");
    } catch (err: any) {
      setOtpError(err.message || "Failed to send OTP.");
      toast.error(err.message || "Failed to send OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const token = await verifyOTP(otpCode);

      const phone = accountType === "individual" ? indPhone : clinicPhone;
      await verifyPhoneWithBackend(token, phone);
      setOtpToken(token);
      setOtpVerified(true);
      toast.success("Phone number verified successfully!");
    } catch (err: any) {
      setOtpError(err.message || "OTP verification failed.");
      toast.error(err.message || "OTP verification failed.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const [indAddress, setIndAddress] = useState("");

  const [clinicBankAccount, setClinicBankAccount] = useState("");
  const [clinicIfsc, setClinicIfsc] = useState("");
  const [bankVerifying, setBankVerifying] = useState(false);
  const [bankVerified, setBankVerified] = useState(false);
  const [bankHolderName, setBankHolderName] = useState<string | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);

  const [clinicPan, setClinicPan] = useState("");
  const [panVerifying, setPanVerifying] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [panError, setPanError] = useState<string | null>(null);
  const [needsPanFallback, setNeedsPanFallback] = useState(false);

  const handleBankVerify = async () => {
    if (!clinicBankAccount || !clinicIfsc || !clinicName) {
      toast.error("Please fill in bank account, IFSC, and clinic name.");
      return;
    }
    setBankVerifying(true);
    setBankError(null);
    try {
      const result = await verifyBankAccount({
        account_number: clinicBankAccount,
        ifsc_code: clinicIfsc.trim().toUpperCase(),
        beneficiary_name: clinicName,
      });
      if (result.verified) {
        setBankVerified(true);
        setBankHolderName(result.account_holder_name || null);
        setNeedsPanFallback(false);
        toast.success("Bank account verified successfully!");
      } else {
        setBankError(result.message || "Bank verification failed.");
        setNeedsPanFallback(true);
        toast.error(result.message || "Bank verification failed. Please verify using PAN.");
      }
    } catch (err: any) {
      setBankError(err?.response?.data?.detail || "Bank verification failed.");
      setNeedsPanFallback(true);
      toast.error("Bank verification failed. Please verify using PAN.");
    } finally {
      setBankVerifying(false);
    }
  };

  const handlePanVerify = async () => {
    if (!clinicPan || clinicPan.length !== 10) {
      toast.error("Please enter a valid 10-character PAN number.");
      return;
    }
    setPanVerifying(true);
    setPanError(null);
    try {
      const { verifyPAN } = await import("@/services/signupVerifyService");
      const result = await verifyPAN({
        pan_number: clinicPan.toUpperCase(),
        expected_name: clinicName,
      });
      if (result.verified) {
        setPanVerified(true);
        toast.success("PAN verified successfully!");
      } else {
        setPanError(result.message || "PAN verification failed.");
        toast.error(result.message || "PAN verification failed.");
      }
    } catch (err: any) {
      setPanError(err?.response?.data?.detail || "PAN verification failed.");
      toast.error("PAN verification failed.");
    } finally {
      setPanVerifying(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const pw = accountType === "individual" ? indPassword : clinicPassword;
    const confirm = accountType === "individual" ? indConfirm : clinicConfirm;

    if (pw !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (accountType === "individual" && !indNoRci) {
      if (!indRci || !indRci.trim()) {
        toast.error("RCI Registration No. is required.");
        return;
      }
      const rciPattern = /^A\d{5,6}$/i;
      if (!rciPattern.test(indRci.trim())) {
        toast.error("Invalid RCI format. Must be 'A' followed by 5 or 6 digits (e.g. A123456).");
        return;
      }
    }

    if (!otpVerified || !otpToken) {
      toast.error("Please verify your phone number via OTP before registering.");
      return;
    }

    if (!termsAccepted || !aiDisclaimerAccepted || !refundAccepted || !professionalResponsibilityAccepted) {
      toast.error("You must agree to all terms, policies, and agreements to create an account.");
      return;
    }

    setIsLoading(true);
    try {
      let res;
      if (accountType === "individual") {
        res = await registerIndividual({
          first_name: `${indDesignation} ${indFirstName}`.trim(),
          last_name: indLastName || undefined,
          email: indEmail,
          password: indPassword,
          phone: indPhone,
          phone_otp_token: otpToken,
          professional_domain: indProfessionalDomain || undefined,
          rci_number: indNoRci ? undefined : indRci.trim().toUpperCase() || undefined,
          specialization: undefined,
          date_of_birth: indDob ? new Date(indDob.getTime() - indDob.getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined,
          gender: indGender || undefined,
          address: indAddress || undefined,
          terms_accepted: termsAccepted,
          ai_disclaimer_accepted: aiDisclaimerAccepted,
          refund_policy_accepted: refundAccepted,
          professional_responsibility_accepted: professionalResponsibilityAccepted,
        });
      } else if (accountType === "organization") {
        res = await registerOrganization({
          first_name: `${clinicDesignation} ${clinicFirstName}`.trim(),
          last_name: clinicLastName || undefined,
          email: clinicEmail,
          password: clinicPassword,
          phone: clinicPhone,
          phone_otp_token: otpToken,
          org_name: clinicName,
          org_type: clinicType || undefined,
          address: clinicAddress || undefined,

          date_of_birth: clinicDob ? new Date(clinicDob.getTime() - clinicDob.getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined,
          gender: clinicGender || undefined,
          company_pan: clinicPan.trim().toUpperCase() || undefined,
          pan_verified: panVerified || undefined,
          terms_accepted: termsAccepted,
          ai_disclaimer_accepted: aiDisclaimerAccepted,
          refund_policy_accepted: refundAccepted,
          professional_responsibility_accepted: professionalResponsibilityAccepted,
        });
      } else {
        res = await registerClinic({
          first_name: `${clinicDesignation} ${clinicFirstName}`.trim(),
          last_name: clinicLastName || undefined,
          email: clinicEmail,
          password: clinicPassword,
          phone: clinicPhone,
          phone_otp_token: otpToken,
          clinic_name: clinicName,
          clinic_type: clinicType || undefined,
          address: clinicAddress || undefined,
          date_of_birth: clinicDob ? new Date(clinicDob.getTime() - clinicDob.getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined,
          gender: clinicGender || undefined,

          bank_account_number: clinicBankAccount || undefined,
          bank_ifsc_code: clinicIfsc.trim().toUpperCase() || undefined,
          bank_verified: bankVerified || undefined,
          company_pan: clinicPan.trim().toUpperCase() || undefined,
          pan_verified: panVerified || undefined,
          terms_accepted: termsAccepted,
          ai_disclaimer_accepted: aiDisclaimerAccepted,
          refund_policy_accepted: refundAccepted,
          professional_responsibility_accepted: professionalResponsibilityAccepted,
        });
      }
      setAuth(res.access_token, res.user);
      toast.success("Account created!");
      navigate("/verification");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail || "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans transition-colors duration-300 relative">
      <Helmet>
        <title>Create Account | PsyicHub - Psychological Intelligence</title>
        <meta
          name="description"
          content="Create your Psyichub account as an Individual Psychologist or Clinic."
        />
      </Helmet>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
      </div>

      <LandingNavbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-[640px]"
        >
          <Card className="border-primary/10 bg-background/85 backdrop-blur-xl shadow-2xl shadow-primary/5">
            <CardHeader className="text-center space-y-2 pb-2">
              <CardTitle className="text-2xl font-extrabold tracking-tight">
                Create an account
              </CardTitle>
              <CardDescription className="text-text/60">
                Get started with clinical-grade psychological analysis
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-2">

              <div className="grid grid-cols-3 gap-3 mb-6">
                {(["individual", "clinic", "organization"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 cursor-pointer",
                      accountType === type
                        ? "border-2 border-primary bg-primary/10 text-primary"
                        : "border border-border hover:border-primary/40 text-muted-foreground"
                    )}
                  >
                    {type === "individual" ? (
                      <User className="h-6 w-6" />
                    ) : type === "clinic" ? (
                      <Building2 className="h-6 w-6" />
                    ) : (
                      <Building2 className="h-6 w-6" />
                    )}
                    <div className="text-center">
                      <p className="font-bold text-sm">
                        {type === "individual" ? "Individual" : type === "clinic" ? "Clinic" : "Organization"}
                      </p>
                      <p className="text-xs opacity-70 leading-tight mt-0.5">
                        {type === "individual"
                          ? "Solo psychologist"
                          : type === "clinic"
                            ? "Institution / Hospital"
                            : "Corporate / Business"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <AnimatePresence mode="wait">
                  {accountType === "individual" ? (
                    <motion.div
                      key="individual"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="ind-professional-domain">Professional Domain *</FieldLabel>
                          <Select value={indProfessionalDomain} onValueChange={setIndProfessionalDomain} required>
                            <SelectTrigger id="ind-professional-domain" className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all data-[placeholder]:text-muted-foreground">
                              <SelectValue placeholder="Select your professional domain" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Clinical Psychologist">Clinical Psychologist</SelectItem>
                              <SelectItem value="Counseling Psychologist">Counseling Psychologist</SelectItem>
                              <SelectItem value="Therapist">Therapist</SelectItem>
                              <SelectItem value="Psychotherapist">Psychotherapist</SelectItem>
                              <SelectItem value="Psychiatrist">Psychiatrist</SelectItem>
                              <SelectItem value="School Counselor">School Counselor</SelectItem>
                              <SelectItem value="Student / Trainee">Student / Trainee</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="ind-designation">Full Name</FieldLabel>
                          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                            <div className="sm:col-span-1">
                              <Select value={indDesignation} onValueChange={setIndDesignation} required>
                                <SelectTrigger id="ind-designation" className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all data-[placeholder]:text-muted-foreground">
                                  <SelectValue placeholder="Title" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Dr.">Dr.</SelectItem>
                                  <SelectItem value="Mr.">Mr.</SelectItem>
                                  <SelectItem value="Mrs.">Mrs.</SelectItem>
                                  <SelectItem value="Ms.">Ms.</SelectItem>
                                  <SelectItem value="Prof.">Prof.</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="sm:col-span-2">
                              <Input id="ind-first-name" placeholder="First Name" value={indFirstName} onChange={(e) => setIndFirstName(e.target.value)} required className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all" />
                            </div>
                            <div className="sm:col-span-3">
                              <Input id="ind-last-name" placeholder="Last Name" value={indLastName} onChange={(e) => setIndLastName(e.target.value)} required className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="ind-email">Email</FieldLabel>
                          <Input
                            id="ind-email"
                            type="email"
                            placeholder="name@example.com"
                            value={indEmail}
                            onChange={(e) => setIndEmail(e.target.value)}
                            required
                            className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all"
                          />
                        </div>

                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="ind-address">
                            Address
                          </FieldLabel>
                          <Input
                            id="ind-address"
                            placeholder="Your registered address"
                            value={indAddress}
                            onChange={(e) => setIndAddress(e.target.value)}
                            className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <FieldLabel htmlFor="ind-phone">
                            Phone <span className="text-red-500">*</span>
                          </FieldLabel>
                          <div className="flex gap-2">
                            <Input
                              id="ind-phone"
                              type="tel"
                              placeholder="98XXXXX321"
                              value={indPhone}
                              onChange={(e) => { setIndPhone(e.target.value); resetOtpState(); }}
                              disabled={otpVerified}
                              required
                              className={cn(
                                "h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all",
                                otpVerified && "border-green-500/50 bg-green-500/5"
                              )}
                            />
                            {!otpVerified && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={otpSending || !indPhone || indPhone.length < 10 || otpCountdown > 0}
                                className="h-11 px-4 whitespace-nowrap"
                                onClick={handleSendOTP}
                              >
                                {otpSending ? <Loader2 className="h-4 w-4 animate-spin" /> : otpCountdown > 0 ? `Resend (${otpCountdown}s)` : otpSent ? 'Resend OTP' : 'Send OTP'}
                              </Button>
                            )}
                          </div>

                          {otpVerified && (
                            <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold mt-1">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Phone verified via OTP</span>
                            </div>
                          )}

                          {otpSent && !otpVerified && (
                            <div className="mt-2 space-y-2">
                              <div className="flex gap-2">
                                <Input
                                  id="ind-otp"
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Enter 6-digit OTP"
                                  value={otpCode}
                                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  maxLength={6}
                                  className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all font-mono text-center tracking-[0.3em] text-lg"
                                />
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  disabled={otpVerifying || otpCode.length !== 6}
                                  className="h-11 px-4 whitespace-nowrap"
                                  onClick={handleVerifyOTP}
                                >
                                  {otpVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                                </Button>
                              </div>
                              {otpError && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                  <XCircle className="h-3 w-3" /> {otpError}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                A 6-digit code has been sent to your phone. Enter it above to verify.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <FieldLabel htmlFor="ind-rci">
                            RCI Registration No. {(!indNoRci || indProfessionalDomain === "Clinical Psychologist") && <span className="text-red-500">*</span>}
                          </FieldLabel>
                          <div className="flex gap-2">
                            <Input
                              id="ind-rci"
                              placeholder="A123456"
                              value={indRci}
                              onChange={(e) => { setIndRci(e.target.value.toUpperCase()); setRciVerified(null); }}
                              disabled={indNoRci}
                              required={!indNoRci}
                              maxLength={7}
                              className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all font-mono"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={indNoRci || rciVerifying || !/^A\d{5,6}$/i.test(indRci.trim())}
                              className="h-11 px-3 whitespace-nowrap"
                              onClick={async () => {
                                setRciVerifying(true);
                                try {
                                  const fullName = `${indDesignation} ${indFirstName} ${indLastName}`.trim();
                                  const resp = await fetch(`${getApiBaseUrl()}/verify-rci`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      rci_number: indRci.trim().toUpperCase(),
                                      user_name: fullName,
                                      user_phone: indPhone,
                                      user_address: indAddress
                                    }),
                                  });
                                  const data = await resp.json();
                                  setRciVerified(data);
                                  if (data.verified) toast.success('RCI Number Verified Successfully!');
                                  else toast.error(data.message || 'RCI number not found.');
                                } catch { toast.error('Failed to verify RCI number.'); setRciVerified(null); }
                                finally { setRciVerifying(false); }
                              }}
                            >
                              {rciVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                            </Button>
                          </div>
                          {rciVerified && (
                            <div className={cn("flex flex-col gap-1 text-xs mt-1.5", rciVerified.verified ? "text-green-600" : "text-red-500")}>
                              {rciVerified.verified ? (
                                <>
                                  <div className="flex items-center gap-1.5 font-semibold">
                                    <span>Verified</span>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="whitespace-pre-wrap leading-relaxed">{rciVerified.practitioner_name || 'Valid'}</span>
                                  <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20 text-green-700">
                                    <p className="font-semibold mb-1">Details Match:</p>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="flex items-center gap-1">Name: {rciVerified.name_match ? "✅" : "❌"}</span>
                                      <span className="flex items-center gap-1">Phone: {rciVerified.phone_match ? "✅" : "❌"}</span>
                                      <span className="flex items-center gap-1">Address: {rciVerified.address_match ? "✅" : "❌"}</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-start gap-1.5">
                                  <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                  <span className="whitespace-pre-wrap leading-relaxed">{rciVerified.message}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <a
                            href="https://rciregistration.nic.in/rehabcouncil/newsearch_modify.jsp"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary hover:underline mt-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Verify on RCI website
                          </a>
                          {indProfessionalDomain !== "Clinical Psychologist" && (
                            <label className="flex flex-col items-start gap-0 text-xs text-muted-foreground mt-2 cursor-pointer">
                              <span className="flex items-center gap-2">
                                <input type="checkbox" checked={indNoRci} onChange={(e) => { setIndNoRci(e.target.checked); if (e.target.checked) { setIndRci(''); setRciVerified(null); } }} className="rounded border-primary/30" />
                                I don't have an RCI number
                              </span>
                              <span className="ml-6 text-[11px] text-muted-foreground/80 mt-0.5">
                                (Undergraduate / Student)
                              </span>
                            </label>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 col-span-2">

                          <div className="space-y-2">
                            <FieldLabel htmlFor="ind-dob">
                              Date of Birth <span className="text-muted-foreground normal-case">(optional)</span>
                            </FieldLabel>
                            <Input
                              id="ind-dob"
                              type="date"
                              value={indDob ? indDob.toISOString().split('T')[0] : ''}
                              onChange={(e) => setIndDob(e.target.value ? new Date(e.target.value) : undefined)}
                              max={new Date().toISOString().split('T')[0]}
                              className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all text-muted-foreground data-[state=filled]:text-foreground [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                            />
                          </div>

                          <div className="space-y-2">
                            <FieldLabel htmlFor="ind-gender">
                              Gender <span className="text-muted-foreground normal-case">(optional)</span>
                            </FieldLabel>
                            <Select value={indGender} onValueChange={setIndGender}>
                              <SelectTrigger className="w-full h-11 bg-background/50 border-primary/20 hover:border-primary/30 transition-all data-[placeholder]:text-muted-foreground">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent className="border-primary/10">
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="ind-password">Password</FieldLabel>
                          <PasswordInput
                            id="ind-password"
                            value={indPassword}
                            onChange={setIndPassword}
                            show={showPassword}
                            onToggle={() => setShowPassword((p) => !p)}
                            placeholder="Enter password"
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="ind-confirm">
                            Confirm Password
                          </FieldLabel>
                          <PasswordInput
                            id="ind-confirm"
                            value={indConfirm}
                            onChange={setIndConfirm}
                            show={showConfirm}
                            onToggle={() => setShowConfirm((p) => !p)}
                            placeholder="Re-enter password"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="clinic-org"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="clinic-name">
                            {accountType === "clinic" ? "Clinic / Hospital Name" : "Organization Name"}
                          </FieldLabel>
                          <Input
                            id="clinic-name"
                            placeholder={accountType === "clinic" ? "e.g., Manasa Neuropsychiatry Clinic" : "e.g., TechCorp Solutions"}
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                            required
                            className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all"
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="clinic-designation">Contact Person</FieldLabel>
                          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                            <div className="sm:col-span-1">
                              <Select value={clinicDesignation} onValueChange={setClinicDesignation} required>
                                <SelectTrigger id="clinic-designation" className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all data-[placeholder]:text-muted-foreground">
                                  <SelectValue placeholder="Title" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Dr.">Dr.</SelectItem>
                                  <SelectItem value="Mr.">Mr.</SelectItem>
                                  <SelectItem value="Mrs.">Mrs.</SelectItem>
                                  <SelectItem value="Ms.">Ms.</SelectItem>
                                  <SelectItem value="Prof.">Prof.</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="sm:col-span-2">
                              <Input id="clinic-first-name" placeholder="First Name" value={clinicFirstName} onChange={(e) => setClinicFirstName(e.target.value)} required className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all" />
                            </div>
                            <div className="sm:col-span-3">
                              <Input id="clinic-last-name" placeholder="Last Name" value={clinicLastName} onChange={(e) => setClinicLastName(e.target.value)} required className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="clinic-phone">
                            Phone <span className="text-red-500">*</span> <span className="text-muted-foreground normal-case">(OTP Verification Required)</span>
                          </FieldLabel>
                          <div className="flex gap-2">
                            <Input
                              id="clinic-phone"
                              type="tel"
                              placeholder="98XXXXX321"
                              value={clinicPhone}
                              onChange={(e) => { setClinicPhone(e.target.value); resetOtpState(); }}
                              disabled={otpVerified}
                              required
                              className={cn(
                                "h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all",
                                otpVerified && "border-green-500/50 bg-green-500/5"
                              )}
                            />
                            {!otpVerified && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={otpSending || !clinicPhone || clinicPhone.length < 10 || otpCountdown > 0}
                                className="h-11 px-4 whitespace-nowrap"
                                onClick={handleSendOTP}
                              >
                                {otpSending ? <Loader2 className="h-4 w-4 animate-spin" /> : otpCountdown > 0 ? `Resend (${otpCountdown}s)` : otpSent ? 'Resend OTP' : 'Send OTP'}
                              </Button>
                            )}
                          </div>

                          {otpVerified && (
                            <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold mt-1">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Phone verified via OTP</span>
                            </div>
                          )}

                          {otpSent && !otpVerified && (
                            <div className="mt-2 space-y-2">
                              <div className="flex gap-2">
                                <Input
                                  id="clinic-otp"
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Enter 6-digit OTP"
                                  value={otpCode}
                                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  maxLength={6}
                                  className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all font-mono text-center tracking-[0.3em] text-lg"
                                />
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  disabled={otpVerifying || otpCode.length !== 6}
                                  className="h-11 px-4 whitespace-nowrap"
                                  onClick={handleVerifyOTP}
                                >
                                  {otpVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                                </Button>
                              </div>
                              {otpError && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                  <XCircle className="h-3 w-3" /> {otpError}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                A 6-digit code has been sent to your phone. Enter it above to verify.
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="clinic-email">Email</FieldLabel>
                          <Input
                            id="clinic-email"
                            type="email"
                            placeholder="contact@clinicname.com"
                            value={clinicEmail}
                            onChange={(e) => setClinicEmail(e.target.value)}
                            required
                            className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor="clinic-type">
                            {accountType === "clinic" ? "Type of Clinic" : "Type of Organization"}
                          </FieldLabel>
                          <Select
                            value={clinicType}
                            onValueChange={setClinicType}
                            required
                          >
                            <SelectTrigger
                              id="clinic-type"
                              className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all data-[placeholder]:text-muted-foreground"
                            >
                              <SelectValue placeholder={`-- Select ${accountType === "clinic" ? "Clinic" : "Organization"} Type --`} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sole_proprietorship">Proprietorship</SelectItem>
                              <SelectItem value="partnership">Partnership</SelectItem>
                              <SelectItem value="llp">LLP</SelectItem>
                              <SelectItem value="private_limited">Private Limited</SelectItem>
                              <SelectItem value="opc">One Person Company (OPC)</SelectItem>
                              <SelectItem value="public_limited">Public Limited</SelectItem>
                              <SelectItem value="trust">Trust</SelectItem>
                              <SelectItem value="society">Society</SelectItem>
                              <SelectItem value="section_8">Section 8</SelectItem>
                              <SelectItem value="cooperative">Co-operative</SelectItem>
                              <SelectItem value="ngo">NGO / Nonprofit</SelectItem>
                              <SelectItem value="government">Government / Public Clinic</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor="clinic-address">
                            Address
                          </FieldLabel>
                          <Input
                            id="clinic-address"
                            placeholder="e.g., Bengaluru, Karnataka"
                            value={clinicAddress}
                            onChange={(e) => setClinicAddress(e.target.value)}
                            required
                            className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all"
                          />
                        </div>

                        <div className="col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <CreditCard className="h-4 w-4" />
                            Bank Account Verification <span className="text-muted-foreground font-normal">(Optional)</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            To verify your clinic's identity faster, you may provide your bank account details. A ₹1 verification deposit will confirm the account.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <FieldLabel htmlFor="clinic-bank-acc">
                                Account Number <span className="text-muted-foreground font-normal">(Optional)</span>
                              </FieldLabel>
                              <Input
                                id="clinic-bank-acc"
                                type="text"
                                inputMode="numeric"
                                placeholder="1234567890123"
                                value={clinicBankAccount}
                                onChange={(e) => { setClinicBankAccount(e.target.value.replace(/\D/g, "")); setBankVerified(false); setBankError(null); }}
                                disabled={bankVerified}
                                className={cn(
                                  "h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all font-mono",
                                  bankVerified && "border-green-500/50 bg-green-500/5"
                                )}
                              />
                            </div>
                            <div className="space-y-2">
                              <FieldLabel htmlFor="clinic-ifsc">
                                IFSC Code <span className="text-muted-foreground font-normal">(Optional)</span>
                              </FieldLabel>
                              <Input
                                id="clinic-ifsc"
                                type="text"
                                placeholder="SBIN0001234"
                                value={clinicIfsc}
                                onChange={(e) => { setClinicIfsc(e.target.value.toUpperCase()); setBankVerified(false); setBankError(null); }}
                                disabled={bankVerified}
                                maxLength={11}
                                className={cn(
                                  "h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all font-mono",
                                  bankVerified && "border-green-500/50 bg-green-500/5"
                                )}
                              />
                            </div>
                          </div>

                          {!bankVerified && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={bankVerifying || !clinicBankAccount || !clinicIfsc || clinicIfsc.length !== 11 || !clinicName}
                              className="h-9"
                              onClick={handleBankVerify}
                            >
                              {bankVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                              Verify Bank Account
                            </Button>
                          )}

                          {bankVerified && (
                            <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Bank verified{bankHolderName ? ` — ${bankHolderName}` : ""}</span>
                            </div>
                          )}

                          {bankError && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> {bankError}
                            </p>
                          )}

                          {needsPanFallback && (
                            <div className="mt-4 pt-4 border-t border-primary/10 space-y-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-orange-500">
                                <AlertTriangle className="h-4 w-4" />
                                Alternate Verification Required
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Since we couldn't verify your bank account, please provide your clinic or company PAN.
                              </p>
                              <div className="flex gap-2 items-end">
                                <div className="space-y-2 flex-1">
                                  <FieldLabel htmlFor="clinic-pan">
                                    PAN Number
                                  </FieldLabel>
                                  <Input
                                    id="clinic-pan"
                                    type="text"
                                    placeholder="ABCDE1234F"
                                    value={clinicPan}
                                    onChange={(e) => { setClinicPan(e.target.value.toUpperCase()); setPanVerified(false); setPanError(null); }}
                                    disabled={panVerified}
                                    maxLength={10}
                                    className={cn(
                                      "h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all font-mono",
                                      panVerified && "border-green-500/50 bg-green-500/5"
                                    )}
                                  />
                                </div>
                                {!panVerified && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={panVerifying || clinicPan.length !== 10 || !clinicName}
                                    className="h-11 mb-0"
                                    onClick={handlePanVerify}
                                  >
                                    {panVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                    Verify PAN
                                  </Button>
                                )}
                              </div>

                              {panVerified && (
                                <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold mt-2">
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  <span>PAN verified successfully</span>
                                </div>
                              )}

                              {panError && (
                                <p className="text-xs text-red-500 flex items-center gap-1 mt-2">
                                  <XCircle className="h-3 w-3" /> {panError}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 col-span-2">

                          <div className="space-y-2">
                            <FieldLabel htmlFor="clinic-dob">
                              Date of Birth <span className="text-muted-foreground normal-case">(optional)</span>
                            </FieldLabel>
                            <Input
                              id="clinic-dob"
                              type="date"
                              value={clinicDob ? clinicDob.toISOString().split('T')[0] : ''}
                              onChange={(e) => setClinicDob(e.target.value ? new Date(e.target.value) : undefined)}
                              max={new Date().toISOString().split('T')[0]}
                              className="h-11 bg-background/50 border border-primary/20 focus:border-2 focus:border-primary/50 focus-visible:ring-0 transition-all text-muted-foreground data-[state=filled]:text-foreground [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                            />
                          </div>

                          <div className="space-y-2">
                            <FieldLabel htmlFor="clinic-gender">
                              Gender <span className="text-muted-foreground normal-case">(optional)</span>
                            </FieldLabel>
                            <Select value={clinicGender} onValueChange={setClinicGender}>
                              <SelectTrigger className="w-full h-11 bg-background/50 border-primary/20 hover:border-primary/30 transition-all data-[placeholder]:text-muted-foreground">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent className="border-primary/10">
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="clinic-password">
                            Password
                          </FieldLabel>
                          <PasswordInput
                            id="clinic-password"
                            value={clinicPassword}
                            onChange={setClinicPassword}
                            show={showPassword}
                            onToggle={() => setShowPassword((p) => !p)}
                            placeholder="Enter password"
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <FieldLabel htmlFor="clinic-confirm">
                            Confirm Password
                          </FieldLabel>
                          <PasswordInput
                            id="clinic-confirm"
                            value={clinicConfirm}
                            onChange={setClinicConfirm}
                            show={showConfirm}
                            onToggle={() => setShowConfirm((p) => !p)}
                            placeholder="Re-enter password"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3 mt-4">

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary/50 accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-text/50 leading-relaxed group-hover:text-text/70 transition-colors">
                      I agree to the{" "}
                      <a
                        href="https://psyichub.com/terms-conditions/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 font-bold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Terms and Conditions
                      </a>{" "}
                      and{" "}
                      <a
                        href="https://psyichub.com/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 font-bold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Privacy Policy
                      </a>
                      . <span className="text-red-500">*</span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={aiDisclaimerAccepted}
                      onChange={(e) => setAiDisclaimerAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary/50 accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-text/50 leading-relaxed group-hover:text-text/70 transition-colors">
                      I agree to the{" "}
                      <a
                        href="#"
                        className="text-primary hover:text-primary/80 font-bold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        AI & Professional Disclaimer
                      </a>
                      . <span className="text-red-500">*</span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={refundAccepted}
                      onChange={(e) => setRefundAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary/50 accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-text/50 leading-relaxed group-hover:text-text/70 transition-colors">
                      I agree to the{" "}
                      <a
                        href="#"
                        className="text-primary hover:text-primary/80 font-bold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Refund & Cancellation Policy
                      </a>
                      . <span className="text-red-500">*</span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={professionalResponsibilityAccepted}
                      onChange={(e) => setProfessionalResponsibilityAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary/50 accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-text/50 leading-relaxed group-hover:text-text/70 transition-colors">
                      I agree to the{" "}
                      <a
                        href="#"
                        className="text-primary hover:text-primary/80 font-bold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Professional Responsibility Agreement
                      </a>
                      . <span className="text-red-500">*</span>
                    </span>
                  </label>
                </div>

                <div id="recaptcha-container"></div>

                <Button
                  type="submit"
                  disabled={isLoading || !otpVerified || !termsAccepted || !aiDisclaimerAccepted || !refundAccepted || !professionalResponsibilityAccepted}
                  className={cn(
                    "w-full h-11 bg-primary hover:bg-primary/90 text-background font-bold text-sm rounded-lg transition-all shadow-lg shadow-primary/20",
                    (!otpVerified || !termsAccepted || !aiDisclaimerAccepted || !refundAccepted || !professionalResponsibilityAccepted) && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {otpVerified ? 'Create Account' : 'Verify Phone to Continue'} <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                {!otpVerified && (
                  <p className="text-xs text-amber-600/80 text-center mt-1">
                    Phone verification via OTP is required for security.
                  </p>
                )}

              </form>

              <p className="text-center text-sm text-text/50 mt-6">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:text-primary/80 font-bold transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-text/30 mt-6 font-medium">
            Clinical-grade psychological insights, secured and private.
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
