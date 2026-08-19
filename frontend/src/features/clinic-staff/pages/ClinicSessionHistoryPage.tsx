import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { ClipboardPlus, Filter, RotateCcw, Search, FileText, Trash2, X, History, Check, ShieldCheck, User, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchPastSessions, fetchSessionDetails, deleteSession, openPdfReport, requestSessionValidation } from "@/features/assessment/tat/services/analysisService";
import { formatDateTime } from "@/lib/dateFormat";
import { getSessionNewRoute, getSessionDetailsRoute } from "@/lib/routeUtils";
import { AssessmentAuditLogsSheet } from "@/features/assessment/_shared/components/AssessmentAuditLogsSheet";
import { reportService } from "@/features/assessment/screening/level1/services/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function ClinicSessionHistoryPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isOrg = user?.role === "org_admin" || user?.role === "org_staff";
  const patientTerm = isOrg ? "Candidate" : "Patient";
  const patientTermLower = isOrg ? "candidate" : "patient";
  const isStaff = user?.role?.includes("staff");
  const canStartSession = !isStaff || !!(user?.module_permissions?.assessments ?? user?.can_assess);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 35;

  const [selectedAssessmentForLogs, setSelectedAssessmentForLogs] = useState<string | null>(null);
  const [isLogsSheetOpen, setIsLogsSheetOpen] = useState(false);

  const handleOpenLogs = (assessmentId: string) => {
    setSelectedAssessmentForLogs(assessmentId);
    setIsLogsSheetOpen(true);
  };

  const [statusFilter, setStatusFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState("all");

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    toggleAllOnPage,
    exportSelectedToPDF,
    exportSelectedToExcel,
    isItemSelected,
  } = useBulkSelection<any>();

  useEffect(() => {
    async function loadSessions() {
      setIsLoading(true);
      try {
        const sessions = await fetchPastSessions({
          status: statusFilter !== "all" ? statusFilter : undefined,
          start_date: startDateFilter || undefined,
          end_date: endDateFilter ? `${endDateFilter}T23:59:59Z` : undefined,
          assessment_type: assessmentTypeFilter !== "all" ? assessmentTypeFilter : undefined,
        });
        setPastSessions(sessions);
      } catch (err) {
        console.error("Failed to fetch past sessions", err);
        toast.error("Failed to load session history.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSessions();
  }, [statusFilter, startDateFilter, endDateFilter, assessmentTypeFilter]);

  const handleDeleteSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      await deleteSession(sessionId);
      toast.success("Session deleted successfully.");
      const sessions = await fetchPastSessions();
      setPastSessions(sessions);
    } catch (err) {
      toast.error("Failed to delete the session.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSession = async (sessionId: string) => {
    try {
      const data = await fetchSessionDetails(sessionId);
      queryClient.setQueryData(['past-session-report'], {
        report: data.report_summary,
        patientId: data.patient_info?.patient_id || data._db_metadata?.id,
        sessionId: sessionId,
        pdfFilename: data.pdf_filename || null,
        testType: data._metadata?.test_type || (sessionId.startsWith("SCR_") ? "screening_level1" : "tat"),
        validationStatus: data.validation_status,
      });
      navigate(getSessionDetailsRoute(user?.role, sessionId));
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 400) {
        toast.info("The data is being processed... please check back after some time.");
      } else {
        toast.error("Failed to load session data. Please try again later.");
      }
    }
  };

  const handleDownloadPDF = async (reportId: string, testType?: string, pdfFilename?: string) => {
    let newWindow: Window | null = null;
    try {
      if (testType === 'screening_level1' || reportId.startsWith('SCR_')) {
        const realId = reportId.replace('SCR_', '');
        newWindow = window.open('', '_blank');
        const blob = await reportService.openPdf(realId);
        const url = URL.createObjectURL(blob);
        if (newWindow) {
          newWindow.location.href = url;
        } else {
          toast.error("Pop-up blocked. Please allow pop-ups for this site to view the PDF.");
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else if (pdfFilename) {
        await openPdfReport(pdfFilename);
      }
    } catch (err: any) {
      console.error(err);
      if (newWindow) newWindow.close();
      toast.error(err?.message || "Failed to open PDF.");
    }
  };

  const handleRequestVerification = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const res = await requestSessionValidation(sessionId);
      toast.success(res.message || "Verification requested successfully.");
      const sessions = await fetchPastSessions();
      setPastSessions(sessions);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to request verification.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSessions = searchQuery.trim()
    ? pastSessions.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        (s.patient_name || "").toLowerCase().includes(q) ||
        (s.patient_id || "").toLowerCase().includes(q) ||
        (s.user_id?.toString() || "").toLowerCase().includes(q)
      );
    })
    : pastSessions;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / ITEMS_PER_PAGE));
  const currentSessions = filteredSessions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="w-full relative min-h-full isolate">
        <Helmet>
          <title>Session History | PsyicHub - Psychological Intelligence</title>
        </Helmet>
        <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-4 w-32" />
          <Card className="border-primary/10 bg-background/50 backdrop-blur-sm mt-6">
            <CardContent className="p-0">
              <Table className="max-md:block">
                <TableHeader className="max-md:hidden">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">{patientTerm} Name</TableHead>
                    <TableHead className="w-[120px] font-semibold">Session ID</TableHead>
                    <TableHead className="font-semibold">Assessment Examined</TableHead>
                    <TableHead className="font-semibold">Performed By</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="w-[180px] text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="max-md:block">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Session:</span>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Session ID:</span>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Assessment Examined:</span>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Performed By:</span>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Date:</span>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Status:</span>
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none max-md:mt-2">
                        <span className="md:hidden font-semibold text-muted-foreground">Actions:</span>
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative min-h-full isolate">

      <Helmet>
        <title>Session History | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-7 w-7 text-primary" />
              Session History
            </h2>
            <p className="text-muted-foreground">
              View and search past {patientTermLower} assessments and generated reports.
            </p>
          </div>
          {user?.role !== "super_admin" && (
            <div className="flex items-center gap-2 shrink-0">
              {canStartSession && (
                <Button onClick={() => navigate(getSessionNewRoute(user?.role))} variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                  <ClipboardPlus className="h-4 w-4 mr-2" /> Start New Intake
                </Button>
              )}
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
          )}
        </div>

        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
          {isSelectionMode ? (
            <div className="flex items-center justify-between p-4 bg-primary/10 border-b border-primary/20">
              <span className="text-base font-medium text-foreground">
                {selectedItems.size} sessions selected
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
                    <DropdownMenuItem onClick={() => exportSelectedToPDF({ pdfHeader: "Session History", columns: [{ label: patientTerm, key: "patient_name" }, { label: `${patientTerm} ID`, key: "patient_id" }, { label: "Date", key: "timestamp" }] })}>
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportSelectedToExcel({ columns: [{ label: patientTerm, key: "patient_name" }, { label: `${patientTerm} ID`, key: "patient_id" }, { label: "Date", key: "timestamp" }] }, "Sessions")}>
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
                    <PatientSearchInput query={searchQuery} onChange={setSearchQuery} />
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto overflow-y-hidden pb-1 md:pb-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={statusFilter !== "all" || startDateFilter || endDateFilter || assessmentTypeFilter !== "all" ? "border-primary text-primary bg-primary/5" : ""}>
                        <Filter className="mr-2 h-4 w-4" /> Filter
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-4">
                      <div className="grid gap-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Filter Options</h4>
                            <p className="text-sm text-muted-foreground">Adjust filters for session history.</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                            setStartDateFilter("");
                            setEndDateFilter("");
                            setAssessmentTypeFilter("all");
                          }} className="h-8 px-2 text-muted-foreground hover:text-foreground -mt-1 -mr-1">
                            <RotateCcw className="mr-2 h-3 w-3" /> Reset
                          </Button>
                        </div>
                        <div className="grid gap-3">
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="completed">Completed / Finalized</SelectItem>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="pending">Pending Verification</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select value={assessmentTypeFilter} onValueChange={setAssessmentTypeFilter}>
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="Assessment Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Assessments</SelectItem>
                              <SelectItem value="tat">Narrative Assessment</SelectItem>
                              <SelectItem value="screening">Screening Assessment</SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">From</label>
                              <Input type="date" className="w-full h-9" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">To</label>
                              <Input type="date" className="w-full h-9" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {searchQuery.trim() && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing {filteredSessions.length} of {pastSessions.length} session{pastSessions.length !== 1 ? "s" : ""}
                  {filteredSessions.length === 0 && (
                    <span> — no matches for "<strong>{searchQuery}</strong>"</span>
                  )}
                </p>
              )}
            </CardHeader>
          )}
          <CardContent className="p-0">
            <Table className="max-md:block">
              <TableHeader className="max-md:hidden">
                <TableRow className="hover:bg-transparent">
                  {isSelectionMode && (
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={currentSessions.every(item => isItemSelected(item.id)) && currentSessions.length > 0}
                        onCheckedChange={() => toggleAllOnPage(currentSessions, currentSessions.every(item => isItemSelected(item.id)))}
                      />
                    </TableHead>
                  )}
                  <TableHead className="font-semibold">{patientTerm} Name</TableHead>
                  <TableHead className="w-[120px] font-semibold">Session ID</TableHead>
                  <TableHead className="font-semibold">Assessment Examined</TableHead>
                  <TableHead className="font-semibold">Performed By</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-[180px] text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="max-md:block">
                {pastSessions.length === 0 ? (
                  <TableRow className="max-md:block">
                    <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-48 text-center max-md:block max-md:py-8">
                      <History className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No past sessions found. Make sure the backend server is running.</p>
                    </TableCell>
                  </TableRow>
                ) : filteredSessions.length === 0 ? (
                  <TableRow className="max-md:block">
                    <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-48 text-center max-md:block max-md:py-8">
                      <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No sessions match your search.</p>
                      <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2">
                        Clear Search
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentSessions.map((s, idx) => (
                    <TableRow key={idx} className="max-md:block max-md:p-4 max-md:border-b max-md:relative">
                      {isSelectionMode && (
                        <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                          <Checkbox
                            checked={selectedItems.has(s.id!)}
                            onCheckedChange={() => toggleItemSelection(s)}
                          />
                        </TableCell>
                      )}
                      <TableCell className={cn("py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">{patientTerm} Name</span>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {(s.patient_name || s.patient_id || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 pr-2 max-md:text-right">
                            <p className="text-sm font-semibold truncate text-foreground">{s.patient_name || s.patient_id}</p>
                            <p className="text-xs text-muted-foreground truncate font-mono">
                              ID: {s.patient_id || "Unknown"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={cn("font-mono text-xs py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none")}>
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Session ID</span>
                        {s.id?.slice(0,8)}
                      </TableCell>
                      <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Assessment Examined</span>
                        {s.test_type === 'screening_level1' ? (
                          <span className="text-sm font-medium">
                            Employee Mental Health & Wellbeing
                          </span>
                        ) : (s.test_type === 'tat' || (s.cards_examined && s.cards_examined.length > 0)) ? (
                          <span className="text-sm font-medium">
                            Narrative Intelligence
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Performed By</span>
                        <div className="flex items-center text-muted-foreground gap-2 font-medium">
                          <User className="h-4 w-4 opacity-70" />
                          <span>{s.psychologist_name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</span>
                        {s.timestamp ? formatDateTime(s.timestamp) : "Unknown date"}
                      </TableCell>
                      <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                        {s.pdf_filename ? (
                          <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-500/10">Completed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 bg-yellow-500/10">Pending PDF</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                        <div className="flex items-center justify-end gap-2 flex-nowrap shrink-0">
                          {s.validation_status === "pending" || s.validation_status === "Under Verification" || s.validation_status === "Assigned" ? (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pending Verification</Badge>
                          ) : null}
                          {s.validation_status === "Verified by Psychologist" || s.validation_status === "validated" ? (
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Verified</Badge>
                          ) : null}
                          {s.validation_status === "Rejected" ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Rejected</Badge>
                          ) : null}
                          {isOrg && (s.validation_status === "unvalidated" || !s.validation_status) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-amber-600 border-amber-600/20 hover:bg-amber-600/10" title="Request Verification">
                                  <ShieldCheck className="h-4 w-4 md:mr-1" />
                                  <span className="hidden md:inline">Verify</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Request Psychologist Verification</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will securely send the screening report to an RCI-registered psychologist for manual verification.
                                    An additional charge of ₹100 will be deducted from your wallet.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRequestVerification(s.id)}>Proceed to Pay ₹100</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <InteractiveHoverButton
                            onClick={() => handleViewSession(s.id)}
                            className="text-xs h-8 py-0 px-4"
                          >
                            Details
                          </InteractiveHoverButton>
                          {s.pdf_filename ? (
                            <Button
                              variant="outline"
                              size="sm"
                              title="View PDF"
                              onClick={() => handleDownloadPDF(s.id, s.test_type, s.pdf_filename)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          ) : (s.test_type === 'screening_level1' || s.id.startsWith('SCR_')) && s.validation_status === 'validated' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              title="View PDF"
                              onClick={() => handleDownloadPDF(s.id, s.test_type)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button variant="outline" size="sm" onClick={() => handleOpenLogs(s.id)} title="View Logs">
                            <ScrollText className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/20 hover:bg-destructive/10"
                                title="Delete Report"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this
                                  session report from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="hover:bg-muted hover:text-muted-foreground transition-colors">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSession(s.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            Showing <span className="font-medium text-foreground">{filteredSessions.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredSessions.length)}</span> of <span className="font-medium text-foreground">{filteredSessions.length}</span> sessions
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

      <AssessmentAuditLogsSheet
        assessmentId={selectedAssessmentForLogs}
        open={isLogsSheetOpen}
        onOpenChange={setIsLogsSheetOpen}
      />
    </div>
  );
}

function PatientSearchInput({ query, onChange }: { query: string; onChange: (q: string) => void }) {
  const { user } = useAuthStore();
  const isOrg = user?.role === "org_admin" || user?.role === "org_staff";
  const patientTermLower = isOrg ? "candidate" : "patient";

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={`Search ${patientTermLower} by name or ID...`}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9 h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
      />
      {query && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
