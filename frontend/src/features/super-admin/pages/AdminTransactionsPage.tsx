import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  RotateCcw,
  Check,
  Download,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/dateFormat";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";
import { formatRupees } from "@/types/wallet";
import { parseTransactionDescription } from "@/lib/transactionUtils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBulkSelection } from "@/hooks/useBulkSelection";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminWalletTransactionOut {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_address?: string;
  type: "credit" | "debit";
  amount_paise: number;
  amount_rupees: number;
  balance_after_paise: number;
  balance_after_rupees: number;
  description: string;
  razorpay_payment_id?: string;
  created_at: string;
}

interface PaginatedAdminTransactionsResponse {
  transactions: AdminWalletTransactionOut[];
  total: number;
  page: number;
  page_size: number;
}

export function AdminTransactionsPage() {
  const navigate = useNavigate();
  const { pageId } = useParams();
  const page = parseInt(pageId as string, 10) || 1;
  const [transactions, setTransactions] = useState<AdminWalletTransactionOut[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 30;

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    toggleAllOnPage,
    isItemSelected,
    exportSelectedToPDF,
    exportSelectedToExcel,
  } = useBulkSelection<AdminWalletTransactionOut>();

  const fetchTransactions = async (pageNum: number, searchQuery: string) => {
    setIsLoading(true);
    try {
      const params: any = { page: pageNum, page_size: pageSize };
      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.type_filter = typeFilter;
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) params.date_to = new Date(dateTo).toISOString();

      const { data } = await apiClient.get<PaginatedAdminTransactionsResponse>(
        "/admin/transactions",
        { params }
      );
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (page !== 1) navigate('/admin/transactions');
      else fetchTransactions(1, search);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    fetchTransactions(page, search);
  }, [page, typeFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Transactions  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <History className="h-7 w-7 text-primary" />
            Transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            View all wallet credits and debits across the platform.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isSelectionMode && (
            <Button
              type="button"
              variant="outline"
              onClick={toggleSelectionMode}
            >
              <Check className="h-4 w-4 mr-2" /> Select
            </Button>
          )}
        </div>
      </div>

      <Card className="border-primary/10 shadow-md bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />

        {isSelectionMode ? (
          <div className="flex items-center justify-between p-4 bg-primary/10 border-b border-primary/20">
            <span className="text-base font-medium text-foreground">
              {selectedItems.size} transactions selected
            </span>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={toggleSelectionMode}>
                Cancel
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="default">Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportSelectedToPDF({ pdfHeader: "Transaction History", columns: [{ label: "Date", key: (tx) => formatDateTime(tx.created_at) }, { label: "User", key: "user_name" }, { label: "Email", key: "user_email" }, { label: "Description", key: "description" }, { label: "Type", key: (tx) => tx.type.charAt(0).toUpperCase() + tx.type.slice(1) }, { label: "Amount", key: (tx) => formatRupees(tx.amount_paise).replace("₹", "Rs. ") }, { label: "Balance", key: (tx) => formatRupees(tx.balance_after_paise).replace("₹", "Rs. ") }] })}>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportSelectedToExcel({ columns: [{ label: "Date", key: (tx) => formatDateTime(tx.created_at) }, { label: "User", key: "user_name" }, { label: "Email", key: "user_email" }, { label: "Description", key: "description" }, { label: "Type", key: (tx) => tx.type.charAt(0).toUpperCase() + tx.type.slice(1) }, { label: "Amount", key: (tx) => formatRupees(tx.amount_paise) }, { label: "Balance", key: (tx) => formatRupees(tx.balance_after_paise) }] }, "Transactions")}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">

              <div className="flex w-full max-w-sm items-center space-x-2">
                <div className="relative w-full">
                  <SearchInput placeholder="Search by user or email..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} className="w-full sm:w-64" />
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto overflow-y-hidden pb-1 md:pb-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" /> Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-4">
                    <div className="grid gap-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">Filter Options</h4>
                          <p className="text-sm text-muted-foreground">Adjust filters for transactions.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                          <RotateCcw className="mr-2 h-3 w-3" /> Reset
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground font-bold uppercase">Type</Label>
                          <select
                            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={typeFilter}
                            onChange={(e) => {
                              setTypeFilter(e.target.value);
                              if (page !== 1) navigate('/admin/transactions');
                            }}
                          >
                            <option value="">All Types</option>
                            <option value="credit">Credit</option>
                            <option value="debit">Debit</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground font-bold uppercase">From</Label>
                          <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                              setDateFrom(e.target.value);
                              if (page !== 1) navigate('/admin/transactions');
                            }}
                            className="h-9 w-full"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground font-bold uppercase">To</Label>
                          <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                              setDateTo(e.target.value);
                              if (page !== 1) navigate('/admin/transactions');
                            }}
                            className="h-9 w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent>
          <div className="rounded-xl border border-primary/10 bg-background/50 overflow-hidden">
            <Table className="max-md:block">
              <TableHeader className="bg-primary/5 max-md:hidden">
                <TableRow className="hover:bg-transparent">
                  {isSelectionMode && (
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={transactions.length > 0 && transactions.every(t => isItemSelected(t.id))}
                        onCheckedChange={() => toggleAllOnPage(transactions, transactions.every(t => isItemSelected(t.id)))}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[180px] font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Psychologist / Clinic</TableHead>
                  <TableHead className="font-semibold">Purpose</TableHead>
                  <TableHead className="font-semibold">Patient</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="text-right font-semibold">Amount</TableHead>
                  <TableHead className="text-right font-semibold">Balance After</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="max-md:block">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                      {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</span><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Test Performed By</span><div><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-40" /></div></TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Purpose</span><Skeleton className="h-4 w-24 mb-1" /></TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Patient</span><Skeleton className="h-4 w-32 mb-1" /></TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Type</span><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Amount</span><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Balance After</span><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="max-md:hidden"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow className="max-md:block">
                    <TableCell colSpan={isSelectionMode ? 9 : 8} className="h-32 text-center text-muted-foreground max-md:block max-md:py-8">
                      No transactions found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => {
                    const { purpose, candidate: patientName, testName } = parseTransactionDescription(tx.description);

                    return (
                      <TableRow key={tx.id} className="hover:bg-primary/5 transition-colors group max-md:block max-md:p-4 max-md:border-b max-md:relative">
                        {isSelectionMode && (
                          <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                            <Checkbox
                              checked={isItemSelected(tx.id)}
                              onCheckedChange={() => toggleItemSelection(tx)}
                            />
                          </TableCell>
                        )}
                        <TableCell className={cn("text-sm max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</span>
                          {formatDateTime(tx.created_at)}
                        </TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Test Performed By</span>
                          <div className="flex flex-col max-md:items-end">
                            <span className="font-medium text-foreground">{tx.user_name}</span>
                            <span className="text-xs text-muted-foreground">{tx.user_email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Purpose</span>
                          <div className="flex flex-col max-md:items-end">
                            <span className="font-medium text-foreground"><div className="flex flex-col"><span>{purpose}</span>{testName && <span className="text-xs text-muted-foreground mt-0.5">({testName})</span>}</div></span>
                            {tx.razorpay_payment_id && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {tx.razorpay_payment_id}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Patient</span>
                          <span className="font-medium text-muted-foreground">{patientName}</span>
                        </TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Type</span>
                          {tx.type === "credit" ? (
                            <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-500/10">
                              <ArrowDownLeft className="h-3 w-3 mr-1" />
                              Credit
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-500/30 text-red-600 bg-red-500/10">
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                              Debit
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Amount</span>
                          <span className={tx.type === "credit" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {tx.type === "credit" ? "+" : "-"}
                            {formatRupees(tx.amount_paise)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Balance After</span>
                          {formatRupees(tx.balance_after_paise)}
                        </TableCell>
                        <TableCell className="text-right max-md:hidden">
                          {tx.type === "credit" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Download Invoice"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={async () => {
                                const { downloadInvoice } = await import("@/lib/invoiceUtils");
                                downloadInvoice(tx as any, { first_name: tx.user_name, email: tx.user_email, id: tx.user_id, address: tx.user_address });
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

        </CardContent>
      </Card>

      {totalPages >= 0 && (
        <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            Showing <span className="font-medium text-foreground">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-foreground">{total}</span> transactions
          </p>
          <Pagination className="sm:justify-end sm:w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => navigate(page > 2 ? `/admin/transactions/page/${page - 1}` : `/admin/transactions`)}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (
                  totalPages > 7 &&
                  (pageNum < page - 2 || pageNum > page + 2) &&
                  pageNum !== 1 &&
                  pageNum !== totalPages
                ) {
                  if (pageNum === page - 3 || pageNum === page + 3) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => navigate(pageNum === 1 ? `/admin/transactions` : `/admin/transactions/page/${pageNum}`)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => navigate(`/admin/transactions/page/${page + 1}`)}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
