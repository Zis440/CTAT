import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, ScrollText, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiClient } from "@/services/apiClient";

function FormattedValue({ value }: { value: any }) {
  if (typeof value === "boolean") {
    return value ? (
      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1 rounded-sm py-0 text-[10px] h-5 font-semibold">
        <CheckCircle2 className="h-3 w-3" /> Yes
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1 rounded-sm py-0 text-[10px] h-5 font-semibold">
        <XCircle className="h-3 w-3" /> No
      </Badge>
    );
  }

  if (typeof value === "object" && value !== null) {
    return (
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {Object.entries(value).map(([k, v]) => {
          const formattedKey = k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
          return (
            <div key={k} className="flex items-center gap-1.5 bg-background border border-border/50 rounded-md px-2 py-1 text-[11px] shadow-sm">
              <span className="text-muted-foreground font-medium">{formattedKey}:</span>
              <span><FormattedValue value={v} /></span>
            </div>
          );
        })}
      </div>
    );
  }

  if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null) {
        return <FormattedValue value={parsed} />;
      }
    } catch (e) {

    }
  }

  return <span className="break-all">{String(value)}</span>;
}

interface AuditLog {
  id: string;
  action: string;
  target_user_id?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export function UserAuditLogsSheet({
  userId,
  userName,
  open,
  onOpenChange,
}: {
  userId: string | null;
  userName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && userId) {
      setIsLoading(true);
      setError(null);
      apiClient
        .get(`/audit-logs?user_id=${userId}`)
        .then((res) => setLogs(res.data))
        .catch((err) => setError(err.response?.data?.detail || "Failed to load logs."))
        .finally(() => setIsLoading(false));
    }
  }, [open, userId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto overflow-x-hidden border-l border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            Audit Logs for {userName || "User"}
          </SheetTitle>
          <SheetDescription>
            A chronological list of actions performed by this user.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Loading logs...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-destructive">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No audit logs found for this user.</p>
            </div>
          ) : (
            <div className="relative border-l border-border ml-3 space-y-6 pb-4">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="mb-1 flex items-center justify-between gap-4">
                    <span className="font-semibold text-sm capitalize">
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(log.timestamp), "MMM d, yyyy h:mm:ss a")}
                    </span>
                  </div>
                  {log.target_user_id && (
                    <div className="text-xs text-muted-foreground mb-1">
                      <span className="font-medium">Target ID:</span> {log.target_user_id}
                    </div>
                  )}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="bg-muted/30 rounded-md p-3 mt-2 border border-border/50 text-xs">
                      <div className="grid gap-1.5">
                        {Object.entries(log.details).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-[120px_1fr] items-start gap-2">
                            <span className="font-medium text-muted-foreground">
                              {key.replace(/_/g, " ")
                                 .replace(/\b\w/g, l => l.toUpperCase())
                                 .replace(/\bIp\b/i, "IP")
                                 .replace(/\bAi\b/i, "AI")
                                 .replace(/\bRci\b/i, "RCI")
                                 .replace(/\bId\b/i, "ID")
                                 .replace(/^Path$/i, "API Path")
                                 .replace(/^Url$/i, "URL")}:
                            </span>
                            <div className="text-foreground min-w-0">
                              <FormattedValue value={value} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
