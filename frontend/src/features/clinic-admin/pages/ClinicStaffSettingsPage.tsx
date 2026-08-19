import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { LayoutDashboard, FileText, Calendar, ShieldAlert, User, UserCog, Wallet, HeartPulse, Search, Check, ChevronsUpDown, Link } from "lucide-react";
import { toast } from "sonner";
import { getStaff, updateStaffPermissions } from "@/services/authService";
import type { AuthUser } from "@/types/auth";
import { useAuthStore } from "@/store/useAuthStore";

export function ClinicStaffSettingsPage() {
  const user = useAuthStore(s => s.user);
  const isOrg = user?.role?.startsWith("org_");

  const [staffList, setStaffList] = useState<AuthUser[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [savedPermissions, setSavedPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredStaff = staffList.filter(staff => {
    const name = `${staff.first_name} ${staff.last_name || ""}`.toLowerCase();
    const email = staff.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  useEffect(() => {
    async function loadStaff() {
      try {
        const staff = await getStaff();
        setStaffList(staff);

        const initialPermissions: Record<string, Record<string, boolean>> = {};
        staff.forEach(s => {
          const mods = s.module_permissions;
          const hasMods = mods && Object.keys(mods).length > 0;
          initialPermissions[s.id] = hasMods ? mods : {
            assessments: s.can_assess || false,
            appointments: false,
            patients: false,
            reports: false,
            can_view_wallet_history: false,
            can_recharge: false,
            remote_assessment_link_management: false,
          };
        });
        setPermissions(initialPermissions);
        setSavedPermissions(JSON.parse(JSON.stringify(initialPermissions)));

        if (staff.length > 0) {
          setSelectedStaffId(staff[0].id);
        }
      } catch (err) {
        toast.error("Failed to load staff list.");
      } finally {
        setIsLoading(false);
      }
    }
    loadStaff();
  }, []);

  const ROLE_DEFAULTS: Record<string, Record<string, boolean>> = {
    staff_view_only: {
      assessments: false,
      appointments: true,
      patients: true,
      reports: true,
      can_view_wallet_history: false,
      can_recharge: false,
      remote_assessment_link_management: true,
    },
    psychology_assessment: {
      assessments: true,
      appointments: true,
      patients: true,
      reports: true,
      can_view_wallet_history: true,
      can_recharge: true,
      remote_assessment_link_management: true,
    },
  };

  const toggleModule = (moduleKey: string) => {
    if (!selectedStaffId) return;
    setPermissions(prev => ({
      ...prev,
      [selectedStaffId]: {
        ...prev[selectedStaffId],
        [moduleKey]: !prev[selectedStaffId][moduleKey]
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedStaffId) return;
    setIsSaving(true);
    try {
      await updateStaffPermissions(selectedStaffId, {
        module_permissions: permissions[selectedStaffId]
      });
      const updatedStaff = await getStaff();
      setStaffList(updatedStaff);
      setSavedPermissions(prev => ({
        ...prev,
        [selectedStaffId]: JSON.parse(JSON.stringify(permissions[selectedStaffId]))
      }));
      toast.success("Staff module settings saved successfully");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const currentModules = permissions[selectedStaffId] || {};
  const isDirty = selectedStaffId && savedPermissions[selectedStaffId]
    ? JSON.stringify(permissions[selectedStaffId]) !== JSON.stringify(savedPermissions[selectedStaffId])
    : false;

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Staff Settings  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <UserCog className="h-8 w-8 text-primary" />
          Staff Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage platform modules and staff permissions.</p>
      </div>

      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Staff Module Permissions
          </CardTitle>
          <CardDescription>Configure which features are available for each individual staff member.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-3">
            <Label className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Select Staff Member
            </Label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading staff...</div>
            ) : staffList.length === 0 ? (
              <div className="text-sm text-muted-foreground">No staff members found.</div>
            ) : (
              <div className="flex flex-col gap-4">
                <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={isDropdownOpen} className="w-full md:w-1/2 justify-between bg-background h-12 font-normal">
                      {selectedStaffId
                        ? `${staffList.find(s => s.id === selectedStaffId)?.first_name} ${staffList.find(s => s.id === selectedStaffId)?.last_name || ""}`
                        : "Select staff member"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {filteredStaff.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No staff found.</div>
                      ) : (
                        filteredStaff.map((staff) => (
                          <div
                            key={staff.id}
                            className={`relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-primary/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${selectedStaffId === staff.id ? 'bg-primary/15 text-primary' : ''}`}
                            onClick={() => {
                              setSelectedStaffId(staff.id);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${selectedStaffId === staff.id ? 'opacity-100' : 'opacity-0'}`} />
                            <div className="flex flex-col items-start text-left py-1">
                              <span className="font-medium text-sm">{staff.first_name} {staff.last_name || ""}</span>
                              <span className="text-xs text-muted-foreground mt-0.5">
                                <span className={staff.can_assess ? "text-primary font-medium" : "text-green-600 font-medium dark:text-green-400"}>
                                  {staff.can_assess ? "Psychologist Assessment" : "Staff View Only"}
                                </span>
                                <span className="mx-1.5 opacity-50">•</span>
                                {staff.email}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {selectedStaffId && (
                  <div className="p-3 bg-background/50 rounded-lg border border-border/50 flex items-center gap-3 w-full md:w-1/2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">
                        {staffList.find(s => s.id === selectedStaffId)?.first_name}{" "}
                        {staffList.find(s => s.id === selectedStaffId)?.last_name || ""}
                      </span>
                      <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={currentModules.assessments ? "psychology_assessment" : "staff_view_only"}
                          onValueChange={(val) => {
                            setPermissions(prev => ({
                              ...prev,
                              [selectedStaffId]: {
                                ...prev[selectedStaffId],
                                ...ROLE_DEFAULTS[val],
                              }
                            }));
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs px-2 border-primary/20 bg-primary/5 w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff_view_only">
                              <span className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                Staff View Only
                              </span>
                            </SelectItem>
                            <SelectItem value="psychology_assessment">
                              <span className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
                                Psychologist Assessment
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">Changes made below will apply only to the selected staff member.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-center justify-between space-x-4 p-4 border border-border/50 rounded-xl bg-background/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label className="text-base font-bold">Assessments</Label>
                  <p className="text-sm text-muted-foreground">Run psychological assessments (Controlled by Role)</p>
                </div>
              </div>
              <Switch checked={!!currentModules.assessments} onCheckedChange={() => toggleModule('assessments')} disabled={!selectedStaffId} />
            </div>

            <div className="flex items-center justify-between space-x-4 p-4 border border-border/50 rounded-xl bg-background/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-sky-500/10 flex items-center justify-center">
                  <HeartPulse className="h-5 w-5 text-sky-500" />
                </div>
                <div>
                  <Label className="text-base font-bold">{isOrg ? "Candidates" : "Patients"}</Label>
                  <p className="text-sm text-muted-foreground">Add and manage {isOrg ? "candidates" : "patients"}</p>
                </div>
              </div>
              <Switch checked={!!currentModules.patients} onCheckedChange={() => toggleModule('patients')} disabled={!selectedStaffId} />
            </div>

            <div className="flex items-center justify-between space-x-4 p-4 border border-border/50 rounded-xl bg-background/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label className="text-base font-bold">Appointments</Label>
                  <p className="text-sm text-muted-foreground">Scheduling and calendars</p>
                </div>
              </div>
              <Switch checked={!!currentModules.appointments} onCheckedChange={() => toggleModule('appointments')} disabled={!selectedStaffId} />
            </div>

            <div className="flex items-center justify-between space-x-4 p-4 border border-border/50 rounded-xl bg-background/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <Label className="text-base font-bold">Reports</Label>
                  <p className="text-sm text-muted-foreground">View analytical reports</p>
                </div>
              </div>
              <Switch checked={!!currentModules.reports} onCheckedChange={() => toggleModule('reports')} disabled={!selectedStaffId} />
            </div>

            <div className="flex items-center justify-between space-x-4 p-4 border border-border/50 rounded-xl bg-background/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <Label className="text-base font-bold">Wallet</Label>
                  <p className="text-sm text-muted-foreground">Manage wallet balance, recharge, and transactions</p>
                </div>
              </div>
              <Switch
                checked={!!currentModules.can_view_wallet_history || !!currentModules.can_recharge}
                onCheckedChange={(checked) => {
                  if (!selectedStaffId) return;
                  setPermissions(prev => ({
                    ...prev,
                    [selectedStaffId]: {
                      ...prev[selectedStaffId],
                      can_view_wallet_history: checked,
                      can_recharge: checked
                    }
                  }));
                }}
                disabled={!selectedStaffId}
              />
            </div>

            <div className="flex items-center justify-between space-x-4 p-4 border border-border/50 rounded-xl bg-background/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Link className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <Label className="text-base font-bold">Link Management</Label>
                  <p className="text-sm text-muted-foreground">Manage and revoke remote assessment links</p>
                </div>
              </div>
              <Switch checked={!!currentModules.remote_assessment_link_management} onCheckedChange={() => toggleModule('remote_assessment_link_management')} disabled={!selectedStaffId} />
            </div>

          </div>
          <div className="flex justify-end mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!selectedStaffId || isSaving || !isDirty}>
                  {isSaving ? "Saving..." : "Save Module Settings"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will immediately update the module permissions for the selected staff member. They will gain or lose access to these sections on their next interaction.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSave}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
