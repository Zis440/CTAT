import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiClient } from "@/services/apiClient";
import StoryCardGame from '@/features/assessment/screening/level1/games/StoryCardGame';
import SymbolGame from '@/features/assessment/screening/level1/games/SymbolGame';
import CodeNumberGame from '@/features/assessment/screening/level1/games/CodeNumberGame';
import LlmInsightBanner from '@/features/assessment/screening/level1/components/LlmInsightBanner';
import { Check, ArrowRight, BookOpen, Mic } from 'lucide-react';
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
import { useUIStore } from "@/store/useUIStore";
import { globalAudioPlayer } from "@/lib/audioPlayer";

// Phase mapping
type Phase = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface PhaseConfig {
  name: string;
  context: string;
  section?: string;
  mbiSection?: string;
  key?: string;
}

interface GameMetrics {
  game_type: string;
  score: number;
  movement_count: number;
  completion_time_seconds: number;
  story_assessments?: any[];
  patient_context?: PatientContext;
  timeExpired?: boolean;
}

interface StoryAssessment {
  card_id: string;
  story_text: string;
  movement_count: number;
  completion_time_seconds: number;
}

interface PatientContext {
  age: number;
  gender: string;
  living_condition: string;
  family_structure: string;
  residence_type: string;
  environment_type: string;
  education_level: string;
  occupation: string;
  socioeconomic_status: string;
}

interface Question {
  id: string;
  text: string;
  note?: string;
}

interface QuestionnaireData {
  wemwbs?: { items?: Question[]; scale_labels: string[]; scale_range: [number, number] };
  pss?: { items?: Question[]; scale_labels: string[]; scale_range: [number, number] };
  mbi?: { sections?: { A?: { items?: Question[] } }; scale_labels: string[]; scale_range: [number, number] };
  wrqol?: { items?: Question[]; overall_indicator?: Question; scale_labels: string[]; scale_range: [number, number] };
}

const PHASE_CONFIG: Record<Phase, PhaseConfig> = {
  1: { name: 'Employee Mental Health & Wellbeing', context: 'wellbeing', section: 'wemwbs', key: 'items' },
  2: { name: 'Perceived Stress', context: 'stress', section: 'pss', key: 'items' },
  3: { name: 'Burnout — Emotional Exhaustion', context: 'burnout', section: 'mbi', mbiSection: 'A', key: 'items' },
  4: { name: 'Quality of Working Life', context: 'wrqol', section: 'wrqol', key: 'items' },
  5: { name: 'Visual Pattern Search Task', context: 'cognitive_game' },
  6: { name: 'Symbol-Number Association Task', context: 'cognitive_game' },
  7: { name: 'Imagination Power Test', context: 'cognitive_game' },
};

const TOTAL_PHASES = 7;

const GAME_COMPONENTS: Record<number, React.ComponentType<any>> = {
  5: SymbolGame,
  6: CodeNumberGame,
  7: StoryCardGame,
};

const MODULE_INSTRUCTIONS: Record<Phase, { title: string; text: string }> = {
  1: {
    title: "Employee Mental Health & Wellbeing",
    text: "In this module, you will read a series of statements about your thoughts and feelings. Please select the option that best describes your experience over the past 2 weeks. There are no right or wrong answers—just be as honest as possible."
  },
  2: {
    title: "Perceived Stress",
    text: "This module asks about your feelings and thoughts during the last month. You will be asked to indicate how often you felt or thought a certain way. Try not to overthink your answers; your initial gut reaction is usually the best."
  },
  3: {
    title: "Burnout & Emotional Exhaustion",
    text: "This section explores your relationship with your work. You will rate how frequently you experience certain feelings related to workplace stress and emotional exhaustion."
  },
  4: {
    title: "Quality of Working Life",
    text: "Here, you will reflect on your current work-life balance, job satisfaction, and overall wellness. Please indicate how much you agree or disagree with each statement."
  },
  5: {
    title: "Visual Pattern Search Task",
    text: "In this cognitive game, you will be shown a target pattern. Your goal is to quickly locate and select the matching pattern from the options provided. Both speed and accuracy are important."
  },
  6: {
    title: "Symbol-Number Association Task",
    text: "This task tests your processing speed. A key mapping numbers to symbols will be displayed. When a number appears, you must rapidly select the corresponding symbol. Work as quickly and accurately as possible."
  },
  7: {
    title: "Imagination Power Test",
    text: "You will be presented with a series of ambiguous images. For each image, use your imagination to write a short story. Describe what is happening in the picture, what led up to the event, what the characters are feeling, and what the outcome will be."
  }
};

export const AnonymousEMHWAssessment = ({
  token,
  validation,
  onComplete
}: {
  token: string;
  validation: any;
  onComplete: () => void;
}) => {
  const [questions, setQuestions] = useState<QuestionnaireData | null>(null);
  const [] = useState<string | null>(String(validation.assessment_id));
  const [phase, setPhase] = useState<Phase>(1);
  const [qIndex, setQIndex] = useState(0);
  const [responses, setResponses] = useState<Array<{ question_id: string; score: number }>>([]);
  const [gameMetrics, setGameMetrics] = useState<GameMetrics[]>([]);
  const [storyAssessments, setStoryAssessments] = useState<StoryAssessment[]>([]);
  const [patientContext, setPatientContext] = useState<PatientContext>({
    age: 30,
    gender: 'Male',
    living_condition: 'Neutral',
    family_structure: 'Nuclear Family',
    residence_type: 'Urban',
    environment_type: 'Neutral',
    education_level: 'Graduate',
    occupation: 'Professional',
    socioeconomic_status: 'Middle'
  });
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [isIntermission, setIsIntermission] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);
  const [pendingSubmitAction, setPendingSubmitAction] = useState<(() => void) | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(5);
  const [isSubmittingData, setIsSubmittingData] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const initialized = useRef(false);

  // Removed useSessionStore
  const setTopbarBackOverride = useUIStore(state => state.setTopbarBackOverride);

  useEffect(() => {
    if (qIndex > 0 && phase >= 1 && phase <= 4) {
      setTopbarBackOverride(() => {
        setQIndex(qIndex - 1);
        setSelectedScore(null);
      });
    } else {
      setTopbarBackOverride(null);
    }
    return () => setTopbarBackOverride(null);
  }, [qIndex, phase, setTopbarBackOverride]);

  // Auto-submit countdown when time expires on timed modules
  useEffect(() => {
    if (!isTimeUp || !isConfirmingSubmit) return;
    if (autoSubmitCountdown <= 0) {
      setIsConfirmingSubmit(false);
      setIsTimeUp(false);
      if (pendingSubmitAction) {
        pendingSubmitAction();
        setPendingSubmitAction(null);
      }
      return;
    }
    const timer = setTimeout(() => setAutoSubmitCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [isTimeUp, isConfirmingSubmit, autoSubmitCountdown, pendingSubmitAction]);

  const speakText = (textId: string) => {
    try {
      globalAudioPlayer.play(`/audio/screening/${textId}.mp3`);
    } catch (err) {
      console.debug("Audio play failed:", err);
    }
  };

  // Stop any playing audio when the component unmounts
  useEffect(() => {
    return () => {
      globalAudioPlayer.stop();
    };
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        const qData = await apiClient.get<QuestionnaireData>(`/anonymous/${token}/screening-questions`);
        setQuestions(qData.data);
      } catch (err: any) {
        console.error("Failed to init assessment", err);
        toast.error("Failed to initialize the assessment environment.");
      }
    };
    init();
  }, [token]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isIntermission && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      if (countdown <= 3 && countdown > 0) {
        speakText(`countdown_${countdown}`);
      }
    } else if (isIntermission && countdown === 0) {
      setIsIntermission(false);
      setPhase((prev) => (prev + 1) as Phase);
      setShowInstructions(true);
    }
    return () => clearTimeout(timer);
  }, [isIntermission, countdown]);

  useEffect(() => {
    if (showInstructions && !isIntermission) {
      const info = MODULE_INSTRUCTIONS[phase];
      if (info) {
        speakText(`phase_${phase}`);
      }
    } else {
      // Nothing needed here since audio instances complete naturally
    }
  }, [showInstructions, phase, isIntermission]);

  if (!questions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground font-medium font-['Inter']">Initializing environment...</p>
        </div>
      </div>
    );
  }

  const startIntermission = () => {
    setIsIntermission(true);
    setCountdown(10);
    // Removed random phrase read aloud per user request
  };

  const getQuestionList = (): Question[] => {
    const cfg = PHASE_CONFIG[phase];
    if (!cfg || !cfg.section) return [];
    const sectionData = questions[cfg.section as keyof QuestionnaireData];
    if (!sectionData) return [];

    if (cfg.mbiSection) {
      const sec = (sectionData as any).sections?.[cfg.mbiSection];
      return sec?.items || [];
    }

    let items = (sectionData as any).items || [];
    if (cfg.section === 'wrqol' && (sectionData as any).overall_indicator) {
      items = [...items, (sectionData as any).overall_indicator];
    }
    return items;
  };

  const getScaleLabels = (): string[] => {
    const cfg = PHASE_CONFIG[phase];
    if (!cfg?.section) return [];
    return (questions[cfg.section as keyof QuestionnaireData] as any)?.scale_labels || [];
  };

  const getScaleRange = (): [number, number] => {
    const cfg = PHASE_CONFIG[phase];
    if (!cfg?.section) return [0, 4];
    return (questions[cfg.section as keyof QuestionnaireData] as any)?.scale_range || [0, 4];
  };

  const currentQList = getQuestionList();
  const labels = getScaleLabels();
  const scaleRange = getScaleRange();
  const phaseInfo = PHASE_CONFIG[phase];
  const insightContext = phaseInfo?.context || 'general';

  const handleAnswerClick = (score: number) => {
    setSelectedScore(score);
    setTimeout(() => {
      const q = currentQList[qIndex];
      // Update responses: replace if exists, otherwise append
      setResponses(prev => {
        const existingIndex = prev.findIndex(r => r.question_id === q.id);
        if (existingIndex >= 0) {
          const newResponses = [...prev];
          newResponses[existingIndex] = { question_id: q.id, score };
          return newResponses;
        }
        return [...prev, { question_id: q.id, score }];
      });
      setSelectedScore(null);

      if (qIndex < currentQList.length - 1) {
        setQIndex(qIndex + 1);
      } else {
        // Show confirmation dialog before going to intermission
        setPendingSubmitAction(() => () => {
          setQIndex(0);
          startIntermission();
        });
        setIsConfirmingSubmit(true);
      }
    }, 400);
  };


  const handleGameComplete = async (metrics: GameMetrics) => {
    const timeUp = !!metrics.timeExpired;
    // Show confirmation dialog before completing game
    setPendingSubmitAction(() => async () => {
      if (metrics.story_assessments) {
        setStoryAssessments(metrics.story_assessments);
      }
      if (metrics.patient_context) {
        setPatientContext(metrics.patient_context);
      }

      const newMetrics = [...gameMetrics, {
        game_type: metrics.game_type,
        score: metrics.score,
        movement_count: metrics.movement_count,
        completion_time_seconds: metrics.completion_time_seconds,
      }];
      setGameMetrics(newMetrics);

      if (phase < TOTAL_PHASES) {
        startIntermission();
      } else {
        setIsSubmittingData(true);
        try {
          const first_name = validation.patient?.first_name || "Anonymous";
          const last_name = validation.patient?.last_name || "";
          const email = validation.patient?.email || "";

          await apiClient.post(`/anonymous/submit/${token}`, {
            first_name,
            last_name,
            email,
            responses: {
              patient_context: metrics.patient_context || patientContext,
              questionnaire_responses: responses,
              game_metrics: newMetrics,
              story_assessments: metrics.story_assessments || storyAssessments,
            }
          });
          toast.success("Assessment submitted successfully.");
          setIsSubmittingData(false);
          setIsCompleted(true);
          onComplete();
        } catch (err: any) {
          console.error("Failed to complete", err);
          toast.error("Failed to submit assessment results.");
          setIsSubmittingData(false);
        }
      }
    });
    setIsTimeUp(timeUp);
    setAutoSubmitCountdown(5);
    setIsConfirmingSubmit(true);
  };

  const renderQuestionnaire = () => {
    if (!currentQList.length) return null;
    const q = currentQList[qIndex];
    const totalQuestions = currentQList.length;
    const progress = (qIndex / totalQuestions) * 100;
    const isOverallIndicator = !!q.note;

    // Find if already answered
    const existingResponse = responses.find(r => r.question_id === q.id);
    const activeScore = selectedScore !== null ? selectedScore : existingResponse?.score;

    return (
      <div className="max-w-3xl mx-auto pt-6 pb-12">
        <div className="mb-8">
          <h2 className="text-muted-foreground text-sm font-medium tracking-widest uppercase mb-2">
            Module {phase} / {TOTAL_PHASES}
          </h2>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{phaseInfo?.name}</h1>
        </div>

        <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="w-full bg-muted h-1.5">
            <div className="bg-primary h-1.5 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>

          <div className="p-8 md:p-10">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted px-3 py-1 rounded-md">
                Drafting Profile
              </span>
              <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                {qIndex + 1} of {totalQuestions}
              </span>
            </div>

            <h3 className="text-xl font-bold text-foreground mb-2 leading-relaxed">{q.text}</h3>
            {isOverallIndicator && (
              <p className="text-xs text-amber-600 mb-6 font-medium bg-amber-50 inline-block px-2 py-1 rounded">Overall Indicator — Non-Scoring Item</p>
            )}

            <div className="mt-8 space-y-3">
              {labels.map((label, i) => {
                const score = scaleRange[0] + i;
                const isSelected = activeScore === score;
                return (
                  <button key={i} onClick={() => handleAnswerClick(score)}
                    className={`w-full flex items-center p-4 rounded-xl border text-left transition-all duration-200 group
                      ${isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-background hover:border-primary/50 hover:shadow-sm'
                      }`}>
                    <div className={`w-6 h-6 shrink-0 rounded flex items-center justify-center mr-4 transition-colors
                      ${isSelected
                        ? 'bg-primary border-primary'
                        : 'border-2 border-muted-foreground/30 group-hover:border-primary/50'
                      }`}>
                      {isSelected && <Check size={14} className="text-primary-foreground" strokeWidth={3} />}
                    </div>
                    <div className="flex-1">
                      <span className={`font-semibold ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                        {label}
                      </span>
                    </div>
                    <div className={`text-xs font-mono font-bold bg-muted px-2 py-1 rounded
                      ${isSelected ? 'text-primary bg-primary/20' : 'text-muted-foreground'}`}>
                      {score}
                    </div>
                  </button>
                );
              })}
            </div>
            {pendingSubmitAction && !isConfirmingSubmit && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setIsConfirmingSubmit(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:scale-105 active:scale-95"
                >
                  Submit Module <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGame = () => {
    const GameComponent = GAME_COMPONENTS[phase];
    if (!GameComponent) return null;

    return (
      <div className="max-w-[1000px] mx-auto pt-6 pb-12">
        <div className="mb-8">
          <h2 className="text-muted-foreground text-sm font-medium tracking-widest uppercase mb-2">
            Module {phase} / {TOTAL_PHASES}
          </h2>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{phaseInfo?.name}</h1>
        </div>

        <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="w-full bg-muted h-1.5">
            <div className="bg-primary h-1.5 w-full" />
          </div>
          <div className="p-2 md:p-6 bg-muted/10">
            <GameComponent onComplete={handleGameComplete} />
          </div>
        </div>
        {pendingSubmitAction && !isConfirmingSubmit && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setIsConfirmingSubmit(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95"
            >
              Submit Module <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderInstructions = () => {
    const info = MODULE_INSTRUCTIONS[phase];
    if (!info) return null;

    return (
      <div className="flex-1 max-w-3xl w-full mx-auto flex flex-col items-center justify-center text-center py-12">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
          <BookOpen size={32} />
        </div>
        <h2 className="text-muted-foreground text-sm font-bold tracking-widest uppercase mb-2">Module {phase} / {TOTAL_PHASES}</h2>
        <h1 className="text-4xl font-black text-foreground mb-6">{info.title} Instructions</h1>
        <div className="bg-card p-8 rounded-2xl shadow-sm border border-border text-lg text-card-foreground leading-relaxed max-w-2xl">
          {info.text}
        </div>
        <div className="mt-10 flex gap-4">
          <button onClick={() => setShowInstructions(false)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-full font-bold text-lg 
            flex items-center gap-2 shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95">
            Start Module <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-['Inter',sans-serif] p-4 md:p-8 animate-in fade-in duration-500 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <img src="/psyichub-logo-v2.png" alt="PsyicHub" className="h-10 w-auto object-contain dark:filter-none" style={{ filter: "brightness(0) saturate(100%) invert(33%) sepia(43%) saturate(935%) hue-rotate(70deg) brightness(100%) contrast(83%)" }} />
      </div>

      {isCompleted ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-500 max-w-xl w-full shadow-sm">
            <Check size={64} className="text-green-500 mb-6" />
            <h2 className="text-3xl font-bold text-foreground mb-4">Assessment Completed</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Your responses have been saved and queued for analysis. Your assessment assignee will soon receive your reports. You may now close this window.
            </p>
          </div>
        </div>
      ) : isSubmittingData ? (
        <div className="flex-1 flex items-center justify-center flex-col space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_15px_rgba(var(--primary),0.3)]"></div>
          <h2 className="text-3xl font-bold text-foreground">Saving Responses...</h2>
          <p className="text-muted-foreground text-center max-w-md text-lg">Please wait while we securely save your data.</p>
        </div>
      ) : isIntermission ? (
        <div className="flex-1 flex items-center justify-center flex-col space-y-6">
          <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center shadow-lg border-4 border-primary/20 relative">
            <div className="absolute inset-0 rounded-full animate-ping bg-primary/30 opacity-20"></div>
            <Mic size={32} className="text-primary animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Preparing Next Module...</h2>
          <div className="text-8xl font-black text-primary tabular-nums tracking-tighter">
            {countdown}
          </div>
        </div>
      ) : showInstructions ? (
        renderInstructions()
      ) : (
        <div className="max-w-4xl mx-auto h-full w-full pt-4 relative">
          {phase >= 1 && phase <= 4 && renderQuestionnaire()}
          {phase >= 5 && phase <= 7 && renderGame()}

          <div className="fixed bottom-6 right-6 z-50 pointer-events-none max-w-sm">
            <div className="pointer-events-auto shadow-2xl rounded-xl">
              <LlmInsightBanner context={insightContext} intervalMs={30000} />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmingSubmit} onOpenChange={(open) => {
        if (!open && isTimeUp) return;
        setIsConfirmingSubmit(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isTimeUp ? "⏰ Time's up!" : "Are you sure?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isTimeUp
                ? `These results will be auto-submitted in ${autoSubmitCountdown} second${autoSubmitCountdown !== 1 ? 's' : ''}...`
                : "You are about to submit the results for this module. Make sure you are satisfied with your responses before proceeding."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!isTimeUp && (
              <AlertDialogCancel onClick={() => {
                setIsConfirmingSubmit(false);
              }}>
                Cancel
              </AlertDialogCancel>
            )}
            <AlertDialogAction onClick={() => {
              setIsConfirmingSubmit(false);
              setIsTimeUp(false);
              if (pendingSubmitAction) {
                pendingSubmitAction();
                setPendingSubmitAction(null);
              }
            }}>
              Submit Module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Replaced default export with named export