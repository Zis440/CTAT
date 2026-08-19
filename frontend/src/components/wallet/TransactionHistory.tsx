// ─── TransactionHistory ─────────────────────────────────────────────────────
// Displays all past wallet transactions with timestamps and running balances.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, History, ArrowUpRight, ArrowDownLeft, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRupees } from "@/types/wallet";
import type { Transaction } from "@/types/wallet";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TransactionHistoryProps {
  transactions: Transaction[];
  txLoading: boolean;
  fetchTransactions: () => Promise<void>;
}

export default function TransactionHistory({
  transactions,
  txLoading,
  fetchTransactions,
}: TransactionHistoryProps) {
  const { user } = useAuthStore();
  return (
    <div className="space-y-4">
      <Card className="border-primary/10 shadow-md bg-background/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Transactions
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchTransactions}
            disabled={txLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${txLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-primary/10 bg-background/50 overflow-x-auto">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-muted-foreground w-[180px]">Date & Time</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Purpose</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Performed By</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-center">Type</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-right pr-6">Balance</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell className="text-right pr-6"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground font-medium">No transactions yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Transactions will appear here after you recharge or use a test.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => {
                    let testName = "-";
                    let performedBy = "-";
                    
                    if (tx.description.includes(" - ")) {
                      const parts = tx.description.split(" - ");
                      testName = parts[0].replace(" Session", "");
                      performedBy = parts.slice(2).join(" - ") || "Self";
                    } else if (tx.description === "Razorpay recharge") {
                      testName = "Recharge";
                    } else {
                      testName = tx.description;
                    }
                    
                    if ((tx as any).created_by_name) {
                      performedBy = (tx as any).created_by_name;
                    }
                    
                    return (
                      <TableRow key={tx.id} className="hover:bg-primary/5 transition-colors group">
                        <TableCell className="font-medium text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {testName}
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">
                          {performedBy}
                        </TableCell>
                        <TableCell className="text-center">
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
                        <TableCell className="text-right">
                          <span className={tx.type === "credit" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {tx.type === "credit" ? "+" : "-"}
                            {formatRupees(tx.amount_paise)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6 opacity-90 whitespace-nowrap font-medium">
                          {formatRupees(tx.balance_after_paise)}
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.type === "credit" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Download Invoice"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={async () => {
                                const { downloadInvoice } = await import("@/lib/invoiceUtils");
                                downloadInvoice(tx, user);
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
    </div>
  );
}
