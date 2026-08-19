import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  Loader2, CheckCircle, XCircle, Clock, ShieldCheck,
  FileText, User, Building2, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, Check, Search, Filter, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBulkSelection } from "@/hooks/useBulkSelection";
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
import {
  getVerificationQueue,
  verifyUser,
} from "@/services/authService";
import { apiClient } from "@/services/apiClient";
import { cn } from "@/lib/utils";
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

async function openDocument(apiPath: string, filename: string) {
  try {
    const res = await apiClient.get(apiPath, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(res.data);
    const win = window.open(blobUrl, "_blank");

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    if (!win) toast.error("Popup blocked — please allow popups for this site.");
  } catch (err: any) {
    toast.error(err?.response?.data?.detail || `Failed to open "${filename}".`);
  }
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground min-w-[110px] shrink-0">{label}</span>
      <span className="font-medium text-text/90 break-all">{value}</span>
    </div>
  );
}

function UserDocumentsSection({ userId, cvPath, cvOriginalFilename, bio }: { userId: string; cvPath?: string; cvOriginalFilename?: string; bio?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-documents", userId],
    queryFn: async () => {
      const res = await apiClient.get(`/auth/admin/documents/${userId}`);
      return res.data.files as Array<{
        document_type: string;
        original_filename: string | null;
        filename: string;
        status: string;
        category: string;
        uploaded_at: string | null;
      }>;
    },
    staleTime: 30_000,
  });

  const isRciApplication = !!(cvPath || bio);
  const hasNormalDocs = !isLoading && data && data.length > 0;

  const statusColors: Record<string, string> = {
    pending: "text-yellow-500",
    approved: "text-green-500",
    rejected: "text-destructive",
  };

  return (
    <div className="space-y-3">

      {isRciApplication ? (
        <div className="flex items-center gap-2 p-2 rounded-md bg-violet-500/10 border border-violet-500/20">
          <ShieldCheck className="h-4 w-4 text-violet-400 shrink-0" />
          <p className="text-xs font-bold text-violet-400">RCI Reviewer Network Application — Review CV & Bio below</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10">
          <ShieldCheck className="h-4 w-4 text-primary/60 shrink-0" />
          <p className="text-xs font-bold text-text/50">Standard Account Verification</p>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      ) : !hasNormalDocs ? (
        <div className="flex items-start gap-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3">
          <FileText className="h-4 w-4 text-yellow-500/60 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-2">
          <p className="text-xs font-bold text-text/50 uppercase tracking-wider">
            Uploaded Documents ({data!.length})
          </p>
          {data!.map((doc) => (
            <button
              key={doc.document_type}
              type="button"
              onClick={() => openDocument(
                `/auth/admin/documents/${userId}/${encodeURIComponent(doc.filename)}`,
                doc.original_filename || doc.document_type
              )}
              className="w-full flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline transition-colors group text-left"
            >
              <FileText className="h-4 w-4 shrink-0 text-primary/60 group-hover:text-primary transition-colors" />
              <span className="truncate font-medium">
                {doc.original_filename || doc.document_type.replace(/_/g, " ")}
              </span>
              <span className={cn("text-[10px] shrink-0 ml-auto font-bold uppercase", statusColors[doc.status] || "text-muted-foreground")}>
                {doc.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {isRciApplication && (
        <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-3 space-y-2">
          <p className="text-xs font-bold text-violet-400/80 uppercase tracking-wider">RCI Reviewer Profile</p>
          {bio && (
            <div className="text-xs text-text/70 leading-relaxed bg-background/50 rounded p-2 border border-violet-500/10">
              <p className="font-bold text-violet-400/70 mb-1">Professional Bio:</p>
              <p className="whitespace-pre-wrap">{bio}</p>
            </div>
          )}
          {cvPath && (
            <button
              type="button"
              onClick={() => openDocument(
                `/auth/admin/documents/${userId}/${encodeURIComponent(cvPath.split("/").pop() || "cv")}`,
                "CV / Resume"
              )}
              className="w-full flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 hover:underline transition-colors group text-left"
            >
              <FileText className="h-4 w-4 shrink-0 text-violet-400/60 group-hover:text-violet-400 transition-colors" />
              <span className="truncate font-medium">CV / Resume — {cvOriginalFilename || cvPath.split("/").pop()}</span>
              <span className="text-[10px] shrink-0 ml-auto font-bold uppercase text-yellow-500">PENDING REVIEW</span>
            </button>
          )}
          {!bio && !cvPath && (
            <p className="text-xs text-muted-foreground">No CV or Bio submitted.</p>
          )}
        </div>
      )}
    </div>
  );
}

function AccountBadge({ type }: { type: string }) {
  const isClinic = type === "clinic";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold",
        isClinic
          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
          : "bg-primary/10 text-primary border border-primary/20"
      )}
    >
      {isClinic ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {isClinic ? "Clinic" : "Individual"}
    </span>
  );
}

export function VerificationQueuePage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [confirmingReject, setConfirmingReject] = useState<string | null>(null);
  const [confirmingApprove, setConfirmingApprove] = useState<string | null>(null);
  const [showFinalRejectConfirm, setShowFinalRejectConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("clinic-org");
  const ITEMS_PER_PAGE = 35;

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    toggleAllOnPage,
    isItemSelected,
    exportSelectedToPDF,
    exportSelectedToExcel,
  } = useBulkSelection<any>();

  const { data: queue, isLoading, isError, refetch } = useQuery({
    queryKey: ["verification-queue"],
    queryFn: getVerificationQueue,
    staleTime: 0,
    refetchInterval: 10_000,
  });

  const verifyMutation = useMutation({
    mutationFn: ({
      userId,
      action,
      notes,
    }: {
      userId: string;
      action: "approve" | "reject";
      notes?: string;
    }) => verifyUser(userId, { action, notes }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["verification-queue"] });
      toast.success(
        variables.action === "approve"
          ? "User approved — they now have full platform access."
          : "User rejected — they have been notified."
      );
      setExpandedId(null);
      setConfirmingReject(null);
      setRejectionNotes((prev) => {
        const next = { ...prev };
        delete next[variables.userId];
        return next;
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to process verification.");
    },
  });

  const handleApprove = (userId: string) => {
    setConfirmingApprove(null);
    verifyMutation.mutate({ userId, action: "approve" });
  };

  const handleReject = (userId: string) => {
    const notes = rejectionNotes[userId]?.trim();
    if (!notes) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    setShowFinalRejectConfirm(userId);
  };

  const handleConfirmReject = (userId: string) => {
    setShowFinalRejectConfirm(null);
    const notes = rejectionNotes[userId]?.trim();
    verifyMutation.mutate({ userId, action: "reject", notes });
  };

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  if (isLoading) {
    return (
      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Helmet>
          <title>Account Verification Queue  | PsyicHub - Psychological Intelligence</title>
        </Helmet>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" />
              Account Verification Queue
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review submitted documents and approve or reject each pending user.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-primary/10">
              <CardHeader className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div className="text-center">
              <p className="font-bold text-text">Failed to load verification queue</p>
              <p className="text-sm text-muted-foreground mt-1">
                Could not reach the backend. Check that the server is running.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clinicOrgCount = (queue || []).filter(u => u.account_type === "clinic" || u.account_type === "organization").length;
  const individualCount = (queue || []).filter(u => u.account_type === "individual").length;

  const tabFilteredQueue = (queue || []).filter((user) => {
    if (activeTab === "clinic-org") {
      return user.account_type === "clinic" || user.account_type === "organization";
    } else {
      return user.account_type === "individual";
    }
  });

  const filteredQueue = tabFilteredQueue.filter((user) => {
    const matchesSearch = !searchQuery.trim() ||
      [user.first_name, user.last_name, user.email, user.clinic_name, user.rci_number, user.roc_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());

    let matchesType = false;
    if (accountTypeFilter === "all") {
      matchesType = true;
    } else if (accountTypeFilter === "rci_individual") {
      matchesType = user.account_type === "individual" && !!user.rci_number;
    } else if (accountTypeFilter === "non_rci_individual") {
      matchesType = user.account_type === "individual" && !user.rci_number;
    } else {
      matchesType = user.account_type === accountTypeFilter;
    }

    return matchesSearch && matchesType;
  });

  const queueToRender = filteredQueue;
  const totalPages = Math.ceil(queueToRender.length / ITEMS_PER_PAGE);
  const currentQueue = queueToRender.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Helmet>
          <title>Account Verification Queue  | PsyicHub - Psychological Intelligence</title>
        </Helmet>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" />
              Account Verification Queue
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review submitted documents and approve or reject each pending user.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/30 text-primary font-bold px-3 py-1"
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              {queue?.length ?? 0} pending
            </Badge>
            {!isSelectionMode && (
              <Button
                type="button"
                variant="outline"
                onClick={toggleSelectionMode}
              >
                <Check className="h-4 w-4 mr-2" />
                Select
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="clinic-org" onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); setAccountTypeFilter("all"); }}>
          <TabsList className="mb-4 bg-primary/10">
            <TabsTrigger value="clinic-org" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold relative pr-10">
              <Building2 className="w-4 h-4 mr-2" /> Clinic / Org Verification
              {clinicOrgCount > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-green-500 text-[10px] font-bold text-white dark:bg-[#D3E392] dark:text-black shadow-sm ring-2 ring-background animate-in zoom-in">
                  {clinicOrgCount > 99 ? '99+' : clinicOrgCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rci-psychologist" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold relative pr-10">
              <User className="w-4 h-4 mr-2" /> Individual Psychologists
              {individualCount > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-green-500 text-[10px] font-bold text-white dark:bg-[#D3E392] dark:text-black shadow-sm ring-2 ring-background animate-in zoom-in">
                  {individualCount > 99 ? '99+' : individualCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {queue?.length === 0 ? (
            <Card className="bg-background/40 border-dashed border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-text">All clear!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No pending verifications — the queue is empty.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
                {isSelectionMode ? (
                  <div className="flex items-center justify-between p-4 bg-primary/10 border-b border-primary/20">
                    <span className="text-base font-medium text-foreground">
                      {selectedItems.size} verifications selected
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
                          <DropdownMenuItem onClick={() => exportSelectedToPDF({ pdfHeader: "Verification Queue", columns: [{ label: "Name", key: (u) => [u.first_name, u.last_name].filter(Boolean).join(" ") }, { label: "Email", key: "email" }, { label: "Account Type", key: "account_type" }, { label: "Clinic Name", key: "clinic_name" }] })}>
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportSelectedToExcel({ columns: [{ label: "Name", key: (u) => [u.first_name, u.last_name].filter(Boolean).join(" ") }, { label: "Email", key: "email" }, { label: "Account Type", key: "account_type" }, { label: "Clinic Name", key: "clinic_name" }] }, "Verification Queue")}>
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
                          <Input
                            type="search"
                            placeholder="Search by name, email, or clinic..."
                            className="pl-8 bg-background/50"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
                                  <p className="text-sm text-muted-foreground">Adjust filters for verification queue.</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSearchQuery("");
                                    setAccountTypeFilter("all");
                                    setCurrentPage(1);
                                  }}
                                  className="h-8 px-2 text-xs"
                                >
                                  <RotateCcw className="mr-2 h-3 w-3" /> Reset
                                </Button>
                              </div>
                              <div className="grid gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground font-bold uppercase">Account Type</Label>
                                  <Select value={accountTypeFilter} onValueChange={(val) => { setAccountTypeFilter(val); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-full h-9">
                                      <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Types</SelectItem>
                                      <SelectItem value="rci_individual">RCI Individual Psychologist</SelectItem>
                                      <SelectItem value="non_rci_individual">Non-RCI Individual</SelectItem>
                                      <SelectItem value="clinic">Clinic</SelectItem>
                                      <SelectItem value="organization">Organization</SelectItem>
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
                <Table className="max-md:block">
                  <TableHeader className="max-md:hidden">
                    <TableRow className="hover:bg-transparent">
                      {isSelectionMode && (
                        <TableHead className="w-12 text-center">
                          <Checkbox
                            checked={currentQueue.length > 0 && currentQueue.every(u => isItemSelected(u.id))}
                            onCheckedChange={() => toggleAllOnPage(currentQueue, currentQueue.every(u => isItemSelected(u.id)))}
                          />
                        </TableHead>
                      )}
                      <TableHead>User Details</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Clinic Name</TableHead>
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="max-md:block">
                    {currentQueue.map((user) => {
                      const isExpanded = expandedId === user.id;
                      const isProcessing =
                        verifyMutation.isPending &&
                        (verifyMutation.variables as any)?.userId === user.id;
                      const isRejectMode = confirmingReject === user.id;

                      return (
                        <React.Fragment key={user.id}>
                          <TableRow className={cn("transition-colors cursor-pointer max-md:block max-md:p-4 max-md:border-b max-md:relative", isExpanded && "bg-primary/5")}>
                            {isSelectionMode && (
                              <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isItemSelected(user.id)}
                                  onCheckedChange={() => toggleItemSelection(user)}
                                />
                              </TableCell>
                            )}
                            <TableCell onClick={() => toggleExpand(user.id)} className={cn("max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                              <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">User Details</span>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                  {(user.first_name || user.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="max-md:text-right">
                                  <div className="font-bold text-sm text-text">
                                    {[user.first_name, user.last_name].filter(Boolean).join(" ") || "(no name)"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{user.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell onClick={() => toggleExpand(user.id)} className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                              <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Account Type</span>
                              <AccountBadge type={user.account_type} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none" onClick={() => toggleExpand(user.id)}>
                              <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Clinic Name</span>
                              {user.clinic_name || "N/A"}
                            </TableCell>
                            <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                              <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleExpand(user.id); }}>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>

                          <AnimatePresence>
                            {isExpanded && (
                              <TableRow className="bg-primary/5/50 border-b border-primary/10 hover:bg-primary/5/50 max-md:block">
                                <TableCell colSpan={isSelectionMode ? 5 : 4} className="p-0 border-0 max-md:block">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-6 space-y-5">
                                      <div className="border-t border-primary/10 pt-4 grid sm:grid-cols-2 gap-3">
                                        <InfoRow label="Name" value={[user.first_name, user.last_name].filter(Boolean).join(" ")} />
                                        <InfoRow label="Email" value={user.email} />
                                        <InfoRow
                                          label="Account Type"
                                          value={user.account_type.replace("_", " ")}
                                        />
                                        <InfoRow label="Clinic Name" value={user.clinic_name} />
                                        <InfoRow label="ROC / Lic. No." value={user.roc_number} />
                                        <InfoRow label="RCI Number" value={user.rci_number} />
                                        <InfoRow label="Specialization" value={user.specialization} />
                                      </div>

                                      <UserDocumentsSection userId={user.id} cvPath={user.cv_path} cvOriginalFilename={user.cv_original_filename} bio={user.bio} />

                                      {isRejectMode ? (
                                        <div className="space-y-2">
                                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            Rejection Reason *
                                          </label>
                                          <Textarea
                                            placeholder="e.g. Document is blurry, wrong document type…"
                                            value={rejectionNotes[user.id] ?? ""}
                                            onChange={(e) =>
                                              setRejectionNotes((prev) => ({
                                                ...prev,
                                                [user.id]: e.target.value,
                                              }))
                                            }
                                            className="h-24 resize-none bg-background/50 border-destructive/30 focus:border-destructive/60"
                                          />
                                          <div className="flex gap-2 justify-end">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => setConfirmingReject(null)}
                                              disabled={isProcessing}
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => handleReject(user.id)}
                                              disabled={isProcessing}
                                              className="min-w-[120px]"
                                            >
                                              {isProcessing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <>
                                                  <XCircle className="h-4 w-4 mr-1.5" />
                                                  Confirm Reject
                                                </>
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex gap-2 justify-end">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 min-w-[100px]"
                                            onClick={() => setConfirmingReject(user.id)}
                                            disabled={isProcessing}
                                          >
                                            <XCircle className="h-4 w-4 mr-1.5" />
                                            Reject
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-600/90 text-white font-bold min-w-[100px]"
                                            onClick={() => setConfirmingApprove(user.id)}
                                            disabled={isProcessing}
                                          >
                                            {isProcessing ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <>
                                                <CheckCircle className="h-4 w-4 mr-1.5" />
                                                Approve
                                              </>
                                            )}
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                </TableCell>
                              </TableRow>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </Tabs>

        <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            Showing <span className="font-medium text-foreground">{queueToRender.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, queueToRender.length)}</span> of <span className="font-medium text-foreground">{queueToRender.length}</span> users
          </p>
          <Pagination className="sm:justify-end sm:w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  totalPages > 7 &&
                  (page < currentPage - 2 || page > currentPage + 2) &&
                  page !== 1 &&
                  page !== totalPages
                ) {
                  if (page === currentPage - 3 || page === currentPage + 3) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                }

                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      <AlertDialog
        open={!!confirmingApprove}
        onOpenChange={(o) => !o && setConfirmingApprove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will grant full platform access to{" "}
              <strong>
                {(() => { const u = queue?.find((u) => u.id === confirmingApprove); return u ? [u.first_name, u.last_name].filter(Boolean).join(" ") : "this user"; })()}
              </strong>. They will be notified of the approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmingApprove && handleApprove(confirmingApprove)}
              className="bg-green-600 text-white hover:bg-green-600/90"
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!showFinalRejectConfirm}
        onOpenChange={(o) => !o && setShowFinalRejectConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deny platform access to{" "}
              <strong>
                {(() => { const u = queue?.find((u) => u.id === showFinalRejectConfirm); return u ? [u.first_name, u.last_name].filter(Boolean).join(" ") : "this user"; })()}
              </strong>. They will be notified of the rejection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showFinalRejectConfirm && handleConfirmReject(showFinalRejectConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
