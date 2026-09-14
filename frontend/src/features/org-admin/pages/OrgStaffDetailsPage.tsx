import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Shield,
  Users,
  Calendar as CalendarIcon,
  Pencil,
  Save,
  X,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  BadgeCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/services/apiClient";

import type { AuthUser } from "@/types/auth";

const STAFF_ROLES = [
  { value: "clinic_admin", label: "Clinic Admin (Full Access)" },
  { value: "clinic_staff_assess", label: "Psychologist (Assessment)" },
  { value: "clinic_staff", label: "Staff (View Only)" },
  { value: "org_admin", label: "Org Admin (Full Access)" },
  { value: "org_staff_assess", label: "Psychologist (Assessment)" },
  { value: "org_staff", label: "Staff (View Only)" },
];

export function OrgStaffDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const backUrl = "/org/staff";

  const [staff, setStaff] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    designation: "",
    specialization: "",
    role: "",
  });

  const fetchStaff = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {

      try {
        const { data } = await apiClient.get<AuthUser>(`/auth/staff/${id}`);
        setStaff(data);
        syncForm(data);
      } catch (individualErr: any) {
        if (individualErr?.response?.status === 404 || individualErr?.response?.status === 405) {

          const { data: list } = await apiClient.get<AuthUser[]>("/auth/staff");
          const found = list.find((s) => s.id === id);
          if (!found) {
            toast.error("Staff member not found.");
            navigate(backUrl);
            return;
          }
          setStaff(found);
          syncForm(found);
        } else {
          throw individualErr;
        }
      }
    } catch (err: any) {
      toast.error("Failed to load staff details.");
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  function syncForm(s: AuthUser) {
    let currentRole: string = s.role || "clinic_staff";
    if ((currentRole === "clinic_staff" || currentRole === "org_staff") && s.can_assess) {
      currentRole = `${currentRole}_assess`;
    }

    setForm({
      first_name: s.first_name || "",
      last_name: s.last_name || "",
      phone: s.phone || "",
      designation: s.designation || "",
      specialization: s.specialization || "",
      role: currentRole,
    });
  }

  function handleToggleEdit(checked: boolean) {
    if (!checked && staff) syncForm(staff);
    setIsEditing(checked);
  }

  async function handleSave() {
    if (!id) return;
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (form.first_name !== (staff?.first_name || "")) payload.first_name = form.first_name;
      if (form.last_name !== (staff?.last_name || "")) payload.last_name = form.last_name || null;
      if (form.phone !== (staff?.phone || "")) payload.phone = form.phone || null;
      if (form.designation !== (staff?.designation || "")) payload.designation = form.designation || null;
      if (form.specialization !== (staff?.specialization || "")) payload.specialization = form.specialization || null;

      let currentRole: string = staff?.role || "clinic_staff";
      if ((currentRole === "clinic_staff" || currentRole === "org_staff") && staff?.can_assess) {
        currentRole = `${currentRole}_assess`;
      }

      if (form.role !== currentRole) {
         let finalRole = form.role;
         let finalCanAssess = staff?.can_assess || false;

         if (form.role === 'clinic_staff_assess' || form.role === 'org_staff_assess') {
             finalRole = form.role.replace('_assess', '');
             finalCanAssess = true;
         } else if (form.role === 'clinic_staff' || form.role === 'org_staff') {
             finalCanAssess = false;
         }

         payload.role = finalRole;
         payload.can_assess = finalCanAssess;
      }

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save.");
        setIsEditing(false);
        return;
      }

      const { data } = await apiClient.patch<AuthUser>(`/auth/staff/${id}`, payload);
      setStaff(data);
      syncForm(data);
      setIsEditing(false);
      toast.success("Staff details updated successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    if (staff) syncForm(staff);
    setIsEditing(false);
    toast.info("Changes discarded.");
  }

  async function handleDeactivate() {
    if (!id) return;
    try {
      await apiClient.patch(`/auth/staff/${id}`, { is_active: false });
      toast.success("Staff member deactivated.");
      navigate(backUrl);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to deactivate staff member.");
    }
  }

  if (isLoading) {
    return (
      <div className="w-full relative min-h-full isolate">
        <Helmet><title>Staff Details | CoreTAT - Psychological Intelligence</title></Helmet>
        <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-end"><Skeleton className="h-10 w-32 rounded-full" /></div>
          <Card className="border-primary/10">
            <div className="h-1 bg-muted" />
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-8 w-48" />
                  <div className="flex gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-24" /></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/10">
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!staff) return null;

  const displayName = [staff.first_name, staff.last_name].filter(Boolean).join(" ") || staff.id;
  const initial = displayName.charAt(0).toUpperCase();
  const isVerified = staff.verification_status === "approved";

  return (
    <div className="w-full relative min-h-full isolate">
      <Helmet>
        <title>Staff Details | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

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

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
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
                    <Badge variant="outline" className="font-mono text-xs">{staff.id}</Badge>
                    <Badge variant={staff.can_assess ? "default" : "secondary"}>
                      {staff.can_assess ? "Psychology Assessment" : "Staff View Only"}
                    </Badge>
                    {isVerified && (
                      <Badge variant="outline" className="border-blue-500/20 text-blue-500 bg-blue-500/10">
                        <BadgeCheck className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    )}
                    {staff.is_active ? (
                      <Badge variant="outline" className="border-green-500/20 text-green-500 bg-green-500/10">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-500/20 text-red-500 bg-red-500/10">Inactive</Badge>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 pt-2 border-t border-primary/10">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email
                      </Label>
                      <p className="text-sm">{staff.email || <span className="text-muted-foreground italic">No email</span>}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Phone
                      </Label>
                      {isEditing ? (
                        <Input
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="Phone (optional)"
                          className="h-8 bg-background/50 text-sm border-primary/15 focus:border-primary/40 transition-colors max-w-[200px]"
                        />
                      ) : (
                        <p className="text-sm">{staff.phone || <span className="text-muted-foreground italic">No phone</span>}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center sm:text-right shrink-0 space-y-2 w-full sm:w-auto mt-4 sm:mt-0">
                  {isEditing ? (
                    <Select
                      value={form.role}
                      onValueChange={(val) => setForm({ ...form, role: val })}
                    >
                      <SelectTrigger className="w-full sm:w-[220px] bg-background/50 border-primary/15 focus:ring-primary/40">
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_ROLES.filter(r => (staff?.role?.startsWith('org_') ? r.value.startsWith('org_') : r.value.startsWith('clinic_'))).map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex flex-col items-center sm:items-end gap-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>Role: {STAFF_ROLES.find(r => {
                          let currentRole: string = staff?.role || "clinic_staff";
                          if ((currentRole === "clinic_staff" || currentRole === "org_staff") && staff?.can_assess) {
                            currentRole = `${currentRole}_assess`;
                          }
                          return r.value === currentRole;
                        })?.label || staff?.role?.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Professional Information
              </CardTitle>
              <CardDescription>Designation and specialization details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Designation</Label>
                  {isEditing ? (
                    <Input
                      value={form.designation}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                      placeholder="e.g. Senior Psychologist"
                      className="bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium pt-1">
                      {staff.designation || <span className="text-muted-foreground italic">Not specified</span>}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Specialization</Label>
                  {isEditing ? (
                    <Input
                      value={form.specialization}
                      onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                      placeholder="e.g. Cognitive Behavioural Therapy"
                      className="bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                    />
                  ) : (
                    <p className="text-sm font-medium pt-1">
                      {staff.specialization || <span className="text-muted-foreground italic">Not specified</span>}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Permissions & Access
              </CardTitle>
              <CardDescription>This staff member's role-level and module permissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                {staff.can_assess ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Psychology Assessment</p>
                      <p className="text-xs text-muted-foreground">Can conduct assessments and view full session data.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Staff View Only</p>
                      <p className="text-xs text-muted-foreground">Can view patient records but cannot conduct assessments.</p>
                    </div>
                  </>
                )}
              </div>

              {staff.rci_number && (
                <>
                  <Separator className="bg-primary/5" />
                  <div className="space-y-1">
                    <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">RCI Registration No.</Label>
                    <p className="text-sm font-mono font-semibold">{staff.rci_number}</p>
                  </div>
                </>
              )}

              {staff.module_permissions && Object.keys(staff.module_permissions).length > 0 && (
                <>
                  <Separator className="bg-primary/5" />
                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Module Permissions</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(staff.module_permissions).map(([mod, enabled]) => (
                        <div key={mod} className={`flex items-center gap-2 p-2 rounded-md text-xs font-medium ${enabled ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-muted/40 text-muted-foreground border border-border/40"}`}>
                          {enabled ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                          <span className="capitalize">{mod.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
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
                  className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/30 font-bold text-xs transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Deactivate Staff
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate staff member?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will deactivate <strong>{displayName}</strong>'s account. They will no longer be able to log in.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" />Save Changes</>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Save Staff Changes?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will update the staff record for <strong>{displayName}</strong> with your changes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSave}>Save Changes</AlertDialogAction>
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
