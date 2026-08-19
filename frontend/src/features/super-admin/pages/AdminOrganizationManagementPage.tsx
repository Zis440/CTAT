import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  Search,
  Filter,
  RotateCcw,
  CheckCircle,
  XCircle,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
import { fetchAdminOrganizations, deleteUser, type AdminClinic } from "@/features/super-admin/services/adminService";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { AddUserDialog } from "@/features/super-admin/components/AddUserDialog";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

export function AdminOrganizationManagementPage() {
  const navigate = useNavigate();
  const { pageId } = useParams();
  const page = parseInt(pageId as string, 10) || 1;
  const pageSize = 15;

  const [organizations, setOrganizations] = useState<AdminClinic[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [deletingOrganization, setDeletingOrganization] = useState<AdminClinic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    toggleAllOnPage,
    exportSelectedToPDF,
    exportSelectedToExcel,
    isItemSelected,
  } = useBulkSelection<AdminClinic>();
  const loadOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: any = {
        page,
        page_size: pageSize,
      };
      if (search.trim()) filters.search = search.trim();
      if (statusFilter !== "all") {
        filters.is_active = statusFilter === "active";
      }

      const res = await fetchAdminOrganizations(filters);
      setOrganizations(res.clinics || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error("Failed to fetch organizations:", err);
      toast.error(err?.response?.data?.detail || "Failed to load organizations.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (page !== 1) {
      navigate("/admin/organizations");
    } else {
      loadOrganizations();
    }
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("all");
    if (page !== 1) {
      navigate("/admin/organizations");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async () => {
    if (!deletingOrganization?.admin_user_id) return;
    setIsDeleting(true);
    try {
      await deleteUser(deletingOrganization.admin_user_id);
      toast.success(`Organization ${deletingOrganization.clinic_name || "Unknown"} deactivated.`);
      setDeletingOrganization(null);
      loadOrganizations();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete organization.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Organization Management  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Organization Management
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Monitor and manage registered healthcare organizations and organizations.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AddUserDialog onSuccess={() => loadOrganizations()} defaultAccountType="organization">
            <Button variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
              <Building2 className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </AddUserDialog>
          {!isSelectionMode && (
            <Button
              type="button"
              variant="outline"
              onClick={toggleSelectionMode}
            >
              <Check className="h-4 w-4" />
              Select
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/30 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOrganizationsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Onboarded systems</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-green-500/30 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">Active Status</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{activeOrganizationsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Actively consulting</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500/30 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">Platform Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {organizations.reduce((sum, c) => sum + (c.total_sessions || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sessions administered</p>
          </CardContent>
        </Card>
      </div> */}

      {/* Main Grid */}
      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
        {isSelectionMode ? (
          <div className="flex items-center justify-between p-4 bg-primary/10 border-b border-primary/20">
            <span className="text-base font-medium text-foreground">
              {selectedItems.size} organizations selected
            </span>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={toggleSelectionMode}>
                Cancel
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="default">
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportSelectedToPDF({ pdfHeader: "Organizations Directory", columns: [{ label: "Name", key: "clinic_name" }, { label: "Email", key: "email" }, { label: "ROC Number", key: "roc_number" }, { label: "Status", key: (c) => c.is_active ? "Active" : "Inactive" }, { label: "Total Users", key: "total_users" }, { label: "Total Patients", key: "total_patients" }, { label: "Total Sessions", key: "total_sessions" }] })}>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportSelectedToExcel({ columns: [{ label: "Name", key: "clinic_name" }, { label: "Email", key: "email" }, { label: "ROC Number", key: "roc_number" }, { label: "Status", key: (c) => c.is_active ? "Active" : "Inactive" }, { label: "Total Users", key: "total_users" }, { label: "Total Patients", key: "total_patients" }, { label: "Total Sessions", key: "total_sessions" }] }, "Organizations")}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <form onSubmit={handleSearchSubmit} className="flex w-full max-w-sm items-center space-x-2">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by organization name or email..."
                    className="pl-8 bg-background/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </form>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto overflow-y-hidden pb-1 md:pb-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" /> Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-4">
                    <div className="grid gap-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">Filter Options</h4>
                          <p className="text-sm text-muted-foreground">Adjust status for organizations list.</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2 text-xs">
                          <RotateCcw className="mr-2 h-3 w-3" /> Reset
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Organization Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active Only</SelectItem>
                            <SelectItem value="inactive">Inactive Only</SelectItem>
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
                      checked={organizations.every(item => isItemSelected(item.id)) && organizations.length > 0}
                      onCheckedChange={() => toggleAllOnPage(organizations, organizations.every(item => isItemSelected(item.id)))}
                    />
                  </TableHead>
                )}
                <TableHead>Organization Profile</TableHead>
                <TableHead>License Info (ROC)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Patients</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                    {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Organization Profile</span><Skeleton className="h-8 w-40" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">License Info</span><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Staff</span><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Patients</span><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Sessions</span><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span><Skeleton className="h-8 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : organizations.length === 0 ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-48 text-center max-md:block max-md:py-8">
                    <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No organizations registered on platform.</p>
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((organization) => (
                  <TableRow key={organization.id} className="hover:bg-muted/50 transition-colors max-md:block max-md:p-4 max-md:border-b max-md:relative">
                    {isSelectionMode && (
                      <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                        <Checkbox
                          checked={selectedItems.has(organization.id!)}
                          onCheckedChange={() => toggleItemSelection(organization)}
                        />
                      </TableCell>
                    )}
                    <TableCell className={cn("py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Organization Profile</span>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {(organization.clinic_name || organization.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 pr-2 max-md:text-right">
                          <p className="text-sm font-bold truncate text-foreground">{organization.clinic_name || organization.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{organization.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">License Info</span>
                      <span className="font-semibold text-xs font-mono">{organization.roc_number || "—"}</span>
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                      {organization.is_active ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                          <CheckCircle className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                          <XCircle className="h-3 w-3" /> Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-sm max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Staff</span>
                      {organization.total_users || 0}
                    </TableCell>
                    <TableCell className="font-semibold text-sm max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Patients</span>
                      {organization.total_patients || 0}
                    </TableCell>
                    <TableCell className="font-semibold text-sm max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Sessions</span>
                      {organization.total_sessions || 0}
                    </TableCell>
                    <TableCell className="py-3 text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                      <div className="flex items-center justify-end gap-2">
                        <InteractiveHoverButton
                          onClick={() => navigate(`/admin/organizations/${organization.id}/details`)}
                          className="text-xs h-8 py-0 px-4"
                        >
                          Details
                        </InteractiveHoverButton>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
                          onClick={() => setDeletingOrganization(organization)}
                          disabled={!organization.is_active}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

      </Card>

      {/* Pagination */}
      {totalPages >= 0 && !isLoading && (
        <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            Showing <span className="font-medium text-foreground">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-foreground">{total}</span> organizations
          </p>
          <Pagination className="sm:justify-end sm:w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => navigate(page > 2 ? `/admin/organizations/page/${page - 1}` : `/admin/organizations`)}
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
                      onClick={() => navigate(pageNum === 1 ? `/admin/organizations` : `/admin/organizations/page/${pageNum}`)}
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
                  onClick={() => navigate(`/admin/organizations/page/${page + 1}`)}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingOrganization} onOpenChange={(o) => !o && setDeletingOrganization(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the organization admin account for <strong>{deletingOrganization?.clinic_name || "this organization"}</strong>. They will no longer be able to log in.
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
    </div>
  );
}
