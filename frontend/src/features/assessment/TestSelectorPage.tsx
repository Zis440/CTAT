
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Lock, Brain, Heart, Activity, ClipboardList, Zap, GraduationCap, Baby } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TEST_REGISTRY, type TestModule } from "./registry";
import { useAuthStore, isDemoAccount } from "@/store/useAuthStore";
import { useSessionStore } from "@/store/useSessionStore";
import { useWalletStore } from "@/store/useWalletStore";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  heart: Heart,
  activity: Activity,
  "clipboard-list": ClipboardList,
  zap: Zap,
  "graduation-cap": GraduationCap,
  baby: Baby,
};

export function TestSelectorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedSlug, setSelectedSlug] = useState<string>("tat");
  const [isLoading, setIsLoading] = useState(true);
  const [showContinueConfirm, setShowContinueConfirm] = useState(false);
  const { user } = useAuthStore();
  const { balance } = useWalletStore();

  useEffect(() => {
    if (user?.role === "org_staff" || user?.role === "org_admin") {
      setSelectedSlug("screening-tool");
    }
  }, [user?.role]);

  const [dbAssessments, setDbAssessments] = useState<any[]>([]);
  const [pricingMap, setPricingMap] = useState<Record<string, {clinic: number | null, psychologist: number | null, org: number | null}>>({});

  useEffect(() => {

    const fetchPricing = async () => {
      try {
        const response = await apiClient.get("/assessments/");
        if (response.data) {
          setDbAssessments(response.data);
          const newPricingMap: Record<string, {clinic: number | null, psychologist: number | null, org: number | null}> = {};
          response.data.forEach((test: any) => {
            const priceInfo = {
              clinic: test.clinicPrice,
              psychologist: test.psychologistPrice,
              org: test.orgPrice
            };
            if (test.slug) newPricingMap[test.slug] = priceInfo;
            if (test.name) newPricingMap[test.name.toLowerCase()] = priceInfo;
            if (test.slug === 'screening_level1') newPricingMap['screening-tool'] = priceInfo;
          });
          setPricingMap(newPricingMap);
        }
      } catch (err) {
        console.error("Failed to fetch assessment pricing:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPricing();
  }, []);

  const isDemo = isDemoAccount(user);

  const selectedTest = isDemo
    ? ({
        slug: "tat",
        name: "TATcore AI Test",
        shortName: "TATcore AI Test",
        description:
          "Advanced neural projective assessment engine powered by TATcore. Analyzes thematic apperceptive narratives to extract personality dynamics, clinical indicators, and psychological formulations in real-time.",
        status: "active" as const,
        icon: "brain",
        route: "/session/new",
        creditCost: 0,
        category: "Projective Assessment",
        ageGroup: "Adults & Adolescents",
        minAge: 9,
      } as TestModule)
    : TEST_REGISTRY.find((t) => t.slug === selectedSlug);

  const isIndividual = user?.account_type === "individual";
  const isOrg = user?.role === "org_admin" || user?.role === "org_staff";
  const isStaff = user?.role === "clinic_staff" || user?.role === "org_staff";
  const canAssess = !isStaff ||
    (user?.module_permissions?.assessments !== undefined
      ? user.module_permissions.assessments
      : user?.can_assess);

  const setTestType = useSessionStore((state: any) => state.setTestType);

  const handleContinue = () => {
    if (!selectedTest || selectedTest.status !== "active") return;
    if (selectedTest.route === "#") {
      toast.info("This feature is currently unavailable or coming soon!");
      return;
    }

    const dbPricing = pricingMap[selectedTest.slug] || pricingMap[selectedTest.name.toLowerCase()];
    const dbPrice = dbPricing
      ? (isIndividual ? dbPricing.psychologist : (isOrg ? dbPricing.org : dbPricing.clinic))
      : null;
    const price = dbPrice != null ? dbPrice : selectedTest.creditCost;

    if (!isDemo && price && price > 0) {
      const balanceRupees = balance ? balance.balance_rupees : 0;
      if (balanceRupees < price) {
        toast.error(`Insufficient wallet balance. Please recharge your wallet. (Required: ₹${price.toFixed(2)})`);
        return;
      }
    }

    setShowContinueConfirm(true);
  };

  const handleConfirmContinue = () => {
    setShowContinueConfirm(false);
    setTestType(selectedSlug);
    navigate(location.pathname.replace(/\/$/, '') + "/intake");
  };

  let roleSuffix = "CoreTAT";
  if (user?.role === "clinic_admin") roleSuffix = "Clinic Admin";
  if (user?.role === "clinic_staff") roleSuffix = "Clinic Staff";
  if (user?.role === "org_admin") roleSuffix = "Org Admin";
  if (user?.role === "org_staff") roleSuffix = "Org Staff";

  const pageTitle = `Select Assessment | ${roleSuffix}`;

  const isOrgAccount = user?.role === "org_admin" || user?.role === "org_staff";
  const targetLabel = isOrgAccount ? "Candidate" : "Patient";
  const targetLabelLower = isOrgAccount ? "candidate" : "patient";

  if (isLoading) {
    return (
      <div className="w-full relative min-h-full isolate">
        <Helmet>
          <title>{pageTitle}</title>
        </Helmet>
        <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6 pb-4 flex flex-col items-center gap-3 text-center">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2 flex flex-col items-center">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="flex gap-1.5 mt-auto">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-20">
              <Card className="border-primary/10">
                <CardContent className="p-6 flex flex-col gap-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-7 w-48" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  </div>
                  <div className="pt-4 border-t space-y-4">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-11 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative min-h-full isolate">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary" />
            Choose Assessment
          </h2>
          <p className="text-muted-foreground">
            Select the psychological test you'd like to administer, then proceed to {targetLabelLower} intake.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {(() => {
              if (isDemo) {
                return [
                  {
                    slug: "tat",
                    name: "TATcore AI Test",
                    shortName: "TATcore AI Test",
                    description:
                      "Advanced neural projective assessment engine powered by TATcore. Analyzes thematic apperceptive narratives to extract personality dynamics, clinical indicators, and psychological formulations in real-time.",
                    status: "active" as const,
                    icon: "brain",
                    route: "/session/new",
                    creditCost: 0,
                    category: "Projective Assessment",
                    ageGroup: "Adults & Adolescents",
                    minAge: 9,
                  } as TestModule,
                ];
              }

              const isOrgAccount = user?.role === "org_admin" || user?.role === "org_staff";
              let displayTests = [...TEST_REGISTRY].map((registryTest) => {
                const dbTest = dbAssessments.find(db => db.slug === registryTest.slug || db.name.toLowerCase() === registryTest.name.toLowerCase());
                if (dbTest) {
                  return {
                    ...registryTest,
                    name: dbTest.name,
                    shortName: dbTest.name,
                    category: dbTest.category || registryTest.category,
                    status: (dbTest.isComingSoon ? "coming-soon" : "active") as "active" | "coming-soon",
                  } as TestModule;
                }
                return registryTest;
              });

              if (isOrgAccount) {
                displayTests = displayTests.filter(t => t.slug !== "advance-screening" && t.slug !== "intermediate-screening");

                displayTests.sort((a, b) => {
                  const getRank = (slug: string) => {
                    if (slug === "screening-tool") return 1;
                    if (slug === "advance-screening") return 2;
                    if (slug === "tat") return 3;
                    if (slug === "intermediate-screening") return 4;
                    return 5;
                  };
                  return getRank(a.slug) - getRank(b.slug);
                });
              } else {
                displayTests.sort((a, b) => {
                  if (a.slug === "tat") return -1;
                  if (b.slug === "tat") return 1;
                  return 0;
                });
              }
              return displayTests;
            })().map((test) => {
              const isActive = test.status === "active";
              const isSelected = selectedSlug === test.slug;
              const Icon = ICON_MAP[test.icon] || Brain;

              return (
                <TestCard
                   key={test.slug}
                  test={test}
                  Icon={Icon}
                  isActive={isActive}
                  isSelected={isSelected}
                  onSelect={() => {
                    if (isActive) setSelectedSlug(test.slug);
                  }}
                />
              );
            })}
          </div>

          <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-20">
            {selectedTest && selectedTest.status === "active" ? (
              <Card className="border-primary/30 shadow-md">
                <CardContent className="p-6 flex flex-col gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Selected Assessment</p>
                    <h3 className="text-xl font-bold">{selectedTest.name}</h3>
                    <div className="flex flex-row flex-wrap items-center gap-2 mt-3">
                      {(() => {
                        const dbTest = dbAssessments.find(db => db.slug === selectedTest.slug || db.name.toLowerCase() === selectedTest.name.toLowerCase());
                        const displayCategory = dbTest?.category || selectedTest.category;
                        return displayCategory ? (
                          <Badge variant="outline" className="text-xs py-1">
                            {displayCategory}
                          </Badge>
                        ) : null;
                      })()}
                      {selectedTest.ageGroup && (
                        <Badge variant="secondary" className="text-xs py-1">
                          {selectedTest.ageGroup}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium">Test Fee</span>
                      {(() => {
                        if (isDemo) {
                          return (
                            <div className="text-right">
                              <span className="font-bold text-green-600 dark:text-[#D3E392]">Free Demo</span>
                              <span className="text-xs font-normal text-muted-foreground block">
                                Rate Limited Tier
                              </span>
                            </div>
                          );
                        }

                        const dbPricing = pricingMap[selectedTest.slug] || pricingMap[selectedTest.name.toLowerCase()];
                        const dbPrice = dbPricing
                          ? (isIndividual ? dbPricing.psychologist : (isOrg ? dbPricing.org : dbPricing.clinic))
                          : null;

                        const displayPrice = dbPrice != null ? dbPrice : selectedTest.creditCost;

                        if (displayPrice != null && displayPrice > 0) {
                          return (
                            <div className="text-right">
                              <span className="font-bold">₹{displayPrice.toFixed(2)}</span>
                              <span className="text-xs font-normal text-muted-foreground block">
                                {selectedTest.slug === "tat" ? "per card" : "total cost"}
                              </span>
                            </div>
                          );
                        }

                        return <span className="text-muted-foreground">Free</span>;
                      })()}
                    </div>
                    <Button size="lg" onClick={handleContinue} className="w-full gap-2" disabled={!canAssess}>
                      Continue to Intake
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    {!canAssess && (
                      <p className="text-xs text-red-500 text-center mt-2">
                        You do not have permission to start assessments. Contact your clinic admin.
                      </p>
                    )}
                  </div>

                  <AlertDialog open={showContinueConfirm} onOpenChange={setShowContinueConfirm}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Proceed to {targetLabel} Intake?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You have selected <strong>{selectedTest.name}</strong>.
                          You will now proceed to the {targetLabelLower} intake step before starting the assessment.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmContinue}>
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border border-dashed bg-muted/30">
                <CardContent className="p-6 flex flex-col items-center text-center text-muted-foreground">
                  <Lock className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Select an active assessment to proceed.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TestCard({
  test,
  Icon,
  isActive,
  isSelected,
  onSelect,
}: {
  test: TestModule;
  Icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={`relative overflow-visible transition-all ${isActive
        ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        : "opacity-60 cursor-not-allowed"
        } ${isSelected && isActive
          ? "border-primary ring-1 ring-primary shadow-lg"
          : isActive
            ? "hover:border-primary/40"
            : "border-border/50"
        }`}
      onClick={onSelect}
    >

      {isSelected && isActive && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          Selected
        </Badge>
      )}

      {!isActive && (
        <Badge
          variant="secondary"
          className="absolute -top-2.5 right-3 z-10 gap-1 text-xs"
        >
          <Lock className="h-3 w-3" />
          Coming Soon
        </Badge>
      )}

      <CardContent className="pt-6 pb-4 flex flex-col items-center gap-3 text-center">
        <div
          className={`h-12 w-12 rounded-xl flex items-center justify-center ${isSelected && isActive
            ? "bg-primary/15"
            : isActive
              ? "bg-muted"
              : "bg-muted/50"
            }`}
        >
          <Icon
            className={`h-6 w-6 ${isSelected && isActive
              ? "text-primary"
              : isActive
                ? "text-muted-foreground"
                : "text-muted-foreground/50"
              }`}
          />
        </div>

        <div>
          <h3
            className={`font-semibold text-sm ${!isActive ? "text-muted-foreground" : ""
              }`}
          >
            {test.shortName}
          </h3>
          <p className="text-xs text-muted-foreground leading-snug mt-1 line-clamp-2">
            {test.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-auto">
          {test.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {test.category}
            </Badge>
          )}
          {test.ageGroup && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {test.ageGroup}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
