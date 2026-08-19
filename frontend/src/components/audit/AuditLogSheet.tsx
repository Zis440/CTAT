import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/services/auditService";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Loader2, Search, Download } from "lucide-react";

interface AuditLogSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId?: string;
  contextTitle?: string;
}

export function AuditLogSheet({
  isOpen,
  onOpenChange,
  targetUserId,
  contextTitle,
}: AuditLogSheetProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: logs = [], isLoading, isError } = useQuery({
    queryKey: ["auditLogs", targetUserId],
    queryFn: () => fetchAuditLogs({ target_user_id: targetUserId, limit: 100 }),
    enabled: isOpen,
  });

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.user_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full bg-background/95 backdrop-blur-md border-l border-border/50">
        <SheetHeader className="pb-4 border-b border-border/50">
          <SheetTitle className="text-xl font-bold tracking-tight">Activity Logs</SheetTitle>
          <SheetDescription>
            {contextTitle ? `History for ${contextTitle}` : "Recent activity history."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions or users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50 border-border/50"
            />
          </div>
          <Button variant="outline" size="icon" title="Export Logs">
            <Download className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Loading logs...</p>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-32 text-destructive">
              <p className="text-sm">Failed to load activity logs.</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">No activity logs found.</p>
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary/50 group-hover:bg-primary transition-colors mt-2" />
                    <div className="w-px h-full bg-border/50 -mb-6 mt-2" />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="text-sm font-medium text-foreground">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <time className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {format(new Date(log.timestamp), "MMM d, yyyy • h:mm a")}
                      </time>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        by <span className="font-medium text-foreground/80">{log.user_name}</span>
                      </p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary/50 text-secondary-foreground font-mono uppercase tracking-wider">
                        {log.user_role?.replace(/_/g, " ")}
                      </span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 text-xs bg-muted/30 p-2 rounded-md font-mono text-muted-foreground overflow-x-auto whitespace-pre">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
