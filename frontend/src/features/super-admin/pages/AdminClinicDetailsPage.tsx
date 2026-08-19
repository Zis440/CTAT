import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Loader2,
  Pencil,
  Save,
  X,
  Shield,
  Building2,
  Activity,
  Mail,
  Phone,
  MapPin,
  FileSpreadsheet,
  Users,
  HeartPulse,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  fetchAdminClinic,
  updateAdminClinic,
  type AdminClinic,
} from "@/features/super-admin/services/adminService";
import { formatDate } from "@/lib/dateFormat";

const VERIFICATION_STATUSES = [
  { value: "not_submitted", label: "Not Submitted" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const CLINIC_TYPES = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llp", label: "LLP" },
  { value: "private_limited", label: "Private Limited" },
  { value: "opc", label: "OPC" },
  { value: "public_limited", label: "Public Limited" },
  { value: "trust", label: "Trust" },
  { value: "society", label: "Society" },
  { value: "section_8", label: "Section 8" },
  { value: "cooperative", label: "Cooperative" },
  { value: "ngo", label: "NGO" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
];

export function AdminClinicDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<AdminClinic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // form state
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [rocNumber, setRocNumber] = useState("");
  const [clinicType, setClinicType] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await fetchAdminClinic(id);
      setClinic(data);
      syncForm(data);
    } catch (err: any) {
      toast.error("Failed to load clinic details.");
      navigate("/admin/clinics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, navigate]);

  const syncForm = (data: AdminClinic) => {
    setClinicName(data.clinic_name || data.name || "");
    setEmail(data.email || "");
    setPhone(data.phone || "");
    setAddress(data.address || "");
    setRocNumber(data.roc_number || "");
    setClinicType(data.clinic_type || "");
    setVerificationStatus(data.verification_status || "not_submitted");
    setIsActive(data.is_active);
  };

  const handleToggleEdit = (checked: boolean) => {
    if (!checked && clinic) {
      syncForm(clinic);
    }
    setIsEditing(checked);
  };

  const handleSave = async () => {
    if (!clinic) return;
    setIsSaving(true);
    try {
      const payload: Partial<AdminClinic> = {
        clinic_name: clinicName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        roc_number: rocNumber.trim() || undefined,
        clinic_type: clinicType.trim() || undefined,
        verification_status: verificationStatus,
        is_active: isActive,
      };

      const updatedClinic = await updateAdminClinic(clinic.id, payload);
      setClinic(updatedClinic);
      syncForm(updatedClinic);
      setIsEditing(false);
      toast.success("Clinic details updated successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update clinic.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (clinic) syncForm(clinic);
    setIsEditing(false);
    toast.info("Changes discarded.");
  };

  if (isLoading) {
    return (
      <div className="w-full relative min-h-full isolate">
        <Helmet>
          <title>Clinic Details  | PsyicHub - Psychological Intelligence</title>
        </Helmet>
        <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
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
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-2"><Skeleton className="h-3 w-12" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-10 w-full" /></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!clinic) return null;

  const displayName = clinicName || clinic.clinic_name || clinic.name || "Unnamed Clinic";
  const initial = displayName.charAt(0).toUpperCase();

  const getVerificationLabel = (val: string) => VERIFICATION_STATUSES.find((v) => v.value === val)?.label || val;
  const getClinicTypeLabel = (val: string) => CLINIC_TYPES.find((c) => c.value === val)?.label || val;

  return (
    <div className="w-full relative min-h-full isolate">
      <Helmet>
        <title>{displayName} — Details  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Top bar: Edit Switch */}
        <div className="flex items-center justify-end">

          {/* Edit Mode Switch */}
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

        {/* Identity Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Clinic Initial Avatar */}
                <div className="h-16 w-16 rounded-2xl border-2 border-primary/20 bg-primary/10 shrink-0 flex items-center justify-center text-2xl font-bold text-primary shadow-inner">
                  {initial}
                </div>

                {/* Name + metadata */}
                <div className="flex-1 text-center sm:text-left space-y-3 w-full">
                  {isEditing ? (
                    <div className="max-w-lg">
                      <Input
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder="Clinic Name"
                        className="text-xl font-bold h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                      />
                    </div>
                  ) : (
                    <h2 className="text-2xl font-bold tracking-tight">
                      {displayName}
                    </h2>
                  )}
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pb-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {clinic.id}
                    </Badge>
                    <Badge variant={isActive ? "default" : "destructive"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="secondary">
                      {getVerificationLabel(verificationStatus)}
                    </Badge>
                  </div>

                  {/* Creation info */}
                  <div className="text-xs text-muted-foreground font-medium border-t border-primary/5 pt-2">
                    Created on {formatDate(clinic.created_at)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <Card className="border-primary/10 bg-background/85 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registered Staff</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{clinic.staff_count || clinic.total_users || 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Healthcare practitioners</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-background/85 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Consulted Patients</CardTitle>
              <HeartPulse className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{clinic.patient_count || clinic.total_patients || 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Onboarded patient records</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-background/85 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Sessions administered</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">{clinic.total_sessions || 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Platform clinical yield</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Basic & Legal Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Details */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card className="border-primary/10 bg-background/80 backdrop-blur-sm min-h-full">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Basic Information
                </CardTitle>
                <CardDescription className="text-sm">
                  Clinic classification and active communication endpoints.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Clinic email"
                      className="bg-background/50 border-primary/15 focus:border-primary/40 h-10"
                    />
                  ) : (
                    <p className="text-sm font-semibold pt-1 text-foreground">
                      {email || <span className="text-muted-foreground italic">None</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </Label>
                  {isEditing ? (
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Clinic phone (optional)"
                      className="bg-background/50 border-primary/15 focus:border-primary/40 h-10"
                    />
                  ) : (
                    <p className="text-sm font-semibold pt-1 text-foreground">
                      {phone || <span className="text-muted-foreground italic">Not specified</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Address
                  </Label>
                  {isEditing ? (
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Clinic address (optional)"
                      className="bg-background/50 border-primary/15 focus:border-primary/40 h-10"
                    />
                  ) : (
                    <p className="text-sm font-semibold pt-1 text-foreground">
                      {address || <span className="text-muted-foreground italic">Not specified</span>}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Legal / Licensing Details */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="border-primary/10 bg-background/80 backdrop-blur-sm min-h-full">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Compliance & Licensing
                </CardTitle>
                <CardDescription className="text-sm">
                  ROC certificate, license numbers and verification logs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> RoC / License Number
                  </Label>
                  {isEditing ? (
                    <Input
                      value={rocNumber}
                      onChange={(e) => setRocNumber(e.target.value)}
                      placeholder="e.g. ROC-2026-12"
                      className="bg-background/50 border-primary/15 focus:border-primary/40 h-10 font-mono"
                    />
                  ) : (
                    <p className="text-sm font-mono font-bold pt-1 text-foreground">
                      {rocNumber || <span className="text-muted-foreground font-sans italic">Not specified</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Clinic Type
                  </Label>
                  {isEditing ? (
                    <Input
                      value={clinicType}
                      onChange={(e) => setClinicType(e.target.value)}
                      placeholder="e.g. Psychiatric / General"
                      className="bg-background/50 border-primary/15 focus:border-primary/40 h-10"
                    />
                  ) : (
                    <p className="text-sm font-semibold pt-1 text-foreground">
                      {clinicType ? getClinicTypeLabel(clinicType) : <span className="text-muted-foreground italic">Not specified</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                    Verification Log
                  </Label>
                  {isEditing ? (
                    <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                      <SelectTrigger className="w-full h-10 bg-background/50 border-primary/15 hover:border-primary/30 transition-all">
                        <SelectValue placeholder="Verification status" />
                      </SelectTrigger>
                      <SelectContent className="border-primary/10">
                        {VERIFICATION_STATUSES.map((v) => (
                          <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-semibold pt-1">
                      {getVerificationLabel(verificationStatus) || <span className="text-muted-foreground italic">None</span>}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* System Active Status Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Clinic System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-primary/10 p-4 bg-primary/5">
                <div className="mb-3 sm:mb-0 space-y-1">
                  <Label className="text-sm font-bold">Organization Active Status</Label>
                  <p className="text-xs text-muted-foreground">Inactivated clinics cannot consult patients, manage staff or charge credits.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${isActive ? "text-primary" : "text-destructive"}`}>
                    {isActive ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Bar (visible in edit mode) */}
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
                  <AlertDialogTitle>Save Clinic Changes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will update the organization record for <strong>{displayName}</strong> with your changes.
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
          </motion.div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
