import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Eye } from "lucide-react";
import { reportService } from '../services/api';
import { toast } from 'sonner';
import { useAuthStore } from "@/store/useAuthStore";

interface PendingVerification {
  assessment_id: number;
  patient_id: string;
  requested_at: string;
  status: string;
  user_name: string;
}

export const VerificationQueue: React.FC = () => {
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const data = await reportService.getPendingVerifications();
      setPending(data);
    } catch (err) {
      console.error("Failed to fetch verification queue", err);
      toast.error("Failed to load verification queue.");
    } finally {
      setLoading(false);
    }
  };

  if (!user || !['clinic_admin', 'org_admin', 'clinic_staff', 'org_staff'].includes(user.role)) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p>You do not have permission to view the verification queue.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report Verification Queue</h1>
          <p className="text-muted-foreground mt-1">Review and clinically verify Employee Mental Health screening assessments.</p>
        </div>
        <Button onClick={fetchPending} variant="outline" size="sm">
          Refresh Queue
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Pending Reviews
          </CardTitle>
          <CardDescription>
            {pending.length} reports currently await clinical verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No reports currently pending verification.</p>
            </div>
          ) : (
            <div className="divide-y">
              {pending.map(item => (
                <div key={item.assessment_id} className="flex items-center justify-between p-6 hover:bg-muted/50 transition-colors">
                  <div>
                    <h3 className="font-semibold text-lg">{item.user_name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>ID: {item.patient_id}</span>
                      <span>•</span>
                      <span>Requested: {new Date(item.requested_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                      Pending Review
                    </Badge>
                    <Button onClick={() => navigate(`/screening/report/${item.assessment_id}?mode=verify`)} className="gap-2">
                      <Eye className="w-4 h-4" />
                      Review & Verify
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationQueue;
