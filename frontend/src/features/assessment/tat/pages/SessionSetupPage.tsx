import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@/store/useSessionStore";
import { useAuthStore, isDemoAccount } from "@/store/useAuthStore";
import { useWalletStore } from "@/store/useWalletStore";
import { CardGrid } from "./CardGridPage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Info, Link as LinkIcon, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { getWalletBalance } from "@/services/walletService";
import { getSessionNewRoute, getSessionActiveRoute } from "@/lib/routeUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/services/apiClient";
import { formatRupees } from "@/types/wallet";
import { PaymentConfirmationModal, type PaymentBreakdownItem } from "@/components/PaymentConfirmationModal";
import { TEST_REGISTRY } from "@/features/assessment/registry";

export function SessionSetupView() {
  const { activePatientId, selectedCards, testType, requestPsychologistValidation, toggleValidation } = useSessionStore();
  const { user } = useAuthStore();
  const { setBalance } = useWalletStore();
  const navigate = useNavigate();
  const [cardVersion, setCardVersion] = useState<"indianized" | "globalized">("indianized");
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showShareConfirm, setShowShareConfirm] = useState(false);
  const [baseRate, setBaseRate] = useState<number>(user?.account_type === "individual" ? 30 : 20);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const b = await getWalletBalance();
        setBalance(b);
      } catch (err) {
        console.error("Failed to fetch wallet balance:", err);
      }
    }
    fetchBalance();
  }, [setBalance]);

  useEffect(() => {
    async function fetchDynamicPricing() {
      try {
        const { data } = await apiClient.get("/assessments/");
        const testDef = TEST_REGISTRY.find(t => t.slug === testType) || { name: "Assessment" };
        const testEntry = data?.find((a: { name: string, slug?: string }) => a.name === testDef.name || a.slug === testType);

        if (testEntry) {
          if (user?.account_type === "individual") {
            setBaseRate(testEntry.psychologistPrice ?? 30);
          } else {
            setBaseRate(testEntry.clinicPrice ?? 20);
          }
        }
      } catch (err) {
        console.error("Failed to fetch pricing:", err);
      }
    }
    fetchDynamicPricing();
  }, [user?.account_type, testType]);

  if (!activePatientId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <h2 className="text-2xl font-semibold">No Patient Selected</h2>
        <p className="text-muted-foreground">Please complete patient intake before selecting cards.</p>
        <Button onClick={() => navigate(getSessionNewRoute(user?.role))}>Go to Intake</Button>
      </div>
    );
  }

  const isDemo = isDemoAccount(user);
  const rate = isDemo ? 0 : baseRate;
  const baseCost = rate * selectedCards.length;
  const hasDiscount = selectedCards.length > 1;
  const sessionCost = isDemo ? 0 : (hasDiscount ? baseCost * 0.8 : baseCost);
  const isRciVerifiedPsychologist = !!user?.rci_number && user?.verification_status === "approved";
  const isEligibleForValidation = !isDemo && !isRciVerifiedPsychologist;
  const isValidationRequested = isEligibleForValidation && requestPsychologistValidation;
  const finalCost = isDemo ? 0 : (sessionCost + (isValidationRequested ? 100 : 0));

  const breakdownItems: PaymentBreakdownItem[] = isDemo
    ? [
        { label: "Account Tier:", value: <span>Demo Tier (Complimentary)</span> },
        { label: "Selected Assessment:", value: <strong>TATcore AI Test</strong> },
        { label: "No. of cards:", value: selectedCards.length },
        { label: "Assessment Fee:", value: <span className="text-green-600 dark:text-[#D3E392] font-bold">Free (Rate Limited)</span> },
        { label: "Total Cost:", value: <span className="text-green-600 dark:text-[#D3E392] font-bold">₹0.00</span>, isTotal: true },
      ]
    : [
        { label: "Account Type:", value: <span className="capitalize">{user?.account_type || "individual"}</span> },
        { label: "Rate per card:", value: formatRupees(rate * 100) },
        { label: "No. of cards:", value: selectedCards.length },
        { label: "Base Fee:", value: formatRupees(baseCost * 100) },
        ...(hasDiscount ? [{ label: "Multi-card Discount (20%):", value: `-${formatRupees(baseCost * 0.2 * 100)}`, isDiscount: true }] : []),
        ...(isValidationRequested ? [{ label: "Validate by RCI Verified Psychologist:", value: formatRupees(10000) }] : []),
        { label: "Total Cost:", value: formatRupees(finalCost * 100), isTotal: true },
      ];

  const handleStartSession = () => {
    if (selectedCards.length === 0) {
      toast.error("Please select at least one card to begin the session.");
      return;
    }
    setShowStartConfirm(true);
  };

  const handleConfirmStart = () => {
    setShowStartConfirm(false);
    navigate(getSessionActiveRoute(user?.role));
  };

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const testDef = TEST_REGISTRY.find(t => t.slug === testType);
      const testName = testDef?.name.toLowerCase() || testType?.toLowerCase() || "";
      const assessmentList = await apiClient.get("/assessments").then(res => res.data);
      const assessment = assessmentList.find((a: any) => a.name.toLowerCase().includes(testName) || (testType && a.id.toString() === testType));

      if (!assessment) {
        toast.error("Assessment not found in database.");
        setIsGenerating(false);
        return;
      }

      const isIndividual = user?.account_type === "individual";
      const isOrg = user?.role === "org_admin" || user?.role === "org_staff";
      const dbPrice = isIndividual ? assessment.psychologistPrice : (isOrg ? assessment.orgPrice : assessment.clinicPrice);
      const basePrice = dbPrice != null ? dbPrice : (testDef?.creditCost || 0);
      const price = testDef?.slug === "tat" ? basePrice * selectedCards.length : basePrice;

      if (!isDemo && price > 0) {
        const currentBalance = await getWalletBalance();
        if (currentBalance.balance_rupees < price) {
          toast.error(`Insufficient wallet balance to generate link. (Required: ₹${price.toFixed(2)})`);
          setIsGenerating(false);
          return;
        }
      }
      const res = await apiClient.post("/org/anonymous-links/", {
        assessment_id: assessment.id,
        expires_in_hours: 3,
        patient_id: activePatientId,
        selected_cards: selectedCards,
        request_validation: requestPsychologistValidation
      });
      setGeneratedLink(`${window.location.origin}/assessment/${res.data.token}`);
      setShowShareConfirm(false);

      const newBalance = await getWalletBalance();
      setBalance(newBalance);

      toast.success("Transaction successful! Link is ready to be shared.");
      setIsLinkDialogOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to generate link.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full">
      <Helmet>
        <title>Session Setup | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{isDemo ? "TATcore AI Test" : (TEST_REGISTRY.find(t => t.slug === testType)?.name || "Assessment")} Session Setup</h2>
            <p className="text-muted-foreground">Patient: {activePatientId}</p>
          </div>
          <div className="flex items-center gap-4">
            <Tabs value={cardVersion} onValueChange={(val: string) => setCardVersion(val as any)}>
              <TabsList>
                <TabsTrigger value="indianized">Indianized</TabsTrigger>
                <TabsTrigger value="globalized">Globalized</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button size="lg" onClick={handleStartSession} disabled={selectedCards.length === 0} className="bg-primary/10 text-primary hover:bg-primary/20">
              Start Story Input
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-xl p-4 flex gap-3 shadow-sm">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Standard Administration Instructions</h4>
            <p className="text-sm opacity-90 leading-relaxed">
              Before beginning the story input, read the following instructions to the patient: <br />
              <em className="font-medium">"I am going to show you some pictures, one at a time; and your task will be to make up as dramatic a story as you can for each. Tell what has led up to the event shown in the picture, describe what is happening at the moment, what the characters are feeling and thinking; and then give the outcome. Speak your thoughts as they come to your mind."</em>
            </p>
          </div>
        </div>

        <CardGrid version={cardVersion} />

        <PaymentConfirmationModal
          isOpen={showStartConfirm}
          onOpenChange={setShowStartConfirm}
          title="Begin Assessment Session?"
          description={
            <p>
              You have selected <strong>{selectedCards.length}</strong> card{selectedCards.length !== 1 ? "s" : ""}. Once started, you'll need to provide stories for each selected card.
            </p>
          }
          breakdownItems={breakdownItems}
          showValidationCheck={isEligibleForValidation}
          isValidationRequested={requestPsychologistValidation}
          onValidationChange={toggleValidation}
          validationPrice="₹100"
          validationDescription="An independent RCI registered psychologist will review your assessment."
          warningMessage={<><strong className="block mb-0.5 text-sm">Important:</strong>You cannot change your card selection once the session begins. The final cost will be deducted from your wallet after you submit your narratives.</>}
          onConfirm={handleConfirmStart}
          confirmText="Start Session"
          secondaryAction={
            <Button type="button" variant="ghost" onClick={() => { setShowStartConfirm(false); setShowShareConfirm(true); }} className="text-muted-foreground hover:text-foreground">
              <LinkIcon className="h-4 w-4 mr-2" /> Share Link
            </Button>
          }
        />

        <PaymentConfirmationModal
          isOpen={showShareConfirm}
          onOpenChange={setShowShareConfirm}
          title="Generate Shareable Link"
          description={
            <p>
              You have selected <strong>{selectedCards.length}</strong> card{selectedCards.length !== 1 ? "s" : ""}. Once generated, the link will be valid for 3 hours.
            </p>
          }
          breakdownItems={breakdownItems}
          showValidationCheck={isEligibleForValidation}
          isValidationRequested={requestPsychologistValidation}
          onValidationChange={toggleValidation}
          validationPrice="₹100"
          validationDescription="An independent RCI registered psychologist will review the assessment once submitted."
          warningMessage={<><strong className="block mb-0.5 text-sm">Important:</strong>The final cost will be deducted from your wallet after the test has been successfully completed.</>}
          onConfirm={handleGenerateLink}
          customConfirmButton={
            <Button onClick={handleGenerateLink} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LinkIcon className="h-4 w-4 mr-2" />}
              Generate Link
            </Button>
          }
        />

        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" /> Share Assessment Link
              </DialogTitle>
              <DialogDescription>
                Copy this link and send it to the patient. They can complete the assessment directly from their device.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 mt-4">
              <div className="grid flex-1 gap-2">
                <Input
                  id="link"
                  defaultValue={generatedLink || ""}
                  readOnly
                  className="bg-muted font-mono text-xs"
                />
              </div>
              <Button size="icon" onClick={copyToClipboard}>
                <span className="sr-only">Copy</span>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter className="sm:justify-start">
              <Button type="button" variant="secondary" onClick={() => setIsLinkDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
