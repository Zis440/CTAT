import { useState, useEffect, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Pencil,
  Save,
  X,
  Shield,
  Users,
  Mail,
  Phone,
  Activity,
  Building2,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  CircleDashed,
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
  fetchUserDetail,
  updateUser,
  type AdminUser,
  type AdminUpdateUserPayload,
} from "@/features/super-admin/services/adminService";

// ── Constants ────────────────────────────────────────────────────────────────
const STAFF_ROLES = [
  { value: "clinic_admin", label: "Clinic Admin (Full Access)" },
  { value: "clinic_staff_assess", label: "Psychologist (Assessment)" },
  { value: "clinic_staff", label: "Staff (View Only)" },
];

const VERIFICATION_STATUSES = [
  { value: "not_submitted", label: "Not Submitted" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function roleInfo(role: string): { label: string; className: string; textColor: string } {
  if (role === "clinic_admin") {
    return {
      label: "Clinic Admin",
      className: "bg-primary/10 text-primary border-primary/20",
      textColor: "text-primary",
    };
  }

  if (role === "clinic_staff_assess") {
    return {
      label: "Psychologist (Assessment)",
      className: "bg-green-500/10 text-green-600 border-green-500/20",
      textColor: "text-green-600",
    };
  }

  return {
    label: "Staff View Only",
    className: "bg-muted text-muted-foreground border-muted-foreground/10",
    textColor: "text-muted-foreground",
  };
}

function VerificationBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: ReactNode }> = {
    approved: {
      label: "Approved",
      className: "bg-green-500/10 text-green-500 border-green-500/20 dark:border-green-500/30 dark:bg-green-500/20",
      icon: <CheckCircle className="h-3 w-3 mr-1" />,
    },
    pending: {
      label: "Pending",
      className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 dark:border-yellow-500/30 dark:bg-yellow-500/20",
      icon: <Clock className="h-3 w-3 mr-1" />,
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-500/10 text-red-500 border-red-500/20 dark:border-red-500/30 dark:bg-red-500/20",
      icon: <XCircle className="h-3 w-3 mr-1" />,
    },
    not_submitted: {
      label: "Not Submitted",
      className: "bg-gray-500/10 text-gray-400 border-gray-500/20 dark:border-gray-500/30 dark:bg-gray-500/20",
      icon: <CircleDashed className="h-3 w-3 mr-1" />,
    },
  };
  const entry = map[status] || { label: status, className: "", icon: <></> };
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${entry.className}`}>
      {entry.icon}
      {entry.label}
    </Badge>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <Card className="border-primary/10">
        <div className="h-1 bg-muted" />
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/10">
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminStaffDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [staff, setStaff] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("clinic_staff");
  const [verificationStatus, setVerificationStatus] = useState("not_submitted");
  const [isActive, setIsActive] = useState(true);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await fetchUserDetail(id);
      setStaff(data);
      syncForm(data);
    } catch {
      toast.error("Failed to load staff details.");
      navigate("/admin/staff");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const syncForm = (data: AdminUser) => {
    setFirstName(data.first_name ?? "");
    setLastName(data.last_name ?? "");
    setEmail(data.email ?? "");
    setPhone(data.phone ?? "");
    
    let currentRole = data.role ?? "clinic_staff";
    if ((currentRole === "clinic_staff" || currentRole === "org_staff") && data.can_assess) {
      currentRole = `${currentRole}_assess`;
    }
    setRole(currentRole);
    setVerificationStatus(data.verification_status ?? "not_submitted");
    setIsActive(data.is_active);
  };

  const handleToggleEdit = (checked: boolean) => {
    if (!checked && staff) syncForm(staff);
    setIsEditing(checked);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!staff) return;
    setIsSaving(true);
    try {
      let finalRole = role;
      let finalCanAssess = staff.can_assess;

      if (role === 'clinic_staff_assess' || role === 'org_staff_assess') {
          finalRole = role.replace('_assess', '');
          finalCanAssess = true;
      } else if (role === 'clinic_staff' || role === 'org_staff') {
          finalCanAssess = false;
      }

      const payload: AdminUpdateUserPayload = {
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role: finalRole || undefined,
        can_assess: finalCanAssess,
        verification_status: verificationStatus || undefined,
        is_active: isActive,
      };
      const updated = await updateUser(staff.id, payload);
      setStaff(updated);
      syncForm(updated);
      setIsEditing(false);
      toast.success("Staff member updated successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Failed to update staff member.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (staff) syncForm(staff);
    setIsEditing(false);
    toast.info("Changes discarded.");
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!staff) return null;

  const displayName =
    `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() || staff.email;
  const initial = displayName.charAt(0).toUpperCase();
  const { label: roleLabel, className: roleClassName, textColor: roleTextColor } = roleInfo(role);
  const verLabel =
    VERIFICATION_STATUSES.find((v) => v.value === verificationStatus)?.label ??
    verificationStatus;

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>{displayName} — Staff Details  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      {/* Top bar */}
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

      {/* Identity card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-primary/10 bg-background/80 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="h-16 w-16 rounded-2xl border-2 border-primary/20 bg-primary/10 shrink-0 flex items-center justify-center text-2xl font-bold text-primary shadow-inner">
                {initial}
              </div>

              {/* Name + badges */}
              <div className="flex-1 text-center sm:text-left space-y-3 w-full">
                {isEditing ? (
                  <div className="flex gap-2 max-w-lg">
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="text-xl font-bold h-11 bg-background/50 border-primary/15 focus:border-primary/40"
                    />
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="text-xl font-bold h-11 bg-background/50 border-primary/15 focus:border-primary/40"
                    />
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold tracking-tight">{displayName}</h2>
                )}

                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <Badge variant="outline" className="font-mono text-xs">
                    {staff.id}
                  </Badge>
                  {isActive ? (
                    <Badge variant="outline" className="border-green-500/20 text-green-500 bg-green-500/10 dark:border-green-500/30 dark:bg-green-500/20">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-red-500/20 text-red-500 bg-red-500/10 dark:border-red-500/30 dark:bg-red-500/20">
                      Inactive
                    </Badge>
                  )}
                  <Badge variant="outline" className={roleClassName}>
                    {role === "clinic_admin" ? (
                      <Shield className="h-3 w-3 mr-1 shrink-0" />
                    ) : (
                      <Users className="h-3 w-3 mr-1 shrink-0" />
                    )}
                    {roleLabel}
                  </Badge>
                  <VerificationBadge status={verificationStatus} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact details */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contact Information
              </CardTitle>
              <CardDescription>Email address and phone number on record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/50 border-primary/15 focus:border-primary/40 h-10"
                  />
                ) : (
                  <p className="text-sm font-semibold pt-1">
                    {email || <span className="text-muted-foreground italic">Not specified</span>}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </Label>
                {isEditing ? (
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXX XXX XXXX"
                    className="bg-background/50 border-primary/15 focus:border-primary/40 h-10"
                  />
                ) : (
                  <p className="text-sm font-semibold pt-1">
                    {phone || <span className="text-muted-foreground italic">Not specified</span>}
                  </p>
                )}
              </div>

              {/* Clinic */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Clinic
                </Label>
                <p className="text-sm font-semibold pt-1">
                  {staff.clinic_name || (
                    <span className="text-muted-foreground italic">No clinic assigned</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Role & verification */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Permissions &amp; Verification
              </CardTitle>
              <CardDescription>Role assignment and verification record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Role */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Role / Permission
                </Label>
                {isEditing ? (
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-10 bg-background/50 border-primary/15 hover:border-primary/30">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <Shield className={`h-4 w-4 ${roleTextColor}`} />
                    <p className={`text-sm font-semibold ${roleTextColor}`}>{roleLabel}</p>
                  </div>
                )}
              </div>

              {/* Verification status */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Verification Status
                </Label>
                {isEditing ? (
                  <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                    <SelectTrigger className="h-10 bg-background/50 border-primary/15 hover:border-primary/30">
                      <SelectValue placeholder="Verification status" />
                    </SelectTrigger>
                    <SelectContent>
                      {VERIFICATION_STATUSES.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-semibold pt-1">{verLabel}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Account active status */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-primary/10 p-4 bg-primary/5">
              <div className="mb-3 sm:mb-0 space-y-1">
                <Label className="text-sm font-bold">Account Active Status</Label>
                <p className="text-xs text-muted-foreground">
                  Deactivated staff cannot log in or perform any actions on the platform.
                </p>
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

      {/* Save / Discard bar — only visible in edit mode */}
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
                <AlertDialogTitle>Save Staff Changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will update the account record for{" "}
                  <strong>{displayName}</strong> with your changes.
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
