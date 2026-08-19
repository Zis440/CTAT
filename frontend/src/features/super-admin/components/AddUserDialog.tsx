import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdminClinics, createUser, type AdminCreateUserPayload } from "@/features/super-admin/services/adminService";

export function AddUserDialog({ children, onSuccess, defaultAccountType = "individual" }: { children: React.ReactNode; onSuccess?: () => void; defaultAccountType?: "individual" | "clinic" | "organization" }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("clinic_admin");
  const [accountType, setAccountType] = useState<"individual" | "clinic" | "organization">(defaultAccountType);

  const [clinicSearchQuery, setClinicSearchQuery] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<{ id: string; name: string } | null>(null);
  const [isClinicDropdownOpen, setIsClinicDropdownOpen] = useState(false);
  const clinicDropdownRef = useRef<HTMLDivElement>(null);

  const isClinicRole = accountType === "clinic" || accountType === "organization";

  const { data: clinicsData, isFetching: isFetchingClinics } = useQuery({
    queryKey: ["admin-clinics", "all"],
    queryFn: () => fetchAdminClinics({ page: 1, page_size: 100 }),
    enabled: isOpen && isClinicRole,
  });

  const clinics = clinicsData?.clinics || [];
  const filteredClinics = clinics.filter((c: any) => {
    const name = c.clinic_name || c.name || "";
    return name.toLowerCase().includes(clinicSearchQuery.toLowerCase());
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clinicDropdownRef.current && !clinicDropdownRef.current.contains(event.target as Node)) {
        setIsClinicDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectClinic = (clinic: any) => {
    setSelectedClinic({ id: clinic.id, name: clinic.clinic_name || clinic.name || "" });
    setClinicSearchQuery(clinic.clinic_name || clinic.name || "");
    setIsClinicDropdownOpen(false);
  };

  const createUserMutation = useMutation({
    mutationFn: (payload: AdminCreateUserPayload) => createUser(payload),
    onSuccess: () => {
      toast.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (onSuccess) onSuccess();
      setIsOpen(false);

      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRole(defaultAccountType === "clinic" ? "clinic_admin" : "clinic_admin");
      setAccountType(defaultAccountType);
      setSelectedClinic(null);
      setClinicSearchQuery("");
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        toast.error(detail[0]?.msg || "Validation error in form");
      } else if (typeof detail === "string") {
        toast.error(detail);
      } else {
        toast.error(err.message || "Failed to create user");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email || !phone || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (isClinicRole && !selectedClinic && !clinicSearchQuery) {
      toast.error("Please provide a Clinic Name.");
      return;
    }

    const submitRole = accountType === "individual"
      ? "individual_psychologist"
      : accountType === "organization"
        ? (role === "clinic_admin" ? "org_admin" : "org_staff")
        : (role === "clinic_admin" ? "clinic_admin" : "clinic_staff");

    const submitRoleType = (accountType === "clinic" || accountType === "organization") && role !== "clinic_admin"
      ? role
      : undefined;

    createUserMutation.mutate({
      first_name: firstName,
      last_name: lastName || undefined,
      email,
      phone,
      password,
      role: submitRole,
      role_type: submitRoleType,
      clinic_id: accountType === "clinic" ? selectedClinic?.id : undefined,
      clinic_name: accountType === "clinic" ? (selectedClinic?.name || clinicSearchQuery) : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account and set their role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label>Account Type <span className="text-destructive">*</span></Label>
              <RadioGroup value={accountType} onValueChange={(val: "individual" | "clinic" | "organization") => setAccountType(val)} className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="r-individual" />
                  <Label htmlFor="r-individual" className="font-normal cursor-pointer">Individual</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="clinic" id="r-clinic" />
                  <Label htmlFor="r-clinic" className="font-normal cursor-pointer">Clinic</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="organization" id="r-organization" />
                  <Label htmlFor="r-organization" className="font-normal cursor-pointer">Organization</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. John" required />
            </div>
            <div className="grid gap-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Doe" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label>Phone Number <span className="text-destructive">*</span></Label>
              <Input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXX XXX XXXX" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Temporary Password <span className="text-destructive">*</span></Label>
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set initial password" required minLength={8} />
            </div>
            {accountType === "clinic" && (
              <div className="grid gap-2">
                <Label>Role <span className="text-destructive">*</span></Label>
                <Select value={role} onValueChange={(val: any) => setRole(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinic_admin">Clinic Admin</SelectItem>
                    <SelectItem value="staff_view">Clinic Staff (View Only)</SelectItem>
                    <SelectItem value="psychology_assessment">Psychology Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isClinicRole && (
            <div className="grid gap-2 relative">
              <Label>Clinic Name <span className="text-destructive">*</span></Label>
              <div ref={clinicDropdownRef} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Type to search or add new clinic..."
                  className="pl-9"
                  value={clinicSearchQuery}
                  onChange={(e) => {
                    setClinicSearchQuery(e.target.value);
                    setSelectedClinic(null);
                    setIsClinicDropdownOpen(true);
                  }}
                  onFocus={() => setIsClinicDropdownOpen(true)}
                  autoComplete="off"
                  required
                />

                {isClinicDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                    <ScrollArea className="max-h-[220px] overflow-y-auto">
                      {isFetchingClinics ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading clinics...
                        </div>
                      ) : filteredClinics.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No clinics found. Type to create new.
                        </div>
                      ) : (
                        filteredClinics.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectClinic(c)}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/60 focus:bg-accent/60 outline-none cursor-pointer ${selectedClinic?.id === c.id ? "bg-accent" : ""}`}
                          >
                            <span className="truncate font-medium">{c.clinic_name || c.name || "—"}</span>
                            <span className="truncate text-xs text-muted-foreground">{c.email}</span>
                          </button>
                        ))
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          )}

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
