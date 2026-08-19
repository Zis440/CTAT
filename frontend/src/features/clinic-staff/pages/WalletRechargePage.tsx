import { useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useWalletStore } from "@/store/useWalletStore";
import { getWalletBalance, getTransactions } from "@/services/walletService";
import RechargeForm from "@/components/wallet/RechargeForm";
import { useAuthStore } from "@/store/useAuthStore";

import { CreditCard } from "lucide-react";

export function WalletRechargePage() {
  const navigate = useNavigate();
  const { setBalance, setTransactions } = useWalletStore();
  const { user } = useAuthStore();

  const fetchBalance = async () => {
    try {
      const b = await getWalletBalance();
      setBalance(b);
    } catch {

    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await getTransactions(20, 0);
      setTransactions(data.transactions);
    } catch {

    }
  };

  const handleRechargeSuccess = async () => {
    await fetchBalance();
    await fetchTransactions();
    navigate("/wallet");
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  let roleSuffix = "Psyichub";
  if (user?.role === "clinic_admin") roleSuffix = "Clinic Admin";
  if (user?.role === "clinic_staff") roleSuffix = "Clinic Staff";

  const pageTitle = `Recharge | ${roleSuffix}`;

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <CreditCard className="h-7 w-7 text-primary" />
          Recharge
        </h1>
        <p className="text-muted-foreground mt-1">
          Top up your wallet balance.
        </p>
      </motion.div>

      <div className="w-full">
        <RechargeForm onSuccess={handleRechargeSuccess} />
      </div>
    </div>
  );
}
