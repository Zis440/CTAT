import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { useWalletStore } from "@/store/useWalletStore";
import { getWalletBalance, getTransactions } from "@/services/walletService";
import { Wallet } from "lucide-react";

import BalanceOverview from "@/components/wallet/BalanceOverview";
import { useAuthStore } from "@/store/useAuthStore";

export function ClinicWalletPage() {
  const { balance, transactions, setBalance, setTransactions, isLoading, setLoading } = useWalletStore();
  const { user } = useAuthStore();

  const [txLoading, setTxLoading] = useState(false);
  const [typeFilter] = useState<string>("");
  const [dateFrom] = useState<string>("");
  const [dateTo] = useState<string>("");

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const b = await getWalletBalance();
      setBalance(b);
    } catch {
      toast.error("Failed to fetch wallet balance");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      // If date strings are empty, pass undefined.
      const data = await getTransactions(
        20,
        0,
        typeFilter || undefined,
        dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo ? new Date(dateTo).toISOString() : undefined
      );
      setTransactions(data.transactions);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toast.error("You don't have permission to view wallet history.");
      } else {
        toast.error("Failed to load transactions");
      }
    } finally {
      setTxLoading(false);
    }
  };


  // Always refresh on mount (separate from filter-change refresh)
  useEffect(() => {
    fetchBalance();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, dateFrom, dateTo]);

  let roleSuffix = "Psyichub";
  if (user?.role === "clinic_admin") roleSuffix = "Clinic Admin";
  if (user?.role === "clinic_staff") roleSuffix = "Clinic Staff";
  if (user?.role === "org_admin") roleSuffix = "Organization Admin";
  if (user?.role === "org_staff") roleSuffix = "Organization Staff";

  const pageTitle = `Wallet | ${roleSuffix}`;

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>



      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            Wallet
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your balance and recharge via Razorpay.
          </p>
        </motion.div>


      </div>

      <BalanceOverview
        balance={balance}
        transactions={transactions}
        isLoading={isLoading}
        txLoading={txLoading}
        fetchBalance={fetchBalance}
        viewMoreLink={window.location.pathname.replace('/wallet', '/transactions')}
      />
    </div>
  );
}
