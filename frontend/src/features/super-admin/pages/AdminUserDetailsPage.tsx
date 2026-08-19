import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Loader2,
  Pencil,
  Save,
  X,
  Trash2,
  Shield,
  Building2,
  Activity,
  History,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getMediaUrl } from "@/lib/utils";
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
  deleteUser,
  type AdminUser,
  type AdminUpdateUserPayload,
} from "@/features/super-admin/services/adminService";
import { getSessionHistoryRoute } from "@/lib/routeUtils";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "clinic_admin", label: "Clinic Admin" },
  { value: "clinic_staff", label: "Clinic Staff" },
  { value: "org_admin", label: "Org Admin" },
  { value: "org_staff", label: "Org Staff" },
  { value: "individual_psychologist", label: "Individual Psychologist" },
];

const VERIFICATION_STATUSES = [
  { value: "not_submitted", label: "Not Submitted" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const ACCOUNT_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "clinic", label: "Clinic" },
  { value: "organization", label: "Organization" },
];

export function AdminUserDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [accountType, setAccountType] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [rocNumber, setRocNumber] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await fetchUserDetail(id);
      setUser(data);
      syncForm(data);
    } catch (err: any) {
      toast.error("Failed to load user details.");
      navigate("/admin/users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, navigate]);

  const syncForm = (data: AdminUser) => {
    setFirstName(data.first_name || "");
    setLastName(data.last_name || "");
    setEmail(data.email || "");
    setPhone(data.phone || "");
    setRole(data.role || "");
    setAccountType(data.account_type || "");
    setVerificationStatus(data.verification_status || "");
    setClinicName(data.clinic_name || "");
    setSpecialization(data.specialization || "");
    setRocNumber(data.roc_number || "");
    setIsActive(data.is_active);
  };

  const handleToggleEdit = (checked: boolean) => {
    if (!checked && user) {
      syncForm(user);
    }
    setIsEditing(checked);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const payload: AdminUpdateUserPayload = {
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
        account_type: accountType,
        verification_status: verificationStatus,
        clinic_name: clinicName.trim() || undefined,
        specialization: specialization.trim() || undefined,
        roc_number: rocNumber.trim() || undefined,
        is_active: isActive,
      };

      const updatedUser = await updateUser(user.id, payload);
      setUser(updatedUser);
      syncForm(updatedUser);
      setIsEditing(false);
      toast.success("User details updated successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) syncForm(user);
    setIsEditing(false);
    toast.info("Changes discarded.");
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteUser(user.id);
      toast.success("User deactivated successfully.");
      navigate("/admin/users");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to deactivate user.");
    }
  };

  if (isLoading) {
    return (
      <div className="w-full relative min-h-full isolate">
        <Helmet>
          <title>User Details  | PsyicHub - Psychological Intelligence</title>
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

  if (!user) return null;

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Unnamed User";
  const initial = displayName.charAt(0).toUpperCase();

  const getRoleLabel = (val: string) => ROLES.find((r) => r.value === val)?.label || val;
  const getVerificationLabel = (val: string) => VERIFICATION_STATUSES.find((v) => v.value === val)?.label || val;
  const getAccountTypeLabel = (val: string) => ACCOUNT_TYPES.find((a) => a.value === val)?.label || val;

  return (
    <div className="w-full relative min-h-full isolate">
      <Helmet>
        <title>{displayName} — Details  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="flex items-center justify-end">

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${getSessionHistoryRoute("super_admin")}?search=${user.id}`)}
              className="gap-1.5 font-medium border-primary/15 hover:border-primary/40 bg-background/50"
            >
              <History className="h-4 w-4 text-primary" />
              Session History
            </Button>
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

                <Avatar className="h-16 w-16 rounded-full border-2 border-primary/20 bg-primary/10 shrink-0">
                  <AvatarImage src={getMediaUrl(user.avatar_url)} alt={displayName} className="object-cover" />
                  <AvatarFallback className="text-xl font-bold text-primary">
                    {initial}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center sm:text-left space-y-3">
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        className="text-xl font-bold h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                      />
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
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
                      {user.id}
                    </Badge>
                    <Badge variant={isActive ? "default" : "destructive"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 pt-2 border-t border-primary/10">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider">Email</Label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email"
                          className="h-8 bg-background/50 text-sm border-primary/15 focus:border-primary/40 transition-colors max-w-[200px]"
                        />
                      ) : (
                        <p className="text-sm">{email || <span className="text-muted-foreground italic">No email</span>}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider">Phone</Label>
                      {isEditing ? (
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Phone (optional)"
                          className="h-8 bg-background/50 text-sm border-primary/15 focus:border-primary/40 transition-colors max-w-[200px]"
                        />
                      ) : (
                        <p className="text-sm">{phone || <span className="text-muted-foreground italic">No phone</span>}</p>
                      )}
                    </div>
                  </div>
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
                <Shield className="h-5 w-5 text-primary" />
                Account Details
              </CardTitle>
              <CardDescription className="text-sm">
                System role and verification status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                    Role
                  </Label>
                  {isEditing ? (
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="w-full h-11 bg-background/50 border-primary/15 hover:border-primary/30 transition-all">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="border-primary/10">
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium pt-1">
                      {getRoleLabel(role) || <span className="text-muted-foreground italic">None</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                    Account Type
                  </Label>
                  {isEditing ? (
                    <Select value={accountType} onValueChange={setAccountType}>
                      <SelectTrigger className="w-full h-11 bg-background/50 border-primary/15 hover:border-primary/30 transition-all">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="border-primary/10">
                        {ACCOUNT_TYPES.map((a) => (
                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium pt-1">
                      {getAccountTypeLabel(accountType) || <span className="text-muted-foreground italic">None</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                    Verification Status
                  </Label>
                  {isEditing ? (
                    <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                      <SelectTrigger className="w-full h-11 bg-background/50 border-primary/15 hover:border-primary/30 transition-all">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="border-primary/10">
                        {VERIFICATION_STATUSES.map((v) => (
                          <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium pt-1">
                      {getVerificationLabel(verificationStatus) || <span className="text-muted-foreground italic">None</span>}
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
                <Building2 className="h-5 w-5 text-primary" />
                Professional Information
              </CardTitle>
              <CardDescription className="text-sm">
                Clinic affiliation and specialization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                    Clinic Name
                  </Label>
                  {isEditing ? (
                    <Input
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="e.g. Wellness Clinic"
                      className="bg-background/50 border-primary/15 focus:border-primary/40 h-11"
                    />
                  ) : (
                    <p className="text-sm font-medium pt-1">
                      {clinicName || <span className="text-muted-foreground italic">Not specified</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                    Specialization
                  </Label>
                  {isEditing ? (
                    <Input
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Clinical Psychologist"
                      className="bg-background/50 border-primary/15 focus:border-primary/40 h-11"
                    />
                  ) : (
                    <p className="text-sm font-medium pt-1">
                      {specialization || <span className="text-muted-foreground italic">Not specified</span>}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                    RoC / License No.
                  </Label>
                  {isEditing ? (
                    <Input
                      value={rocNumber}
                      onChange={(e) => setRocNumber(e.target.value)}
                      placeholder="License number"
                      className="bg-background/50 border-primary/15 focus:border-primary/40 h-11"
                    />
                  ) : (
                    <p className="text-sm font-medium pt-1">
                      {rocNumber || <span className="text-muted-foreground italic">Not specified</span>}
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
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-primary/10 p-4 bg-primary/5">
                <div className="mb-3 sm:mb-0 space-y-1">
                  <Label className="text-sm font-bold">Account Active</Label>
                  <p className="text-xs text-muted-foreground">Deactivated users cannot login or access the platform.</p>
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
                  Deactivate User
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will deactivate <strong>{displayName}</strong>. They will no longer be able to log in.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Deactivate
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
                    <AlertDialogTitle>Save User Changes?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will update the user record for <strong>{displayName}</strong> with your changes.
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
