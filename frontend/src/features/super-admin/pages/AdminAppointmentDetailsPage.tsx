import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Pencil,
  Save,
  X,
  CalendarIcon,
  Clock,
  User,
  Building2,
  FileText,
  StickyNote,
  Activity,
  Loader2,
  Hash,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import {
  fetchAdminAppointmentById,
  updateAdminAppointment,
  type AppointmentAdminOut,
  type AdminUpdateAppointmentPayload,
} from "@/features/super-admin/services/adminService";
import { format, parseISO } from "date-fns";

const APPOINTMENT_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const STATUS_STYLES: Record<string, string> = {
  scheduled: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  confirmed: "border-green-500/30 text-green-400 bg-green-500/10",
  completed: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  cancelled: "border-red-500/30 text-red-400 bg-red-500/10",
  no_show: "border-orange-500/30 text-orange-400 bg-orange-500/10",
  pending: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
};

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatApptDate(date: string) {
  try { return format(parseISO(date), "d MMMM yyyy"); } catch { return date; }
}

function formatCreatedAt(ts: string) {
  try { return format(parseISO(ts), "d MMM yyyy, h:mm a"); } catch { return ts; }
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      <div className="text-sm font-semibold pt-0.5">{value}</div>
    </div>
  );
}

function EmptyVal() {
  return <span className="text-muted-foreground italic font-normal">Not specified</span>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <Card className="border-primary/10">
        <div className="h-1 bg-muted" />
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-56" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-primary/10">
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent className="space-y-4">
              {[0, 1, 2].map((j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminAppointmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [appt, setAppt] = useState<AppointmentAdminOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [apptDate, setApptDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [status, setStatus] = useState("scheduled");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchAdminAppointmentById(id)
      .then((data) => {
        setAppt(data);
        syncForm(data);
      })
      .catch(() => {
        toast.error("Failed to load appointment details.");
        navigate("/admin/appointments");
      })
      .finally(() => setIsLoading(false));

  }, [id]);

  const syncForm = (data: AppointmentAdminOut) => {
    setApptDate(data.appointment_date ?? "");
    setStartTime(data.start_time ?? "");
    setDurationMinutes(data.duration_minutes ?? 60);
    setStatus(data.status ?? "scheduled");
    setPurpose(data.purpose ?? "");
    setNotes(data.notes ?? "");
  };

  const handleToggleEdit = (checked: boolean) => {
    if (!checked && appt) syncForm(appt);
    setIsEditing(checked);
  };

  const handleSave = async () => {
    if (!appt || !id) return;
    setIsSaving(true);
    try {
      const payload: AdminUpdateAppointmentPayload = {
        appointment_date: apptDate || undefined,
        start_time: startTime || undefined,
        duration_minutes: durationMinutes || undefined,
        status: status || undefined,
        purpose: purpose.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      const updated = await updateAdminAppointment(id, payload);

      const merged: AppointmentAdminOut = {
        ...updated,
        psychologist_name: appt.psychologist_name,
        psychologist_email: appt.psychologist_email,
        patient_name: appt.patient_name,
        clinic_name: appt.clinic_name,
      };
      setAppt(merged);
      syncForm(merged);
      setIsEditing(false);
      toast.success("Appointment updated successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to update appointment.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (appt) syncForm(appt);
    setIsEditing(false);
    toast.info("Changes discarded.");
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!appt) return null;

  const patientInitial = appt.patient_name?.charAt(0).toUpperCase() ?? "?";
  const staffInitial = appt.psychologist_name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Appointment — {appt.patient_name ?? appt.id}  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="flex items-center justify-end">

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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-primary/10 bg-background/80 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">

              <div className="h-16 w-16 rounded-2xl border-2 border-primary/20 bg-primary/10 shrink-0 flex items-center justify-center text-2xl font-bold text-primary shadow-inner">
                {patientInitial}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-3 w-full">
                <h2 className="text-2xl font-bold tracking-tight">
                  {appt.patient_name ?? "Unknown Patient"}
                </h2>

                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <Badge variant="outline" className="font-mono text-xs">
                    {appt.id}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${STATUS_STYLES[status] ?? "border-border text-muted-foreground"}`}
                  >
                    {statusLabel(status)}
                  </Badge>
                  {appt.clinic_id && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Building2 className="h-3 w-3" />
                      Clinic appointment
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground justify-center sm:justify-start">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {formatApptDate(appt.appointment_date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {appt.start_time}
                    {appt.duration_minutes ? ` · ${appt.duration_minutes} min` : ""}
                  </span>
                  {appt.psychologist_name && (
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {appt.psychologist_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Scheduling
              </CardTitle>
              <CardDescription>Date, time, and duration of the appointment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" /> Appointment Date
                </Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="bg-background/50 border-primary/15 focus:border-primary/40 h-10"
                  />
                ) : (
                  <p className="text-sm font-semibold pt-1">
                    {appt.appointment_date ? formatApptDate(appt.appointment_date) : <EmptyVal />}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Start Time
                </Label>
                {isEditing ? (
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-background/50 border-primary/15 focus:border-primary/40 h-10"
                  />
                ) : (
                  <p className="text-sm font-semibold pt-1">
                    {appt.start_time || <EmptyVal />}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Duration (minutes)
                </Label>
                {isEditing ? (
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="bg-background/50 border-primary/15 focus:border-primary/40 h-10"
                  />
                ) : (
                  <p className="text-sm font-semibold pt-1">
                    {appt.duration_minutes ? `${appt.duration_minutes} min` : <EmptyVal />}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Participants
              </CardTitle>
              <CardDescription>Patient and assigned psychologist.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                  {patientInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{appt.patient_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{appt.patient_id}</p>
                  <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mt-0.5">Patient</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20">
                <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center font-bold text-violet-500 text-sm shrink-0">
                  {staffInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{appt.psychologist_name ?? "Unknown"}</p>
                  {appt.psychologist_email && (
                    <p className="text-xs text-muted-foreground truncate">{appt.psychologist_email}</p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono truncate">{appt.psychologist_id}</p>
                  <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mt-0.5">Psychologist</p>
                </div>
              </div>

              <InfoField
                icon={<Building2 className="h-3.5 w-3.5" />}
                label="Clinic"
                value={
                  appt.clinic_id ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold truncate">{appt.clinic_name ?? "Unknown Clinic"}</span>
                    <span className="font-mono text-[10px] text-muted-foreground truncate">{appt.clinic_id}</span>
                  </div>
                  ) : (
                    <span className="text-sm font-semibold italic text-muted-foreground">Global (No Clinic)</span>
                  )
                }
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Status &amp; Purpose
              </CardTitle>
              <CardDescription>Current status and the reason for the appointment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Status
                </Label>
                {isEditing ? (
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-10 bg-background/50 border-primary/15 hover:border-primary/30">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPOINTMENT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="pt-1">
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold ${STATUS_STYLES[appt.status] ?? ""}`}
                    >
                      {statusLabel(appt.status)}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Purpose / Reason
                </Label>
                {isEditing ? (
                  <Input
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Assessment, Follow-up, Initial consultation"
                    className="bg-background/50 border-primary/15 focus:border-primary/40 h-10"
                  />
                ) : (
                  <p className="text-sm font-semibold pt-1">
                    {appt.purpose || <EmptyVal />}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-primary" />
                Notes
              </CardTitle>
              <CardDescription>Internal notes visible to admins only.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" /> Admin Notes
                </Label>
                {isEditing ? (
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add internal notes about this appointment..."
                    rows={5}
                    className="bg-background/50 border-primary/15 focus:border-primary/40 resize-none"
                  />
                ) : (
                  <p className="text-sm font-medium pt-1 whitespace-pre-wrap leading-relaxed">
                    {appt.notes || <EmptyVal />}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              Record Metadata
            </CardTitle>
            <CardDescription>System-generated identifiers and timestamps.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <InfoField
                icon={<Hash className="h-3.5 w-3.5" />}
                label="Appointment ID"
                value={<span className="font-mono text-xs break-all">{appt.id}</span>}
              />
              <InfoField
                icon={<CalendarIcon className="h-3.5 w-3.5" />}
                label="Created At"
                value={appt.created_at ? formatCreatedAt(appt.created_at) : <EmptyVal />}
              />
              <InfoField
                icon={<CalendarIcon className="h-3.5 w-3.5" />}
                label="Last Updated"
                value={appt.updated_at ? formatCreatedAt(appt.updated_at) : <EmptyVal />}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-end gap-3 p-4 rounded-xl border border-primary/10 bg-background/80 backdrop-blur-sm"
        >
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
                <AlertDialogTitle>Save Appointment Changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will update the appointment record for{" "}
                  <strong>{appt.patient_name ?? appt.id}</strong> with your changes.
                  The psychologist and patient cannot be changed after creation.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSave}>Save Changes</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      )}

      <div className="h-8" />
    </div>
  );
}
