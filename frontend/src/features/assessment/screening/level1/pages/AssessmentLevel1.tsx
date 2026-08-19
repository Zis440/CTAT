import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { assessmentService } from '../services/api';
import LlmInsightBanner from '../components/LlmInsightBanner';
import SymbolGame from '../games/SymbolGame';
import CodeNumberGame from '../games/CodeNumberGame';
import StoryCardGame from '../games/StoryCardGame';
import { Check, ArrowRight, BookOpen, Mic, Loader2 } from 'lucide-react';
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
import { useSessionStore } from "@/store/useSessionStore";
import { useUIStore } from "@/store/useUIStore";
import { useQueryClient } from "@tanstack/react-query";
import { globalAudioPlayer } from "@/lib/audioPlayer";
import { useAuthStore } from "@/store/useAuthStore";
import { getDashboardRoute } from "@/lib/routeUtils";

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
  timeExpired?: boolean;
  story_assessments?: any[];
  patient_context?: PatientContext;
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

const AssessmentLevel1: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionnaireData | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
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
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
  const initialized = useRef(false);

  const patient = useSessionStore(state => state.patient);
  const setTopbarBackOverride = useUIStore(state => state.setTopbarBackOverride);
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

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

  useEffect(() => {
    if (!isConfirmingSubmit) return;
    if (!isTimeUp && phase !== 5 && phase !== 6) return;

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
  }, [isTimeUp, isConfirmingSubmit, autoSubmitCountdown, pendingSubmitAction, phase]);

  const speakText = (textId: string) => {
    try {
      globalAudioPlayer.play(`/audio/screening/${textId}.mp3`);
    } catch (err) {
      console.debug("Audio play failed:", err);
    }
  };

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
        const qData = await assessmentService.getQuestions() as QuestionnaireData;
        setQuestions(qData);
        const aData = await assessmentService.startAssessment(patient?.id) as { id: string };
        setAssessmentId(aData.id);
      } catch (err: any) {
        console.error("Failed to init assessment", err);
        if (err.response?.status === 402) {
          toast.error("Insufficient wallet balance to start screening assessment. Please recharge.");
          navigate(-1);
        } else {
          toast.error("Failed to initialize the assessment environment.");
        }
      }
    };
    init();
  }, []);

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
        setIsFinalSubmitting(true);
        try {
          await assessmentService.completeAssessment(assessmentId, {
            patient_context: metrics.patient_context || patientContext,
            questionnaire_responses: responses,
            game_metrics: newMetrics,
            story_assessments: metrics.story_assessments || storyAssessments,
            request_validation: useSessionStore.getState().requestPsychologistValidation,
          });
          toast.success("Screening Assessment completed successfully.");
          queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
          queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });

          const currentPath = window.location.pathname.replace(/\/$/, '');
          navigate(`${currentPath}/report/${assessmentId}`);
        } catch (err: any) {
          setIsFinalSubmitting(false);
          console.error("Failed to complete", err);
          if (err.response?.status === 402) {
            toast.error("Insufficient wallet balance to submit assessment. Please recharge.");
          } else {
            toast.error("Failed to submit assessment results.");
          }
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

        {phase === 1 && (
          <div className="mt-8 max-w-2xl bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-left">
            <input
              type="checkbox"
              id="disclaimer"
              checked={disclaimerAccepted}
              onChange={(e) => setDisclaimerAccepted(e.target.checked)}
              className="mt-1 w-5 h-5 text-primary border-amber-300 rounded focus:ring-primary"
            />
            <label htmlFor="disclaimer" className="text-sm font-medium text-amber-900 cursor-pointer">
              I understand that this screening tool is for informational and educational purposes only and is not a substitute for professional clinical diagnosis or treatment.
            </label>
          </div>
        )}

        <div className="mt-10 flex gap-4">
          <button
            onClick={() => setShowInstructions(false)}
            disabled={phase === 1 && !disclaimerAccepted}
            className={`px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 transition-all
              ${phase === 1 && !disclaimerAccepted
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 active:scale-95'}`}
          >
            Start Module <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="-m-4 md:-m-6 lg:-m-8 h-[calc(100vh-72px)] flex flex-col bg-background text-foreground font-['Inter',sans-serif] px-4 animate-in fade-in duration-500 overflow-y-auto overflow-x-hidden">
      {isIntermission ? (
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
      ) : isFinalSubmitting ? (
        <div className="flex-1 flex flex-col items-center justify-center p-24 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h3 className="text-xl font-medium tracking-tight">
            Processing Results...
          </h3>
          <p className="text-muted-foreground text-sm max-w-md text-center mt-2">
            Our AI is analyzing your assessment and generating your comprehensive report. This may take 1 to 2 minutes to synthesize all insights.
          </p>
          <p className="text-muted-foreground text-sm max-w-md text-center">
            You can safely navigate to the dashboard while the report generates in the background.
          </p>
          <div className="pt-6">
            <button
              onClick={() => navigate(getDashboardRoute(user?.role))}
              className="px-6 py-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md font-medium transition-colors text-sm shadow-sm"
            >
              Go to Dashboard
            </button>
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

      <AlertDialog open={isConfirmingSubmit} onOpenChange={(open) => {
        if (!open && (isTimeUp || phase >= 5)) return;
        setIsConfirmingSubmit(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTimeUp ? "⏰ Time's up!" : ((phase === 5 || phase === 6) ? "✅ Module Complete" : "Are you sure?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTimeUp
                ? `These results will be auto-submitted in ${autoSubmitCountdown} second${autoSubmitCountdown !== 1 ? 's' : ''}...`
                : ((phase === 5 || phase === 6)
                    ? `You have completed all items. Auto-submitting in ${autoSubmitCountdown} second${autoSubmitCountdown !== 1 ? 's' : ''}...`
                    : "You are about to submit the results for this module. Make sure you are satisfied with your responses before proceeding.")
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!isTimeUp && (phase < 5 || phase === 7) && (
              <AlertDialogCancel onClick={() => setIsConfirmingSubmit(false)}>Cancel</AlertDialogCancel>
            )}
            <AlertDialogAction onClick={() => {
              setIsConfirmingSubmit(false);
              setIsTimeUp(false);
              if (pendingSubmitAction) {
                pendingSubmitAction();
                setPendingSubmitAction(null);
              }
            }}>
              {isTimeUp || phase === 5 || phase === 6 ? "Submit Now" : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AssessmentLevel1;
