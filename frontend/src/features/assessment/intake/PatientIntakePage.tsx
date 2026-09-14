import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserPlus, UserCheck, Loader2, Search, CalendarIcon, AlertTriangle, Check, Copy, LinkIcon } from "lucide-react";
import { useSessionStore } from "@/store/useSessionStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useWalletStore } from "@/store/useWalletStore";
import { getWalletBalance } from "@/services/walletService";
import { TEST_REGISTRY } from "@/features/assessment/registry";
import { getSessionSetupRoute, getScreeningToolRoute } from "@/lib/routeUtils";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { PaymentConfirmationModal, type PaymentBreakdownItem } from "@/components/PaymentConfirmationModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatRupees } from "@/types/wallet";

interface PatientRecord {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

type PatientType = "new" | "existing" ;

const newPatientSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  phone_number: z.string().min(1, "Phone number is required"),
  date_of_birth: z.date({ message: "Date of birth is required" }),
  gender: z.string().min(1, "Gender is required"),
  background: z.string().optional(),
  environment: z.string().optional(),
  living_condition: z.string().optional(),
  family_structure: z.string().optional(),
  residence_type: z.string().optional(),
  environment_type: z.string().optional(),
  education_level: z.string().optional(),
  occupation: z.string().optional(),
  socioeconomic_status: z.string().optional(),
  notes: z.string().optional(),
});

const existingPatientSchema = z.object({
  patient_id: z.string().min(3, "Enter a valid Patient ID (e.g. PAT_XXXXXXXX)"),
});

const maskPhone = (phone: string | null | undefined) => {
  if (!phone) return "—";
  if (phone.length <= 5) return phone;
  return `${phone.substring(0, 2)}${"*".repeat(phone.length - 5)}${phone.substring(phone.length - 3)}`;
};

const maskEmail = (email: string | null | undefined) => {
  if (!email) return "—";
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [localPart, domain] = parts;
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.substring(0, 2)}${"*".repeat(Math.max(1, localPart.length - 3))}${localPart.substring(localPart.length - 1)}@${domain}`;
};

export function IntakeView() {
  const setPatient = useSessionStore((state) => state.setPatient);
  const testType = useSessionStore((state) => state.testType);
  const requestPsychologistValidation = useSessionStore((state) => state.requestPsychologistValidation);
  const toggleValidation = useSessionStore((state) => state.toggleValidation);
  const activePatientId = useSessionStore((state) => state.activePatientId);
  const { user } = useAuthStore();
  const { setBalance } = useWalletStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<PatientType>("new");
  const [intendedAction, setIntendedAction] = useState<"session" | "link">("session");
  const [assessments, setAssessments] = useState<any[]>([]);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOrgAccount = user?.role === "org_admin" || user?.role === "org_staff";
  const targetLabel = isOrgAccount ? "Candidate" : "Patient";
  const targetLabelLower = isOrgAccount ? "candidate" : "patient";

  const baseOptions: { type: PatientType; label: string; description: string; icon: any }[] = [
    {
      type: "new",
      label: "New",
      description: `Create a full ${targetLabelLower} profile that is saved for future sessions.`,
      icon: UserPlus,
    },
    {
      type: "existing",
      label: `Existing ${targetLabel}`,
      description: `Look up an existing ${targetLabelLower} by ID to run a new test with tracked history.`,
      icon: UserCheck,
    },
  ];

  const PATIENT_OPTIONS = baseOptions;

  useEffect(() => {
    apiClient.get("/assessments").then(res => setAssessments(res.data)).catch(console.error);
  }, []);

  const newForm = useForm<z.infer<typeof newPatientSchema>>({
    resolver: zodResolver(newPatientSchema),
    mode: "onChange",
    defaultValues: { first_name: "", last_name: "", email: "", phone_number: "", date_of_birth: undefined as unknown as Date, gender: "", background: "", environment: "", living_condition: "", family_structure: "", residence_type: "", environment_type: "", education_level: "", occupation: "", socioeconomic_status: "", notes: "" },
  });

  const watchedDob = newForm.watch("date_of_birth");
  const computedAge = watchedDob
    ? Math.floor((Date.now() - new Date(watchedDob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const existingForm = useForm<z.infer<typeof existingPatientSchema>>({
    resolver: zodResolver(existingPatientSchema),
    defaultValues: { patient_id: "" },
  });

  const [allPatients, setAllPatients] = useState<PatientRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isFetchingPatients, setIsFetchingPatients] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<Record<string, any> | null>(null);

  const [ageWarning, setAgeWarning] = useState<{
    show: boolean;
    patientData: any;
    finalAge: number;
    effectiveAge: number;
    message: string;
  } | null>(null);

  const [showScreeningPaymentDialog, setShowScreeningPaymentDialog] = useState(false);
  const [showScreeningShareDialog, setShowScreeningShareDialog] = useState(false);

  useEffect(() => {
    if (selectedType === "existing") {
      setIsFetchingPatients(true);
      apiClient.get("/patients")
        .then(({ data }) => {
          const sorted = [...data].sort((a: PatientRecord, b: PatientRecord) => {
            const nameA = [a.first_name?.trim(), a.last_name?.trim()].filter(Boolean).join(" ").toLowerCase();
            const nameB = [b.first_name?.trim(), b.last_name?.trim()].filter(Boolean).join(" ").toLowerCase();
            return nameA.localeCompare(nameB);
          });
          setAllPatients(sorted);
        })
        .catch(() => toast.error(`Failed to load ${targetLabelLower} list.`))
        .finally(() => setIsFetchingPatients(false));
    }
  }, [selectedType]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredPatients = allPatients.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(" ").toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      name.includes(q) ||
      (p.phone_number ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q)
    );
  });

  const handleSelectPatient = useCallback((p: PatientRecord) => {
    setSelectedPatient(p);
    const name = [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(" ");
    setSearchQuery(name || p.id);
    existingForm.setValue("patient_id", p.id);
    setIsDropdownOpen(false);
  }, [existingForm]);

  const handleSubmit = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {

      const payload = {
        patient_type: selectedType,
        ...values,
        date_of_birth: values.date_of_birth
          ? format(new Date(values.date_of_birth), "yyyy-MM-dd")
          : undefined,
      };
      const { data } = await apiClient.post("/patient/intake", payload);
      queryClient.invalidateQueries({ queryKey: ["patients-list"] });

      let finalAge = data.age ?? undefined;
      let effectiveAge = data.age ?? undefined;

      const testDef = TEST_REGISTRY.find(t => t.slug === testType);
      if (testDef && finalAge !== undefined) {
        if (testDef.minAge !== undefined && finalAge < testDef.minAge) {
          effectiveAge = testDef.minAge;
          setAgeWarning({
            show: true,
            patientData: data,
            finalAge,
            effectiveAge,
            message: `Patient age is ${finalAge}, but the test requires a minimum of ${testDef.minAge}. If you proceed, the age will be considered as ${testDef.minAge} for analysis.`,
          });
          setIsSubmitting(false);
          return;
        } else if (testDef.maxAge !== undefined && finalAge > testDef.maxAge) {
          effectiveAge = testDef.maxAge;
          setAgeWarning({
            show: true,
            patientData: data,
            finalAge,
            effectiveAge,
            message: `Patient age is ${finalAge}, but the test has a maximum limit of ${testDef.maxAge}. If you proceed, the age will be considered as ${testDef.maxAge} for analysis.`,
          });
          setIsSubmitting(false);
          return;
        }
      }

      setPatient({
        id: data.patient_id,
        name: [data.first_name?.trim(), data.last_name?.trim()].filter(Boolean).join(" ") || "Anonymous",
        age: finalAge,
        effectiveAge: effectiveAge,
        gender: data.gender ?? undefined,
      });
      if (finalAge === effectiveAge) {
        toast.success(`${targetLabel} profile loaded: ${data.patient_id}`);
      }

      if (intendedAction === "link") {
        const testDef = TEST_REGISTRY.find(t => t.slug === testType);
        const testName = testDef?.name.toLowerCase() || testType?.toLowerCase() || "";
        const assessment = assessments.find(a => a.name.toLowerCase().includes(testName) || (testType && a.id.toString() === testType));

        if (!assessment) {
          toast.error("Assessment not found in database.");
          return;
        }
        try {
          const res = await apiClient.post("/org/anonymous-links/", {
            assessment_id: assessment.id,
            expires_in_days: 1,
            patient_id: data.patient_id
          });
          setGeneratedLink(`${window.location.origin}/assessment/${res.data.token}`);
          setIsLinkDialogOpen(true);
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Failed to generate link.");
        }
        return;
      }

      if (user?.role) {
        if (testType === "screening-tool") {
          setShowScreeningPaymentDialog(true);
        } else {
          navigate(getSessionSetupRoute(user.role));
        }
      } else {
        toast.error('User role not available. Please reload the page.');
      }
    } catch (error: any) {
      const message =
        error?.response?.status === 404
          ? `${targetLabel} ID not found. Please check and try again.`
          : `Failed to process ${targetLabelLower} intake. Check your backend server.`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateScreeningLink = async () => {
    setShowScreeningShareDialog(false);
    if (!activePatientId && !pendingValues?.patient_id) {
      toast.error("No active patient selected.");
      return;
    }

    setIsSubmitting(true);
    try {
      const testDef = TEST_REGISTRY.find(t => t.slug === testType);
      const testName = testDef?.name.toLowerCase() || testType?.toLowerCase() || "";
      const assessmentList = await apiClient.get("/assessments").then(res => res.data);
      const assessment = assessmentList.find((a: any) => a.name.toLowerCase().includes(testName) || (testType && a.id.toString() === testType));

      if (!assessment) {
        toast.error("Assessment not found in database.");
        setIsSubmitting(false);
        return;
      }

      const isIndividual = user?.account_type === "individual";
      const isOrg = user?.role === "org_admin" || user?.role === "org_staff";
      const dbPrice = isIndividual ? assessment.psychologistPrice : (isOrg ? assessment.orgPrice : assessment.clinicPrice);
      const price = dbPrice != null ? dbPrice : (testDef?.creditCost || 0);

      if (price > 0) {
        const currentBalance = await getWalletBalance();
        if (currentBalance.balance_rupees < price) {
          toast.error(`Insufficient wallet balance to generate link. (Required: ₹${price.toFixed(2)})`);
          setIsSubmitting(false);
          return;
        }
      }
      const res = await apiClient.post("/org/anonymous-links/", {
        assessment_id: assessment.id,
        expires_in_hours: 72,
        patient_id: activePatientId || pendingValues?.patient_id,
        request_validation: requestPsychologistValidation
      });
      setGeneratedLink(`${window.location.origin}/assessment/${res.data.token}`);

      const newBalance = await getWalletBalance();
      setBalance(newBalance);

      toast.success("Transaction successful! Link is ready to be shared.");
      setIsLinkDialogOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to generate link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormValidated = (values: Record<string, any>) => {
    setPendingValues(values);
    setShowConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirm(false);
    if (pendingValues) {
      handleSubmit(pendingValues);
      setPendingValues(null);
    }
  };

  const confirmDialogMeta = {
    new: {
      session: {
        title: `Create New ${targetLabel}?`,
        description: `This will register a new ${targetLabelLower} profile and proceed to the assessment.`,
        action: "Create & Continue"
      },
      link: { title: "Generate Link?", description: `This will register a new ${targetLabelLower} profile and generate a shareable link.`, action: "Create & Generate" }
    },
    existing: {
      session: {
        title: `Load ${targetLabel} Profile?`,
        description: `This will load the selected ${targetLabelLower}'s profile and proceed to the assessment.`,
        action: "Load & Continue"
      },
      link: { title: "Generate Link?", description: `This will generate a shareable link for this ${targetLabelLower}.`, action: "Generate Link" }
    },
  };

  const breakdownItems: PaymentBreakdownItem[] = [];

  const accountTypeMap: Record<string, string> = {
    org_admin: "Organization",
    org_staff: "Organization",
    clinic_admin: "Clinic",
    clinic_staff: "Clinic",
    individual: "Individual",
    individual_psychologist: "Individual",
  };
  const accountTypeLabel = user?.role ? accountTypeMap[user.role] || "User" : "User";
  const isEligibleForValidation = user?.verification_status !== "approved";
  const isValidationRequested = isEligibleForValidation && requestPsychologistValidation;
  const finalCost = 100 + (isValidationRequested ? 100 : 0);

  const screeningBreakdownItems: PaymentBreakdownItem[] = [
    { label: "Account Type:", value: accountTypeLabel },
    { label: "Base Fee:", value: formatRupees(10000) },
    ...(isValidationRequested ? [{ label: "Validate by RCI Verified Psychologist:", value: formatRupees(10000) }] : []),
    { label: "Total Cost:", value: formatRupees(finalCost * 100), isTotal: true },
  ];

  return (
    <div className="w-full relative min-h-full isolate">

      <Helmet>
        <title>{targetLabel} Intake | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Assessment Initialization</h2>
          <p className="text-muted-foreground">Select a session type, then initialize the {TEST_REGISTRY.find(t => t.slug === testType)?.name || "assessment"} evaluation.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {PATIENT_OPTIONS.map(({ type, label, description, icon: Icon }) => {
            const isActive = selectedType === type;
            return (
              <Card
                key={type}
                className={`cursor-pointer transition-all relative overflow-visible hover:scale-[1.02] active:scale-[0.98] ${isActive
                  ? "border-primary ring-1 ring-primary shadow-md"
                  : "hover:border-primary/40"
                  }`}
                onClick={() => setSelectedType(type)}
              >
                {isActive && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    Selected
                  </Badge>
                )}
                <CardContent className="pt-6 flex flex-col items-center gap-2 text-center">
                  <Icon className={`h-8 w-8 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="font-semibold text-sm">{label}</div>
                  <p className="text-xs text-muted-foreground leading-snug">{description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedType === "new" && (
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader>
              <CardTitle>New {targetLabel} Details</CardTitle>
              <CardDescription>
                Enter full {targetLabelLower} demographics. This profile will be saved for future sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...newForm}>
                <form onSubmit={newForm.handleSubmit(handleFormValidated)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField
                      control={newForm.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newForm.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newForm.control}
                      name="phone_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+910987654321" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john.doe@example.com" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newForm.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newForm.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem className="flex flex-col pt-2.5">
                          <FormLabel>Date of Birth {computedAge !== null && <span className="text-muted-foreground font-normal text-xs">({computedAge} years)</span>}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full h-10 pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? format(new Date(field.value), "d/M/yyyy") : "Select date of birth"}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={field.onChange}
                                captionLayout="dropdown"
                                startMonth={new Date(1930, 0)}
                                endMonth={new Date()}
                                disabled={(date) => date > new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2 grid grid-cols-1 gap-5">
                    <FormField
                      control={newForm.control}
                      name="background"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Background <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief background of the patient..." {...field} value={field.value || ""} className="resize-y" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newForm.control}
                      name="environment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Living Environment <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <FormControl>
                            <Textarea placeholder="Living environment details..." {...field} value={field.value || ""} className="resize-y" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <FormField
                      control={newForm.control}
                      name="living_condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Living Condition <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="With Family">With Family</SelectItem>
                              <SelectItem value="Alone">Alone</SelectItem>
                              <SelectItem value="Shared/Hostel">Shared/Hostel</SelectItem>
                              <SelectItem value="Homeless/Temporary">Homeless/Temporary</SelectItem>
                              <SelectItem value="Institutional/Foster">Institutional/Foster</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newForm.control}
                      name="family_structure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Family Structure <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select structure" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Nuclear">Nuclear</SelectItem>
                              <SelectItem value="Joint/Extended">Joint/Extended</SelectItem>
                              <SelectItem value="Single Parent">Single Parent</SelectItem>
                              <SelectItem value="Guardian/Foster">Guardian/Foster</SelectItem>
                              <SelectItem value="No Family">No Family</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newForm.control}
                      name="environment_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Environment Type <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select environment" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Highly Supportive">Highly Supportive</SelectItem>
                              <SelectItem value="Moderately Supportive">Moderately Supportive</SelectItem>
                              <SelectItem value="Pressured">Pressured</SelectItem>
                              <SelectItem value="Conflict/Trauma">Conflict/Trauma</SelectItem>
                              <SelectItem value="Isolated">Isolated</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newForm.control}
                      name="education_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Education Level <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select education" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Uneducated">Uneducated</SelectItem>
                              <SelectItem value="Primary">Primary</SelectItem>
                              <SelectItem value="Secondary">Secondary</SelectItem>
                              <SelectItem value="Higher Secondary">Higher Secondary</SelectItem>
                              <SelectItem value="Graduate">Graduate</SelectItem>
                              <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                              <SelectItem value="Doctorate">Doctorate</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newForm.control}
                      name="occupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Occupation <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Student, Engineer" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newForm.control}
                      name="socioeconomic_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Socioeconomic Status <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select SES" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Upper Middle">Upper Middle</SelectItem>
                              <SelectItem value="Middle">Middle</SelectItem>
                              <SelectItem value="Lower Middle">Lower Middle</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2">
                    <FormField
                      control={newForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clinical Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any preliminary clinical notes..." {...field} value={field.value || ""} className="min-h-[100px] resize-y" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <Button type="submit" size="lg" disabled={isSubmitting || !newForm.formState.isValid} onClick={() => setIntendedAction("session")}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {selectedType === "existing" && (
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-visible">
            <CardHeader>
              <CardTitle>Existing {targetLabel} Lookup</CardTitle>
              <CardDescription>
                Search for a {targetLabelLower} by name, email, phone number, or {targetLabelLower} ID. Select a {targetLabelLower}
                from the list to load their profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...existingForm}>
                <form onSubmit={existingForm.handleSubmit(handleFormValidated)} className="space-y-4">
                  <FormField
                    control={existingForm.control}
                    name="patient_id"
                    render={() => (
                      <FormItem>
                        <FormLabel>Search {targetLabel}</FormLabel>
                        <div ref={dropdownRef} className="relative">
                          <FormControl>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                              <Input
                                placeholder={`Type name, email, phone, or ${targetLabelLower} ID...`}
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => {
                                  setSearchQuery(e.target.value);
                                  setSelectedPatient(null);
                                  existingForm.setValue("patient_id", "");
                                  setIsDropdownOpen(true);
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                autoComplete="off"
                              />
                            </div>
                          </FormControl>

                          {isDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">

                              <div className="grid grid-cols-[1fr_1.4fr_1fr_1.5fr] gap-2 px-3 py-2 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                <span>ID</span>
                                <span>Name</span>
                                <span>Phone</span>
                                <span>Email</span>
                              </div>
                              <ScrollArea className="max-h-[220px] overflow-y-auto">
                                {isFetchingPatients ? (
                                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading {targetLabelLower}s…
                                  </div>
                                ) : filteredPatients.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-muted-foreground">
                                    No {targetLabelLower}s found.
                                  </div>
                                ) : (
                                  filteredPatients.map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => handleSelectPatient(p)}
                                      className={`w-full grid grid-cols-[1fr_1.4fr_1fr_1.5fr] gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/60 focus:bg-accent/60 outline-none cursor-pointer ${selectedPatient?.id === p.id ? "bg-accent" : ""}`}
                                    >
                                      <span className="truncate font-mono text-xs text-primary">{p.id}</span>
                                      <span className="truncate font-medium">{[p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(" ") || "—"}</span>
                                      <span className="truncate text-muted-foreground">{maskPhone(p.phone_number)}</span>
                                      <span className="truncate text-muted-foreground">{maskEmail(p.email)}</span>
                                    </button>
                                  ))
                                )}
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedPatient && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm animate-in fade-in duration-200">
                      <span className="text-muted-foreground">Selected: </span>
                      <span className="font-semibold">{[selectedPatient.first_name?.trim(), selectedPatient.last_name?.trim()].filter(Boolean).join(" ")}</span>
                      <span className="ml-2 font-mono text-xs text-primary">({selectedPatient.id})</span>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end gap-3">
                    <Button type="submit" size="lg" disabled={isSubmitting || !selectedPatient} onClick={() => setIntendedAction("session")}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Looking up...
                        </>
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

      </div>

      <PaymentConfirmationModal
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        title={confirmDialogMeta[selectedType as "new" | "existing"][intendedAction].title}
        description={confirmDialogMeta[selectedType as "new" | "existing"][intendedAction].description}
        breakdownItems={breakdownItems}
        onConfirm={handleConfirmSubmit}
        confirmText={confirmDialogMeta[selectedType as "new" | "existing"][intendedAction].action}
      />

      <PaymentConfirmationModal
        isOpen={showScreeningPaymentDialog}
        onOpenChange={setShowScreeningPaymentDialog}
        title="Begin Assessment Session?"
        description="Once started, you will begin the Employee Mental Health & Wellbeing screening assessment."
        breakdownItems={screeningBreakdownItems}
        showValidationCheck={isEligibleForValidation}
        isValidationRequested={requestPsychologistValidation}
        onValidationChange={toggleValidation}
        validationPrice="₹100"
        validationDescription="An independent RCI registered psychologist will review your assessment."
        warningMessage={
          <><strong className="block mb-0.5 text-sm">Important:</strong>The final cost will be deducted from your wallet after you complete the assessment.</>
        }
        onConfirm={() => {
          setShowScreeningPaymentDialog(false);
          if (user?.role) {
            navigate(getScreeningToolRoute(user.role));
          }
        }}
        confirmText="Start Session"
        secondaryAction={
          <Button type="button" variant="ghost" onClick={() => { setShowScreeningPaymentDialog(false); setShowScreeningShareDialog(true); }} className="text-muted-foreground hover:text-foreground">
            <LinkIcon className="h-4 w-4 mr-2" /> Share Link
          </Button>
        }
      />

      <PaymentConfirmationModal
        isOpen={showScreeningShareDialog}
        onOpenChange={setShowScreeningShareDialog}
        title="Generate Shareable Link"
        description="Once generated, the link will be valid for 3 hours."
        breakdownItems={screeningBreakdownItems}
        showValidationCheck={isEligibleForValidation}
        isValidationRequested={requestPsychologistValidation}
        onValidationChange={toggleValidation}
        validationPrice="₹100"
        validationDescription="An independent RCI registered psychologist will review the assessment once submitted."
        warningMessage={
          <><strong className="block mb-0.5 text-sm">Important:</strong>The final cost will be deducted from your wallet after the test has been successfully completed.</>
        }
        onConfirm={handleGenerateScreeningLink}
        customConfirmButton={
          <Button onClick={handleGenerateScreeningLink} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LinkIcon className="h-4 w-4 mr-2" />}
            Generate Link
          </Button>
        }
      />

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Assessment Link</DialogTitle>
            <DialogDescription>
              This link is uniquely tied to the selected patient and will be valid for 3 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {generatedLink && (
              <div className="p-3 rounded-md bg-muted/50 border">
                <label className="text-xs text-muted-foreground font-semibold mb-1 block">One-Time Link</label>
                <div className="flex items-center gap-2">
                  <Input value={generatedLink} readOnly className="font-mono text-xs bg-background h-8" />
                  <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    setCopied(true);
                    toast.success("Copied to clipboard!");
                    setTimeout(() => setCopied(false), 2000);
                  }}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsLinkDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={ageWarning?.show || false} onOpenChange={(open) => !open && setAgeWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              Age Limitation Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground/90 mt-2">
              {ageWarning?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAgeWarning(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (ageWarning) {
                setPatient({
                  id: ageWarning.patientData.patient_id,
                  name: [ageWarning.patientData.first_name?.trim(), ageWarning.patientData.last_name?.trim()].filter(Boolean).join(" ") || "Anonymous",
                  age: ageWarning.finalAge,
                  effectiveAge: ageWarning.effectiveAge,
                  gender: ageWarning.patientData.gender ?? undefined,
                });
                if (user?.role) {
                  if (testType === "screening-tool") {
                    setShowScreeningPaymentDialog(true);
                  } else {
                    navigate(getSessionSetupRoute(user.role));
                  }
                } else {
                  toast.error('User role not available. Please reload the page.');
                }
              }
            }}>
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
