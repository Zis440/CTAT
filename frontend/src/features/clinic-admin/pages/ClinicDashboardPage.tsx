import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Wallet, CreditCard, Activity, TrendingUp, BarChart3, PieChart, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getClinicStats } from "@/services/clinicService";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { useAuthStore } from "@/store/useAuthStore";
import { OrgAssessmentRequests } from "@/features/clinic-admin/components/OrgAssessmentRequests";
import { GenerateAnonymousLink } from "@/features/clinic-admin/components/GenerateAnonymousLink";
import { cn } from "@/lib/utils";
import BorderGlow from "@/components/BorderGlow";

export function ClinicDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["clinic-stats"],
    queryFn: getClinicStats,
  });

  const user = useAuthStore(s => s.user);
  const isOrg = user?.role?.startsWith("org_");

  const getBasePath = () => {
    if (user?.role === "org_admin") return "/org";
    if (user?.role === "org_staff") return "/org-staff";
    if (user?.role === "clinic_staff") return "/clinic-staff";
    return "/clinic";
  };
  const basePath = getBasePath();

  if (isLoading) {
    return (
      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-primary/10 bg-background/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-1 lg:col-span-4 border-primary/10 bg-background/50 backdrop-blur-sm">
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
          </Card>
          <Card className="col-span-1 lg:col-span-3 border-primary/10 bg-background/50 backdrop-blur-sm">
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Dashboard  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome, {[user?.first_name, user?.last_name].filter(Boolean).join(" ") || `${isOrg ? "Organization" : "Clinic"} ${user?.role?.includes("staff") ? "Staff" : "Admin"}`}
          </h1>
          <p className="text-muted-foreground mt-1">Here is what's happening with your {isOrg ? "organization" : "clinic"} today.</p>
        </div>
        <div className="flex gap-2">
          {!isOrg && (
            <Button variant="outline" asChild>
              <Link to={`${basePath}/appointments`}>View Appointments</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BorderGlow className="hover:border-primary/30 transition-colors h-full">
          <Card className="border-0 bg-transparent shadow-none w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{((stats?.wallet_balance_paise || 0) / 100).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Available balance</p>
            </CardContent>
          </Card>
        </BorderGlow>

        <BorderGlow className="hover:border-primary/30 transition-colors h-full">
          <Card className="border-0 bg-transparent shadow-none w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{isOrg ? "Total Candidates" : "Total Patients"}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_patients || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total registered {isOrg ? "candidates" : "patients"}</p>
            </CardContent>
          </Card>
        </BorderGlow>

        <BorderGlow className="hover:border-primary/30 transition-colors h-full">
          <Card className="border-0 bg-transparent shadow-none w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{isOrg ? "Organization Staff" : "Clinic Staff"}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_staff || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total staff members</p>
            </CardContent>
          </Card>
        </BorderGlow>

        <BorderGlow className="hover:border-primary/30 transition-colors h-full">
          <Card className="border-0 bg-transparent shadow-none w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Assessments Run</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_sessions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total platform uses</p>
            </CardContent>
          </Card>
        </BorderGlow>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">

        <Card className="col-span-1 lg:col-span-4 border-primary/10 bg-background/50 backdrop-blur-sm flex flex-col h-full overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2"><TrendingUp className="h-5 w-5 text-muted-foreground" /> {isOrg ? "Candidate" : "Patient"} Growth ({new Date().getFullYear()})</CardTitle>
            <CardDescription>Monthly {isOrg ? "candidate" : "patient"} acquisition overview</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[250px]">
            {stats?.monthly_growth && stats.monthly_growth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={stats.monthly_growth}>
                  <defs>
                    <linearGradient id="growthGradientClinic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d3e392" stopOpacity={1} />
                      <stop offset="100%" stopColor="#95ac39" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'var(--muted)' }}
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--foreground)'
                    }}
                    itemStyle={{ color: '#d3e392', fontWeight: 'bold' }}
                  />
                  <Bar
                    dataKey="patients"
                    name={isOrg ? "New Candidates" : "New Patients"}
                    fill="url(#growthGradientClinic)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center opacity-50 space-y-4 py-8">
                <BarChart3 className="h-12 w-12" />
                <div className="text-center">
                  <p className="font-medium text-sm">No {isOrg ? "candidate" : "patient"} data yet</p>
                  <p className="text-xs">Growth data will appear as {isOrg ? "candidates" : "patients"} are registered.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3 border-primary/10 bg-background/50 backdrop-blur-sm flex flex-col h-full overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary/40 via-secondary/20 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2"><PieChart className="h-5 w-5 text-muted-foreground" /> Monthly Assessment Uses</CardTitle>
            <CardDescription>Breakdown by assessment type</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[250px]">
            {stats?.assessment_uses && stats.assessment_uses.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={stats.assessment_uses}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.assessment_uses.map((entry: { color: string; value: number; name: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--border)',
                      borderRadius: '0.5rem',
                      color: 'var(--foreground)'
                    }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center opacity-50 space-y-4 py-8">
                <PieChart className="h-12 w-12" />
                <div className="text-center">
                  <p className="font-medium text-sm">No assessment data yet</p>
                  <p className="text-xs">Usage breakdown will appear here.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className={cn("grid gap-6 md:grid-cols-2", isOrg ? "lg:grid-cols-1" : "lg:grid-cols-2")}>

        {!isOrg && (
          <Card className="border-primary/10 bg-background/50 backdrop-blur-sm flex flex-col h-full relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive/40 via-destructive/20 to-transparent" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2"><Calendar className="h-5 w-5 text-muted-foreground" /> Upcoming Appointments</CardTitle>
                  <CardDescription>Your schedule for today</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-xs h-8 bg-destructive/10 text-destructive hover:bg-destructive/20 shadow-none">
                  <Link to={`${basePath}/appointments`}>View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              {!stats?.upcoming_appointments || stats.upcoming_appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-8 text-center border border-dashed rounded-lg">
                  <Calendar className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No upcoming appointments</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Scheduled appointments will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col flex-1 space-y-3">
                  {stats.upcoming_appointments.slice(0, 3).map((appt: { id: string; patient_name: string; psychologist_name: string; time: string; date: string }) => (
                    <div key={appt.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border bg-card/50 hover:bg-card transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{appt.patient_name}</span>
                        <span className="text-xs text-muted-foreground">with {appt.psychologist_name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <Badge variant="outline" className="text-[10px] whitespace-nowrap mb-1">{appt.time}</Badge>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(appt.date), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm flex flex-col h-full relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500/40 via-blue-500/20 to-transparent" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2"><CreditCard className="h-5 w-5 text-muted-foreground" /> Latest Transactions</CardTitle>
                <CardDescription>Recent transaction history</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs h-8 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 shadow-none">
                <Link to={`${basePath}/transactions`}>View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            {!stats?.recent_transactions || stats.recent_transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-8 text-center border border-dashed rounded-lg">
                <CreditCard className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Recent credits and debits will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col flex-1 space-y-3">
                {stats.recent_transactions.slice(0, 3).map((tx: { id: string; user_name: string; type: string; amount_rupees: number; created_at: string }) => (
                  <div key={tx.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border bg-card/50 hover:bg-card transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{tx.user_name}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.type === 'credit' ? '+' : '-'}₹{tx.amount_rupees.toFixed(2)}
                      </span>
                      <Badge variant={tx.type === 'debit' ? 'destructive' : 'secondary'} className="text-[10px] capitalize whitespace-nowrap mt-1">
                        {tx.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isOrg && (
        <>
          <OrgAssessmentRequests />
          <GenerateAnonymousLink />
        </>
      )}

    </div>
  );
}
