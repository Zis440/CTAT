import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { History, Search, X, ScrollText, FileText, Trash2, User, Filter, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchPastSessions, fetchSessionDetails, deleteSession, openPdfReport, requestSessionValidation } from "@/features/assessment/tat/services/analysisService";
import { formatDateTime } from "@/lib/dateFormat";
import { getSessionDetailsRoute } from "@/lib/routeUtils";
import { AssessmentAuditLogsSheet } from "@/features/assessment/_shared/components/AssessmentAuditLogsSheet";
import { reportService } from "@/features/assessment/screening/level1/services/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function SessionTable({
  sessions,
  isLoading,
  showClinicName,
  onDelete,
  onViewDetails,
  onViewLogs,
  onDownloadPDF }: {
    sessions: any[],
    isLoading: boolean,
    showClinicName: boolean,
    onDelete: (id: string) => void,
    onViewDetails: (id: string, testType?: string) => void,
    onViewLogs: (s: any) => void,
    onDownloadPDF?: (id: string, testType?: string, pdfFilename?: string) => void,
    onRequestVerification: (id: string) => void
  }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const totalPages = Math.max(1, Math.ceil(sessions.length / ITEMS_PER_PAGE));
  const currentSessions = sessions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center">
        <History className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No sessions found in this category.</p>
      </div>
    );
  }

  return (
    <>
      <Table className="max-md:block">
        <TableHeader className="max-md:hidden">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">Patient Name</TableHead>
            <TableHead className="w-[120px] font-semibold">Session ID</TableHead>
            <TableHead className="font-semibold">Assessment</TableHead>
            <TableHead className="font-semibold">Performed By</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            {showClinicName && <TableHead className="font-semibold">Organization / Clinic</TableHead>}
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="w-[180px] text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="max-md:block">
          {currentSessions.map((s, idx) => (
            <TableRow key={idx} className="max-md:block max-md:p-4 max-md:border-b max-md:relative">
              <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Patient Name</span>
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
                {s.id?.slice(0, 8)}
              </TableCell>
              <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Assessment</span>
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
              {showClinicName && (
                <TableCell className="py-3 text-sm max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                  <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Org/Clinic</span>
                  {s.clinic_name || "—"}
                </TableCell>
              )}
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
                  {s.validation_status === "pending" && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Verification Pending</Badge>
                  )}
                  {s.validation_status === "validated" && (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">Verified</Badge>
                  )}
                  <InteractiveHoverButton
                    onClick={() => onViewDetails(s.id, s.test_type)}
                    className="text-xs h-8 py-0 px-4"
                  >
                    Details
                  </InteractiveHoverButton>
                  {s.pdf_filename ? (
                    <Button
                      variant="outline"
                      size="sm"
                      title="View PDF"
                      onClick={() => onDownloadPDF?.(s.id, s.test_type, s.pdf_filename)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  ) : (s.test_type === 'screening_level1' || s.id.startsWith('SCR_')) && s.validation_status === 'validated' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      title="View PDF"
                      onClick={() => onDownloadPDF?.(s.id, s.test_type)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    title="View Logs"
                    onClick={() => onViewLogs(s)}
                  >
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
                          onClick={() => onDelete(s.id)}
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
          ))}
        </TableBody>
      </Table>

      <div className="pt-6 pb-6 px-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
          Showing <span className="font-medium text-foreground">{sessions.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, sessions.length)}</span> of <span className="font-medium text-foreground">{sessions.length}</span> sessions
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
    </>
  );
}

export function AdminSessionHistoryPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [activeTab, setActiveTab] = useState("individual");

  const [statusFilter, setStatusFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState("all");

  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [auditTargetAssessmentId, setAuditTargetAssessmentId] = useState<string | null>(null);

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

  const handleViewLogs = (s: any) => {
    setAuditTargetAssessmentId(s.id);
    setIsAuditLogOpen(true);
  };

  const handleRequestVerification = async (sessionId: string) => {
    try {
      const res = await requestSessionValidation(sessionId);
      toast.success(res.message || "Verification requested successfully.");
      const sessions = await fetchPastSessions();
      setPastSessions(sessions);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to request verification.");
    }
  };

  const filteredSessions = searchQuery.trim()
    ? pastSessions.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        (s.patient_name || "").toLowerCase().includes(q) ||
        (s.patient_id || "").toLowerCase().includes(q) ||
        (s.psychologist_name || "").toLowerCase().includes(q) ||
        (s.clinic_name || "").toLowerCase().includes(q)
      );
    })
    : pastSessions;

  const individualSessions = filteredSessions.filter(s => s.account_type === "individual" || !s.account_type);
  const clinicSessions = filteredSessions.filter(s => s.account_type === "clinic");
  const orgSessions = filteredSessions.filter(s => s.account_type === "organization");

  return (
    <div className="w-full relative min-h-full isolate">
      <Helmet>
        <title>All Session History  | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-7 w-7 text-primary" />
              Session History
            </h2>
            <p className="text-muted-foreground">
              View and search all past assessments and generated reports across the platform.
            </p>
          </div>
        </div>

        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />

          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search sessions by patient, psychologist, or org..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
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
                      <div className="flex items-start justify-between">
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
                        }} className="h-8 px-2 text-xs">
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
          </CardHeader>

          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-4 pt-4 pb-2 border-b border-border/50">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="individual">Individual</TabsTrigger>
                  <TabsTrigger value="clinic">Clinic</TabsTrigger>
                  <TabsTrigger value="organization">Organization</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="individual" className="m-0 border-none">
                <SessionTable
                  sessions={individualSessions}
                  isLoading={isLoading}
                  showClinicName={false}
                  onDelete={handleDeleteSession}
                  onViewDetails={handleViewSession}
                  onViewLogs={handleViewLogs}
                  onDownloadPDF={handleDownloadPDF}
                  onRequestVerification={handleRequestVerification}
                />
              </TabsContent>

              <TabsContent value="clinic" className="m-0 border-none">
                <SessionTable
                  sessions={clinicSessions}
                  isLoading={isLoading}
                  showClinicName={true}
                  onDelete={handleDeleteSession}
                  onViewDetails={handleViewSession}
                  onViewLogs={handleViewLogs}
                  onDownloadPDF={handleDownloadPDF}
                  onRequestVerification={handleRequestVerification}
                />
              </TabsContent>

              <TabsContent value="organization" className="m-0 border-none">
                <SessionTable
                  sessions={orgSessions}
                  isLoading={isLoading}
                  showClinicName={true}
                  onDelete={handleDeleteSession}
                  onViewDetails={handleViewSession}
                  onViewLogs={handleViewLogs}
                  onDownloadPDF={handleDownloadPDF}
                  onRequestVerification={handleRequestVerification}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AssessmentAuditLogsSheet
        assessmentId={auditTargetAssessmentId}
        open={isAuditLogOpen}
        onOpenChange={setIsAuditLogOpen}
      />
    </div>
  );
}
