
import { useState, useEffect, useCallback, type JSX } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search,
  Loader2,
  AlertTriangle,
  UserCog,
  RotateCcw,
  Filter,
  UserPlus,
  Check,
  CheckCircle,
  Clock,
  XCircle,
  CircleDashed,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, getMediaUrl, maskPhoneNumber } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  fetchUsers,
  deleteUser,
  type AdminUser,
  type UserFilters,
} from "@/features/super-admin/services/adminService";

import { AddUserDialog } from "@/features/super-admin/components/AddUserDialog";
import { UserAuditLogsSheet } from "@/features/super-admin/components/UserAuditLogsSheet";
import { RoleBadge } from "@/components/common/RoleBadge";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string; icon: JSX.Element }> = {
    approved: {
      label: "Approved",
      className: "bg-green-500/10 text-green-500 border-green-500/30",
      icon: <CheckCircle className="mr-1.5 h-3 w-3" />,
    },
    pending: {
      label: "Pending",
      className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
      icon: <Clock className="mr-1.5 h-3 w-3" />,
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-500/10 text-red-500 border-red-500/30",
      icon: <XCircle className="mr-1.5 h-3 w-3" />,
    },
    not_submitted: {
      label: "Not Submitted",
      className: "bg-gray-500/10 text-gray-400 border-gray-500/30",
      icon: <CircleDashed className="mr-1.5 h-3 w-3" />,
    },
  };
  const entry = map[status] || { label: status, className: "", icon: <></> };
  return (
    <Badge variant="outline" className={`text-xs ${entry.className}`}>
      {entry.icon}
      {entry.label}
    </Badge>
  );
}

function getRowColorClass(_role: string): string {
  return "hover:bg-muted/50";
}

export function UserManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const { pageId } = useParams();
  const page = parseInt(pageId as string, 10) || 1;
  const pageSize = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>(filterParam || "all");

  useEffect(() => {
    const param = searchParams.get("filter");
    if (param) setAccountStatusFilter(param);
    else setAccountStatusFilter("all");
  }, [searchParams]);

  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHardDeleting, setIsHardDeleting] = useState(false);
  const [viewingLogsFor, setViewingLogsFor] = useState<AdminUser | null>(null);

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    toggleAllOnPage,
    isItemSelected,
    exportSelectedToPDF,
    exportSelectedToExcel,
  } = useBulkSelection<AdminUser>();

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: UserFilters = {
        page,
        page_size: pageSize,
      };
      if (search.trim()) filters.search = search.trim();
      if (roleFilter !== "all") filters.role = roleFilter;
      if (statusFilter !== "all") filters.verification_status = statusFilter;
      if (accountStatusFilter === "active") filters.is_active = true;
      if (accountStatusFilter === "inactive") filters.is_active = false;

      const res = await fetchUsers(filters);
      setUsers(res.users);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, roleFilter, statusFilter, accountStatusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (page !== 1) {
      navigate('/admin/users');
    }
  }, [search, roleFilter, statusFilter, accountStatusFilter]);

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async (hard: boolean = false) => {
    if (!deletingUser) return;
    setIsDeleting(true);
    if (hard) setIsHardDeleting(true);
    try {
      await deleteUser(deletingUser.id, hard);
      toast.success(hard ? `User ${deletingUser.email} permanently deleted.` : `User ${deletingUser.email} deactivated.`);
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to modify user.");
    } finally {
      setIsDeleting(false);
      setIsHardDeleting(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>User Management  | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-7 w-7 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View, edit, and manage all platform users.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AddUserDialog onSuccess={() => loadUsers()}>
            <Button variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
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

      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
        {isSelectionMode ? (
          <div className="flex items-center justify-between p-4 bg-primary/10 border-b border-primary/20">
            <span className="text-base font-medium text-foreground">
              {selectedItems.size} users selected
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
                  <DropdownMenuItem onClick={() => exportSelectedToPDF({ pdfHeader: "User Management", columns: [{ label: "First Name", key: "first_name" }, { label: "Last Name", key: "last_name" }, { label: "Email", key: "email" }, { label: "Phone", key: "phone" }, { label: "Role", key: "role" }, { label: "Status", key: "verification_status" }, { label: "Clinic", key: "clinic_name" }] })}>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportSelectedToExcel({ columns: [{ label: "First Name", key: "first_name" }, { label: "Last Name", key: "last_name" }, { label: "Email", key: "email" }, { label: "Phone", key: "phone" }, { label: "Role", key: "role" }, { label: "Status", key: "verification_status" }, { label: "Clinic", key: "clinic_name" }] }, "Users")}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">

              <div className="flex w-full max-w-sm items-center space-x-2">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or clinic..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 bg-background/50"
                  />
                </div>
              </div>

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
                          <p className="text-sm text-muted-foreground">Adjust filters for users.</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setRoleFilter("all");
                            setStatusFilter("all");
                            setAccountStatusFilter("all");
                            searchParams.delete("filter");
                            setSearchParams(searchParams);
                          }}
                          className="h-8 px-2 text-xs"
                        >
                          <RotateCcw className="mr-2 h-3 w-3" /> Reset
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground font-bold uppercase">Role</Label>
                          <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Roles</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="clinic_admin">Clinic Admin</SelectItem>
                              <SelectItem value="clinic_staff">Clinic Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground font-bold uppercase">Verification Status</Label>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="not_submitted">Not Submitted</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground font-bold uppercase">Account Status</Label>
                          <Select
                            value={accountStatusFilter}
                            onValueChange={(val) => {
                              setAccountStatusFilter(val);
                              if (val === "all") {
                                searchParams.delete("filter");
                              } else {
                                searchParams.set("filter", val);
                              }
                              setSearchParams(searchParams);
                            }}
                          >
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="All Accounts" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Accounts</SelectItem>
                              <SelectItem value="active">Active Users</SelectItem>
                              <SelectItem value="inactive">Inactive Users</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
                      checked={users.length > 0 && users.every(u => isItemSelected(u.id))}
                      onCheckedChange={() => toggleAllOnPage(users, users.every(u => isItemSelected(u.id)))}
                    />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clinic Info</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                    {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                    <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</span>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Contact</span>
                      <div className="flex flex-col gap-1.5 max-md:items-end">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Role</span><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Clinic Info</span><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={isSelectionMode ? 7 : 6} className="h-48 text-center max-md:block max-md:py-8">
                    <AlertTriangle className="h-10 w-10 text-destructive/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-destructive">{error}</p>
                    <Button variant="outline" size="sm" onClick={loadUsers} className="mt-4 text-foreground">
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={isSelectionMode ? 7 : 6} className="h-48 text-center max-md:block max-md:py-8">
                    <UserCog className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No users found</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filters.</p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className={`${getRowColorClass(user.role)} ${!user.is_active ? "opacity-60" : ""} max-md:block max-md:p-4 max-md:border-b max-md:relative`}>
                    {isSelectionMode && (
                      <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                        <Checkbox
                          checked={isItemSelected(user.id)}
                          onCheckedChange={() => toggleItemSelection(user)}
                        />
                      </TableCell>
                    )}
                    <TableCell className={cn("py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</span>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
                          {user.avatar_url ? (
                            <img src={getMediaUrl(user.avatar_url)} alt={`${user.first_name || ""} ${user.last_name || ""}`.trim()} className="h-full w-full object-cover" />
                          ) : (
                            (user.first_name?.charAt(0) || "?").toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 pr-2 max-md:text-right">
                          <div className="flex items-center gap-2 flex-wrap max-md:justify-end">
                            <p className="text-sm font-semibold truncate text-foreground">
                              {[user.first_name, user.last_name].filter(Boolean).join(" ")}
                            </p>
                            {!user.is_active && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Contact</span>
                      <div className="flex flex-col gap-0.5 max-md:items-end">
                        <span className="text-sm font-medium text-foreground">
                          {user.phone ? maskPhoneNumber(user.phone) : <span className="text-muted-foreground/50">-</span>}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Role</span>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                      {statusBadge(user.verification_status)}
                    </TableCell>
                    <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Clinic Info</span>
                      <div className="flex items-center text-xs">
                        {user.clinic_name ? (
                          <span className="text-sm font-medium">
                            {user.clinic_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                      <div className="flex items-center justify-end gap-2">
                        <InteractiveHoverButton
                          onClick={() => navigate(`/admin/users/${user.id}/details`)}
                          className="text-xs h-8 py-0 px-4"
                        >
                          Details
                        </InteractiveHoverButton>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs px-3 bg-secondary/50"
                          onClick={() => setViewingLogsFor(user)}
                        >
                          Logs
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
                          onClick={() => setDeletingUser(user)}
                        ><XCircle className="h-4 w-4" />
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

      {totalPages >= 0 && !isLoading && !error && (
        <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            Showing <span className="font-medium text-foreground">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-foreground">{total}</span> users
          </p>
          <Pagination className="sm:justify-end sm:w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => navigate(page > 2 ? `/admin/users/page/${page - 1}` : `/admin/users`)}
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
                      onClick={() => navigate(pageNum === 1 ? `/admin/users` : `/admin/users/page/${pageNum}`)}
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
                  onClick={() => navigate(`/admin/users/page/${page + 1}`)}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(o) => !o && setDeletingUser(null)}
      >
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Account Action: {[deletingUser?.first_name, deletingUser?.last_name].filter(Boolean).join(" ")}</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how you want to handle this user account (<strong>{deletingUser?.email}</strong>).
              <br /><br />
              <strong>Deactivate:</strong> They will not be able to log in, but their data remains intact. You can reactivate them later.
              <br /><br />
              <strong>Permanent Delete:</strong> This will erase all data, patients, wallets, and logs associated with this user. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between items-center">
            <AlertDialogCancel disabled={isDeleting} className="w-full sm:w-auto mt-0">Cancel</AlertDialogCancel>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => handleDelete(false)}
                disabled={isDeleting}
                className="text-amber-600 hover:bg-amber-50 w-full sm:w-auto"
              >
                {isDeleting && !isHardDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Deactivate
              </Button>
              <Button
                onClick={() => handleDelete(true)}
                disabled={isDeleting}
                className="bg-red-700 text-destructive-foreground hover:bg-red-800 w-full sm:w-auto"
              >
                {isDeleting && isHardDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Permanent Delete
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserAuditLogsSheet
        userId={viewingLogsFor?.id || null}
        userName={viewingLogsFor ? [viewingLogsFor.first_name, viewingLogsFor.last_name].filter(Boolean).join(" ") : null}
        open={!!viewingLogsFor}
        onOpenChange={(open) => !open && setViewingLogsFor(null)}
      />
    </div>
  );
}
