import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdminClinics, createUser, type AdminCreateUserPayload } from "@/features/super-admin/services/adminService";
import { getApiBaseUrl } from "@/lib/utils";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function AddStaffDialog({ children, onSuccess }: { children: React.ReactNode; onSuccess?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleType, setRoleType] = useState<"staff_view" | "psychology_assessment">("staff_view");
  const [rciNumber, setRciNumber] = useState("");
  const [noRci, setNoRci] = useState(false);
  const [rciVerifying, setRciVerifying] = useState(false);
  const [rciVerified, setRciVerified] = useState<{ verified: boolean; practitioner_name?: string | null; message?: string } | null>(null);

  const [clinicSearchQuery, setClinicSearchQuery] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<{ id: string; name: string } | null>(null);
  const [isClinicDropdownOpen, setIsClinicDropdownOpen] = useState(false);
  const clinicDropdownRef = useRef<HTMLDivElement>(null);

  const { data: clinicsData, isFetching: isFetchingClinics } = useQuery({
    queryKey: ["admin-clinics", "all"],
    queryFn: () => fetchAdminClinics({ page: 1, page_size: 100 }),
    enabled: isOpen,
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

  const createStaffMutation = useMutation({
    mutationFn: (payload: AdminCreateUserPayload) => createUser(payload),
    onSuccess: () => {
      toast.success("Staff member created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (onSuccess) onSuccess();
      setIsOpen(false);

      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRoleType("staff_view");
      setRciNumber("");
      setNoRci(false);
      setRciVerified(null);
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
        toast.error(err.message || "Failed to create staff member");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email || !phone || !password || !selectedClinic) {
      toast.error("Please fill in all required fields, including Clinic Name.");
      return;
    }

    if (roleType === "psychology_assessment" && !noRci) {
      if (!rciNumber || !rciNumber.trim()) {
        toast.error("RCI Registration No. is required for Psychology Assessment role.");
        return;
      }
      const rciPattern = /^A\d{5,6}$/i;
      if (!rciPattern.test(rciNumber.trim())) {
        toast.error("Invalid RCI format. Must be 'A' followed by 5 or 6 digits (e.g. A123456).");
        return;
      }
    }

    createStaffMutation.mutate({
      first_name: firstName,
      last_name: lastName || undefined,
      email,
      phone,
      password,
      role: "clinic_staff",
      clinic_id: selectedClinic.id,
      clinic_name: selectedClinic.name,
      role_type: roleType === "psychology_assessment" ? "psychology_assessment" : "staff_view",
      rci_number: roleType === "psychology_assessment" && !noRci ? rciNumber.trim().toUpperCase() : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New Staff Member
          </DialogTitle>
          <DialogDescription>
            Create a new staff account and associate them with a clinic.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 py-4">
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
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set a temporary password" required minLength={8} />
            </div>
            <div className="grid gap-2">
              <Label>Role & Permissions <span className="text-destructive">*</span></Label>
              <Select value={roleType} onValueChange={(val: any) => setRoleType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff_view">Staff (View Only)</SelectItem>
                  <SelectItem value="psychology_assessment">Psychology Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {roleType === "psychology_assessment" && (
            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label>RCI Registration No. <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input
                  placeholder="A123456"
                  value={rciNumber}
                  onChange={(e) => { setRciNumber(e.target.value.toUpperCase()); setRciVerified(null); }}
                  disabled={noRci}
                  required={!noRci}
                  maxLength={7}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={noRci || rciVerifying || !/^A\d{5,6}$/i.test(rciNumber.trim())}
                  onClick={async () => {
                    setRciVerifying(true);
                    try {
                      const resp = await fetch(`${getApiBaseUrl()}/verify-rci`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rci_number: rciNumber.trim().toUpperCase() }),
                      });
                      const data = await resp.json();
                      setRciVerified(data);
                      if (data.verified) toast.success('RCI Number Verified Successfully!');
                      else toast.error(data.message || 'RCI number not found.');
                    } catch { toast.error('Failed to verify RCI number.'); setRciVerified(null); }
                    finally { setRciVerifying(false); }
                  }}
                >
                  {rciVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
              </div>
              {rciVerified && (
                <div className={cn("flex flex-col gap-1 text-xs mt-1", rciVerified.verified ? "text-green-600" : "text-red-500")}>
                  {rciVerified.verified ? (
                    <>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span>Verified</span>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="whitespace-pre-wrap leading-relaxed">{rciVerified.practitioner_name || 'Valid'}</span>
                    </>
                  ) : (
                    <div className="flex items-start gap-1.5">
                      <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="whitespace-pre-wrap leading-relaxed">{rciVerified.message}</span>
                    </div>
                  )}
                </div>
              )}
              <a
                href="https://rciregistration.nic.in/rehabcouncil/newsearch_modify.jsp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Verify on RCI website
              </a>
              <label className="flex flex-col items-start gap-0 text-xs text-muted-foreground mt-1 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={noRci} onChange={(e) => { setNoRci(e.target.checked); if (e.target.checked) { setRciNumber(''); setRciVerified(null); } }} className="rounded border-primary/30" />
                  I don't have an RCI number
                </span>
                <span className="ml-6 text-[11px] text-muted-foreground/80 mt-0.5">
                  (Undergraduate / Student)
                </span>
              </label>
            </div>
          )}

          <div className="grid gap-2 relative">
            <Label>Clinic Name <span className="text-destructive">*</span></Label>
            <div ref={clinicDropdownRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Type to search clinics..."
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
                        No clinics found.
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

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createStaffMutation.isPending}>
              {createStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Staff
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
