
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BorderGlow from "@/components/BorderGlow";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import {
  Users,
  ShieldCheck,
  BarChart3,
  UserCog,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Building2,
  PieChart as PieChartIcon,
  LineChart,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getVerificationQueue } from "@/services/authService";
import { apiClient } from "@/services/apiClient";
import type { VerificationUser } from "@/types/auth";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [pendingQueue, setPendingQueue] = useState<VerificationUser[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      setIsLoading(true);
      setError(null);
      try {

        const queueData = await getVerificationQueue();
        setPendingQueue(queueData);

        const { data: statsData } = await apiClient.get("/admin/dashboard-stats");
        setStats(statsData);
      } catch (err: any) {
        console.error("Admin dashboard load failed:", err);
        setError(
          err?.response?.data?.detail || "Failed to load admin dashboard data."
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadAdminData();
  }, []);

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4 text-destructive">
        <AlertTriangle className="h-10 w-10" />
        <p>{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const pendingCount = pendingQueue.length;
  const currentYear = new Date().getFullYear();

  const pieData = [
    { name: 'Clinics', value: stats?.clinics || 0, color: '#d3e392' },
    { name: 'Individuals', value: stats?.individuals || 0, color: '#88db85' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Dashboard  | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome, Super Admin
          </h1>
          <p className="text-muted-foreground mt-1">
            Here is what's happening across the platform today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/users")}
            className="gap-2"
          >
            <UserCog className="h-4 w-4" />
            Manage Users
          </Button>
          <Button
            onClick={() => navigate("/admin/verification-queue")}
            variant="default"
            className="gap-2 relative bg-primary/10 text-primary hover:bg-primary/20"
          >
            <ShieldCheck className="h-4 w-4" />
            Verification Queue
            {pendingCount > 0 && (
              <Badge
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground font-bold text-[10px] border-2 border-background shadow-sm"
              >
                {pendingCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BorderGlow className="hover:border-primary/30 transition-colors h-full">
          <Card className="border-0 bg-transparent shadow-none w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats?.active_users || 0} active</p>
            </CardContent>
          </Card>
        </BorderGlow>

        <BorderGlow className="hover:border-primary/30 transition-colors h-full">
          <Card className="border-0 bg-transparent shadow-none w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Clinics</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.clinics || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered clinics</p>
            </CardContent>
          </Card>
        </BorderGlow>

        <BorderGlow className="hover:border-primary/30 transition-colors h-full">
          <Card className="border-0 bg-transparent shadow-none w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_patients || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Across the platform</p>
            </CardContent>
          </Card>
        </BorderGlow>

        <BorderGlow className="hover:border-primary/30 transition-colors h-full">
          <Card className="border-0 bg-transparent shadow-none w-full h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Assessments Run</CardTitle>
              <LineChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_sessions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total platform uses</p>
            </CardContent>
          </Card>
        </BorderGlow>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm flex flex-col h-full overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2"><TrendingUp className="h-5 w-5 text-muted-foreground" /> Platform Growth ({currentYear})</CardTitle>
            <CardDescription>Monthly user acquisition overview</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[250px]">
            {stats?.monthly_growth && stats.monthly_growth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.monthly_growth}>
                  <defs>
                    <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
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
                    dataKey="users"
                    name="New Users"
                    fill="url(#growthGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center opacity-50 space-y-4 py-8">
                <BarChart3 className="h-12 w-12" />
                <div className="text-center">
                  <p className="font-medium text-sm">No growth data yet</p>
                  <p className="text-xs">Growth data will appear as users register</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm flex flex-col h-full overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary/40 via-secondary/20 to-transparent" />
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-muted-foreground" /> User Distribution</CardTitle>
            <CardDescription>Breakdown by account type</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[250px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
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
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center opacity-50 space-y-4 py-8">
                <PieChartIcon className="h-12 w-12" />
                <div className="text-center">
                  <p className="font-medium text-sm">No user data yet</p>
                  <p className="text-xs">Distribution will appear here</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm flex flex-col h-full relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive/40 via-destructive/20 to-transparent" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-muted-foreground" /> Pending Verifications</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 bg-destructive/10 text-destructive hover:bg-destructive/20 shadow-none"
                onClick={() => navigate("/admin/verification-queue")}
              >
                View All
              </Button>
            </div>
            <CardDescription>Users awaiting document approval.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            {pendingQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border-dashed border-2 border-border/50 rounded-lg space-y-3 flex-1">
                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                <div>
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No pending verifications.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 space-y-3">
                {pendingQueue.slice(0, 3).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl border bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {user.first_name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-semibold truncate">{[user.first_name, user.last_name].filter(Boolean).join(" ")}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] capitalize shrink-0 whitespace-nowrap">
                      {user.account_type.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-background/50 backdrop-blur-sm flex flex-col h-full relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500/40 via-blue-500/20 to-transparent" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2"><Users className="h-5 w-5 text-muted-foreground" /> Latest Registrations</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 shadow-none"
                onClick={() => navigate("/admin/users")}
              >
                View All
              </Button>
            </div>
            <CardDescription>Recently joined users on the platform.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            {!stats?.recent_users || stats.recent_users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border-dashed border-2 border-border/50 rounded-lg space-y-3 flex-1">
                <Users className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No recent registrations</p>
              </div>
            ) : (
              <div className="flex flex-col flex-1 space-y-3">
                {stats.recent_users.slice(0, 3).map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl border bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-sm shrink-0">
                        {user.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-semibold truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="secondary" className="text-[10px] capitalize whitespace-nowrap">
                        {user.account_type.replace("_", " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(user.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
