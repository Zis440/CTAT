import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateAdminPatient, type AdminPatient, type AdminUpdatePatientRequest } from "@/features/super-admin/services/adminService";

interface AdminPatientEditDialogProps {
  patient: AdminPatient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientUpdated: () => void;
}

export function AdminPatientEditDialog({ patient, open, onOpenChange, onPatientUpdated }: AdminPatientEditDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [formData, setFormData] = useState<AdminUpdatePatientRequest>({});

  useEffect(() => {
    if (patient && open) {
      setFormData({
        first_name: patient.first_name || "",
        last_name: patient.last_name || "",
        phone_number: patient.phone_number || "",
        date_of_birth: patient.date_of_birth || "",
        gender: patient.gender || "",
      });
    }
  }, [patient, open]);

  const handleChange = (field: keyof AdminUpdatePatientRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!patient) return;
    setIsSaving(true);
    try {
      // Sanitize payload (convert empty strings to undefined)
      const payload: AdminUpdatePatientRequest = {
        first_name: formData.first_name?.trim() || undefined,
        last_name: formData.last_name?.trim() || undefined,
        phone_number: formData.phone_number?.trim() || undefined,
        date_of_birth: formData.date_of_birth?.trim() || undefined,
        gender: formData.gender?.trim() || undefined,
      };

      await updateAdminPatient(patient.id, payload);
      toast.success("Patient details updated successfully");
      onPatientUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update patient");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Patient</DialogTitle>
          <DialogDescription>
            Modify patient demographics and contact details. Changes are saved directly to the database.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">Personal Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={formData.first_name || ""}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  placeholder="First Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.last_name || ""}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  placeholder="Last Name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={formData.phone_number || ""}
                onChange={(e) => handleChange("phone_number", e.target.value)}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">Demographics</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth || ""}
                  onChange={(e) => handleChange("date_of_birth", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender || ""}
                  onValueChange={(val) => handleChange("gender", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => setShowSaveConfirm(true)} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Save Confirmation Dialog */}
    <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save Patient Changes?</AlertDialogTitle>
          <AlertDialogDescription>
            This will update <strong>{[formData.first_name, formData.last_name].filter(Boolean).join(" ") || "this patient"}'s</strong> details directly in the database. Please verify all changes are correct before proceeding.
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
