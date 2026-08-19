import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  TrendingUp,
  IndianRupee,
  Calendar,
  CalendarDays,
  ArrowDownLeft
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";

import { adminIncomeService } from "@/features/super-admin/services/adminIncomeService";
import type { AdminIncomeOverview } from "@/features/super-admin/services/adminIncomeService";
import { formatRupees } from "@/types/wallet";
import { formatDateTime } from "@/lib/dateFormat";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function AdminIncomePage() {
  const [data, setData] = useState<AdminIncomeOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const result = await adminIncomeService.getOverview();

        const formattedResult = {
          ...result,
          daily_breakdown: result.daily_breakdown.map(item => ({
            ...item,
            date: format(new Date(item.date), 'MMM dd')
          }))
        }
        setData(formattedResult);
      } catch (err: any) {
        toast.error(err?.response?.data?.detail || "Failed to load income overview.");
      } finally {
        setIsLoading(false);
      }
    };
    loadOverview();
  }, []);

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Income | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          Income
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor platform-wide revenue from wallet recharges.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-background/50 backdrop-blur-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatRupees(data?.total_revenue_rupees! * 100)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">All-time wallet credits</p>
          </CardContent>
        </Card>
        <Card className="bg-background/50 backdrop-blur-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatRupees(data?.monthly_revenue_rupees! * 100)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card className="bg-background/50 backdrop-blur-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatRupees(data?.weekly_revenue_rupees! * 100)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
        <Card className="bg-background/50 backdrop-blur-sm border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatRupees(data?.today_revenue_rupees! * 100)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 shadow-md bg-background/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
        <CardHeader>
          <CardTitle>Daily Income (Last 30 Days)</CardTitle>
          <CardDescription>Revenue generated from wallet recharges per day.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.daily_breakdown}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'var(--muted)' }}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--foreground)'
                    }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                    formatter={(value: any) => [`₹${value}`, "Revenue"]}
                  />
                  <Bar
                    dataKey="amount_rupees"
                    fill="url(#incomeGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10 shadow-md bg-background/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
        <CardHeader>
          <CardTitle>Recent Income Logs</CardTitle>
          <CardDescription>
            Latest wallet recharges contributing to revenue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-primary/10 bg-background/50 overflow-hidden">
            <Table className="max-md:block">
              <TableHeader className="bg-primary/5 max-md:hidden">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px] font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Purpose</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="text-right font-semibold">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="max-md:block">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</span><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">User</span><div><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-40" /></div></TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Purpose</span><Skeleton className="h-4 w-24 mb-1" /></TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Type</span><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Amount</span><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : !data || data.recent_transactions.length === 0 ? (
                  <TableRow className="max-md:block">
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground max-md:block max-md:py-8">
                      No recent income logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recent_transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-primary/5 transition-colors group max-md:block max-md:p-4 max-md:border-b">
                      <TableCell className="text-sm max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</span>
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">User</span>
                        <div className="flex flex-col max-md:items-end">
                          <span className="font-medium text-foreground">{tx.user_name}</span>
                          <span className="text-xs text-muted-foreground">{tx.user_email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Purpose</span>
                        <div className="flex flex-col max-md:items-end">
                          <span className="font-medium text-foreground">
                            {tx.description === "Razorpay recharge" ? "Recharge" : tx.description}
                          </span>
                          {tx.razorpay_payment_id && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {tx.razorpay_payment_id}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Type</span>
                        <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-500/10">
                          <ArrowDownLeft className="h-3 w-3 mr-1" />
                          Credit
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Amount</span>
                        <span className="text-green-600 font-bold">
                          +{formatRupees(tx.amount_paise)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
