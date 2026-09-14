import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Loader2, FileText, CheckCircle, Clock, AlertTriangle, RefreshCw, Timer, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/services/apiClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  getPsychologistVerificationQueue,
  approveVerificationRequest,
  rejectVerificationRequest,
  getPsychologistVerificationHistory
} from "@/services/psychologistVerificationService";

async function openDocument(sessionId: string) {
  try {
    const res = await apiClient.get(`/sessions/${sessionId}/report/pdf`, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(res.data);
    const win = window.open(blobUrl, "_blank");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    if (!win) toast.error("Popup blocked — please allow popups for this site.");
  } catch (err: unknown) {
    const error = err as any;
    if (error?.response?.data instanceof Blob) {
      error.response.data.text().then((text: string) => {
        try {
          const json = JSON.parse(text);
          toast.error(json.detail || "Failed to open the PDF report.");
        } catch {
          toast.error("Failed to open the PDF report.");
        }
      });
    } else {
      toast.error(error?.response?.data?.detail || "Failed to open the PDF report.");
    }
  }
}

import { useAuthStore } from "@/store/useAuthStore";
import { Link } from "react-router-dom";

export function ReportVerificationQueuePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: queue, isLoading, isError, refetch } = useQuery({
    queryKey: ["psychologist-verification-queue"],
    queryFn: getPsychologistVerificationQueue,
    refetchInterval: 30_000,
  });

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["psychologist-verification-history"],
    queryFn: getPsychologistVerificationHistory,
  });

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const SLA_HOURS_BY_ATTEMPT: Record<number, number> = { 1: 15, 2: 6, 3: 3 };

  function getRemainingTime(assignedAt: string, attempt: number) {
    const slaHours = SLA_HOURS_BY_ATTEMPT[attempt] || 3;
    const deadline = new Date(new Date(assignedAt).getTime() + slaHours * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs <= 0) return { text: "Expired", isUrgent: true, hours: 0 };
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${hours}h ${mins}m`, isUrgent: hours < 2, hours };
  }

  function getPriorityLevel(attempt: number) {
    if (attempt >= 3) return { label: "Critical", color: "bg-red-500/10 text-red-500 border-red-500/30" };
    if (attempt === 2) return { label: "High", color: "bg-orange-500/10 text-orange-500 border-orange-500/30" };
    return { label: "Normal", color: "bg-blue-500/10 text-blue-500 border-blue-500/30" };
  }

  const approveMutation = useMutation({
    mutationFn: ({ requestId, note }: { requestId: string, note: string }) =>
      approveVerificationRequest(requestId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["psychologist-verification-queue"] });
      toast.success("Report verified and regenerated successfully.");
      setApprovingId(null);
    },
    onError: (err: unknown) => {
      const error = err as any;
      toast.error(error?.response?.data?.detail || "Failed to verify report.");
      setApprovingId(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string; note: string }) => {
      return rejectVerificationRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["psychologist-verification-queue"] });
      toast.success("Report rejected and returned to the queue.");
      setApprovingId(null);
    },
    onError: (err: unknown) => {
      const error = err as any;
      toast.error(error?.response?.data?.detail || "Failed to reject report.");
    }
  });

  const handleApprove = (requestId: string) => {
    approveMutation.mutate({ requestId, note: notes[requestId] || "" });
  };

  const handleReject = (requestId: string) => {
    rejectMutation.mutate({ requestId, note: notes[requestId] || "" });
  };

  const isEligible = user?.verification_status === "approved" && !!user?.rci_number;

  if (!isEligible) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <ShieldAlert className="h-16 w-16 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground max-w-md text-center">
          You must be a CoreTAT Verified Psychologist to access the Report Verification Queue. Please submit your profile on the Verification page to enroll.
        </p>
        <Button asChild variant="outline">
          <Link to="/verification">Go to Verification</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 w-full max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
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
              <p className="font-bold text-text">Failed to load queue</p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>RCI Verification Queue | CoreTAT</title>
      </Helmet>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            RCI Verification Queue
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review assessment reports and apply your RCI-verified signature. SLA: 15h (1st) → 6h (2nd) → 3h (3rd).
          </p>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary font-bold px-3 py-1">
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          {queue?.length ?? 0} pending
        </Badge>
      </div>

      <Tabs defaultValue="pending" className="w-full mt-6">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending Verification</TabsTrigger>
          <TabsTrigger value="history">Verified History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-0">
      {queue?.length === 0 ? (
        <Card className="bg-background/40 border-dashed border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-text">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">
                There are no reports waiting for your verification right now.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Requesting User</TableHead>
                <TableHead>Assigned At</TableHead>
                <TableHead>Remaining Time</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Report PDF</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue?.map((req: any) => {
                const remaining = getRemainingTime(req.assigned_at, req.assignment_attempts || 1);
                const priority = getPriorityLevel(req.assignment_attempts || 1);
                return (
                <React.Fragment key={req.request_id}>
                  <TableRow>
                    <TableCell className="font-medium">{req.patient_name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{req.requesting_user_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{req.requesting_user_domain || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(req.assigned_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${remaining.isUrgent ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {remaining.isUrgent ? <ShieldAlert className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                        {remaining.text}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-bold ${priority.color}`}>
                        {priority.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="link" onClick={() => openDocument(req.session_id)} className="px-0">
                        <FileText className="h-4 w-4 mr-2" /> View Report
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      {approvingId === req.request_id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setApprovingId(null)}>Cancel</Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(req.request_id)}
                            disabled={rejectMutation.isPending || approveMutation.isPending}
                          >
                            {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleApprove(req.request_id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Verify"}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/20 hover:bg-destructive/10"
                            onClick={() => handleReject(req.request_id)}
                            disabled={rejectMutation.isPending}
                          >
                            {rejectMutation.isPending && req.request_id === rejectMutation.variables?.requestId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setApprovingId(req.request_id)}
                          >
                            Verify & Sign
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  {approvingId === req.request_id && (
                    <TableRow className="bg-primary/5">
                      <TableCell colSpan={7} className="p-4">
                        <label className="text-sm font-semibold mb-2 block">Verification Notes (Optional)</label>
                        <Textarea
                          value={notes[req.request_id] || ""}
                          onChange={(e) => setNotes({...notes, [req.request_id]: e.target.value})}
                          placeholder="Any internal notes about this verification..."
                          className="bg-background/50"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          By clicking Confirm, you are appending your signature and RCI number to this report.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-0">
          {isHistoryLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : history?.length === 0 ? (
            <Card className="bg-background/40 border-dashed border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-text">No History Yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You haven't verified any reports yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Requesting User</TableHead>
                    <TableHead>Assigned At</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead>Report PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.map((req: any) => (
                    <TableRow key={req.request_id}>
                      <TableCell className="font-medium">{req.patient_name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{req.requesting_user_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{req.requesting_user_domain || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{req.assigned_at ? new Date(req.assigned_at).toLocaleString() : "—"}</TableCell>
                      <TableCell>{req.completed_at ? new Date(req.completed_at).toLocaleString() : "—"}</TableCell>
                      <TableCell>
                        <Button variant="link" onClick={() => openDocument(req.session_id)} className="px-0">
                          <FileText className="h-4 w-4 mr-2" /> View Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
