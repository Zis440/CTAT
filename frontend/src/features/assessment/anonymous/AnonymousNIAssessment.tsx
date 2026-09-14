import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/services/apiClient";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ArrowRight, CheckCircle2, Info, Mic, MicOff, Globe, MapPin, ChevronDown, RotateCcw, RotateCw, Maximize, X, AlertTriangle } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
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

interface ValidationResponse {
  valid: boolean;
  assessment_name: string;
  assessment_id: number;
  org_id: string;
  patient?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  selected_cards?: string[];
  request_validation?: boolean;
}

type CardVersion = "indianized" | "globalized";

type TranscriptionLanguage = "en" | "hi" | "bn";

const LANGUAGE_OPTIONS: { value: TranscriptionLanguage; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "hi", label: "Hindi", flag: "🇮🇳" },
  { value: "bn", label: "Bengali", flag: "🇮🇳" },
];

export function AnonymousNIAssessment({
  token,
  validation,
  cards,
  onComplete
}: {
  token: string;
  validation: ValidationResponse;
  cards: { id: string, filename: string }[];
  onComplete: () => void;
}) {

  const [step, setStep] = useState<"intro" | "assessment" | "completed">("intro");
  const [stories, setStories] = useState<Record<string, string>>({});

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardVersion, setCardVersion] = useState<CardVersion>("indianized");
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<TranscriptionLanguage>("en");
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {

  }, []);

  const getCardImageUrl = useCallback((filename: string) => {
    if (!filename) return "";
    return `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/cards/image/${cardVersion}/${filename}`;
  }, [cardVersion]);

  const currentCard = cards[currentCardIndex];

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

      if (data.text && currentCard) {
        setStories(prev => {
          const existing = prev[currentCard.id] || "";
          const separator = existing.trim() ? " " : "";
          return { ...prev, [currentCard.id]: existing + separator + data.text };
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

  const handleNextCard = () => {
    const currentStory = stories[currentCard?.id] || "";
    if (currentStory.trim().length < 10) {
      toast.error("Please enter a valid descriptive story before continuing.");
      return;
    }
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setRotation(0);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      await apiClient.post(`/anonymous/submit/${token}`, {
        first_name: validation?.patient?.first_name || "Anonymous",
        last_name: validation?.patient?.last_name || "",
        email: validation?.patient?.email || "",
        responses: {
          cards: Object.entries(stories).map(([card_id, story]) => ({
            card_id,
            story
          }))
        }
      });
      setStep("completed");
      onComplete();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit assessment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = cards.length > 0 ? ((currentCardIndex) / cards.length) * 100 : 0;

  const versionButtons: { key: CardVersion; label: string; icon: React.ReactNode }[] = [
    { key: "indianized", label: "Indianized", icon: <MapPin className="h-3.5 w-3.5" /> },
    { key: "globalized", label: "Globalized", icon: <Globe className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:p-8">
      <Helmet><title>CoreTAT - Psychological Intelligence</title></Helmet>

      <div className="w-full max-w-3xl flex-1 flex flex-col pt-4">

        <div className="mb-6 flex items-center gap-3">
          <img src="/coretat-logo.png" alt="CoreTAT" className="h-10 w-auto object-contain hidden dark:block" />
          <img src="/coretat-report-logo.png" alt="CoreTAT" className="h-10 w-auto object-contain block dark:hidden" />
        </div>

        {step === "intro" && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 border-primary/20 bg-background/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">{validation?.assessment_name}</CardTitle>
              {validation?.patient && (
                <p className="text-sm text-muted-foreground">
                  Welcome, <strong>{validation.patient.first_name} {validation.patient.last_name}</strong>
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-xl p-4 flex gap-3 shadow-sm">
                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Standard Administration Instructions</h4>
                  <p className="text-sm opacity-90 leading-relaxed">
                    You will be shown some pictures, one at a time. Your task is to make up as dramatic a story as you can for each. Tell what has led up to the event shown in the picture, describe what is happening at the moment, what the characters are feeling and thinking; and then give the outcome. Speak your thoughts as they come to your mind.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 text-sm space-y-3">
                <p><strong>Before you begin:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>This assessment is strictly confidential.</li>
                  <li>Please ensure you are in a quiet environment.</li>
                  <li>Do not refresh or close the page once you begin.</li>
                  <li>You can type your story or use the microphone button to narrate verbally.</li>
                  <li>You will be shown <strong>{cards.length}</strong> card{cards.length !== 1 ? "s" : ""}.</li>
                </ul>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => setStep("assessment")}>
                I Understand, Begin Assessment <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "assessment" && currentCard && (
          <div className="space-y-4 flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="flex justify-between items-end text-sm mb-2 px-1">
              <span className="font-semibold text-foreground">
                Card {currentCardIndex + 1} <span className="text-muted-foreground font-normal">of {cards.length}</span>
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
                  <span>Analyzing: {currentCard.id}</span>
                  {validation?.patient && (
                    <Badge variant="outline">Patient: {validation.patient.first_name} {validation.patient.last_name}</Badge>
                  )}
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
                    src={getCardImageUrl(currentCard.filename)}
                    alt={currentCard.id}
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

                  <div className="absolute top-3 right-3">
                    <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase tracking-wider">
                      {cardVersion === "indianized" ? "🇮🇳 Indianized" : "🌍 Globalized"}
                    </Badge>
                  </div>
                </div>

                {isFullscreen && (
                  <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setIsFullscreen(false)}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 text-white hover:bg-white/10"
                      onClick={() => setIsFullscreen(false)}
                    >
                      <X className="h-6 w-6" />
                    </Button>
                    <ImageWithFallback
                      src={getCardImageUrl(currentCard.filename)}
                      alt={currentCard.id}
                      className="max-w-full max-h-full object-contain"
                      style={{ transform: `rotate(${rotation}deg)` }}
                    />
                  </div>
                )}

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
                      placeholder="Record your story for this card here..."
                      className="min-h-[200px] resize-y pr-14"
                      value={stories[currentCard.id] || ""}
                      onChange={(e) => setStories(prev => ({ ...prev, [currentCard.id]: e.target.value }))}
                      disabled={isSubmitting || isTranscribing}
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
                          disabled={isSubmitting}
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
                      {(stories[currentCard.id] || "").split(/\s+/).filter(Boolean).length} words
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleNextCard}
                    disabled={isSubmitting || (stories[currentCard.id] || "").length < 10}
                    className="w-full sm:w-auto min-w-[180px] bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : currentCardIndex < cards.length - 1 ? (
                      "Continue to Next Card"
                    ) : (
                      "Submit Assessment"
                    )}
                  </Button>
                </div>

                <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
                  <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Submit for Analysis?</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-4 text-left mt-2">
                          <p className="text-sm text-muted-foreground">
                            This will submit the story for {currentCard.id}{currentCardIndex < cards.length - 1 ? " and move to the next card." : " and prepare for final analysis."}
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
                      <AlertDialogAction onClick={handleConfirmSubmit}>
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "completed" && (
          <Card className="animate-in zoom-in-95 duration-500 border-green-500/20 bg-green-500/5">
            <CardContent className="pt-10 pb-10 flex flex-col items-center text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-6" />
              <CardTitle className="text-2xl mb-2">Assessment Completed</CardTitle>
              <p className="text-muted-foreground max-w-md text-lg leading-relaxed">
              Your responses have been saved and queued for analysis. Your assessment assignee will soon receive your reports. You may now close this window.
            </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
