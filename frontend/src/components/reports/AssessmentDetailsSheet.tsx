import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import type { PastSession } from "@/features/assessment/tat/services/analysisService";
import { Calendar, User, FileText, Clock, Activity } from "lucide-react";

interface AssessmentDetailsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  report: PastSession | null;
}

const getAssessmentName = (report: PastSession) => {
  if (report.test_type === 'screening_level1') return 'Employee Mental Health & Wellbeing';
  if (report.test_type === 'tat' || (report.cards_examined && report.cards_examined.length > 0)) return 'Narrative Assessment';
  if (report.test_type) return report.test_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return 'Assessment';
};

export function AssessmentDetailsSheet({
  isOpen,
  onOpenChange,
  report,
}: AssessmentDetailsSheetProps) {
  if (!report) return null;

  const date = report.timestamp || report.created_at;
  const formattedDate = date ? format(new Date(date), "MMMM d, yyyy") : "N/A";
  const formattedTime = date ? format(new Date(date), "h:mm a") : "N/A";

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full bg-background/95 backdrop-blur-md border-l border-border/50">
        <SheetHeader className="pb-4 border-b border-border/50">
          <SheetTitle className="text-xl font-bold tracking-tight">Assessment Log</SheetTitle>
          <SheetDescription>
            Information and metadata for this assessment report.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-4 -mr-4 py-6 space-y-6">
          
          <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Candidate</p>
              <p className="text-lg font-semibold text-foreground">{report.patient_name || "Unknown Candidate"}</p>
              {report.patient_id && <p className="text-xs text-muted-foreground mt-0.5">ID: {report.patient_id}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5"><FileText className="h-4 w-4" /> Assessment Type</p>
              <p className="font-medium text-foreground pl-5.5">{getAssessmentName(report)}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Activity className="h-4 w-4" /> Status</p>
              <p className="font-medium text-foreground pl-5.5 capitalize">
                {report.pdf_filename ? "Completed" : "Processing"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Date</p>
              <p className="font-medium text-foreground pl-5.5">{formattedDate}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="h-4 w-4" /> Time</p>
              <p className="font-medium text-foreground pl-5.5">{formattedTime}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5"><User className="h-4 w-4" /> Taken By</p>
              <p className="font-medium text-foreground pl-5.5">{report.psychologist_name || "System"}</p>
            </div>

          </div>

          <div className="pt-6 border-t border-border/50">
            <h4 className="text-sm font-medium text-foreground mb-4">System Information</h4>
            <div className="bg-muted/30 rounded-md p-4 space-y-3">
               <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Report ID</span>
                  <span className="font-mono text-foreground/80">{report.id}</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Report Generated</span>
                  <span className="text-foreground/80">{report.pdf_filename ? "Yes" : "No"}</span>
               </div>
               {report.cards_examined && report.cards_examined.length > 0 && (
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Items Examined</span>
                    <span className="text-foreground/80">{report.cards_examined.length}</span>
                 </div>
               )}
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
