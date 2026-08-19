import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, AlertTriangle, ArrowLeft, RefreshCw, Ban, FileText, User as UserIcon, Calendar as CalendarIcon, Building2, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useAuthStore } from "@/store/useAuthStore";
import { apiClient } from "@/services/apiClient";

// Setup pdf.js worker using Vite's URL import
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getAdminSingleVerificationRequest,
  getEligiblePsychologists,
  getAllPsychologists,
  reassignVerificationRequest,
  cancelVerificationRequest
} from "@/services/psychologistVerificationService";

export function AdminVerificationRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const { token } = useAuthStore();

  const SLA_HOURS_BY_ATTEMPT: Record<number, number> = { 1: 15, 2: 6, 3: 3 };

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  function getRemainingTime(assignedAt?: string, attempt?: number) {
    if (!assignedAt) return { text: "-", isUrgent: false };
    const slaHours = SLA_HOURS_BY_ATTEMPT[attempt || 1] || 3;
    const deadline = new Date(new Date(assignedAt).getTime() + slaHours * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs <= 0) return { text: "Expired", isUrgent: true };
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${hours}h ${mins}m`, isUrgent: hours < 2 };
  }

  const { data: request, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-psychologist-verification-request", id],
    queryFn: () => getAdminSingleVerificationRequest(id!),
    enabled: !!id,
  });

  const { data: psychologists, isLoading: loadingPsychologists } = useQuery({
    queryKey: ["admin-eligible-psychologists"],
    queryFn: getEligiblePsychologists,
  });

  const { data: allPsychologists, isLoading: loadingAllPsychologists } = useQuery({
    queryKey: ["admin-all-psychologists"],
    queryFn: getAllPsychologists,
  });

  const reassignMutation = useMutation({
    mutationFn: async (psychologistId?: string) => {
      return reassignVerificationRequest(request!.request_id, psychologistId);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Request reassigned successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-psychologist-verification-request", id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to reassign request");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelVerificationRequest(request!.request_id),
    onSuccess: (data) => {
      toast.success(data.message || "Request cancelled");
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-psychologist-verification-request", id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to cancel request");
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 w-full max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[600px] col-span-2" />
          <Skeleton className="h-[600px] col-span-1" />
        </div>
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div className="text-center">
              <p className="font-bold text-text">Failed to load request details</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
              <Button onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = request.status === "VERIFIED" || request.status === "REJECTED";
  const pdfFilename = request.report_pdf_path?.split("/").pop();
  const pdfApiUrl = pdfFilename ? `/api/reports/pdf/${pdfFilename}` : null;

  const handleOpenPdf = async () => {
    if (!pdfApiUrl) return;
    try {
      // apiClient already has a base URL (like /api), so we should remove the /api prefix from pdfApiUrl if it exists
      const endpoint = pdfApiUrl.startsWith('/api/') ? pdfApiUrl.substring(4) : pdfApiUrl;
      const { data } = await apiClient.get(endpoint, { responseType: 'blob' });
      const fileUrl = URL.createObjectURL(data);
      window.open(fileUrl, "_blank");
    } catch (err) {
      toast.error("Failed to open PDF report.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <Helmet>
        <title>Request Details | Admin</title>
      </Helmet>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Verification Request Details
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            ID: {request.request_id}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className="text-sm px-3 py-1" variant={request.status === "VERIFIED" ? "default" : request.status === "ASSIGNED" ? "secondary" : "outline"}>
            {request.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          <Card className="border-primary/10 shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border/50 p-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Request Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Patient / Candidate</p>
                    <p className="font-semibold">{request.patient_name || "Unknown"}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Requested By</p>
                    <p className="font-medium">{request.requesting_user_name || 'N/A'}</p>
                    {request.requesting_user_domain && (
                      <p className="text-sm text-muted-foreground">{request.requesting_user_domain}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Timelines</p>
                    <p className="text-sm"><span className="text-muted-foreground">Created:</span> {new Date(request.created_at).toLocaleString()}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Assigned:</span> {request.assigned_at ? new Date(request.assigned_at).toLocaleString() : '-'}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Completed:</span> {request.completed_at ? new Date(request.completed_at).toLocaleString() : '-'}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Current Assignment</p>
                    <p className="font-medium">{request.psychologist_name || 'Unassigned'}</p>
                    <p className="text-sm text-muted-foreground">Attempts: {request.assignment_attempts || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 p-0 overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-lg">Assessment Report PDF</CardTitle>
              {pdfApiUrl && (
                <Button variant="outline" size="sm" onClick={handleOpenPdf}>
                  Open in New Tab <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 bg-muted/10 flex justify-center h-[700px] overflow-auto">
              {pdfApiUrl ? (
                <div className="flex flex-col items-center w-full">
                  <Document 
                    file={{ url: pdfApiUrl, httpHeaders: { Authorization: `Bearer ${token}` } } as any}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    loading={<div className="p-10 flex flex-col items-center"><RefreshCw className="h-6 w-6 animate-spin text-primary mb-2" /><p>Loading PDF...</p></div>}
                    error={<div className="p-10 text-destructive text-center font-medium">Failed to load PDF. Please try opening in a new tab.</div>}
                    className="max-w-full my-4 flex flex-col gap-4 items-center"
                  >
                    {numPages && Array.from(new Array(numPages), (_, index) => (
                      <div key={`page_${index + 1}`} className="shadow-xl border border-border">
                        <Page 
                          pageNumber={index + 1} 
                          renderTextLayer={false} 
                          renderAnnotationLayer={false} 
                          width={800} 
                        />
                      </div>
                    ))}
                  </Document>
                  {numPages && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Total Pages: {numPages}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center p-20 text-muted-foreground">
                  <p>No PDF report available for this request.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Monitoring & Actions */}
        <div className="space-y-6">
          {!isCompleted && (
            <Card className="border-destructive/20 border-2 p-0 overflow-hidden">
              <CardHeader className="p-4 bg-destructive/5">
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setCancelOpen(true)}
                >
                  <Ban className="mr-2 h-4 w-4" /> Cancel Request & Refund
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-primary/10 shadow-md p-0 overflow-hidden">
            <CardHeader className="p-4 border-b border-border/50 bg-muted/10">
              <CardTitle className="text-lg">RCI Verified Psychologists</CardTitle>
              <CardDescription>
                Monitor available psychologists and manually reassign if necessary.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 border-b border-border/50 bg-muted/5">
                <Button
                  variant="outline"
                  className="w-full font-medium"
                  disabled={isCompleted || reassignMutation.isPending}
                  onClick={() => reassignMutation.mutate(undefined)}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${reassignMutation.isPending && !reassignMutation.variables ? 'animate-spin' : ''}`} />
                  Re-run Automatic Algorithm
                </Button>
              </div>

              {loadingPsychologists ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                      <TableRow>
                        <TableHead>Psychologist</TableHead>
                        <TableHead>Time Remaining</TableHead>
                        <TableHead className="w-[100px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {psychologists?.map((p) => {
                        const isCurrentAssignee = request.psychologist_name?.includes(p.name);
                        return (
                          <TableRow key={p.id} className={isCurrentAssignee ? "bg-primary/5" : ""}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{p.name} {isCurrentAssignee && <Badge variant="outline" className="ml-2 text-[10px]">Current</Badge>}</span>
                                <span className="text-xs text-muted-foreground font-mono mt-0.5">{p.rci_number}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isCurrentAssignee ? (
                                (() => {
                                  if (isCompleted) return <span className="text-muted-foreground">-</span>;
                                  const { text, isUrgent } = getRemainingTime(request.assigned_at, request.assignment_attempts);
                                  return (
                                    <div className="flex items-center gap-1.5">
                                      <Clock className={`h-3 w-3 ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`} />
                                      <span className={`text-xs font-medium ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`}>
                                        {text}
                                      </span>
                                    </div>
                                  );
                                })()
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant={isCurrentAssignee ? "secondary" : "default"}
                                disabled={isCompleted || isCurrentAssignee || reassignMutation.isPending}
                                onClick={() => reassignMutation.mutate(p.id)}
                              >
                                {reassignMutation.isPending && reassignMutation.variables === p.id ? "Assigning..." : isCurrentAssignee ? "Assigned" : "Assign"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {psychologists?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                            No eligible psychologists found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-primary/10 shadow-md p-0 overflow-hidden mt-6">
            <CardHeader className="p-4 border-b border-border/50 bg-muted/10">
              <CardTitle className="text-lg">All Clinical Psychologists (Manual Override)</CardTitle>
              <CardDescription>
                Assign any clinical psychologist, including those without full RCI verification. Use with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingAllPsychologists ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                      <TableRow>
                        <TableHead>Psychologist</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPsychologists?.map((p) => {
                        const isCurrentAssignee = request.psychologist_name?.includes(p.name);
                        return (
                          <TableRow key={p.id} className={isCurrentAssignee ? "bg-primary/5" : ""}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{p.name} {isCurrentAssignee && <Badge variant="outline" className="ml-2 text-[10px]">Current</Badge>}</span>
                                <span className="text-xs text-muted-foreground font-mono mt-0.5">{p.rci_number || "No RCI"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isCurrentAssignee ? (
                                <Badge variant="default" className="text-[10px] uppercase">
                                  {request.status || "Pending"}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant={isCurrentAssignee ? "secondary" : "default"}
                                disabled={isCompleted || isCurrentAssignee || reassignMutation.isPending}
                                onClick={() => reassignMutation.mutate(p.id)}
                              >
                                {reassignMutation.isPending && reassignMutation.variables === p.id ? "Assigning..." : isCurrentAssignee ? "Assigned" : "Assign"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {allPsychologists?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            No psychologists found in the database.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Verification Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this verification request?
              <br /><br />
              <strong>₹100 will be automatically refunded</strong> to the wallet of the user who requested this verification. The session status will be updated to "Cancelled". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); cancelMutation.mutate(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel & Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
