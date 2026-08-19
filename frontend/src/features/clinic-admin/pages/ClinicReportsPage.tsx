import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, RotateCcw, Download, Building2, User, UserCheck, Calendar as CalendarIcon, ArrowLeft, FileText, Check, Trash2, ScrollText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { cn } from "@/lib/utils";
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
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useQueryClient } from "@tanstack/react-query";
import { getSessionDetailsRoute } from "@/lib/routeUtils";
import { AssessmentAuditLogsSheet } from "@/features/assessment/_shared/components/AssessmentAuditLogsSheet";
import { reportService } from "@/features/assessment/screening/level1/services/api";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPastSessions, openPdfReport, deleteSession, fetchSessionDetails } from "@/features/assessment/tat/services/analysisService";
import type { PastSession } from "@/features/assessment/tat/services/analysisService";
import { formatDateTime } from "@/lib/dateFormat";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

const getAssessmentName = (report: PastSession) => {
  if (report.test_type === 'screening_level1') return 'Employee Mental Health & Wellbeing';
  if (report.test_type === 'tat' || (report.cards_examined && report.cards_examined.length > 0)) return 'Narrative Intelligence';
  if (report.test_type) return report.test_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return 'Assessment';
};

export function ClinicReportsPage() {
  const [searchParams] = useSearchParams();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { pageId } = useParams();
  const page = parseInt(pageId as string, 10) || 1;
  const PAGE_SIZE = 10;
  const queryClient = useQueryClient();

  const [selectedAssessmentForLogs, setSelectedAssessmentForLogs] = useState<string | null>(null);
  const [isLogsSheetOpen, setIsLogsSheetOpen] = useState(false);

  const handleOpenLogs = (assessmentId: string) => {
    setSelectedAssessmentForLogs(assessmentId);
    setIsLogsSheetOpen(true);
  };

  const user = useAuthStore(s => s.user);
  const isOrg = user?.role?.startsWith("org_");

  const getBasePath = () => {
    if (user?.role === "org_admin") return "/org";
    if (user?.role === "org_staff") return "/org-staff";
    if (user?.role === "clinic_staff") return "/clinic-staff";
    if (user?.role === "individual_psychologist") return "";
    return "/clinic";
  };
  const basePath = getBasePath();

  const patientFilter = searchParams.get("patient");
  const [reports, setReports] = useState<PastSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    toggleAllOnPage,
    exportSelectedToPDF,
    exportSelectedToExcel,
    isItemSelected,
  } = useBulkSelection<PastSession>();

  const handleDeleteSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      await deleteSession(sessionId);
      toast.success("Report deleted successfully.");
      const data = await fetchPastSessions();
      setReports(data);
    } catch (err) {
      toast.error("Failed to delete the report.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSession = async (sessionId: string, testType?: string) => {
    try {
      const data = await fetchSessionDetails(sessionId);
      queryClient.setQueryData(['past-session-report'], {
        report: data.report_summary,
        patientId: data.patient_info?.patient_id || data._db_metadata?.id,
        sessionId: sessionId,
        pdfFilename: data.pdf_filename || null,
        testType: testType || data._metadata?.test_type || (sessionId.startsWith("SCR_") ? "screening_level1" : "tat"),
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

  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true);
      try {
        const data = await fetchPastSessions();

        setReports(data);
      } catch (err) {
        toast.error("Failed to load reports");
      } finally {
        setIsLoading(false);
      }
    };
    loadReports();
  }, []);

  const filteredReports = reports.filter(r =>
    !patientFilter || r.patient_name?.toLowerCase().includes(patientFilter.toLowerCase())
  );
  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE) || 1;
  const paginatedReports = filteredReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderReportsList = () => (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Reports
          </h1>
          <p className="text-muted-foreground mt-1">View and manage {isOrg ? "organization" : "clinical"} assessment reports.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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

      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
        {isSelectionMode ? (
          <div className="flex items-center justify-between p-4 bg-primary/10 border-b border-primary/20">
            <span className="text-base font-medium text-foreground">
              {selectedItems.size} reports selected
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
                  <DropdownMenuItem onClick={() => exportSelectedToPDF({ pdfHeader: "Reports", columns: [{ label: "Report ID", key: "id" }, { label: isOrg ? "Candidate Name" : "Patient Name", key: "patient_name" }] })}>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportSelectedToExcel({ columns: [{ label: "Report ID", key: "id" }, { label: isOrg ? "Candidate Name" : "Patient Name", key: "patient_name" }] }, "Reports")}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
        <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
              <div className="flex w-full max-w-sm items-center space-x-2">
                <SearchInput
                  defaultValue={patientFilter || ""}
                  placeholder={isOrg ? "Candidate Name" : "Patient Name"}
                  onChange={(e) => {
                      const val = e.target.value;
                      if (val) searchParams.set("patient", val);
                      else searchParams.delete("patient");
                      navigate({ search: searchParams.toString() }, { replace: true });
                  }}
                  onClear={() => {
                      searchParams.delete("patient");
                      navigate({ search: searchParams.toString() }, { replace: true });
                  }}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto overflow-y-hidden pb-1 md:pb-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <Filter className="mr-2 h-4 w-4" /> Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-4">
                    <div className="grid gap-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">Filter Options</h4>
                          <p className="text-sm text-muted-foreground">Adjust filters for {isOrg ? "organization" : "clinic"} reports.</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground -mt-1 -mr-1">
                          <RotateCcw className="mr-2 h-3 w-3" /> Reset
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        <Select defaultValue="all-assessments">
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Assessment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all-assessments">All Assessments</SelectItem>
                            <SelectItem value="tat">Narrative Intelligence</SelectItem>
                            <SelectItem value="mpaci">Pre adolescent personality assessment intelligence</SelectItem>
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
                      checked={filteredReports.length > 0 && filteredReports.every(item => isItemSelected(item.id))}
                      onCheckedChange={(checked) => toggleAllOnPage(filteredReports, checked as boolean)}
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold">{isOrg ? "Candidate" : "Patient"} Name</TableHead>
                <TableHead className="w-[120px] font-semibold">Report ID</TableHead>
                <TableHead className="font-semibold">Assessment</TableHead>
                <TableHead className="font-semibold">Performed By</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                    {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">{isOrg ? "Candidate" : "Patient"} Name</span>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Report ID</span><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Assessment</span><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Performed By</span><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</span><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedReports.length === 0 ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-32 text-center text-muted-foreground max-md:block max-md:py-8">
                    <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    No reports found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-primary/5 transition-colors max-md:block max-md:p-4 max-md:border-b max-md:relative">
                    {isSelectionMode && (
                      <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                        <Checkbox
                          checked={selectedItems.has(report.id)}
                          onCheckedChange={() => toggleItemSelection(report)}
                        />
                      </TableCell>
                    )}
                    <TableCell className={cn("py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">{isOrg ? "Candidate" : "Patient"} Name</span>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {(report.patient_name || report.patient_id || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 pr-2 max-md:text-right">
                          <p className="text-sm font-semibold truncate text-foreground">{report.patient_name || report.patient_id || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground truncate font-mono">
                            ID: {report.patient_id || "Unknown"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={cn("font-mono text-xs max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none")}>
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Report ID</span>
                      {report.id.slice(0,8)}
                    </TableCell>
                    <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Assessment</span>
                      {getAssessmentName(report)}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Performed By</span>
                      <div className="flex items-center text-muted-foreground gap-2 font-medium">
                        <User className="h-4 w-4 opacity-70" />
                        <span>{report.psychologist_name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</span>
                      {formatDateTime(report.timestamp || report.created_at)}
                    </TableCell>
                    <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                      {report.pdf_filename ? (
                        <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-500/10">Completed</Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 bg-yellow-500/10">Pending PDF</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                      <div className="flex items-center justify-end gap-2 flex-nowrap shrink-0">
                        <InteractiveHoverButton
                          onClick={() => handleViewSession(report.id)}
                          className="text-xs h-8 py-0 px-4"
                        >
                          Details
                        </InteractiveHoverButton>
                        {report.pdf_filename ? (
                          <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(report.id, report.test_type, report.pdf_filename!)} title="View PDF">
                            <FileText className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            Processing
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleOpenLogs(report.id)} title="View Logs">
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
                                report from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="hover:bg-muted hover:text-muted-foreground transition-colors">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSession(report.id)}
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

      {totalPages >= 0 && !isLoading && (
        <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            Showing <span className="font-medium text-foreground">{filteredReports.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * PAGE_SIZE, filteredReports.length)}</span> of <span className="font-medium text-foreground">{filteredReports.length}</span> reports
          </p>
          <Pagination className="sm:justify-end sm:w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => navigate(page > 2 ? `${basePath}/reports/page/${page - 1}` : `${basePath}/reports`)}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && page > 3) {
                  pageNum = page - 2 + i;
                  if (pageNum > totalPages) return null;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={page === pageNum}
                      onClick={() => navigate(pageNum === 1 ? `${basePath}/reports` : `${basePath}/reports/page/${pageNum}`)}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              {totalPages > 5 && page < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => navigate(`${basePath}/reports/page/${page + 1}`)}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <AssessmentAuditLogsSheet
        assessmentId={selectedAssessmentForLogs}
        open={isLogsSheetOpen}
        onOpenChange={setIsLogsSheetOpen}
      />
    </div>
  );

  const renderDetailedReport = () => (
    <div className="space-y-6 max-w-5xl mx-auto animate-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedReportId(null)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Detailed Assessment Report</h1>
            <p className="text-muted-foreground mt-1">Report ID: {selectedReportId}</p>
          </div>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20 shadow-sm bg-primary/5">
          <CardHeader className="pb-3 border-b border-primary/10">
            <CardTitle className="text-lg flex items-center"><User className="mr-2 h-5 w-5" /> {isOrg ? "Candidate" : "Patient"} & Staff Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{isOrg ? "Candidate Name" : "Patient Name"}</p>
                <p className="font-bold">Rahul Sharma</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Demographics</p>
                <p className="font-semibold text-sm">Male, 34 Years</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center"><UserCheck className="mr-1 h-3 w-3" /> Evaluated By</p>
                <p className="font-semibold text-sm">Dr. A. Sharma</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center"><CalendarIcon className="mr-1 h-3 w-3" /> Assessment Date</p>
                <p className="font-semibold text-sm">Oct 30, 2024</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm bg-background/50">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg flex items-center"><Building2 className="mr-2 h-5 w-5" /> Clinic Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex items-center gap-6">
            <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-lg">Psyichub Care</h4>
              <p className="text-sm text-muted-foreground">123 Health Ave, New Delhi</p>
              <p className="text-xs text-muted-foreground">contact@psyichub.com | +91 99999 88888</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Assessment Results (Pre adolescent personality assessment intelligence)</CardTitle>
          <CardDescription>Raw scores and standardized T-scores</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Category / Scale</TableHead>
                <TableHead className="text-center">Raw Score</TableHead>
                <TableHead className="text-center">T-Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Emerging Clinical Patterns</TableCell>
                <TableCell className="text-center">24</TableCell>
                <TableCell className="text-center font-bold text-primary">65</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Current Symptomatology</TableCell>
                <TableCell className="text-center">18</TableCell>
                <TableCell className="text-center font-bold text-yellow-600">58</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Response Validity</TableCell>
                <TableCell className="text-center">V</TableCell>
                <TableCell className="text-center font-bold text-green-600">Valid</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 border-primary/10">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-base">ADHD Criteria</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Criteria</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Questions Met</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs">Inattention</TableCell>
                  <TableCell><Badge variant="destructive" className="text-[10px]">High</Badge></TableCell>
                  <TableCell className="text-xs text-center">6/9</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">Hyperactivity</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">Low</Badge></TableCell>
                  <TableCell className="text-xs text-center">2/9</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-primary/10">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-base">Conduct Disorder</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Criteria</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Questions Met</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs">Aggression</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">Normal</Badge></TableCell>
                  <TableCell className="text-xs text-center">1/5</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-primary/10">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-base">ODD Criteria</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Criteria</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Questions Met</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs">Defiance</TableCell>
                  <TableCell><Badge variant="default" className="text-[10px] bg-yellow-500">Elevated</Badge></TableCell>
                  <TableCell className="text-xs text-center">4/8</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle>Interpretation & Narrative Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 text-sm leading-relaxed text-muted-foreground">
            <p className="mb-2">
              <strong className="text-foreground">Clinical Findings:</strong> The assessment results indicate elevated scores on the Emerging Clinical Patterns scale, suggesting a predisposition towards inattentive features. The T-Score of 65 is clinically significant and warrants further evaluation.
            </p>
            <p>
              <strong className="text-foreground">Recommendations:</strong> It is recommended to follow up with a structured clinical interview and consider behavioral interventions. The validity scales indicate that the patient understood the questions and responded appropriately.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="w-full">
      <Helmet>
        <title>Reports  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      {selectedReportId ? renderDetailedReport() : renderReportsList()}
    </div>
  );
}
