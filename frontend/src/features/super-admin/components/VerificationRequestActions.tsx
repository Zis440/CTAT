import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCog, Ban, RefreshCw, AlertTriangle, FileText, Calendar as CalendarIcon, User as UserIcon, Link as LinkIcon, Building2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";

import { Button } from "@/components/ui/button";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  reassignVerificationRequest,
  cancelVerificationRequest,
  getEligiblePsychologists
} from "@/services/psychologistVerificationService";
import type { VerificationRequestItem } from "@/services/psychologistVerificationService";

interface Props {
  request: VerificationRequestItem;
}

export function VerificationRequestActions({ request }: Props) {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const pdfFilename = request.report_pdf_path?.split("/").pop();
  const pdfApiUrl = pdfFilename ? `/api/reports/pdf/${pdfFilename}` : null;

  const handleOpenPdf = async () => {
    if (!pdfApiUrl) return;
    try {
      const { data } = await apiClient.get(pdfApiUrl, { responseType: 'blob' });
      const fileUrl = URL.createObjectURL(data);
      window.open(fileUrl, "_blank");
    } catch (err) {
      toast.error("Failed to open PDF report.");
    }
  };
  const [selectedPsychologistId, setSelectedPsychologistId] = useState<string>("auto");

  const { data: psychologists, isLoading: loadingPsychologists } = useQuery({
    queryKey: ["admin-eligible-psychologists"],
    queryFn: getEligiblePsychologists,
    enabled: reassignOpen,
  });

  const reassignMutation = useMutation({
    mutationFn: async () => {
      const targetId = selectedPsychologistId === "auto" ? undefined : selectedPsychologistId;
      return reassignVerificationRequest(request.request_id, targetId);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Request reassigned successfully");
      setReassignOpen(false);
      setSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-psychologist-verification-monitor"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to reassign request");
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelVerificationRequest(request.request_id),
    onSuccess: (data) => {
      toast.success(data.message || "Request cancelled");
      setCancelOpen(false);
      setSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-psychologist-verification-monitor"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to cancel request");
    }
  });

  const isCompleted = request.status === "VERIFIED" || request.status === "REJECTED";

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <div>
            <InteractiveHoverButton type="button" className="text-xs h-8 py-0 px-4">
              Details
            </InteractiveHoverButton>
          </div>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Request Details
            </SheetTitle>
            <SheetDescription>
              Detailed view of the verification request and associated entities.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Request ID</p>
                <p className="text-sm font-mono font-medium">{request.request_id.split("-")[0]}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
                <Badge variant={request.status === "VERIFIED" ? "default" : request.status === "ASSIGNED" ? "secondary" : "outline"}>
                  {request.status}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" /> Associated Entities
              </h3>

              <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-border/50">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Patient/Candidate</p>
                  <p className="text-sm font-medium">{request.patient_name || "Unknown"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Session ID</p>
                  <p className="text-sm font-mono">{request.session_id.split("-")[0]}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-border/50">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Requested By</p>
                  <p className="text-sm font-medium">{request.requesting_user_name || "Unknown"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Domain</p>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm">{request.requesting_user_domain || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" /> Timelines
              </h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Created At</p>
                  <p className="text-sm">{request.created_at ? new Date(request.created_at).toLocaleString() : "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Assigned At</p>
                  <p className="text-sm">{request.assigned_at ? new Date(request.assigned_at).toLocaleString() : "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Completed At</p>
                  <p className="text-sm">{request.completed_at ? new Date(request.completed_at).toLocaleString() : "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Attempts</p>
                  <p className="text-sm">{request.assignment_attempts || 0}</p>
                </div>
              </div>
            </div>

            {request.report_pdf_path && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" /> Attachment
                  </h3>
                  <Button variant="outline" className="w-full justify-start" onClick={handleOpenPdf}>
                    <FileText className="mr-2 h-4 w-4 text-primary" />
                    View Assessment Report
                  </Button>
                </div>
              </>
            )}

            {!isCompleted && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Management Actions</h3>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-primary/20 hover:bg-primary/5"
                      onClick={() => setReassignOpen(true)}
                    >
                      <UserCog className="mr-2 h-4 w-4 text-primary" />
                      Reassign Request
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
                      onClick={() => setCancelOpen(true)}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Cancel Request & Refund
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Verification Request</DialogTitle>
            <DialogDescription>
              You can manually assign this request to a specific RCI psychologist, or re-run the algorithm to automatically pick the best available one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Psychologist</Label>
              <Select
                value={selectedPsychologistId}
                onValueChange={setSelectedPsychologistId}
                disabled={loadingPsychologists}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignment method..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" className="font-semibold text-primary">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Re-run Automatic Algorithm
                    </div>
                  </SelectItem>
                  {psychologists?.length === 0 && (
                    <SelectItem value="empty" disabled className="text-muted-foreground italic">
                      No eligible RCI psychologists found
                    </SelectItem>
                  )}
                  {psychologists?.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.rci_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>Close</Button>
            <Button
              onClick={() => reassignMutation.mutate()}
              disabled={reassignMutation.isPending}
            >
              {reassignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Verification Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this verification request?
              <br/><br/>
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
    </>
  );
}
