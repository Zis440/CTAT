import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, RotateCcw, Search, Users, Shield, Check, UserPlus, Loader2, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { cn, maskPhoneNumber } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { fetchUsers, deleteUser, type UserFilters } from "@/features/super-admin/services/adminService";
import { AddStaffDialog } from "@/features/super-admin/components/AddStaffDialog";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { UserAuditLogsSheet } from "@/features/super-admin/components/UserAuditLogsSheet";
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

// ── Local shape used by the UI ───────────────────────────────────────────────
interface StaffItem {
  id: string;
  name: string;
  email: string;
  clinic: string;
  phone: string;
  status: "active" | "inactive";
  joined: string;
  role: string;
  can_assess?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function roleInfo(role: string, canAssess?: boolean): { label: string; icon: "shield" | "users" } {
  if (role === "clinic_admin" || role === "org_admin") return { label: role === "org_admin" ? "Org Admin" : "Clinic Admin", icon: "shield" };
  if (role === "individual_psychologist") return { label: "Psychologist", icon: "shield" };
  if ((role === "clinic_staff" || role === "org_staff") && canAssess) return { label: "Psychology Assessment", icon: "shield" };
  return { label: "Staff View Only", icon: "users" };
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminStaffPage() {
  const navigate = useNavigate();
  const { pageId } = useParams();
  const page = parseInt(pageId as string, 10) || 1;
  const pageSize = 30;

  // Data
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [deletingStaff, setDeletingStaff] = useState<StaffItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingLogsFor, setViewingLogsFor] = useState<StaffItem | null>(null);

  const [staffTab, setStaffTab] = useState<"clinic" | "organization">("clinic");

  // Bulk selection
  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleAllOnPage,
    toggleItemSelection,
    isItemSelected,
    exportSelectedToPDF,
    exportSelectedToExcel,
  } = useBulkSelection<StaffItem>();

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: UserFilters = {
        page,
        page_size: pageSize,
        // No role filter → fetch clinic_staff + clinic_admin + individual_psychologist
        // We use account_type=clinic so we get all clinic-account users (staff of all kinds)
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(roleFilter !== "all" ? { role: roleFilter } : {}),
        ...(statusFilter === "active" ? { is_active: true } : {}),
        ...(statusFilter === "inactive" ? { is_active: false } : {}),
        account_type: staffTab,
      };
      const res = await fetchUsers(filters);

      const validRoles = new Set(["clinic_staff", "clinic_admin", "org_staff", "org_admin"]);
      const transformed: StaffItem[] = res.users
        .filter((u: any) => validRoles.has(u.role))
        .map((u: any) => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name ?? ""}`.trim(),
          email: u.email,
          clinic: u.clinic_name ?? "",
          phone: u.phone ?? "",
          status: u.is_active ? "active" : "inactive",
          joined: "",
          role: u.role,
          can_assess: u.can_assess,
        }));

      setStaffList(transformed);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, roleFilter, statusFilter, staffTab]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleReset = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    try {
      await deleteUser(deletingStaff.id);
      toast.success(`Staff ${deletingStaff.name || "Unknown"} deactivated.`);
      setDeletingStaff(null);
      loadStaff();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete staff member.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Staff Management  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Staff Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage clinic staff members across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isSelectionMode && (
            <>
              <AddStaffDialog onSuccess={() => loadStaff()}>
                <Button
                  type="button"
                  variant="default"
                  className="bg-primary/10 text-primary hover:bg-primary/20"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </AddStaffDialog>
              <Button type="button" variant="outline" onClick={toggleSelectionMode}>
                <Check className="h-4 w-4 mr-2" />
                Select
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={staffTab} onValueChange={(v) => { setStaffTab(v as "clinic" | "organization"); navigate("/admin/staff"); }} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="clinic" className="gap-2">
            <Shield className="h-4 w-4" />
            Clinic Staff
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Users className="h-4 w-4" />
            Organization Staff
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinic" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />

            {/* Selection-mode banner / Search+filter bar */}
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
                        pdfHeader: "Staff Management",
                        columns: [
                          { label: "Name", key: "name" },
                          { label: "Clinic", key: "clinic" },
                          { label: "Phone", key: "phone" },
                          { label: "Status", key: "status" },
                          { label: "Role", key: "role" },
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
                            { label: "Name", key: "name" },
                            { label: "Clinic", key: "clinic" },
                            { label: "Phone", key: "phone" },
                            { label: "Status", key: "status" },
                            { label: "Role", key: "role" },
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
              {/* Search */}
              <div className="flex w-full max-w-sm items-center space-x-2">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by name or email..."
                    className="pl-8 bg-background/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter + Reset */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" /> Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-4">
                    <div className="grid gap-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium leading-none">Filter Options</h4>
                          <p className="text-sm text-muted-foreground">Narrow down platform staff.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2 text-xs">
                          <RotateCcw className="mr-2 h-3 w-3" /> Reset
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        {/* Role filter */}
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Permission / Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Permissions</SelectItem>
                            <SelectItem value="clinic_admin">Clinic Admin</SelectItem>
                            <SelectItem value="clinic_staff">Staff View Only</SelectItem>
                          </SelectContent>
                        </Select>
                        {/* Status filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Account Status" />
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
                <TableHead>Clinic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                    {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                    <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground">Name:</span>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground">Contact:</span>
                      <div className="flex flex-col gap-1.5 max-md:items-end">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground">Clinic:</span>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground">Status:</span>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground">Permission:</span>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                      <span className="md:hidden font-semibold text-muted-foreground">Actions:</span>
                      <div className="flex items-center justify-end gap-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-14" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : staffList.length === 0 ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={isSelectionMode ? 7 : 6} className="max-md:block">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">No staff members found</p>
                      <p className="text-sm text-muted-foreground/60 mt-1">
                        Platform staff members will appear here.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                staffList.map((staff) => {
                  const { label, icon } = roleInfo(staff.role, staff.can_assess);
                  return (
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
                            {(staff.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 pr-2 max-md:text-right">
                            <p className="text-sm font-bold truncate text-foreground">{staff.name || "—"}</p>
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
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Clinic</span>
                        {staff.clinic || "—"}
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                        {staff.status === "active" ? (
                          <Badge
                            variant="outline"
                            className="border-green-500/20 text-green-500 bg-green-500/10"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-red-500/20 text-red-500 bg-red-500/10"
                          >
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Permission</span>
                        <div className="flex items-center gap-2">
                          {icon === "shield" ? (
                            <Shield className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-sm">{label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                        <div className="flex items-center justify-end gap-2">
                          <InteractiveHoverButton
                            onClick={() => navigate(`/admin/staff/${staff.id}/details`)}
                            className="text-xs h-8 py-0 px-4"
                          >
                            Details
                          </InteractiveHoverButton>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-3 bg-secondary/50"
                            onClick={() => setViewingLogsFor(staff)}
                          >
                            Logs
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
                            onClick={() => setDeletingStaff(staff)}
                            disabled={staff.status !== "active"}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="organization" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />

            {/* Selection-mode banner / Search+filter bar */}
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
                            pdfHeader: "Staff Management",
                            columns: [
                              { label: "Name", key: "name" },
                              { label: "Organization", key: "clinic" },
                              { label: "Phone", key: "phone" },
                              { label: "Status", key: "status" },
                              { label: "Role", key: "role" },
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
                                { label: "Name", key: "name" },
                                { label: "Organization", key: "clinic" },
                                { label: "Phone", key: "phone" },
                                { label: "Status", key: "status" },
                                { label: "Role", key: "role" },
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
                  {/* Search */}
                  <div className="flex w-full max-w-sm items-center space-x-2">
                    <div className="relative w-full">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search by name or email..."
                        className="pl-8 bg-background/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Filter + Reset */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="mr-2 h-4 w-4" /> Filter
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-80 p-4">
                        <div className="grid gap-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium leading-none">Filter Options</h4>
                              <p className="text-sm text-muted-foreground">Narrow down platform staff.</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2 text-xs">
                              <RotateCcw className="mr-2 h-3 w-3" /> Reset
                            </Button>
                          </div>
                          <div className="grid gap-3">
                            {/* Role filter */}
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                              <SelectTrigger className="w-full h-9">
                                <SelectValue placeholder="Permission / Role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Permissions</SelectItem>
                                <SelectItem value="org_admin">Org Admin</SelectItem>
                                <SelectItem value="org_staff">Staff View Only</SelectItem>
                              </SelectContent>
                            </Select>
                            {/* Status filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="w-full h-9">
                                <SelectValue placeholder="Account Status" />
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
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permission</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="max-md:block">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                        {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                        <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground">Name:</span>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </TableCell>
                        <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground">Contact:</span>
                          <div className="flex flex-col gap-1.5 max-md:items-end">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground">Organization:</span>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground">Status:</span>
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground">Permission:</span>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                          <span className="md:hidden font-semibold text-muted-foreground">Actions:</span>
                          <div className="flex items-center justify-end gap-2">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-8 w-14" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : staffList.length === 0 ? (
                    <TableRow className="max-md:block">
                      <TableCell colSpan={isSelectionMode ? 7 : 6} className="max-md:block">
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground">No staff members found</p>
                          <p className="text-sm text-muted-foreground/60 mt-1">
                            Platform staff members will appear here.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffList.map((staff) => {
                      const { label, icon } = roleInfo(staff.role, staff.can_assess);
                      return (
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
                                {(staff.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 pr-2 max-md:text-right">
                                <p className="text-sm font-bold truncate text-foreground">{staff.name || "—"}</p>
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
                            <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Organization</span>
                            {staff.clinic || "—"}
                          </TableCell>
                          <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                            <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                            {staff.status === "active" ? (
                              <Badge
                                variant="outline"
                                className="border-green-500/20 text-green-500 bg-green-500/10"
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-red-500/20 text-red-500 bg-red-500/10"
                              >
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                            <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Permission</span>
                            <div className="flex items-center gap-2">
                              {icon === "shield" ? (
                                <Shield className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <span className="text-sm">{label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                            <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                            <div className="flex items-center justify-end gap-2">
                              <InteractiveHoverButton
                                onClick={() => navigate(`/admin/staff/${staff.id}/details`)}
                                className="text-xs h-8 py-0 px-4"
                              >
                                Details
                              </InteractiveHoverButton>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs px-3 bg-secondary/50"
                                onClick={() => setViewingLogsFor(staff)}
                              >
                                Logs
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
                                onClick={() => setDeletingStaff(staff)}
                                disabled={staff.status !== "active"}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalPages >= 0 && !isLoading && (
        <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            Showing <span className="font-medium text-foreground">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-foreground">{total}</span> staff
          </p>
          <Pagination className="sm:justify-end sm:w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => navigate(page > 2 ? `/admin/staff/page/${page - 1}` : `/admin/staff`)}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (
                  totalPages > 7 &&
                  (pageNum < page - 2 || pageNum > page + 2) &&
                  pageNum !== 1 &&
                  pageNum !== totalPages
                ) {
                  if (pageNum === page - 3 || pageNum === page + 3) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => navigate(pageNum === 1 ? `/admin/staff` : `/admin/staff/page/${pageNum}`)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => navigate(`/admin/staff/page/${page + 1}`)}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingStaff} onOpenChange={(o) => !o && setDeletingStaff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Staff?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate <strong>{deletingStaff?.name || "this staff member"}</strong> (
              {deletingStaff?.email}). They will no longer be able to log in.
              You can reactivate them later from the users page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Audit Logs Sheet */}
      <UserAuditLogsSheet
        userId={viewingLogsFor?.id || null}
        userName={viewingLogsFor?.name || null}
        open={!!viewingLogsFor}
        onOpenChange={(open) => !open && setViewingLogsFor(null)}
      />
    </div>
  );
}
