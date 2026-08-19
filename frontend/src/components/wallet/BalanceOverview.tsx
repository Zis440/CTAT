
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, ArrowUpCircle, ArrowDownCircle, RefreshCw, ChevronRight } from "lucide-react";
import { formatRupees } from "@/types/wallet";
import type { WalletBalance, Transaction } from "@/types/wallet";

interface BalanceOverviewProps {
  balance: WalletBalance | null;
  transactions: Transaction[];
  isLoading: boolean;
  txLoading: boolean;
  fetchBalance: () => Promise<void>;
  viewMoreLink?: string;
}

export default function BalanceOverview({
  balance,
  transactions,
  isLoading,
  txLoading,
  fetchBalance,
  viewMoreLink,
}: BalanceOverviewProps) {
  return (
    <div className="space-y-6">

      <Card className="border-primary/10 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Current Balance
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchBalance}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && !balance ? (
            <Skeleton className="h-10 w-40" />
          ) : (
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-primary" />
              <span className="text-3xl font-extrabold tracking-tight text-primary">
                {balance ? formatRupees(balance.balance_paise) : "—"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-bold mt-1.5">Recent Transactions</CardTitle>
          {viewMoreLink && transactions.length > 0 && (
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
              <Link to={viewMoreLink}>
                View More <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {txLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions yet
            </p>
          ) : (
            transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-2 p-3 rounded-xl bg-secondary/20 border border-border/20"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {tx.type === "credit" ? (
                    <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <ArrowDownCircle className="h-5 w-5 text-green-500" />
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <ArrowUpCircle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-semibold truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(tx.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`block text-sm font-bold ${
                      tx.type === "credit" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {tx.type === "credit" ? "+" : "-"}
                    {formatRupees(tx.amount_paise)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
