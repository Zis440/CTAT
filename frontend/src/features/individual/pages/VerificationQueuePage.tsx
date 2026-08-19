import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2, FileText, CheckCircle, Clock } from "lucide-react";
import { VerificationEditorModal } from "./VerificationEditorModal";
import { toast } from "sonner";

interface VerificationRequest {
  id: string | number;
  assessment_type: "tat" | "screening_level1";
  assessment_name: string;
  patient_id: string;
  patient_name: string;
  requested_at: string;
  status: string;
  assigned_to: string | null;
  requested_by: string;
}

export const VerificationQueuePage = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery<VerificationRequest[]>({
    queryKey: ["verification-queue"],
    queryFn: async () => {
      const { data } = await apiClient.get("/verification-queue");
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (req: VerificationRequest) => {
      return await apiClient.post(`/verification-queue/${req.assessment_type}/${req.id}/assign`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-queue"] });
      toast.success("Assessment assigned successfully.");
    },
    onError: () => {
      toast.error("Failed to assign assessment.");
    },
  });

  const handleAssign = (req: VerificationRequest) => {
    assignMutation.mutate(req);
  };

  const handleReview = (req: VerificationRequest) => {
    setSelectedRequest(req);
    setIsEditorOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assessment Verification Queue</h1>
        <p className="text-muted-foreground">Claim and review pending automated assessments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Verifications</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle className="mx-auto h-12 w-12 text-primary/40 mb-4" />
              <p>No pending verification requests found.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Patient Details</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={`${req.assessment_type}-${req.id}`}>
                      <TableCell>
                        <div className="font-medium">{req.assessment_name}</div>
                        <div className="text-xs text-muted-foreground">Type: {req.assessment_type}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{req.patient_name}</div>
                        <div className="text-xs text-muted-foreground">ID: {req.patient_id}</div>
                      </TableCell>
                      <TableCell>{req.requested_by}</TableCell>
                      <TableCell>
                        {req.requested_at ? format(new Date(req.requested_at), "PPp") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === "Assigned"
                              ? "default"
                              : req.status === "pending" || req.status === "Under Verification"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {req.status === "pending" || req.status === "Under Verification" ? (
                            <Clock className="w-3 h-3 mr-1 inline" />
                          ) : null}
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === "pending" || req.status === "Under Verification" ? (
                          <Button size="sm" onClick={() => handleAssign(req)} disabled={assignMutation.isPending}>
                            Claim
                          </Button>
                        ) : req.status === "Assigned" ? (
                          <Button size="sm" variant="outline" onClick={() => handleReview(req)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Review Findings
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled>
                            Completed
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isEditorOpen && selectedRequest && (
        <VerificationEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          request={selectedRequest}
          onSuccess={() => {
            setIsEditorOpen(false);
            queryClient.invalidateQueries({ queryKey: ["verification-queue"] });
          }}
        />
      )}
    </div>
  );
};
