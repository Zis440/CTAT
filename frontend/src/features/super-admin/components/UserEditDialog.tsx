
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  updateUser,
  type AdminUser,
  type AdminUpdateUserPayload,
} from "@/features/super-admin/services/adminService";

interface UserEditDialogProps {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "clinic_admin", label: "Clinic Admin" },
  { value: "clinic_staff", label: "Clinic Staff" },
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
];

export function UserEditDialog({
  user,
  open,
  onClose,
  onUpdated,
}: UserEditDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

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

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setRole(user.role || "");
      setAccountType(user.account_type || "");
      setVerificationStatus(user.verification_status || "");
      setClinicName(user.clinic_name || "");
      setSpecialization(user.specialization || "");
      setRocNumber(user.roc_number || "");
      setIsActive(user.is_active);
    }
  }, [user]);

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

      await updateUser(user.id, payload);
      toast.success("User updated successfully.");
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail || "Failed to update user."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Modify user details, role, and account status. Changes are saved directly to the database.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">Personal Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">Account Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Verification</Label>
                <Select
                  value={verificationStatus}
                  onValueChange={setVerificationStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VERIFICATION_STATUSES.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">Professional Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Clinic Name</Label>
                <Input
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>RoC / License No.</Label>
                <Input
                  value={rocNumber}
                  onChange={(e) => setRocNumber(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">System Status</h4>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 bg-muted/40">
              <div className="mb-3 sm:mb-0">
                <p className="text-sm font-medium">Account Active</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Deactivated users cannot login or access the platform.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${isActive ? "text-green-600" : "text-destructive"}`}>
                  {isActive ? "Active" : "Inactive"}
                </span>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => setShowSaveConfirm(true)} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save User Changes?</AlertDialogTitle>
          <AlertDialogDescription>
            This will update <strong>{[firstName, lastName].filter(Boolean).join(" ") || "this user"}'s</strong> account details directly in the database. Please verify all changes are correct before proceeding.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setShowSaveConfirm(false); handleSave(); }}>
            Save Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
