import { useState, useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@/store/useSessionStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { submitCardStory } from "@/features/assessment/tat/services/analysisService";
import { apiClient } from "@/services/apiClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RotateCcw, RotateCw, Maximize, X, Info, Mic, MicOff, Globe, MapPin, ChevronDown, AlertTriangle, Link as LinkIcon, Copy, Check } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useAuthStore, isDemoAccount } from "@/store/useAuthStore";
import { useWalletStore } from "@/store/useWalletStore";
import { getWalletBalance } from "@/services/walletService";
import { formatRupees } from "@/types/wallet";
import { PaymentConfirmationModal, type PaymentBreakdownItem } from "@/components/PaymentConfirmationModal";
import { useNavigate } from "react-router-dom";
import { getSessionNewRoute, getRechargeRoute, getSessionResultRoute } from "@/lib/routeUtils";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TEST_REGISTRY } from "@/features/assessment/registry";

type CardVersion = "original" | "indianized" | "globalized";

type TranscriptionLanguage = "en" | "hi" | "bn";

const LANGUAGE_OPTIONS: { value: TranscriptionLanguage; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "hi", label: "Hindi", flag: "🇮🇳" },
  { value: "bn", label: "Bengali", flag: "🇮🇳" },
];

export function ActiveSession() {
  const { activePatientId, selectedCards, patient, testType, requestPsychologistValidation, toggleValidation } = useSessionStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Record<string, string>>({});
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cardMappings, setCardMappings] = useState<Record<string, string>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [showAnalyzeConfirm, setShowAnalyzeConfirm] = useState(false);
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [showShareConfirm, setShowShareConfirm] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { user } = useAuthStore();
  const { balance, setBalance } = useWalletStore();

  const isDemo = isDemoAccount(user);
  const isIndividual = user?.account_type === "individual";
  const rate = isDemo ? 0 : (isIndividual ? 30 : 20);
  const baseCost = rate * selectedCards.length;
  const hasDiscount = selectedCards.length > 1;
  const sessionCost = isDemo ? 0 : (hasDiscount ? baseCost * 0.8 : baseCost);
  const isEligibleForValidation = !isDemo && user?.verification_status !== "approved";
  const isValidationRequested = isEligibleForValidation && requestPsychologistValidation;
  const finalCost = isDemo ? 0 : (sessionCost + (isValidationRequested ? 100 : 0));

  const currentBalance = balance ? balance.balance_rupees : 0;
  const hasInsufficientBalance = isDemo ? false : (currentBalance < finalCost);

  const breakdownItems: PaymentBreakdownItem[] = isDemo
    ? [
        { label: "Account Tier:", value: <span>Demo Tier (Complimentary)</span> },
        { label: "Assessment:", value: <strong>TATcore AI Test</strong> },
        { label: "No. of cards:", value: selectedCards.length },
        { label: "Total Cost:", value: <span className="text-green-600 dark:text-[#D3E392] font-bold">₹0.00 (Free Demo)</span>, isTotal: true },
      ]
    : [
        { label: "Account Type:", value: <span className="capitalize">{user?.account_type || "individual"}</span> },
        { label: "Rate per card:", value: formatRupees(rate * 100) },
        { label: "No. of cards:", value: selectedCards.length },
        { label: "Base Fee:", value: formatRupees(baseCost * 100) },
        ...(hasDiscount ? [{ label: "Multi-card Discount (20%):", value: `-${formatRupees(baseCost * 0.2 * 100)}`, isDiscount: true }] : []),
        ...(isValidationRequested ? [{ label: "Validate by RCI Verified Psychologist:", value: formatRupees(10000) }] : []),
        { label: "Total Cost:", value: formatRupees(finalCost * 100), isTotal: true },
        { label: "Available Wallet Balance:", value: balance ? formatRupees(balance.balance_paise) : formatRupees(0), isBalance: true, isInsufficient: hasInsufficientBalance },
      ];

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

    const onFocus = () => fetchBalance();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [setBalance]);

  const [cardVersion, setCardVersion] = useState<CardVersion>("indianized");

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<TranscriptionLanguage>("en");
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    async function fetchMappings() {
      try {
        const { data } = await apiClient.get<{ id: string, filename: string }[]>("/cards");
        const map: Record<string, string> = {};
        data.forEach(c => { map[c.id] = c.filename; });
        setCardMappings(map);
      } catch (e) {
        console.error("Failed to map cards", e);
      }
    }
    fetchMappings();
  }, []);

  const currentCard = selectedCards[currentCardIndex];

  const getCardImageUrl = useCallback((filename: string) => {
    if (!filename) return "";
    if (cardVersion === "original") {
      return `http://localhost:8000/api/cards/image/${filename}`;
    }
    return `http://localhost:8000/api/cards/image/${cardVersion}/${filename}`;
  }, [cardVersion]);

  const mutation = useMutation({
    mutationFn: async (storyText: string) => {
      if (!activePatientId || !currentCard) throw new Error("Missing session details");
      return submitCardStory(currentCard, storyText, activePatientId, patient?.effectiveAge);
    },
    onSuccess: async (data) => {
      if (!activePatientId) return;

      toast.success(`Analysis complete for ${currentCard}`);
      queryClient.setQueryData(['analysis', activePatientId, currentCard], data);

      if (currentCardIndex < selectedCards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setRotation(0);
      } else {
        toast.info("All selected cards analyzed. Finalizing results...");

        getWalletBalance().then(b => {
          setBalance(b);
        }).catch(err => console.error("Failed to update wallet balance:", err));

        setTimeout(() => {
          const userState = useAuthStore.getState().user;
          navigate(getSessionResultRoute(userState?.role));
        }, 500);
      }
    },
    onError: (error) => {
      toast.error("Analysis failed. Please try again.");
      console.error(error);
    }
  });

  useEffect(() => {
    let interval: number;
    if (mutation.isPending) {
      setElapsedSeconds(0);
      interval = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => window.clearInterval(interval);
  }, [mutation.isPending]);

  useEffect(() => {
    if (!activePatientId || selectedCards.length === 0) {
      const interval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            navigate(getSessionNewRoute(user?.role));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activePatientId, selectedCards, navigate]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
      });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setRecordingSeconds(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        if (audioBlob.size < 1000) {
          toast.error("Recording too short. Please try again.");
          return;
        }
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      toast.info("🎤 Recording started. Speak clearly...");
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("language", selectedLanguage);

      const { data } = await apiClient.post("/audio/transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.text) {

        setStories(prev => {
          const existing = prev[currentCard] || "";
          const separator = existing.trim() ? " " : "";
          return { ...prev, [currentCard]: existing + separator + data.text };
        });

        const langLabel = LANGUAGE_OPTIONS.find(l => l.value === selectedLanguage)?.label || selectedLanguage.toUpperCase();
        toast.success(
          `🎤 Transcribed (${langLabel})`
        );
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (err: any) {
      console.error("Transcription failed:", err);
      toast.error(err?.response?.data?.detail || "Transcription failed. Try typing instead.");
    } finally {
      setIsTranscribing(false);
    }
  }, [currentCard, selectedLanguage]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  if (!activePatientId || selectedCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-500">
        <div className="relative py-12 px-10 max-w-xl w-full bg-background/50 border border-primary/10 rounded-xl shadow-2xl backdrop-blur-md text-center space-y-5">
          <div className="mx-auto w-12 h-12 bg-primary/10 flex items-center justify-center rounded-full mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
          <h3 className="text-xl font-medium text-foreground tracking-tight">Redirecting to Intake</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your session state was lost. Taking you back to session intake in <strong className="text-primary font-bold">{redirectCountdown} sec{redirectCountdown !== 1 ? 's' : ''}</strong>...
          </p>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    const currentStory = stories[currentCard] || "";
    if (currentStory.trim().length < 10) {
      toast.error("Please enter a valid descriptive story before analyzing.");
      return;
    }
    setShowAnalyzeConfirm(true);
  };

  const handleConfirmAnalyze = () => {
    setShowAnalyzeConfirm(false);
    if (currentCardIndex === selectedCards.length - 1) {
      setShowPayConfirm(true);
    } else {
      const currentStory = stories[currentCard] || "";
      mutation.mutate(currentStory);
    }
  };

  const handleConfirmPay = () => {
    setShowPayConfirm(false);
    const currentStory = stories[currentCard] || "";
    mutation.mutate(currentStory);
  };

  const handleShareSessionClick = () => {
    setShowShareConfirm(true);
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

      toast.success("Link successfully generated and ready to be shared.");
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

  const progress = ((currentCardIndex) / selectedCards.length) * 100;

  const versionButtons: { key: CardVersion; label: string; icon: React.ReactNode }[] = [
    { key: "indianized", label: "Indianized", icon: <MapPin className="h-3.5 w-3.5" /> },
    { key: "globalized", label: "Globalized", icon: <Globe className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Active Session | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-end text-sm mb-2 px-1">
          <span className="font-semibold text-foreground">
            Card {currentCardIndex + 1} <span className="text-muted-foreground font-normal">of {selectedCards.length}</span>
          </span>
          <span className="text-primary font-bold">
            {Math.round(progress)}% <span className="text-muted-foreground font-normal text-xs">Complete</span>
          </span>
        </div>
        <div className="h-2.5 w-full bg-primary/15 dark:bg-primary/10 rounded-full overflow-hidden shadow-inner border border-primary/5">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span>Analyzing: {currentCard}</span>
              <Badge variant="outline">Patient: {activePatientId}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-lg border w-fit">
              {versionButtons.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setCardVersion(key)}
                  className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                  ${cardVersion === key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }
                `}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <div className="relative aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden group">
              <ImageWithFallback
                src={cardMappings[currentCard] ? getCardImageUrl(cardMappings[currentCard]) : ""}
                alt={currentCard}
                className="object-contain h-full w-full transition-transform duration-500 ease-in-out"
                style={{
                  transform: `rotate(${rotation}deg)`
                }}
              />

              <div className="absolute bottom-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm p-1 rounded-lg border shadow-sm">
                <Button variant="ghost" size="icon" onClick={() => setRotation(r => r - 90)} title="Rotate Left 90°">
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setRotation(r => r + 90)} title="Rotate Right 90°">
                  <RotateCw className="h-5 w-5" />
                </Button>
                <div className="w-px h-6 bg-border self-center" />
                <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(true)} title="View Full Screen">
                  <Maximize className="h-5 w-5" />
                </Button>
              </div>

              {cardVersion !== "original" && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase tracking-wider">
                    {cardVersion === "indianized" ? "🇮🇳 Indianized" : "🌍 Globalized"}
                  </Badge>
                </div>
              )}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3 my-4">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="font-medium text-primary text-sm">Patient Instruction</h4>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Write below what you see, what is going on inside your mind after watching this image.
                  Describe the scene, the characters, their emotions, and what you think might happen next...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  🎤 Can't type? Use the microphone button to narrate your story verbally.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Patient Narrative Input</label>
                <div className="flex items-center gap-2">

                  <div className="relative">
                    <button
                      onClick={() => setIsLangDropdownOpen(prev => !prev)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border bg-secondary/60 hover:bg-secondary text-foreground transition-all duration-200 cursor-pointer select-none"
                      title="Select transcription language"
                    >
                      <span>{LANGUAGE_OPTIONS.find(l => l.value === selectedLanguage)?.flag}</span>
                      <span>{LANGUAGE_OPTIONS.find(l => l.value === selectedLanguage)?.label}</span>
                      <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isLangDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsLangDropdownOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-popover border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                          {LANGUAGE_OPTIONS.map((lang) => (
                            <button
                              key={lang.value}
                              onClick={() => {
                                setSelectedLanguage(lang.value);
                                setIsLangDropdownOpen(false);
                                toast.info(`🌐 Language set to ${lang.label}`);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${selectedLanguage === lang.value
                                  ? 'bg-primary/10 text-primary font-semibold'
                                  : 'text-foreground hover:bg-muted'
                                }`}
                            >
                              <span className="text-sm">{lang.flag}</span>
                              <span>{lang.label}</span>
                              {selectedLanguage === lang.value && (
                                <span className="ml-auto text-primary">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    📝 Verbatim Transcription
                  </Badge>
                </div>
              </div>
              <div className="relative">
                <Textarea
                  placeholder="Record the patient's story for this card here..."
                  className="min-h-[200px] resize-y pr-14"
                  value={stories[currentCard] || ""}
                  onChange={(e) => setStories(prev => ({ ...prev, [currentCard]: e.target.value }))}
                  disabled={mutation.isPending || isTranscribing}
                />

                <div className="absolute bottom-3 right-3 flex flex-col items-center gap-1.5">
                  {isRecording ? (
                    <button
                      onClick={stopRecording}
                      className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all animate-pulse"
                      title="Stop Recording"
                    >
                      <MicOff className="h-4.5 w-4.5" />
                    </button>
                  ) : isTranscribing ? (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <button
                      onClick={startRecording}
                      disabled={mutation.isPending}
                      className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center shadow-sm transition-all border border-primary/20 hover:border-primary/40 disabled:opacity-50"
                      title="Start Voice Recording"
                    >
                      <Mic className="h-4.5 w-4.5" />
                    </button>
                  )}
                  {isRecording && (
                    <span className="text-[10px] font-mono text-red-500 font-bold">
                      {recordingSeconds}s
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isRecording && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 animate-in fade-in">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Recording...
                    </div>
                  )}
                  {isTranscribing && (
                    <div className="flex items-center gap-1.5 text-xs text-primary animate-in fade-in">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Transcribing audio...
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {(stories[currentCard] || "").split(/\s+/).filter(Boolean).length} words
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 pt-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleShareSessionClick}
                  disabled={isGenerating || mutation.isPending}
                  className="w-full sm:w-auto min-w-[140px]"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LinkIcon className="h-4 w-4 mr-2" />}
                  Share Link
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={mutation.isPending}
                  className="w-full sm:w-auto min-w-[140px] bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {mutation.isPending ? (
                    <>
                      <div className="flex space-x-1 items-center h-full mr-2">
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      Working on it...
                    </>
                  ) : currentCardIndex === selectedCards.length - 1 ? (
                    "Analyze Session"
                  ) : (
                    "Continue to Next Card"
                  )}
                </Button>
              </div>

              {mutation.isPending && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>
                    Analyzing...{" "}
                    <span className="font-medium text-foreground ml-1">
                      {elapsedSeconds > 59
                        ? `${Math.floor(elapsedSeconds / 60)} min ${elapsedSeconds % 60} secs`
                        : `${elapsedSeconds} secs`}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <AlertDialog open={showAnalyzeConfirm} onOpenChange={setShowAnalyzeConfirm}>
              <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit for Analysis?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4 text-left mt-2">
                      <p className="text-sm text-muted-foreground">
                        This will submit the story for {currentCard}{currentCardIndex < selectedCards.length - 1 ? " and move to the next card." : " and prepare for final analysis."}
                      </p>

                      <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-lg p-3 text-xs mt-2 font-medium flex gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <div>
                          <strong className="block mb-0.5 text-sm">Important:</strong>
                          Once submitted, you will not be able to edit this story. Please review it carefully before continuing.
                        </div>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmAnalyze}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <PaymentConfirmationModal
              isOpen={showPayConfirm}
              onOpenChange={setShowPayConfirm}
              title={isDemo ? "Complete Demo Assessment" : "Complete Assessment & Pay"}
              description={
                <p>
                  {isDemo ? "This will analyze all cards and finalize the TATcore AI Test session complimentary." : "This will analyze all cards and finalize the session. The following amount will be deducted from your wallet."}
                </p>
              }
              breakdownItems={breakdownItems}
              showValidationCheck={isEligibleForValidation}
              isValidationRequested={requestPsychologistValidation}
              onValidationChange={toggleValidation}
              validationPrice="₹100"
              validationDescription="An independent RCI registered psychologist will review your assessment."
              warningMessage={<><strong className="block mb-0.5 text-sm">Important:</strong>Once confirmed, the final analysis results will be generated. This action cannot be undone.</>}
              onConfirm={handleConfirmPay}
              confirmText={isDemo ? "Complete Assessment" : "Pay & Analyze Session"}
              hasInsufficientBalance={hasInsufficientBalance}
              onRechargeClick={() => {
                setShowPayConfirm(false);
                toast.info("Recharge page opened in a new window. After paying, return here.");
                window.open(getRechargeRoute(user?.role), "rechargeWindow", "width=800,height=800,left=200,top=100");
              }}
            />

            <PaymentConfirmationModal
              isOpen={showShareConfirm}
              onOpenChange={setShowShareConfirm}
              title={
                <>
                  <LinkIcon className="h-5 w-5" />
                  Generate Shareable Link
                </>
              }
              description={
                <div className="space-y-4 text-left mt-2">
                  <p className="text-sm text-muted-foreground">
                    You are about to generate a one-time secure link for this session.
                  </p>

                  <div className="bg-primary/5 border border-primary/20 text-primary rounded-lg p-3 text-sm mt-2 font-medium flex gap-3 shadow-sm">
                    <Info className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-1 text-base">Important Update:</strong>
                      Once generated, you can share the link with the patient to complete the assessment remotely. <strong>Your wallet will NOT be deducted right now.</strong> The amount will only be deducted if and when the remote user successfully completes and submits the assessment.
                    </div>
                  </div>
                </div>
              }
              onConfirm={handleGenerateLink}
              customConfirmButton={
                <Button onClick={handleGenerateLink} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Generate Link
                </Button>
              }
            />

          </CardContent>
        </Card>

        {isFullscreen && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300"
            onClick={() => setIsFullscreen(false)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-6 right-6 text-white hover:bg-white/10 z-10"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={cardMappings[currentCard] ? getCardImageUrl(cardMappings[currentCard]) : ""}
              alt={currentCard}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              style={{ transform: `rotate(${rotation}deg)` }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

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
