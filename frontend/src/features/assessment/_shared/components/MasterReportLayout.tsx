import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/dateFormat";
import { Badge } from "@/components/ui/badge";

interface MasterReportLayoutProps {
  title: string;
  subtitle: string;
  patientId?: string;
  status?: string;
  generatedDate?: string;
  verifiedByName?: string;
  leftFooterActions?: ReactNode;
  rightFooterActions?: ReactNode;
  rightHeaderActions?: ReactNode;
  children: ReactNode;
}

export function MasterReportLayout({
  title,
  subtitle,
  patientId,
  status,
  generatedDate,
  verifiedByName,
  leftFooterActions,
  rightFooterActions,
  rightHeaderActions,
  children,
}: MasterReportLayoutProps) {
  return (
    <div className="bg-background min-h-screen py-10 font-['Helvetica',sans-serif] print:py-0 print:bg-white text-foreground">
      <div id="pdf-content" className="w-full max-w-6xl mx-auto bg-transparent text-foreground px-12 py-16 print:shadow-none print:px-8 print:py-8">

        <div className="flex flex-col items-center border-b-2 border-border pb-8 mb-10 relative">
          <div className="absolute top-[-2rem] left-0 right-0 flex justify-between items-start w-full">
            <div className="flex flex-col gap-3 items-start">
              {patientId && (
                <Badge variant="outline" className="text-sm px-3 py-1 print:hidden">Patient: {patientId}</Badge>
              )}
              {(status === "Verified by Psychologist" || status === "validated" || status === "Finalized") && verifiedByName && (
                <div className="inline-flex items-center gap-2 bg-[#f0fdf4] text-[#166534] border border-[#dcfce7] px-4 py-2 rounded-lg shadow-sm print:mt-4">
                  <ShieldCheck className="w-5 h-5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5">Verified By</p>
                    <p className="text-sm font-bold">{verifiedByName}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-right flex flex-col items-end gap-2">
              {rightHeaderActions}
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Generated</p>
                <p className="text-sm font-bold text-foreground">
                  {generatedDate
                    ? formatDateTime(generatedDate)
                    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">{title}</h1>
            <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mt-2">{subtitle}</p>
            {status && status !== "Finalized" && status !== "Verified by Psychologist" && status !== "validated" && status.toLowerCase() !== "ai generated" && status.toLowerCase() !== "ai_generated" && (
              <p className="text-xs font-bold text-amber-600 uppercase mt-4 bg-amber-50 inline-block px-3 py-1 rounded border border-amber-200">
                {status === "pending" || status === "Under Verification" || status === "Assigned" ? "Pending Verification" : status}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-10">
          {children}
        </div>

        {(leftFooterActions || rightFooterActions) && (
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-8 print:hidden px-4 sm:px-0">
            <div>
              {leftFooterActions}
            </div>
            <div className="flex gap-4 flex-wrap justify-end">
              {rightFooterActions}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
