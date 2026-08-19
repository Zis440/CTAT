import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Paperclip, Send, Download } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getTicketMessages, replyToTicket } from "@/services/supportService";
import type { SupportTicket } from "@/services/supportService";
import { useAuthStore } from "@/store/useAuthStore";
import { cn, getMediaUrl } from "@/lib/utils";

interface SupportThreadDialogProps {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}

export function SupportThreadDialog({
  ticket,
  open,
  onOpenChange,
  isAdmin = false,
}: SupportThreadDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["support-messages", ticket?.id],
    queryFn: () => getTicketMessages(ticket!.id),
    enabled: !!ticket?.id && open,
  });

  const replyMutation = useMutation({
    mutationFn: () => replyToTicket(ticket!.id, message, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-messages", ticket?.id] });

      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      setMessage("");
      setFile(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to send message.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !file) {
      toast.error("Please enter a message or attach a file.");
      return;
    }
    replyMutation.mutate();
  };

  const isClosed = ticket?.status === "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden bg-background border-primary/20">

        <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl font-bold truncate pr-4">
              {ticket?.subject}
            </DialogTitle>
            <Badge
              variant="outline"
              className={cn(
                "uppercase tracking-wider shrink-0 font-bold",
                isClosed
                  ? "border-green-500/30 text-green-600 bg-green-500/10"
                  : "border-yellow-500/30 text-yellow-600 bg-yellow-500/10"
              )}
            >
              {isClosed ? "Closed" : "Open"}
            </Badge>
          </div>
          {isAdmin && (
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Ticket by {ticket?.user_id}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 bg-muted/20">
          <div className="space-y-6 max-w-full">

            <div className="flex flex-col items-start max-w-[85%]">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-6 w-6 border border-border shrink-0">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    U
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground">
                  {isAdmin ? "User" : "You"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {ticket?.created_at ? format(new Date(ticket.created_at), "d/M/yyyy, h:mm a") : ""}
                </span>
              </div>
              <div className="bg-background border border-border/50 p-3 rounded-2xl rounded-tl-sm text-sm text-foreground shadow-sm">
                {ticket?.message}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
              </div>
            ) : (
              messages?.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                const isAdminMsg = msg.sender_role === "super_admin";

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      isMe ? "items-end self-end ml-auto" : "items-start"
                    )}
                  >
                    <div className={cn("flex items-center gap-2 mb-1", isMe && "flex-row-reverse")}>
                      <Avatar className="h-6 w-6 border border-border shrink-0">
                        <AvatarFallback className={cn("text-[10px]", isAdminMsg ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                          {isAdminMsg ? "A" : (isMe ? "Y" : "U")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground">
                        {isMe ? "You" : msg.sender_name || (isAdminMsg ? "Support Team" : "User")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.created_at), "d/M/yyyy, h:mm a")}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "p-3 rounded-2xl text-sm shadow-sm space-y-2 whitespace-pre-wrap break-words w-full",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-background border border-border/50 text-foreground rounded-tl-sm"
                      )}
                    >
                      <span>{msg.message}</span>

                      {msg.attachment_path && (
                        <div className="mt-2 pt-2 border-t border-primary-foreground/20">
                          <a
                            href={getMediaUrl(msg.attachment_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs font-medium hover:underline opacity-90 hover:opacity-100 transition-opacity"
                          >
                            <Download className="h-3 w-3 shrink-0" />
                            View Attachment
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="p-4 bg-background border-t border-border/50 shrink-0">
          {isClosed ? (
            <div className="text-center p-3 text-sm text-muted-foreground bg-muted/50 rounded-xl border border-border/50">
              This ticket is closed. You cannot send new messages.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {file && (
                <div className="flex items-center gap-2 text-xs bg-primary/5 text-primary w-fit px-3 py-1.5 rounded-full border border-primary/20">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[200px] font-medium">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="ml-2 hover:text-red-500 font-bold px-1"
                  >
                    ×
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-10 w-10 rounded-xl border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={replyMutation.isPending}
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="sr-only">Attach file</span>
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFile(e.target.files[0]);
                    }
                  }}
                  disabled={replyMutation.isPending}
                />

                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="min-h-[40px] max-h-32 bg-background focus:border-primary/40 resize-none py-2.5 rounded-xl flex-1"
                  disabled={replyMutation.isPending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (message.trim() || file) handleSubmit(e);
                    }
                  }}
                />

                <Button
                  type="submit"
                  disabled={replyMutation.isPending || (!message.trim() && !file)}
                  className="shrink-0 h-10 w-10 rounded-xl shadow-md transition-transform hover:scale-105"
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 ml-0.5" />
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
