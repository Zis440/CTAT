
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, ArrowUpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createRechargeOrder, confirmRechargePayment } from "@/services/walletService";
import { useWalletStore } from "@/store/useWalletStore";
import { formatRupees } from "@/types/wallet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const QUICK_AMOUNTS = [200, 500, 1000];

interface RechargeFormProps {
  onSuccess: () => Promise<void>;
}

export default function RechargeForm({ onSuccess }: RechargeFormProps) {
  const { balance } = useWalletStore();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPayConfirm, setShowPayConfirm] = useState(false);

  const handleRecharge = async () => {
    const rupees = parseFloat(amount);
    if (isNaN(rupees) || rupees < 200) {
      toast.error("Enter a valid amount (minimum ₹200)");
      return;
    }

    setLoading(true);
    try {
      const order = await createRechargeOrder(rupees * 100);

      if (!(window as any).Razorpay) {
        toast.error("Razorpay SDK not loaded. Please refresh and try again.");
        return;
      }

      const options = {
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: "CoreTAT",
        description: "Wallet Recharge",
        order_id: order.order_id,
        handler: async (response: any) => {
          try {
            await confirmRechargePayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
              rupees
            );
            toast.success(`₹${rupees.toFixed(2)} added to your wallet!`);
            setAmount("");
            await onSuccess();
          } catch {
            toast.error("Payment received but verification failed. Contact support.");
          }
        },
        theme: { color: "#6d28d9" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail?.includes("not configured")) {
        toast.error("Razorpay is not configured on the server yet.");
      } else {
        toast.error("Failed to create recharge order.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 w-full">

      <Card className="relative overflow-hidden border-0 bg-linear-to-br from-primary/15 via-primary/5 to-transparent shadow-lg shadow-primary/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-60"></div>
        <CardContent className="pt-8 pb-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                <Wallet className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Current Balance</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-primary tracking-tighter">
                    {balance ? formatRupees(balance.balance_paise) : "₹0.00"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow-xl shadow-black/5 overflow-hidden">
        <CardHeader className="pb-2 pt-6">
          <CardTitle className="text-xl font-extrabold flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30">
              <ArrowUpCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            Add Money to Wallet
          </CardTitle>
          <p className="text-sm text-muted-foreground font-medium mt-2 pl-11">
            Recharge your account instantly using UPI, Cards, or Netbanking.
          </p>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">

          <div className="space-y-3">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Quick Select</label>
            <div className="flex flex-wrap gap-3 mt-2">
              {QUICK_AMOUNTS.map((amt) => (
                <Button
                  key={amt}
                  variant={amount === String(amt) ? "default" : "outline"}
                  size="lg"
                  className={`rounded-xl font-bold text-base h-12 px-6 transition-all duration-200 ${amount === String(amt)
                    ? "shadow-md shadow-primary/25 scale-105"
                    : "hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  onClick={() => setAmount(String(amt))}
                >
                  ₹ {amt}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Custom Amount</label>
            <div className="flex flex-col sm:flex-row items-stretch gap-4 mt-2">
              <div className="relative flex-1 group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xl transition-colors group-focus-within:text-primary">₹</span>
                <Input
                  type="number"
                  placeholder="Enter custom amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 h-14 rounded-2xl font-black text-xl border-2 border-border/50 focus-visible:ring-offset-0 focus-visible:border-primary bg-background shadow-sm transition-all"
                  min={200}
                />
              </div>
              <Button
                onClick={() => {
                  const rupees = parseFloat(amount);
                  if (isNaN(rupees) || rupees < 200) {
                    toast.error("Enter a valid amount (minimum ₹200)");
                    return;
                  }
                  setShowPayConfirm(true);
                }}
                disabled={loading || !amount}
                className="h-14 px-8 rounded-2xl font-extrabold text-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all sm:w-auto w-full"
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin mr-3" />
                ) : (
                  <ArrowUpCircle className="h-6 w-6 mr-3" />
                )}
                Proceed to Pay
              </Button>
            </div>

            <AlertDialog open={showPayConfirm} onOpenChange={setShowPayConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Wallet Recharge?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to add <strong>₹{parseFloat(amount || "0")}</strong> to your wallet via Razorpay.
                    You will be redirected to the payment gateway to complete the transaction.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setShowPayConfirm(false); handleRecharge(); }}>
                    Proceed to Pay
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="bg-secondary/20 rounded-xl p-4 flex items-center gap-3 border border-border/40">
            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
              100% secure payments powered by Razorpay. Minimum recharge amount is ₹200.
              Your money is added instantly upon successful payment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
