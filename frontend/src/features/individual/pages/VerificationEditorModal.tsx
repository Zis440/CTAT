import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VerificationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string | number;
    assessment_type: "tat" | "screening_level1";
    assessment_name: string;
  };
  onSuccess: () => void;
}

export const VerificationEditorModal: React.FC<VerificationEditorModalProps> = ({
  isOpen,
  onClose,
  request,
  onSuccess,
}) => {
  const [notes, setNotes] = useState("");
  const [clinicalInsight, setClinicalInsight] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [clinicalFormulation, setClinicalFormulation] = useState("");

  const { data: details, isLoading } = useQuery({
    queryKey: ["verification-details", request.assessment_type, request.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/verification-queue/${request.assessment_type}/${request.id}`);
      return data;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (details?.report_data) {
      if (request.assessment_type === "screening_level1") {
        const summary = details.report_data.report_summary || details.report_data;
        setExecutiveSummary(summary.executive_summary || "");
        setClinicalInsight(summary.ai_clinical_insight || "");
      } else if (request.assessment_type === "tat") {
        const summary = details.report_data.report_summary || details.report_data;
        setClinicalFormulation(summary.clinical_formulation || "");
      }
    }
  }, [details, request.assessment_type]);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { verification_notes: notes };
      if (request.assessment_type === "screening_level1") {
        payload.executive_summary = executiveSummary;
        payload.ai_clinical_insight = clinicalInsight;
      } else if (request.assessment_type === "tat") {
        payload.clinical_formulation = clinicalFormulation;
      }
      return await apiClient.post(`/verification-queue/${request.assessment_type}/${request.id}/approve`, payload);
    },
    onSuccess: () => {
      toast.success("Assessment verified and approved.");
      onSuccess();
    },
    onError: () => {
      toast.error("Failed to approve assessment.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { verification_notes: notes };
      return await apiClient.post(`/verification-queue/${request.assessment_type}/${request.id}/reject`, payload);
    },
    onSuccess: () => {
      toast.success("Assessment rejected.");
      onSuccess();
    },
    onError: () => {
      toast.error("Failed to reject assessment.");
    },
  });

  const handleApprove = () => {
    if (!notes.trim()) {
      toast.error("Please add verification notes before approving.");
      return;
    }
    approveMutation.mutate();
  };

  const handleReject = () => {
    if (!notes.trim()) {
      toast.error("Please add rejection notes before rejecting.");
      return;
    }
    rejectMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review Findings - {request.assessment_name}</DialogTitle>
          <DialogDescription>
            Edit the assessment findings and add your clinical notes to finalize the report.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 py-4 pr-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {request.assessment_type === "screening_level1" && (
                <>
                  <div className="space-y-2">
                    <Label>Executive Summary</Label>
                    <Textarea
                      className="min-h-[150px]"
                      value={executiveSummary}
                      onChange={(e) => setExecutiveSummary(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Automated Clinical Insight</Label>
                    <Textarea
                      className="min-h-[150px]"
                      value={clinicalInsight}
                      onChange={(e) => setClinicalInsight(e.target.value)}
                    />
                  </div>
                </>
              )}

              {request.assessment_type === "tat" && (
                <div className="space-y-2">
                  <Label>Clinical Formulation</Label>
                  <Textarea
                    className="min-h-[300px]"
                    value={clinicalFormulation}
                    onChange={(e) => setClinicalFormulation(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Your Verification Notes (Internal / Audit)</Label>
                <Textarea
                  placeholder="Explain your modifications or confirm the assessment findings..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending || approveMutation.isPending || isLoading}>
              {rejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Reject Report
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending || rejectMutation.isPending || isLoading}>
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Approve & Verify Report
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
