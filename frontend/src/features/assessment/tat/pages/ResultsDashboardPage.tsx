import { useEffect, useState, useRef } from "react";
import { formatDateTime } from "@/lib/dateFormat";
import { useSessionStore } from "@/store/useSessionStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import { aggregateCardResults, generatePdfReport, fetchPastSessions, openPdfReport, requestSessionValidation } from "@/features/assessment/tat/services/analysisService";
import { getWalletBalance } from "@/services/walletService";
import { getDashboardStats } from "@/services/dashboardService";
import { useWalletStore } from "@/store/useWalletStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/services/apiClient";
import { Loader2, Shield, History, Eye, ArrowUpRight, ArrowDownRight, Minus, ShieldAlert, ChevronDown, ChevronRight, ClipboardPlus, BarChart3, Clock, Users, UserPlus, ArrowRight, Wallet, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useSearchParams, useLocation, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { TEST_REGISTRY } from "@/features/assessment/registry";
import { getSessionNewRoute, getSessionHistoryRoute, getPatientsRoute, getPatientDetailsRoute, getSessionDetailsRoute } from "@/lib/routeUtils";
import { ScreeningReportUI } from "@/features/assessment/screening/level1/pages/Report";
import BorderGlow from "@/components/BorderGlow";
import { MasterReportLayout } from "@/features/assessment/_shared/components/MasterReportLayout";
import { ColorBandBar, SectionHeader, FormattedText } from '@/features/assessment/_shared/components/ReportComponents';
import { AssessmentActionButton } from "@/features/assessment/_shared/components/AssessmentActionButton";

export function AnalysisDashboard() {
  const { user } = useAuthStore();
  const { activePatientId, selectedCards, testType, requestPsychologistValidation } = useSessionStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { id: urlSessionId } = useParams<{ id: string }>();
  const isDetailsRoute = location.pathname.includes('/details');
  const isResultRoute = location.pathname.includes('/session-history/result') || isDetailsRoute || location.pathname.includes('/synthesizing') || location.pathname.includes('/report/');

  const testDef = TEST_REGISTRY.find((t: any) => t.slug === testType) || { name: "Assessment" };

  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [viewingPast, setViewingPast] = useState(false);
  const [pastPatientId, setPastPatientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [viewedTestType, setViewedTestType] = useState<string>('tat');
  const [questions, setQuestions] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hasRequestedValidation, setHasRequestedValidation] = useState(false);
  const hasGeneratedRef = useRef(false);
  const isAggregatingRef = useRef(false);

  const handleRequestValidation = async () => {
    let sessionIdToValidate = urlSessionId;
    if (!sessionIdToValidate) {
      sessionIdToValidate = report?._db_metadata?.id;
    }
    if (!sessionIdToValidate) {
      toast.error("Could not determine session ID. Please try from Session History.");
      return;
    }
    try {
      setIsValidating(true);
      const res = await requestSessionValidation(sessionIdToValidate);
      toast.success(res.message || "Validation requested successfully!");
      setHasRequestedValidation(true);
      if (res.new_balance !== undefined) {
        const balance = await getWalletBalance();
        useWalletStore.getState().setBalance(balance);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to request validation");
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (viewedTestType === 'screening_level1') {
      import('@/features/assessment/screening/level1/services/api').then(({ assessmentService }) => {
        assessmentService.getQuestions().then(setQuestions).catch(err => console.error("Failed to load questions", err));
      }).catch(err => console.error("Failed to import assessmentService", err));
    }
  }, [viewedTestType]);

  useEffect(() => {
    async function loadPastSession() {
      if (location.state?.report) {
        setReport(location.state.report);
        setPastPatientId(location.state.activePatientId || location.state.report.patient_id || location.state.report.patient_info?.patient_id || location.state.report.employee_information?.patient_id || null);
        setViewedTestType(location.state.report._metadata?.test_type || 'tat');
        setViewingPast(true);
        setIsLoading(false);
        if (!hasGeneratedRef.current && location.state.cardResults) {
          hasGeneratedRef.current = true;
          generatePdfReport(location.state.activePatientId, location.state.cardResults, location.state.testDefName, location.state.requestPsychologistValidation)
            .then((url) => {
              setPdfUrl(url);
              toast.success("PDF Report generated!");
              getWalletBalance()
                .then((b) => useWalletStore.getState().setBalance(b))
                .catch((err) => console.error("Failed to update wallet balance:", err));
            })
            .catch((pdfErr) => {
              console.error("PDF generation failed:", pdfErr);
              toast.error("Analysis complete, but failed to generate PDF report.");
              hasGeneratedRef.current = false;
            });
        }
      } else if (searchParams.get('view') === 'past' || isDetailsRoute || urlSessionId) {
        setIsLoading(true);
        const cached = queryClient.getQueryData<any>(['past-session-report']);
        if (cached) {
          setReport(cached.report);
          setPastPatientId(cached.patientId);
          setViewedTestType(cached.testType || 'tat');
          setViewingPast(true);

          if (cached.sessionId || cached.validationStatus) {

            if (!cached.report._db_metadata) {
              cached.report._db_metadata = {};
            }
            if (cached.sessionId) cached.report._db_metadata.id = cached.sessionId;
            if (cached.validationStatus) cached.report._db_metadata.validation_status = cached.validationStatus;
          }

          if (cached.pdfFilename) {
            setPdfUrl(cached.pdfFilename.split('/').pop() || null);
          }
          queryClient.removeQueries({ queryKey: ['past-session-report'] });
          setIsLoading(false);
        } else if (urlSessionId) {
          try {
            const { fetchSessionDetails } = await import("@/features/assessment/tat/services/analysisService");
            const data = await fetchSessionDetails(urlSessionId);
            setReport(data.report_summary);
            setPastPatientId(data.patient_id || data.patient_info?.patient_id || data.report_summary?.patient_id || data.report_summary?.employee_information?.patient_id || null);
            setViewedTestType(data._metadata?.test_type || (urlSessionId.startsWith('SCR_') ? 'screening_level1' : 'tat'));
            setViewingPast(true);
            if (data.pdf_filename) {
              setPdfUrl(data.pdf_filename.split('/').pop() || null);
            }
          } catch (err) {
            console.error("Failed to load past session details", err);
          } finally {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      }
    }
    loadPastSession();
  }, [searchParams, queryClient, isDetailsRoute, urlSessionId]);

  useEffect(() => {
    async function loadDashboard() {
      if (isDetailsRoute || searchParams.get('view') === 'past' || viewingPast || (urlSessionId && urlSessionId !== 'synthesizing')) {
        setIsLoading(false);
        return;
      }

      if (isResultRoute && activePatientId && selectedCards.length > 0) {
        if (isAggregatingRef.current) return;
        isAggregatingRef.current = true;
        setIsLoading(true);
        try {
          const cardResults: Record<string, any> = {};
          for (const card of selectedCards) {
            const data = queryClient.getQueryData(['analysis', activePatientId, card]);
            if (data) {

              cardResults[card] = data;
            }
          }

          if (Object.keys(cardResults).length === 0) {

            useSessionStore.getState().resetSession();
            try {
              const [sessRes, patRes, statsRes] = await Promise.allSettled([
                fetchPastSessions(),
                apiClient.get<any[]>("/patients"),
                getDashboardStats()
              ]);
              if (sessRes.status === "fulfilled") setPastSessions(sessRes.value);
              if (patRes.status === "fulfilled") setPatientsList(patRes.value.data || []);
              if (statsRes.status === "fulfilled") setDashboardStats(statsRes.value);
            } finally {
              setIsLoading(false);
            }
            return;
          }

          const aggResult = await aggregateCardResults(activePatientId, cardResults, testDef.name, requestPsychologistValidation);

          useSessionStore.getState().resetSession();

          const reportId = aggResult._db_metadata?.id;
          if (reportId) {
            let basePath = "";
            if (window.location.pathname.startsWith('/org-staff')) basePath = '/org-staff';
            else if (window.location.pathname.startsWith('/org')) basePath = '/org';
            else if (window.location.pathname.startsWith('/clinic-staff')) basePath = '/clinic-staff';
            else if (window.location.pathname.startsWith('/clinic')) basePath = '/clinic';
            else if (window.location.pathname.startsWith('/admin')) basePath = '/admin';

            navigate(`${basePath}/session/NI/report/${reportId}`, {
              replace: true,
              state: {
                report: aggResult,
                activePatientId,
                cardResults,
                testDefName: testDef.name,
                requestPsychologistValidation
              }
            });
            return;
          }

          setReport(aggResult);
          setIsLoading(false);

          if (!hasGeneratedRef.current) {
            hasGeneratedRef.current = true;
            generatePdfReport(activePatientId, cardResults, testDef.name, requestPsychologistValidation)
              .then((url) => {
                setPdfUrl(url);
                toast.success("PDF Report generated!");

                getWalletBalance()
                  .then((b) => {
                    useWalletStore.getState().setBalance(b);
                  })
                  .catch((err) => console.error("Failed to update wallet balance:", err));
              })
              .catch((pdfErr) => {
                console.error("PDF generation failed:", pdfErr);
                toast.error("Analysis complete, but failed to generate PDF report.");
                hasGeneratedRef.current = false;
              });
          }
        } catch (err: any) {
          const detail = err?.response?.data?.detail || err?.message || "Unknown error";
          console.error("Aggregation failed:", detail, err);
          toast.error(`Analysis error: ${detail}`, { duration: 8000 });

          try {
            const sessions = await fetchPastSessions();
            setPastSessions(sessions);
            if (sessions.length > 0) {
              const latest = sessions[0];

              const { data: detail } = await apiClient.get<any>(`/sessions/${latest.id}`);
              const reportSummary = detail?.report_summary;
              if (reportSummary) {
                setReport(reportSummary);
                if (latest.pdf_filename) {
                  setPdfUrl(latest.pdf_filename.split('/').pop() || null);
                }
                toast.info("Showing last saved session — re-run for fresh results.");
              }
            }
          } catch {

          } finally {
            isAggregatingRef.current = false;
            setIsLoading(false);
          }
        }
      }

      else {
        setIsLoading(true);

        const safetyTimer = setTimeout(() => setIsLoading(false), 5000);
        try {
          const [sessionsResult, patientsResult, statsResult] = await Promise.allSettled([
            fetchPastSessions(),
            apiClient.get<any[]>("/patients"),
            getDashboardStats()
          ]);

          if (sessionsResult.status === "fulfilled") {
            setPastSessions(sessionsResult.value);
          }
          if (patientsResult.status === "fulfilled") {
            setPatientsList(patientsResult.value.data || []);
          }
          if (statsResult.status === "fulfilled") {
            setDashboardStats(statsResult.value);
          }
        } catch (err) {
          console.error("Failed to fetch dashboard data", err);
        } finally {
          clearTimeout(safetyTimer);
          setIsLoading(false);
        }
      }
    }

    loadDashboard();
  }, [activePatientId, selectedCards, queryClient, viewingPast, searchParams, navigate, isResultRoute, isDetailsRoute, urlSessionId]);

  const displayPatientId = viewingPast ? pastPatientId : activePatientId;

  if (isLoading) {
    if (!isResultRoute && !viewingPast) {
      return (
        <div className="space-y-8 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card className="border-primary/10 bg-background/50 backdrop-blur-sm">
              <CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-64 mt-2" /></CardHeader>
              <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
            </Card>
            <Card className="border-primary/10 bg-background/50 backdrop-blur-sm">
              <CardHeader><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-64 mt-2" /></CardHeader>
              <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
            </Card>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h3 className="text-xl font-medium tracking-tight">
          {isResultRoute && selectedCards.length > 0 ? "Synthesizing Report..." : "Loading Data..."}
        </h3>
        {isResultRoute && selectedCards.length > 0 && (
          <p className="text-muted-foreground text-sm">Aggregating findings from {selectedCards.length} {testDef.name} stimuli.</p>
        )}
      </div>
    );
  }

  if (!isResultRoute) {
    const recentSessions = pastSessions.slice(0, 7);
    const recentPatients = [...patientsList]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 7);

    const isOrg = user?.role === "org_admin" || user?.role === "org_staff";
    const patientTerm = isOrg ? "Candidates" : "Patients";
    const patientTermSingular = isOrg ? "candidate" : "patient";
    const clinicTerm = isOrg ? "organization" : "clinic";

    const canAssess = !user?.role.includes("staff") || !!user?.module_permissions?.assessments;

    const hasWalletPerm = !user?.role.includes("staff") || !!user?.module_permissions?.can_view_wallet_history;

    const numCards = [
      hasWalletPerm,
      true,
      canAssess,
      !isOrg
    ].filter(Boolean).length;

    const gridColsClass =
      numCards === 4 ? "lg:grid-cols-4" :
        numCards === 3 ? "lg:grid-cols-3" :
          numCards === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1";

    return (
      <div className="w-full relative min-h-full isolate">

        <Helmet>
          <title>Dashboard | CoreTAT - Psychological Intelligence</title>
        </Helmet>

        <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Welcome, {[user?.first_name, user?.last_name].filter(Boolean).join(" ") || (user?.role?.includes("staff") ? (user.role.includes("org") ? "Organization Staff" : "Clinic Staff") : "User")}
              </h2>
              <p className="text-muted-foreground mt-1">Here is your assessment overview.</p>
            </div>
            {canAssess && (
              <Button
                onClick={() => navigate(getSessionNewRoute(user?.role))}
                variant="default"
                className="gap-2 relative bg-primary/10 text-primary hover:bg-primary/20"
              >
                <ClipboardPlus className="h-4 w-4" />
                New Assessment
              </Button>
            )}
          </div>

          {user?.account_type === "individual" && user?.professional_domain === "Clinical Psychologist" && user?.rci_number && user?.verification_status !== "approved" && (
            <Card className="border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => navigate("/verification")}>
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">Apply for CoreTAT's Verified Psychologist Program</h3>
                    <p className="text-sm text-muted-foreground">
                      {user?.verification_status === "pending"
                        ? "Your application is currently under review by our super admins."
                        : user?.verification_status === "rejected"
                          ? "Your application was rejected. Please review and resubmit your RCI License & E-Signature."
                          : "Upload your RCI License and E-Signature to get fully verified and accepted by our team."}
                    </p>
                  </div>
                </div>
                {user?.verification_status !== "pending" && (
                  <Button variant="default" size="sm" className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    {user?.verification_status === "rejected" ? "Resubmit Application" : "Apply Now"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <div className={`grid gap-4 md:grid-cols-2 ${gridColsClass}`}>
            {hasWalletPerm && (
              <BorderGlow className="hover:border-primary/30 transition-colors h-full">
                <Card className="border-0 bg-transparent shadow-none w-full h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{((dashboardStats?.wallet_balance_paise || 0) / 100).toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Available balance</p>
                  </CardContent>
                </Card>
              </BorderGlow>
            )}

            <BorderGlow className="hover:border-primary/30 transition-colors h-full">
              <Card className="border-0 bg-transparent shadow-none w-full h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total {patientTerm}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats?.total_patients || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-green-500 font-medium">+{dashboardStats?.patients_this_month || 0}</span> this month
                  </p>
                </CardContent>
              </Card>
            </BorderGlow>

            {canAssess && (
              <BorderGlow className="hover:border-primary/30 transition-colors h-full">
                <Card className="border-0 bg-transparent shadow-none w-full h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Assessments Run</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardStats?.total_sessions || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="text-green-500 font-medium">+{dashboardStats?.sessions_this_month || 0}</span> this month
                    </p>
                  </CardContent>
                </Card>
              </BorderGlow>
            )}

            {!isOrg && (
              <BorderGlow className="hover:border-primary/30 transition-colors h-full">
                <Card className="border-0 bg-transparent shadow-none w-full h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardStats?.upcoming_appointments || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Scheduled for today</p>
                  </CardContent>
                </Card>
              </BorderGlow>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <Card className="border-primary/10 bg-background/50 backdrop-blur-sm flex flex-col h-full overflow-hidden relative">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Recent Sessions
                  </CardTitle>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs h-8 bg-primary/10 text-primary hover:bg-primary/20 shadow-none"
                    onClick={() => navigate(getSessionHistoryRoute(user?.role))}
                  >
                    View All
                  </Button>
                </div>
                <CardDescription>
                  Your latest {patientTermSingular} assessments and reports.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                {recentSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg space-y-3 flex-1">
                    <History className="h-10 w-10 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground text-sm">No assessments yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1">
                    <div className="flex-1 space-y-3">
                      {recentSessions.slice(0, 3).map((s, idx) => {
                        const testName = s.test_type === 'screening_level1'
                          ? 'Employee Mental Health'
                          : 'TATcore AI Test';
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 p-3 rounded-xl border bg-card hover:border-primary/30 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 group-hover:bg-primary/20 transition-colors">
                                {(s.patient_name || s.patient_id || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 pr-2">
                                <p className="text-sm font-semibold truncate">{testName} - {s.patient_name || s.patient_id}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {formatDateTime(s.timestamp)}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-primary gap-2"
                              onClick={() => navigate(getSessionDetailsRoute(user?.role, s.id))}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-background/50 backdrop-blur-sm flex flex-col h-full overflow-hidden relative">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-muted-foreground" />
                    Newly Added {patientTerm}
                  </CardTitle>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs h-8 bg-primary/10 text-primary hover:bg-primary/20 shadow-none"
                    onClick={() => navigate(getPatientsRoute(user?.role))}
                  >
                    View All
                  </Button>
                </div>
                <CardDescription>
                  Recent {patientTerm.toLowerCase()} onboarded to your {clinicTerm}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                {recentPatients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg space-y-3 flex-1">
                    <Users className="h-10 w-10 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground text-sm">No {patientTerm.toLowerCase()} found.</p>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1">
                    <div className="flex-1 space-y-3">
                      {recentPatients.slice(0, 3).map((p, idx) => {
                        const displayName = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id;
                        return (
                          <div
                            key={p.id || idx}
                            className="flex items-center justify-between gap-2 p-3 rounded-xl border bg-card hover:border-primary/30 transition-colors group cursor-pointer"
                            onClick={() => navigate(getPatientDetailsRoute(user?.role, p.id))}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-sm shrink-0 group-hover:bg-blue-500/20 transition-colors">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 pr-2">
                                <p className="text-sm font-semibold truncate">{displayName}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  ID: {p.id}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {p.gender && p.gender !== "Not specified" && (
                                <Badge variant="secondary" className="text-[10px] capitalize">
                                  {p.gender}
                                </Badge>
                              )}
                              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h3 className="text-xl font-medium tracking-tight">Synthesizing Report...</h3>
        <p className="text-muted-foreground text-sm">Aggregating findings from {selectedCards.length} {testDef.name} stimuli.</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg space-y-4">
        <p className="text-muted-foreground">No card data analyzed yet.</p>
        <Button onClick={() => navigate(isDetailsRoute ? getSessionHistoryRoute(user?.role) : getSessionNewRoute(user?.role))}>{isDetailsRoute ? "Back to Session History" : "Start New Session"}</Button>
      </div>
    );
  }

  const formatName = (name: string) => {
    if (!name) return name;
    const s = name;
    if (s.startsWith('n_') || s.startsWith('p_')) return s.substring(2).replace('_', ' ');
    if ((s.startsWith('n') || s.startsWith('p')) && s.length > 1 && s[1] === s[1].toUpperCase()) {
      return s.substring(1);
    }
    return s;
  };

  if (viewedTestType === 'screening_level1') {
    return (
      <div className="w-full relative min-h-full">
        <Helmet>
          <title>Dashboard | CoreTAT - Psychological Intelligence</title>
        </Helmet>
        <div className="max-w-6xl mx-auto pb-16">
          <ScreeningReportUI
            report={report}
            questions={questions}
            leftFooterActions={
              <Button
                variant="outline"
                disabled={!pdfUrl}
                onClick={async () => {
                  if (pdfUrl && !pdfUrl.startsWith('blob:')) {
                    const pdfName = pdfUrl.split('/').pop();
                    if (pdfName) {
                      const sessionId = report?._db_metadata?.id || urlSessionId;
                      if (sessionId) {
                        const realId = sessionId.replace('SCR_', '');
                        const promise = (async () => {
                          const { reportService } = await import("@/features/assessment/screening/level1/services/api");
                          const blob = await reportService.openPdf(realId);
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank');
                          setTimeout(() => URL.revokeObjectURL(url), 60000);
                        })();
                        toast.promise(promise, { loading: 'Opening PDF...', success: 'PDF opened successfully!', error: 'Failed to open PDF.' });
                        return;
                      }
                      toast.promise(
                        openPdfReport(pdfName),
                        {
                          loading: 'Opening PDF...',
                          success: 'PDF opened successfully!',
                          error: 'Failed to open PDF.'
                        }
                      );
                    }
                  } else if (pdfUrl && pdfUrl.startsWith('blob:')) {
                    window.open(pdfUrl, '_blank');
                  } else {
                    toast.error("PDF not available yet.");
                  }
                }}
                className="flex items-center gap-2"
              >
                {pdfUrl ? "View Report" : "Generating Report..."}
              </Button>
            }
            rightFooterActions={
              <>
                <Button
                  variant="outline"
                  className="bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 border-amber-200"
                  onClick={handleRequestValidation}
                  disabled={isValidating || hasRequestedValidation || ["pending", "Pending Verification", "Under Verification", "Assigned", "Verified by Psychologist", "validated"].includes(report?._db_metadata?.validation_status)}
                >
                  {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                  {hasRequestedValidation || ["pending", "Pending Verification", "Under Verification", "Assigned"].includes(report?._db_metadata?.validation_status)
                    ? "Verification Pending"
                    : ["Verified by Psychologist", "validated"].includes(report?._db_metadata?.validation_status)
                      ? "Verified"
                      : "Validate by RCI Verified Psychologist"}
                </Button>
                <Button variant="secondary" onClick={() => {
                  if (viewingPast) {
                    navigate(getSessionHistoryRoute(user?.role || ''));
                  } else {
                    useSessionStore.getState().resetSession();
                    navigate(getSessionNewRoute(user?.role || ''));
                  }
                }}>
                  {viewingPast ? "Back to History" : "New Assessment or Intake"}
                </Button>
                {!viewingPast && (
                  <Button onClick={() => {
                    useSessionStore.getState().resetSession();
                    navigate("/");
                  }}>
                    Close Session
                  </Button>
                )}
              </>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <MasterReportLayout
      title="TATcore AI Assessment Report"
      subtitle="CONFIDENTIAL EXECUTIVE ASSESSMENT"
      patientId={displayPatientId || undefined}
      status={report?._db_metadata?.validation_status}
      verifiedByName={report?._db_metadata?.verified_by_name}
      leftFooterActions={
        <Button
          variant="outline"
          disabled={!pdfUrl}
          onClick={() => {
            if (pdfUrl && !pdfUrl.startsWith('blob:')) {
              const pdfName = pdfUrl.split('/').pop();
              if (pdfName) {
                toast.promise(
                  openPdfReport(pdfName),
                  {
                    loading: 'Opening PDF...',
                    success: 'PDF opened successfully!',
                    error: 'Failed to open PDF.'
                  }
                );
              }
            } else if (pdfUrl && pdfUrl.startsWith('blob:')) {
              window.open(pdfUrl, '_blank');
            } else {
              toast.error("PDF not available yet.");
            }
          }}
          className="flex items-center gap-2"
        >
          {pdfUrl ? "View Report" : "Generating Report..."}
        </Button>
      }
      rightFooterActions={
        <>

          {!((user?.rci_number || user?.roc_number) && user?.verification_status === "approved") && (
            <>
              {(!report?._db_metadata?.validation_status || report?._db_metadata?.validation_status === "AI Generated" || report?._db_metadata?.validation_status === "Generated" || report?._db_metadata?.validation_status === "System Generated") ? (
                <AssessmentActionButton
                  variant="validate"
                  onClick={handleRequestValidation}
                  isLoading={isValidating}
                  disabled={hasRequestedValidation}
                  price={100}
                />
              ) : ["pending", "Pending Verification", "Under Verification", "Assigned"].includes(report?._db_metadata?.validation_status) || hasRequestedValidation ? (
                <AssessmentActionButton
                  variant="validate"
                  onClick={() => { }}
                  disabled={true}
                  label="Verification Pending"
                />
              ) : ["Verified by Psychologist", "validated", "Finalized"].includes(report?._db_metadata?.validation_status) ? (
                <AssessmentActionButton
                  variant="validate"
                  onClick={() => { }}
                  disabled={true}
                  label="Verified"
                />
              ) : (
                <AssessmentActionButton
                  variant="validate"
                  onClick={handleRequestValidation}
                  price={100}
                />
              )}
            </>
          )}
          <Button variant="secondary" onClick={() => {
            if (viewingPast) {
              navigate(getSessionHistoryRoute(user?.role || ''));
            } else {
              useSessionStore.getState().resetSession();
              navigate(getSessionNewRoute(user?.role || ''));
            }
          }}>
            {viewingPast ? "Back to History" : "New Assessment or Intake"}
          </Button>
          {!viewingPast && (
            <Button onClick={() => {
              useSessionStore.getState().resetSession();
              navigate("/");
            }}>
              Close Session
            </Button>
          )}
        </>
      }
    >
      <Helmet>
        <title>Dashboard | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="bg-background p-6 md:p-10 mx-auto max-w-5xl my-6 print:shadow-none print:border-none print:m-0 print:max-w-full">
        <div className="grid grid-cols-1 gap-6">

          {report?.historical_comparison?.metrics && report.historical_comparison.metrics.length > 0 && (
            <div className="mb-8">
              <SectionHeader title="1. Historical Progression" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {report.historical_comparison.metrics.map((m: any, idx: number) => {
                  let trendIcon = <Minus className="h-5 w-5 text-muted-foreground" />;
                  let trendColor = "text-muted-foreground";

                  if (m.is_better === true) {
                    trendIcon = m.trend === "up" ? <ArrowUpRight className="h-5 w-5 text-green-500" /> : <ArrowDownRight className="h-5 w-5 text-green-500" />;
                    trendColor = "text-green-500 font-bold";
                  } else if (m.is_better === false) {
                    trendIcon = m.trend === "up" ? <ArrowUpRight className="h-5 w-5 text-destructive" /> : <ArrowDownRight className="h-5 w-5 text-destructive" />;
                    trendColor = "text-destructive font-bold";
                  }

                  return (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm hover:border-primary/30 transition-colors">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-muted-foreground">{m.metric}</div>
                        <div className="flex items-end gap-3 mt-1">
                          <span className="text-2xl font-bold">{m.current.toFixed(2)}</span>
                          <span className="text-sm line-through text-muted-foreground pb-1">{m.past.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className={`flex flex-col items-end gap-1 ${trendColor}`}>
                        <div className="flex items-center gap-1 bg-background px-3 py-1 border rounded-full shadow-sm">
                          {trendIcon}
                          <span className="text-sm">{m.trend === "stable" ? "Stable" : m.is_better === true ? "Improved" : "Worsened"}</span>
                        </div>
                        <span className="text-xs opacity-80 pt-1 font-mono">
                          {m.diff > 0 ? "+" : ""}{m.diff.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
            <SectionHeader title="2. Primary Psychometrics" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 mt-6">
              <ColorBandBar label="Anxiety Formulation" value={report.anxiety_level || 0} />
              <ColorBandBar label="Ego Strength" value={report.hero_ego_strength || 0} />
              <ColorBandBar label="Emotional Stability" value={report.emotional_stability || 0} />
              <ColorBandBar label="Reality Testing" value={report.reality_testing || 0} />
              <ColorBandBar label="Internal Conflict" value={report.conflict_internal || 0} />
              <ColorBandBar label="Interpersonal Conflict" value={report.conflict_interpersonal || 0} />
            </div>
          </div>

          {(() => {
            const STOPS = new Set(['it', 'do', 'i', 'a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'is', 'was', 'he', 'she', 'they', 'we', 'you', 'be', 'are', 'for', 'on', 'at', 'by', 'as', 'so', 'no', 'my']);
            const validThemes = (report.themes || []).filter((t: string) => {
              if (!t || t.length < 4) return false;
              if (t.includes('/')) return false;
              const words = t.toLowerCase().split(/\s+/).filter(Boolean);
              if (words.length > 6) return false;
              const meaningfulWords = words.filter(w => w.length >= 4 && !STOPS.has(w));
              return meaningfulWords.length > 0;
            }).slice(0, 10);
            if (validThemes.length === 0) return null;
            return (
              <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                <SectionHeader title="3. Recurrent Dominant Themes" />
                <div className="bg-[#f0fdf4] dark:bg-emerald-950/20 border border-[#dcfce7] dark:border-emerald-900/50 p-6 rounded-lg mt-4">
                  <div className="flex flex-wrap gap-2">
                    {validThemes.map((t: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[12px] bg-white dark:bg-emerald-950 text-[#166534] dark:text-emerald-400 border-[#166534]/30 dark:border-emerald-800 px-3 py-1 uppercase tracking-wider">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
            <SectionHeader title="4. Murray Need-Press Profile" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-6">
              <div>
                <h4 className="text-[11px] font-bold text-[#ce1126] uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Salient Needs</h4>
                {report.needs_with_scores && report.needs_with_scores.length > 0 ? (
                  report.needs_with_scores.slice(0, 7).map((item: any, i: number) => {
                    const name = Array.isArray(item) ? item[0] : item.name || item;
                    const score = Array.isArray(item) ? item[1] : item.score || 0;
                    return (
                      <ColorBandBar key={`ns-${i}`} label={formatName(String(name))} value={Math.round(score * 100)} />
                    );
                  })
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(report.common_needs || []).slice(0, 5).map((n: string, i: number) => (
                      <Badge key={`n-${i}`} variant="outline">{formatName(n)}</Badge>
                    ))}
                    {(!report.common_needs || report.common_needs.length === 0) && <span className="text-sm text-muted-foreground">None detected</span>}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-[#ce1126] uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Perceived Presses (Environment)</h4>
                {report.presses_with_scores && report.presses_with_scores.length > 0 ? (
                  report.presses_with_scores.slice(0, 7).map((item: any, i: number) => {
                    const name = Array.isArray(item) ? item[0] : item.name || item;
                    const score = Array.isArray(item) ? item[1] : item.score || 0;
                    return (
                      <ColorBandBar key={`ps-${i}`} label={formatName(String(name))} value={Math.round(score * 100)} />
                    );
                  })
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(report.common_presses || []).slice(0, 5).map((p: string, i: number) => (
                      <Badge key={`p-${i}`} variant="outline">{formatName(p)}</Badge>
                    ))}
                    {(!report.common_presses || report.common_presses.length === 0) && <span className="text-sm text-muted-foreground">None detected</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {report.aggregated_conflicts && report.aggregated_conflicts.length > 0 && (
            <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
              <SectionHeader title="5. Conflict Analysis" />
              <div className="mb-4 text-sm text-muted-foreground">
                {report.global_conflict_score?.total_conflicts || 0} conflict instances across {report.global_conflict_score?.unique_types || 0} types
                {report.global_conflict_score?.persistent_types?.length > 0 && (
                  <span className="ml-2 font-medium text-red-600">
                    · {report.global_conflict_score.persistent_types.length} persistent
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.aggregated_conflicts.slice(0, 8).map((c: any, i: number) => {
                  const intensityPct = Math.min(100, Math.round((c.max_intensity || 0) * 100));
                  return (
                    <div key={`conf-${i}`} className="p-4 border-l-4 border-red-500 bg-red-50/50 dark:bg-red-950/20 rounded-r-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13px] text-red-900 dark:text-red-400">{c.type}</span>
                          {c.persistence_score > 0.5 && (
                            <span className="text-[10px] bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium tracking-wide uppercase">Persistent</span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-red-700 dark:text-red-400">
                          {intensityPct} / 100
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-red-100 dark:bg-red-950 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full transition-all duration-700 bg-red-500"
                          style={{ width: `${intensityPct}%` }}
                        />
                      </div>
                      {c.evidence_samples && c.evidence_samples.length > 0 && (
                        <p className="text-[12px] text-gray-700 italic mt-1 line-clamp-2 leading-relaxed">
                          "{c.evidence_samples[0]}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {report.aggregated_environment && report.aggregated_environment.dominant_type && report.aggregated_environment.dominant_type !== 'N/A' && (
            <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
              <SectionHeader title="6. Environment Classification" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="p-5 border border-primary/20 rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-[14px] uppercase text-[#ce1126] tracking-wider">{report.aggregated_environment.dominant_type}</span>
                    <span className="text-[11px] font-bold text-[#ce1126] bg-white px-2 py-1 rounded border border-[#ce1126]/20">
                      {report.aggregated_environment.dominant_frequency}/{report.per_card_summaries?.length || 1} CARDS
                    </span>
                  </div>
                  <ColorBandBar label="Classification Confidence" value={Math.round((report.aggregated_environment.dominant_confidence || 0) * 100)} />
                </div>

                <div className="flex flex-col gap-4">
                  {report.aggregated_environment.is_mixed && report.aggregated_environment.secondary_type && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                      <div className="text-[12px] text-yellow-800 leading-relaxed">
                        <strong className="block text-yellow-900 mb-1 uppercase tracking-wide text-[10px]">Mixed Environment detected</strong>
                        Also features <strong>{report.aggregated_environment.secondary_type}</strong> themes prominently ({report.aggregated_environment.secondary_frequency} cards)
                      </div>
                    </div>
                  )}
                  {report.aggregated_environment.distribution && Object.keys(report.aggregated_environment.distribution).length > 1 && (
                    <div className="p-4 rounded-lg border border-gray-200">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Distribution Breakdown</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(report.aggregated_environment.distribution).map(([env, cnt]: [string, any]) => (
                          <span key={env} className="text-[11px] bg-gray-100 text-gray-700 px-2.5 py-1 rounded-sm uppercase tracking-wide border border-gray-200">{env}: {cnt}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {report.aggregated_defenses && report.aggregated_defenses.length > 0 && (
            <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
              <SectionHeader title="7. Defense Mechanisms" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {report.aggregated_defenses.slice(0, 6).map((d: any, i: number) => {
                  let badgeColor = "bg-gray-100 text-gray-800 border-gray-200";
                  if (d.maturity_level === 'Mature') badgeColor = "bg-green-50 text-green-700 border-green-200";
                  else if (d.maturity_level === 'Neurotic') badgeColor = "bg-yellow-50 text-yellow-700 border-yellow-200";
                  else if (d.maturity_level === 'Immature') badgeColor = "bg-red-50 text-red-700 border-red-200";

                  return (
                    <div key={`def-${i}`} className={`p-4 border rounded-lg flex flex-col justify-between ${badgeColor}`}>
                      <div className="font-semibold text-[13px] mb-2">{d.defense}</div>
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-80">
                        <span>{d.maturity_level}</span>
                        <span>{d.frequency}x</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {report.aggregated_coping && report.aggregated_coping.filter((c: any) => {
            const name = typeof c === 'string' ? c : (c?.mechanism || '');
            return name && name.length <= 40 && name.split(' ').length <= 5;
          }).length > 0 && (
              <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                <SectionHeader title="8. Coping Mechanisms" />
                <div className="flex flex-wrap gap-2 mt-4">
                  {report.aggregated_coping
                    .filter((c: any) => {
                      const name = typeof c === 'string' ? c : (c?.mechanism || '');
                      return name && name.length <= 40 && name.split(' ').length <= 5;
                    })
                    .map((c: any, i: number) => {
                      const name = typeof c === 'string' ? c : (c?.mechanism || '');
                      return (
                        <span
                          key={`cop-${i}`}
                          className="text-[12px] bg-pink-50 text-pink-700 border border-pink-200 px-3 py-1.5 rounded-full font-medium"
                        >
                          {name}
                        </span>
                      );
                    })}
                </div>
              </div>
            )}

          {report.per_card_summaries && report.per_card_summaries.length > 0 && (
            <PerCardBreakdown cards={report.per_card_summaries} formatName={formatName} />
          )}

          {report.clinical_formulation && (
            <div className="mb-8">
              <SectionHeader title="9. Clinical Formulation (Auto-Generated)" />
              <div className="mt-4 p-8 bg-gray-50 dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-800 rounded-lg">
                <FormattedText text={report.clinical_formulation} />
              </div>
            </div>
          )}

        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col gap-2 text-[10px] text-muted-foreground text-center print:text-left print:flex-row print:justify-between">
          <p className="font-medium text-amber-700 max-w-4xl mx-auto print:mx-0 print:max-w-[70%]">
            Disclaimer: This report is generated for informational and educational purposes only and is not a substitute for professional clinical diagnosis or treatment.
          </p>
          <div className="flex justify-between items-center w-full print:w-auto print:flex-col print:items-end gap-1">
            <span className="font-bold uppercase tracking-widest text-foreground">CONFIDENTIAL</span>
            <span>{new Date().getFullYear()} @ CoreTAT - Psychological Intelligence</span>
          </div>
        </div>
      </div>
    </MasterReportLayout>
  );
}

function PerCardBreakdown({ cards, formatName }: { cards: any[], formatName: (n: string) => string }) {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (cardId: string) => {
    setExpandedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  return (
    <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
      <SectionHeader title="10. Per-Card Breakdown" />
      <div className="mt-4 space-y-2">
        {cards.map((card: any) => {
          const isExpanded = expandedCards[card.card_id] || false;
          return (
            <div key={card.card_id} className="border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                onClick={() => toggleExpand(card.card_id)}
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-bold text-sm">{card.card_id}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {card.needs?.length || 0} needs · {card.conflicts?.length || 0} conflicts · {card.defenses?.length || 0} defenses
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Anxiety</span>
                    <span className={`font-mono font-bold ${(card.anxiety_level || 0) > 70 ? 'text-red-500' : ''}`}>
                      {Math.round(card.anxiety_level || 0)}
                    </span>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t bg-muted/20 animate-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">

                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Needs</h5>
                      {card.needs && card.needs.length > 0 ? (
                        <div className="space-y-1.5">
                          {card.needs.map((n: any, ni: number) => (
                            <div key={ni} className="flex items-center gap-2 text-sm">
                              <span className="w-28 truncate" title={formatName(n.name)}>{formatName(n.name)}</span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(100, Math.round(n.score * 100))}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">{n.score.toFixed(3)}</span>
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">None</span>}
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Presses</h5>
                      {card.presses && card.presses.length > 0 ? (
                        <div className="space-y-1.5">
                          {card.presses.map((p: any, pi: number) => (
                            <div key={pi} className="flex items-center gap-2 text-sm">
                              <span className="w-28 truncate" title={formatName(p.name)}>{formatName(p.name)}</span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-accent/60 rounded-full" style={{ width: `${Math.min(100, Math.round(p.score * 100))}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">{p.score.toFixed(3)}</span>
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">None</span>}
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Conflicts</h5>
                      {card.conflicts && card.conflicts.length > 0 ? (
                        <div className="space-y-1.5">
                          {card.conflicts.map((c: any, ci: number) => (
                            <div key={ci} className="flex items-center justify-between text-sm p-2 rounded border bg-card">
                              <span className="font-medium text-xs">{c.type}</span>
                              <span className={`text-xs font-mono ${c.intensity > 0.7 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                                {c.intensity.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">None</span>}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Defenses</h5>
                        {card.defenses && card.defenses.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {card.defenses.map((d: any, di: number) => (
                              <Badge key={di} variant="outline" className="text-xs">
                                {d.defense}
                                {d.maturity_level && <span className="ml-1 opacity-60">({d.maturity_level})</span>}
                              </Badge>
                            ))}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">None</span>}
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Environment</h5>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{card.environment?.primary || 'N/A'}</Badge>
                          {card.environment?.confidence > 0 && (
                            <span className="text-[10px] font-mono text-muted-foreground">{(card.environment.confidence * 100).toFixed(0)}% conf.</span>
                          )}
                        </div>
                      </div>
                      {card.coping && card.coping.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Coping</h5>
                          <div className="flex flex-wrap gap-1">
                            {card.coping.map((c: string, ci: number) => (
                              <Badge key={ci} variant="outline" className="text-[10px]">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
