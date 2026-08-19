import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Plus, LifeBuoy, Clock, Search, MessageSquare, Paperclip } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTickets, createTicket } from "@/services/supportService";
import type { SupportTicketCreate, SupportTicket } from "@/services/supportService";
import { cn } from "@/lib/utils";
import { SupportThreadDialog } from "\@/components/common/SupportThreadDialog";

export function SupportPage() {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: getTickets,
  });

  const mutation = useMutation({
    mutationFn: (newTicket: SupportTicketCreate) => createTicket(newTicket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Support ticket created successfully.");
      setSubject("");
      setMessage("");
      setFilter("open");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to create support ticket.");
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Please provide both subject and message.");
      return;
    }
    setIsSubmitting(true);
    mutation.mutate({ subject, message });
  };

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((ticket) => {
      const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === "all" || ticket.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [tickets, searchQuery, filter]);

  return (
    <div className="w-full">
      <Helmet>
        <title>Contact Support | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="space-y-8 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-text tracking-tight flex items-center gap-2">
              <LifeBuoy className="h-8 w-8 text-primary" />
              Contact Support
            </h1>
            <p className="text-text/60 text-sm">
              Create a new support ticket or provide feedback.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="border-primary/10 bg-background/80 backdrop-blur-sm shadow-xl shadow-primary/5 h-full flex flex-col overflow-hidden pt-0 gap-0">
              <CardHeader className="bg-primary/5 border-b-0 shrink-0 pt-5 pb-5 sm:h-[104px] flex flex-col justify-center">
                <CardTitle className="text-lg font-bold text-text flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Create Ticket
                </CardTitle>
                <CardDescription className="text-text/60">
                  Fill out the details below to raise a new support request.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1 flex flex-col">
                <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col">
                  <div className="space-y-2.5 shrink-0">
                    <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                      Subject
                    </Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Issue with appointment booking"
                      className="bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                    />
                  </div>
                  <div className="space-y-2.5 flex-1 flex flex-col">
                    <Label className="text-text/80 font-bold text-xs uppercase tracking-wider shrink-0">
                      Message
                    </Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please provide as much detail as possible..."
                      className="min-h-[140px] flex-1 bg-background/50 border-primary/15 focus:border-primary/40 resize-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2.5 shrink-0">
                    <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                      Attachments (Optional)
                    </Label>
                    <div className="flex items-center gap-3">
                      <Button type="button" variant="outline" className="gap-2 border-dashed border-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-colors bg-background/50">
                        <Paperclip className="h-4 w-4 text-primary" />
                        <span className="font-bold text-text text-xs uppercase tracking-wider">Attach File</span>
                      </Button>
                      <span className="text-xs text-text/50 font-medium">SVG, PNG, JPG or PDF (max. 10MB)</span>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 transition-all hover:translate-y-[-2px] disabled:opacity-50 disabled:hover:translate-y-0 shrink-0"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Submit Ticket
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="border-primary/10 bg-background/80 backdrop-blur-sm h-full flex flex-col shadow-xl shadow-primary/5 overflow-hidden pt-0 gap-0">
              <CardHeader className="border-b-0 bg-muted/20 pt-5 pb-5 sm:h-[104px] flex flex-col justify-center w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <div>
                    <CardTitle className="text-lg font-bold text-text flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Your Tickets
                    </CardTitle>
                    <CardDescription className="text-text/60 mt-1">
                      Manage and track your support history.
                    </CardDescription>
                  </div>

                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tickets..."
                      className="pl-9 bg-background/50 border-primary/20 focus:border-primary/50 transition-all rounded-full h-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full flex flex-col h-full">
                  <div className="px-6 pt-5">
                    <TabsList className="bg-muted/50 p-1 w-full max-w-[400px] grid grid-cols-3 rounded-full">
                      <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-semibold">All</TabsTrigger>
                      <TabsTrigger value="open" className="rounded-full data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-semibold">Open</TabsTrigger>
                      <TabsTrigger value="closed" className="rounded-full data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all font-semibold">Closed</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 p-6">
                    {isLoading ? (
                      <div className="h-full flex items-center justify-center min-h-[300px]">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      </div>
                    ) : filteredTickets.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border/50 rounded-2xl bg-background/30 min-h-[300px] animate-in fade-in duration-500">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-8 ring-primary/5">
                          <LifeBuoy className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-text mb-2">No Tickets Found</h3>
                        <p className="text-sm text-text/50 max-w-[300px]">
                          {searchQuery || filter !== "all"
                            ? "No tickets match your current filters."
                            : "You haven't submitted any support requests yet. We're here when you need us!"}
                        </p>
                        {(searchQuery || filter !== "all") && (
                          <Button
                            variant="ghost"
                            onClick={() => { setSearchQuery(""); setFilter("all"); }}
                            className="mt-4 text-primary hover:text-primary/80 font-semibold"
                          >
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {filteredTickets.map((ticket, index) => (
                            <motion.div
                              key={ticket.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2, delay: index * 0.05 }}
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setIsDialogOpen(true);
                              }}
                              className="group p-5 rounded-2xl border border-border/40 bg-card hover:bg-accent/5 hover:border-primary/30 transition-all cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden"
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-3 mb-1">
                                    <h4 className="font-bold text-lg text-text truncate group-hover:text-primary transition-colors">
                                      {ticket.subject}
                                    </h4>
                                    <span
                                      className={cn(
                                        "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 border",
                                        ticket.status === "open"
                                          ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                          : "bg-green-500/10 text-green-600 border-green-500/20"
                                      )}
                                    >
                                      {ticket.status === "open" ? "Open" : "Closed"}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(ticket.created_at), "MMM d, yyyy • h:mm a")}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm text-text/70 bg-muted/30 p-3.5 rounded-xl border border-border/30 line-clamp-2 leading-relaxed group-hover:bg-background transition-colors">
                                {ticket.message}
                              </p>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <SupportThreadDialog
        ticket={selectedTicket}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
