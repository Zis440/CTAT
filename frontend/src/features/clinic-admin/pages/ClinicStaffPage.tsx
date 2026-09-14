import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, RotateCcw, Search, Users, Shield, Loader2, UserPlus, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addStaff, getStaff } from "@/services/authService";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { cn, maskPhoneNumber, getApiBaseUrl } from "@/lib/utils";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/store/useAuthStore";

export function ClinicStaffPage() {
  const navigate = useNavigate();
  const { pageId } = useParams();
  const page = parseInt(pageId as string, 10) || 1;
  const PAGE_SIZE = 3;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const user = useAuthStore(s => s.user);
  const isOrg = user?.role?.startsWith("org_");

  const getBasePath = () => {
    if (user?.role === "org_admin") return "/org";
    if (user?.role === "org_staff") return "/org-staff";
    if (user?.role === "clinic_staff") return "/clinic-staff";
    return "/clinic";
  };
  const basePath = getBasePath();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleType, setRoleType] = useState<"staff_view" | "psychology_assessment">("staff_view");
  const [password, setPassword] = useState("");
  const [rciNumber, setRciNumber] = useState("");
  const [noRci, setNoRci] = useState(false);
  const [rciVerifying, setRciVerifying] = useState(false);
  const [rciVerified, setRciVerified] = useState<{ verified: boolean; practitioner_name?: string | null; message?: string } | null>(null);

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleAllOnPage,
    toggleItemSelection,
    isItemSelected,
    exportSelectedToPDF,
    exportSelectedToExcel,
  } = useBulkSelection<any>();

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ["clinic-staff"],
    queryFn: getStaff,
  });

  const addStaffMutation = useMutation({
    mutationFn: addStaff,
    onSuccess: () => {
      toast.success("Staff member added successfully");
      queryClient.invalidateQueries({ queryKey: ["clinic-staff"] });
      setIsAddOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRoleType("staff_view");
      setRciNumber("");
      setNoRci(false);
      setRciVerified(null);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        toast.error(detail[0]?.msg || "Validation error in form");
      } else if (typeof detail === "string") {
        toast.error(detail);
      } else {
        toast.error("Failed to add staff member");
      }
    },
  });

  const handleAddStaff = () => {
    if (!firstName || !email || !phone || !password) {
      toast.error("Please fill in all required fields (Name, Email, Phone, Password)");
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

    addStaffMutation.mutate({
      first_name: firstName,
      last_name: lastName || undefined,
      email,
      phone,
      password,
      role_type: roleType,
      rci_number: roleType === "psychology_assessment" && !noRci ? rciNumber.trim().toUpperCase() : undefined,
    });
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Staff  | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Staff
          </h1>
          <p className="text-muted-foreground mt-1">Manage {isOrg ? "organization" : "clinic"} staff members and their permissions.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isSelectionMode && (
            <>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                    <UserPlus className="mr-2 h-4 w-4" /> Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                    <DialogDescription>
                      Create a new staff account for your {isOrg ? "organization" : "clinic"}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>First Name *</Label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Last Name</Label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name (Optional)" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Phone Number *</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXX XXX XXXX" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Email *</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`staff@${isOrg ? "organization" : "clinic"}.com`} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Temporary Password *</Label>
                      <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set a temporary password" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Role & Permissions *</Label>
                      <Select value={roleType} onValueChange={(val: any) => setRoleType(val)}>
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff_view">Staff (View Only)</SelectItem>
                          <SelectItem value="psychology_assessment">Psychology Assessment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {roleType === "psychology_assessment" && (
                      <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label>RCI Registration No. *</Label>
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
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddStaff} disabled={addStaffMutation.isPending}>
                      {addStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button type="button" variant="outline" onClick={toggleSelectionMode}>
                <Check className="h-4 w-4 mr-2" />
                Select
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />

        {isSelectionMode ? (
          <div className="flex items-center justify-between p-4 bg-primary/10 border-b border-primary/20">
            <span className="text-base font-medium text-foreground">
              {selectedItems.size} staff selected
            </span>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={toggleSelectionMode}>
                Cancel
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="default">Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      exportSelectedToPDF({
                        pdfHeader: "Staff",
                        columns: [
                          { label: "Name", key: (s: any) => [s.first_name, s.last_name].filter(Boolean).join(" ") },
                          { label: "Phone", key: "phone" },
                          { label: "Email", key: "email" },
                          { label: "Status", key: (s: any) => s.is_active ? "Active" : "Inactive" },
                        ],
                      })
                    }
                  >
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      exportSelectedToExcel(
                        {
                          columns: [
                            { label: "Name", key: (s: any) => [s.first_name, s.last_name].filter(Boolean).join(" ") },
                            { label: "Phone", key: "phone" },
                            { label: "Email", key: "email" },
                            { label: "Status", key: (s: any) => s.is_active ? "Active" : "Inactive" },
                          ],
                        },
                        "Staff"
                      )
                    }
                  >
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex w-full max-w-sm items-center space-x-2">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search by staff name..." className="pl-8 bg-background/50" />
                </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" /> Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-4">
                    <div className="grid gap-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">Filter Options</h4>
                          <p className="text-sm text-muted-foreground">Adjust filters for {isOrg ? "organization" : "clinic"} staff.</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground -mt-1 -mr-1">
                          <RotateCcw className="mr-2 h-3 w-3" /> Reset
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        <Select defaultValue="all">
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent className="p-0">
          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow className="hover:bg-transparent">
                {isSelectionMode && (
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={staffList.length > 0 && staffList.every(item => isItemSelected(item.id))}
                      onCheckedChange={(checked) => toggleAllOnPage(staffList, checked as boolean)}
                    />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {(() => {
                if (isLoading) {
                  return Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                      {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</span>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Contact</span>
                        <div className="flex flex-col gap-1.5 max-md:items-end">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Permission</span><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ));
                }

                const paginated = staffList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

                if (staffList.length === 0) {
                  return (
                    <TableRow className="max-md:block">
                      <TableCell colSpan={isSelectionMode ? 6 : 5} className="h-48 text-center max-md:block max-md:py-8">
                        <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-lg font-medium text-muted-foreground">No staff members yet</p>
                        <p className="text-sm text-muted-foreground/60 mt-1">Added staff members will appear here.</p>
                      </TableCell>
                    </TableRow>
                  );
                }

                return paginated.map((staff: any) => (
                <TableRow key={staff.id} className="max-md:block max-md:p-4 max-md:border-b max-md:relative">
                  {isSelectionMode && (
                    <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                      <Checkbox
                        checked={isItemSelected(staff.id)}
                        onCheckedChange={() => toggleItemSelection(staff)}
                      />
                    </TableCell>
                  )}
                  <TableCell className={cn("py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                    <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</span>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {([staff.first_name, staff.last_name].filter(Boolean).join(" ") || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 pr-2 max-md:text-right">
                        <p className="text-sm font-bold truncate text-foreground">{[staff.first_name, staff.last_name].filter(Boolean).join(" ") || "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                    <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Contact</span>
                    <div className="flex flex-col gap-0.5 max-md:items-end">
                      <span className="text-sm font-medium text-foreground">{staff.phone ? maskPhoneNumber(staff.phone) : "—"}</span>
                      <span className="text-xs text-muted-foreground">{staff.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                    <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                    <div>
                      {staff.is_active ? (
                        <Badge variant="outline" className="border-green-500/20 text-green-500 bg-green-500/10">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-500/20 text-red-500 bg-red-500/10">Inactive</Badge>
                      )}
                      {" "}
                      {staff.verification_status === "approved" && (
                        <Badge variant="outline" className="border-blue-500/20 text-blue-500 bg-blue-500/10 ml-2">Verified</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                    <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Permission</span>

                    {staff.can_assess ? (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span>Psychology Assessment</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Staff View Only</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                    <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                    <div className="flex items-center justify-end gap-2">
                      <InteractiveHoverButton
                        onClick={() => navigate(`/clinic/staff/${staff.id}/details`)}
                        className="text-xs h-8 py-0 px-4"
                      >
                        Details
                      </InteractiveHoverButton>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
                        disabled={!staff.is_active}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ));
              })()}
            </TableBody>
          </Table>

        </CardContent>
      </Card>

      <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
          {isLoading ? (
            "Loading..."
          ) : staffList.length === 0 ? (
            <>Showing <span className="font-medium text-foreground">0</span> to <span className="font-medium text-foreground">0</span> of <span className="font-medium text-foreground">0</span> staff members</>
          ) : (
            <>
              Showing <span className="font-medium text-foreground">{Math.min((page - 1) * PAGE_SIZE + 1, staffList.length)}</span> to <span className="font-medium text-foreground">{Math.min(page * PAGE_SIZE, staffList.length)}</span> of <span className="font-medium text-foreground">{staffList.length}</span> staff members
            </>
          )}
        </p>
        {(() => {
          const totalPages = Math.max(1, Math.ceil(staffList.length / PAGE_SIZE));
          return (
            <Pagination className="sm:justify-end sm:w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => navigate(page > 2 ? `${basePath}/staff/page/${page - 1}` : `${basePath}/staff`)}
                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (totalPages > 7 && (pageNum < page - 2 || pageNum > page + 2) && pageNum !== 1 && pageNum !== totalPages) {
                    if (pageNum === page - 3 || pageNum === page + 3) return <PaginationItem key={pageNum}><PaginationEllipsis /></PaginationItem>;
                    return null;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink onClick={() => navigate(pageNum === 1 ? `${basePath}/staff` : `${basePath}/staff/page/${pageNum}`)} isActive={page === pageNum} className="cursor-pointer">
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => navigate(`${basePath}/staff/page/${page + 1}`)}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          );
        })()}
      </div>
    </div>
  );
}
