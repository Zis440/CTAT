import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  LifeBuoy,
  Clock,
  CheckCircle,
  Loader2,
  Mail,
  User,
  Search,
  AlertCircle,
  Filter,
  RotateCcw,
  Check,
} from "lucide-react";
import { formatDate } from "@/lib/dateFormat";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getAllTicketsAdmin, updateTicketStatus } from "@/services/supportService";
import type { SupportTicketAdmin } from "@/services/supportService";
import { cn } from "@/lib/utils";
import { SupportThreadDialog } from "\@/components/common/SupportThreadDialog";
import { useBulkSelection } from "@/hooks/useBulkSelection";

export function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketAdmin | null>(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    toggleAllOnPage,
    isItemSelected,
    exportSelectedToPDF,
    exportSelectedToExcel,
  } = useBulkSelection<SupportTicketAdmin>();

  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: getAllTicketsAdmin,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) =>
      updateTicketStatus(id, currentStatus === "open" ? "closed" : "open"),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast.success(`Ticket marked as ${updated.status}.`);
      if (selectedTicket && selectedTicket.id === updated.id) {
        setSelectedTicket({
          ...selectedTicket,
          status: updated.status,
        });
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update ticket status.");
    },
  });

  // Filter & Search Tickets
  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  const totalPages = Math.ceil(filteredTickets.length / pageSize);
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="w-full">
      <Helmet>
        <title>Support Requests  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-2"
          >
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <LifeBuoy className="h-7 w-7 text-primary" />
              Support Requests
            </h1>
            <p className="text-text/60 text-sm">
              Review and resolve all support requests submitted by psychologists and clinic administrators.
            </p>
          </motion.div>
          {!isSelectionMode && (
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={toggleSelectionMode}
            >
              <Check className="h-4 w-4 mr-2" /> Select
            </Button>
          )}
        </div>

        {/* Main Card with Filters + Table */}
        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
          {isSelectionMode ? (
            <div className="flex items-center justify-between p-4 bg-primary/10 border-b border-primary/20">
              <span className="text-base font-medium text-foreground">
                {selectedItems.size} requests selected
              </span>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" className="rounded-xl h-10" onClick={toggleSelectionMode}>
                  Cancel
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="default" className="rounded-xl h-10">
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportSelectedToPDF({ pdfHeader: "Support Requests", columns: [{ label: "Subject", key: "subject" }, { label: "Status", key: "status" }, { label: "User Name", key: "user_name" }, { label: "Email", key: "user_email" }] })}>
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportSelectedToExcel({ columns: [{ label: "Subject", key: "subject" }, { label: "Status", key: "status" }, { label: "User Name", key: "user_name" }, { label: "Email", key: "user_email" }] }, "Support Requests")}>
                      Export as Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text/40" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by subject, email, name..."
                    className="pl-9 h-10 bg-background/50 border-primary/15 focus:border-primary/40 rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" /> Filter
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-4 rounded-xl">
                      <div className="grid gap-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Filter Options</h4>
                            <p className="text-sm text-muted-foreground">Adjust filters for support requests.</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearchQuery("");
                              setStatusFilter("all");
                              setCurrentPage(1);
                            }}
                            className="h-8 px-2 text-xs"
                          >
                            <RotateCcw className="mr-2 h-3 w-3" /> Reset
                          </Button>
                        </div>
                        <div className="grid gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground font-bold uppercase">Status</Label>
                            <Select value={statusFilter} onValueChange={(val: any) => {
                              setStatusFilter(val);
                              setCurrentPage(1);
                            }}>
                              <SelectTrigger className="w-full h-9">
                                <SelectValue placeholder="All Statuses" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                  </PopoverContent>
                </Popover>
              </div>
              </div>
            </CardHeader>
          )}

          <CardContent className="p-0">
            <Table className="max-md:block">
              <TableHeader className="max-md:hidden">
                <TableRow className="hover:bg-transparent">
                  {isSelectionMode && (
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={filteredTickets.length > 0 && filteredTickets.every(t => isItemSelected(t.id))}
                        onCheckedChange={() => toggleAllOnPage(filteredTickets, filteredTickets.every(t => isItemSelected(t.id)))}
                      />
                    </TableHead>
                  )}
                  <TableHead>Ticket</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="max-md:block">
                {isLoading ? (
                  <TableRow className="max-md:block">
                    <TableCell colSpan={isSelectionMode ? 6 : 5} className="py-24 text-center max-md:block max-md:py-8">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <h3 className="text-lg font-medium text-text/70">Loading Tickets...</h3>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow className="max-md:block">
                    <TableCell colSpan={isSelectionMode ? 6 : 5} className="py-12 text-center text-destructive max-md:block max-md:py-8">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <AlertCircle className="h-10 w-10 text-red-500" />
                        <h3 className="text-lg font-bold text-text">Failed to Load Tickets</h3>
                        <p className="text-sm text-text/50">Please verify network connectivity and credentials.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTickets.length === 0 ? (
                  <TableRow className="max-md:block">
                    <TableCell colSpan={isSelectionMode ? 6 : 5} className="py-16 text-center max-md:block max-md:py-8">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-1 animate-pulse">
                          <LifeBuoy className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-text mb-1">No Tickets Found</h3>
                        <p className="text-sm text-text/50 max-w-xs mx-auto">
                          {searchQuery || statusFilter !== "all"
                            ? "Try adjusting your search criteria or filters."
                            : "All user queries are completely resolved!"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer transition-colors hover:bg-primary/5 max-md:block max-md:p-4 max-md:border-b max-md:relative"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsThreadOpen(true);
                      }}
                    >
                      {isSelectionMode && (
                        <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isItemSelected(ticket.id)}
                            onCheckedChange={() => toggleItemSelection(ticket)}
                          />
                        </TableCell>
                      )}
                      <TableCell className={cn("max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Ticket</span>
                        <div className="flex flex-col max-md:items-end">
                          <span className="font-bold text-sm text-text truncate max-w-[200px] sm:max-w-[300px]">
                            {ticket.subject}
                          </span>
                          <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px] sm:max-w-[300px]">
                            {ticket.message}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Submitter</span>
                        <div className="flex flex-col max-md:items-end">
                          <span className="flex items-center gap-1.5 min-w-0 font-medium text-sm text-text">
                            <span className="md:hidden truncate">{ticket.user_name}</span>
                            <User className="h-3.5 w-3.5 text-primary/60 shrink-0 max-md:hidden" />
                            <span className="truncate max-md:hidden">{ticket.user_name}</span>
                          </span>
                          <span className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground mt-0.5">
                            <span className="md:hidden truncate">{ticket.user_email}</span>
                            <Mail className="h-3.5 w-3.5 text-primary/60 shrink-0 max-md:hidden" />
                            <span className="truncate max-md:hidden">{ticket.user_email}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</span>
                        {formatDate(ticket.created_at)}
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                        <span
                          className={cn(
                            "text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider",
                            ticket.status === "open"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-green-500/10 text-green-500"
                          )}
                        >
                          {ticket.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                              setIsThreadOpen(true);
                            }}
                          >
                            Review
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStatusMutation.mutate({
                                id: ticket.id,
                                currentStatus: ticket.status,
                              });
                            }}
                            disabled={toggleStatusMutation.isPending && (toggleStatusMutation.variables as any)?.id === ticket.id}
                            className={cn(
                              "font-semibold text-xs",
                              ticket.status === "open"
                                ? "border-green-500/30 text-green-600 hover:bg-green-500/10"
                                : "border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10"
                            )}
                          >
                            {ticket.status === "open" ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1.5" />
                                Resolve
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1.5" />
                                Reopen
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages >= 0 && !isLoading && !error && (
          <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
              Showing <span className="font-medium text-foreground">{filteredTickets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, filteredTickets.length)}</span> of <span className="font-medium text-foreground">{filteredTickets.length}</span> requests
            </p>
            <Pagination className="sm:justify-end sm:w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    totalPages > 7 &&
                    (page < currentPage - 2 || page > currentPage + 2) &&
                    page !== 1 &&
                    page !== totalPages
                  ) {
                    if (page === currentPage - 3 || page === currentPage + 3) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  }

                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <SupportThreadDialog
        ticket={selectedTicket}
        open={isThreadOpen}
        onOpenChange={setIsThreadOpen}
        isAdmin={true}
      />
    </div>
  );
}
