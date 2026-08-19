import { useState, useEffect } from "react";
import { getOrgAssessmentRequests, createOrgAssessmentRequest } from "@/services/orgRequestsService";
import type { OrgAssessmentRequest } from "@/services/orgRequestsService";
import { apiClient } from "@/services/apiClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow, isPast } from "date-fns";

export function OrgAssessmentRequests() {
  const [requests, setRequests] = useState<OrgAssessmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [reqs, pats, asms] = await Promise.all([
        getOrgAssessmentRequests(),
        apiClient.get("/patients").then(res => res.data),
        apiClient.get("/assessments").then(res => res.data)
      ]);
      setRequests(reqs);
      setPatients(pats);
      setAssessments(asms);
    } catch (err) {
      console.error("Failed to load requests", err);
      toast.error("Failed to load assessment requests.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !selectedAssessment) {
      toast.error("Please select a candidate and an assessment.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createOrgAssessmentRequest({
        patient_id: selectedPatient,
        assessment_id: parseInt(selectedAssessment)
      });
      toast.success("Assessment requested successfully.");
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to request assessment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const getStatusBadge = (status: string, deadlineStr: string) => {
    const deadline = new Date(deadlineStr);
    const breached = isPast(deadline) && status !== "completed";

    if (breached || status === "expired") {
      return <Badge variant="destructive" className="flex gap-1 items-center"><AlertCircle className="w-3 h-3" /> SLA Breached</Badge>;
    }
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending Assignment</Badge>;
      case "assigned":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Assigned</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="col-span-1 lg:col-span-7 border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden mt-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/40 via-emerald-500/20 to-transparent" />
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
        <div>
          <CardTitle>Requested Assessments (SLA Tracker)</CardTitle>
          <CardDescription>Track the assignment and completion of candidate assessments.</CardDescription>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-none">
              <Plus className="h-4 w-4" /> Request Assessment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Assessment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRequest} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Candidate</label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Candidate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name || p.id} {p.last_name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Assessment Type</label>
                <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Assessment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assessments.filter(a => !a.is_coming_soon).map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Request
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Request ID</th>
                <th className="px-6 py-3 font-medium">Candidate</th>
                <th className="px-6 py-3 font-medium">Assessment</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Time Remaining</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading requests...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No assessment requests found.</td></tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-6 py-4 font-mono text-xs">{req.id}</td>
                    <td className="px-6 py-4 font-medium">
                      {patients.find(p => p.id === req.patient_id)?.first_name || req.patient_id}
                    </td>
                    <td className="px-6 py-4">
                      {assessments.find(a => a.id === req.assessment_id)?.name || `ID: ${req.assessment_id}`}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(req.status, req.sla_deadline)}</td>
                    <td className="px-6 py-4 text-xs">
                      {req.status === "completed" ? (
                        <span className="text-muted-foreground">Fulfilled</span>
                      ) : (
                        <span className={isPast(new Date(req.sla_deadline)) ? "text-destructive font-semibold" : "text-muted-foreground"}>
                          {isPast(new Date(req.sla_deadline)) ? "Overdue" : formatDistanceToNow(new Date(req.sla_deadline), { addSuffix: true })}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
