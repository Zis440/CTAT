import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  Loader2,
  User,
  Calendar as CalendarIcon,
  Activity,
  FileText,
  Globe,
  Home,
  Pencil,
  Save,
  X,
  Trash2,
  ClipboardCheck,
  Download,
  File as FileIcon,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiClient } from "@/services/apiClient";
import { formatDate } from "@/lib/dateFormat";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PatientData {
  id: string;
  user_id: string;
  clinic_id: string | null;
  patient_type: string;
  provider_name?: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  consent_given: boolean;
  background: string | null;
  environment: string | null;
  notes: string | null;
  total_sessions: number;
  first_session_date: string | null;
  last_session_date: string | null;
  created_at: string | null;
}

interface EditableFields {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  background: string;
  environment: string;
  notes: string;
}

import { getSessionHistoryRoute } from "@/lib/routeUtils";
import { useAuthStore } from "@/store/useAuthStore";

export function OrgCandidateDetailsPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const apiBasePath = "/patients";
  const backUrl = "/org/candidates";
  const allowExport = true;

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState<EditableFields>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    date_of_birth: "",
    gender: "",
    background: "",
    environment: "",
    notes: "",
  });

  const computedAge = form.date_of_birth
    ? Math.floor((Date.now() - new Date(form.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const fetchPatient = useCallback(async () => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const { data } = await apiClient.get<PatientData>(`${apiBasePath}/${patientId}`);
      setPatient(data);
      syncFormFromPatient(data);
    } catch (err: any) {
      console.error("Failed to fetch patient", err);
      if (err?.response?.status === 404) {
        toast.error("Candidate not found.");
        navigate(backUrl);
      } else {
        toast.error("Failed to load patient details.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [patientId, navigate, apiBasePath, backUrl]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  function syncFormFromPatient(p: PatientData) {
    setForm({
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      email: p.email || "",
      phone_number: p.phone_number || "",
      date_of_birth: p.date_of_birth || "",
      gender: p.gender || "",
      background: p.background || "",
      environment: p.environment || "",
      notes: p.notes || "",
    });
  }

  function handleToggleEdit(checked: boolean) {
    if (!checked && patient) {

      syncFormFromPatient(patient);
    }
    setIsEditing(checked);
  }

  async function handleSave() {
    if (!patientId) return;
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (form.first_name !== (patient?.first_name || "")) payload.first_name = form.first_name;
      if (form.last_name !== (patient?.last_name || "")) payload.last_name = form.last_name;
      if (form.email !== (patient?.email || "")) payload.email = form.email || null;
      if (form.phone_number !== (patient?.phone_number || "")) payload.phone_number = form.phone_number || null;
      if (form.date_of_birth !== (patient?.date_of_birth || "")) {
        payload.date_of_birth = form.date_of_birth || null;
      }
      if (form.gender !== (patient?.gender || "")) payload.gender = form.gender || null;
      if (form.background !== (patient?.background || "")) payload.background = form.background || null;
      if (form.environment !== (patient?.environment || "")) payload.environment = form.environment || null;
      if (form.notes !== (patient?.notes || "")) payload.notes = form.notes || null;

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save.");
        setIsEditing(false);
        return;
      }

      const { data } = await apiClient.put<PatientData>(`${apiBasePath}/${patientId}`, payload);
      setPatient(data);
      syncFormFromPatient(data);
      setIsEditing(false);
      toast.success("Candidate details updated successfully.");
    } catch (err: any) {
      console.error("Failed to update patient", err);
      toast.error(err?.response?.data?.detail || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    if (patient) syncFormFromPatient(patient);
    setIsEditing(false);
    toast.info("Changes discarded.");
  }

  async function handleDelete() {
    if (!patientId) return;
    try {
      await apiClient.delete(`${apiBasePath}/${patientId}`);
      toast.success("Candidate record deleted.");
      navigate(backUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete candidate.");
    }
  }

  const exportToPDF = async () => {
    if (!patient) return;
    const doc = new jsPDF();

    let currentY = 20;

    try {
      const response = await fetch('/coretat-report-logo.png');
      const blob = await response.blob();
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      doc.addImage(base64Data, 'PNG', 14, 12, 32, 17);

      currentY = 38;
    } catch (e) {
      console.warn("Failed to load logo for PDF", e);
    }

    const displayName = patient.first_name ? `${patient.first_name} ${patient.last_name || ""}`.trim() : patient.id;

    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(`Candidate Data: ${displayName}`, 14, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${format(new Date(), "PPpp")}`, 14, currentY);
    currentY += 10;

    autoTable(doc, {
      startY: currentY,
      head: [["Field", "Value"]],
      body: [
        ["ID", patient.id],
        ["Candidate Type", patient.patient_type],
        ["Email", patient.email || "N/A"],
        ["Phone", patient.phone_number || "N/A"],
        ["Date of Birth", patient.date_of_birth ? format(new Date(patient.date_of_birth), "PP") : "N/A"],
        ["Gender", patient.gender || "N/A"],
        ["Total Sessions", patient.total_sessions.toString()],
        ["First Session", patient.first_session_date ? format(new Date(patient.first_session_date), "PP") : "N/A"],
        ["Last Session", patient.last_session_date ? format(new Date(patient.last_session_date), "PP") : "N/A"],
        ["Background", patient.background || "N/A"],
        ["Environment", patient.environment || "N/A"],
        ["Clinical Notes", patient.notes || "N/A"],
      ],
      styles: { cellPadding: 4, fontSize: 10 },
      headStyles: { fillColor: "#ce1126" },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });

    doc.save(`Candidate_${patient.id}.pdf`);
    toast.success("PDF Exported Successfully");
  };

  const exportToExcel = () => {
    if (!patient) return;
    const exportData = [{
      "Candidate ID": patient.id,
      "First Name": patient.first_name || "",
      "Last Name": patient.last_name || "",
      "Email": patient.email || "",
      "Phone": patient.phone_number || "",
      "Date of Birth": patient.date_of_birth || "",
      "Gender": patient.gender || "",
      "Candidate Type": patient.patient_type || "",
      "Total Sessions": patient.total_sessions,
      "First Session Date": patient.first_session_date || "",
      "Last Session Date": patient.last_session_date || "",
      "Background": patient.background || "",
      "Environment": patient.environment || "",
      "Clinical Notes": patient.notes || "",
    }];

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidate Data");

    const wscols = Object.keys(exportData[0]).map(() => ({ wch: 20 }));
    worksheet["!cols"] = wscols;

    XLSX.writeFile(workbook, `Candidate_${patient.id}.xlsx`);
    toast.success("Excel Exported Successfully");
  };

  if (isLoading) {
    return (
      <div className="w-full relative min-h-full isolate">
        <Helmet>
          <title>Candidate Details | CoreTAT - Psychological Intelligence</title>
        </Helmet>
        <div className="w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>

          <Card className="border-primary/10">
            <div className="h-1 bg-muted" />
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-3 w-full">
                  <Skeleton className="h-8 w-48" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div className="flex gap-4 pt-2">
                    <div className="space-y-1"><Skeleton className="h-3 w-10" /><Skeleton className="h-4 w-32" /></div>
                    <div className="space-y-1"><Skeleton className="h-3 w-10" /><Skeleton className="h-4 w-24" /></div>
                  </div>
                </div>
                <div className="space-y-2 mt-4 sm:mt-0">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2"><Skeleton className="h-3 w-12" /><Skeleton className="h-5 w-20" /></div>
                <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-24" /></div>
                <div className="space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-5 w-16" /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-20 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-20 w-full" /></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!patient) return null;

  const displayName = patient.first_name
    ? `${patient.first_name} ${patient.last_name || ""}`.trim()
    : patient.id;
  const initial = displayName.charAt(0).toUpperCase();
  const patientTypeLabel =
    patient.patient_type === "new" ? "Registered" :
      patient.patient_type === "existing" ? "Existing" :
        patient.patient_type === "anonymous" ? "Anonymous" : patient.patient_type;

  const patientTypeBadgeVariant =
    patient.patient_type === "anonymous" ? "outline" as const : "default" as const;

  return (
    <div className="w-full relative min-h-full isolate">
      <Helmet>
        <title>Candidate Details | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="flex items-center justify-end">

          <div className="flex items-center gap-3">
            {allowExport && patient && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5 transition-all">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 border-primary/10">
                  <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer gap-2">
                    <FileIcon className="h-4 w-4 text-red-500" />
                    Export to PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-500" />
                    Export to Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex items-center gap-3 px-4 py-2 rounded-full border border-primary/10 bg-background/80 backdrop-blur-sm shadow-sm"
            >
              <Label
                htmlFor="edit-mode-switch"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
              >
                <Pencil className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                Edit Mode
              </Label>
              <Switch
                id="edit-mode-switch"
                checked={isEditing}
                onCheckedChange={handleToggleEdit}
              />
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm overflow-hidden">

            <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">

                <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-primary">{initial}</span>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-3">
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                      <Input
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        placeholder="First Name"
                        className="text-xl font-bold h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                      />
                      <Input
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        placeholder="Last Name"
                        className="text-xl font-bold h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                      />
                    </div>
                  ) : (
                    <h2 className="text-2xl font-bold tracking-tight">
                      {displayName || <span className="text-muted-foreground italic">Unnamed</span>}
                    </h2>
                  )}
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pb-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {patient.id}
                    </Badge>
                    {patient.patient_type && (
                      <Badge variant={patientTypeBadgeVariant}>
                        {patientTypeLabel}
                      </Badge>
                    )}
                    {patient.provider_name && (
                      <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                        Under: {patient.provider_name}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 pt-2 border-t border-primary/10">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider">Email</Label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="Email (optional)"
                          className="h-8 bg-background/50 text-sm border-primary/15 focus:border-primary/40 transition-colors max-w-[200px]"
                        />
                      ) : (
                        <p className="text-sm">{patient.email || <span className="text-muted-foreground italic">No email</span>}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider">Phone</Label>
                      {isEditing ? (
                        <Input
                          value={form.phone_number}
                          onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                          placeholder="Phone (optional)"
                          className="h-8 bg-background/50 text-sm border-primary/15 focus:border-primary/40 transition-colors max-w-[200px]"
                        />
                      ) : (
                        <p className="text-sm">{patient.phone_number || <span className="text-muted-foreground italic">No phone</span>}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center sm:text-right space-y-1 shrink-0">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    <span>
                      <strong className="text-foreground">{patient.total_sessions}</strong>{" "}
                      session{patient.total_sessions !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {patient.created_at && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      <span>Since {formatDate(patient.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Demographics
              </CardTitle>
              <CardDescription className="text-sm">
                Basic candidate demographic information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                    Date of Birth {computedAge !== null && <span className="normal-case font-normal">({computedAge} years)</span>}
                  </Label>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-11 justify-start text-left font-normal bg-background/50 border-primary/15",
                            !form.date_of_birth && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                          {form.date_of_birth ? format(new Date(form.date_of_birth), "d/M/yyyy") : "Select date of birth"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.date_of_birth ? new Date(form.date_of_birth) : undefined}
                          onSelect={(date) => setForm({ ...form, date_of_birth: date ? format(date, "yyyy-MM-dd") : "" })}
                          captionLayout="dropdown"
                          startMonth={new Date(1930, 0)}
                          endMonth={new Date()}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className="text-sm font-medium pt-1">
                      {patient.date_of_birth
                        ? <>{format(new Date(patient.date_of_birth), "d/M/yyyy")} <span className="text-muted-foreground">({patient.age ?? "—"} years)</span></>
                        : patient.age != null
                          ? `${patient.age} years`
                          : <span className="text-muted-foreground italic">Not specified</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                    Gender
                  </Label>
                  {isEditing ? (
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger className="w-full h-11 bg-background/50 border-primary/15 hover:border-primary/30 transition-all">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="border-primary/10">
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium pt-1">
                      {patient.gender || <span className="text-muted-foreground italic">Not specified</span>}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Socio-Cultural Context
              </CardTitle>
              <CardDescription className="text-sm">
                Background information and living environment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                  Background
                </Label>
                {isEditing ? (
                  <Textarea
                    value={form.background}
                    onChange={(e) => setForm({ ...form, background: e.target.value })}
                    placeholder="Socio-cultural background, ethnicity, religion, etc."
                    className="bg-background/50 border-primary/15 focus:border-primary/40 transition-colors min-h-[80px]"
                  />
                ) : (
                  <p className="text-sm leading-relaxed">
                    {patient.background || <span className="text-muted-foreground italic">No background information recorded.</span>}
                  </p>
                )}
              </div>

              <Separator className="bg-primary/5" />

              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5" />
                  Living Environment
                </Label>
                {isEditing ? (
                  <Textarea
                    value={form.environment}
                    onChange={(e) => setForm({ ...form, environment: e.target.value })}
                    placeholder="Living situation, support system, etc."
                    className="bg-background/50 border-primary/15 focus:border-primary/40 transition-colors min-h-[80px]"
                  />
                ) : (
                  <p className="text-sm leading-relaxed">
                    {patient.environment || <span className="text-muted-foreground italic">No environment information recorded.</span>}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Clinical Notes
              </CardTitle>
              <CardDescription className="text-sm">
                Internal practitioner notes about this candidate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Add clinical notes, observations, follow-up items..."
                  className="bg-background/50 border-primary/15 focus:border-primary/40 transition-colors min-h-[100px]"
                />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {patient.notes || <span className="text-muted-foreground italic">No clinical notes recorded.</span>}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Session History
              </CardTitle>
              <Button
                variant="secondary"
                size="sm"
                className="w-auto px-4 shrink-0"
                onClick={() => navigate(`${getSessionHistoryRoute(user?.role)}?search=${patient.id}`)}
                disabled={patient.total_sessions === 0}
              >
                <Activity className="h-4 w-4 mr-2" />
                View Full Session History
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="text-2xl font-bold text-primary">{patient.total_sessions}</span>
                  <span className="text-xs text-muted-foreground mt-1">Total Sessions</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="text-sm font-semibold text-foreground">
                    {patient.total_sessions > 0 && patient.first_session_date ? formatDate(patient.first_session_date) : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">First Session</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="text-sm font-semibold text-foreground">
                    {patient.total_sessions > 0 && patient.last_session_date ? formatDate(patient.last_session_date) : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">Last Session</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-primary/10 bg-background/80 backdrop-blur-sm"
          >
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/20 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 hover:border-destructive/30 font-bold text-xs transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete Candidate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete candidate record?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove <strong>{displayName}</strong> and
                    all associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-primary/15 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-muted-foreground font-bold text-sm px-5 transition-all"
              >
                <X className="h-4 w-4 mr-1.5" />
                Discard
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm px-6 shadow-lg shadow-primary/20 transition-all"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1.5" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Save Candidate Changes?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will update the candidate record for <strong>{displayName}</strong> with your changes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSave}>
                      Save Changes
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
