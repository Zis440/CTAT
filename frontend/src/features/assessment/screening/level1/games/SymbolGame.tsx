import React, { useRef, useState, useCallback } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';
import { Play } from 'lucide-react';

interface SymbolGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
    timeExpired?: boolean;
    advanced_metrics: {
      correct: number;
      wrong: number;
      fatigueIndex: number;
      averageLatencyMs: number;
      highestDifficultyReached: number;
    };
  }) => void;
}

interface Trial {
  targets: string[];
  searchSymbols: string[];
  hasMatch: boolean;
}

const SYMBOLS_EASY = ['★', '☀', '☁', '☂', '☃', '☄', '♠', '♣', '♥', '♦', '⚡', '⚙', '✿', '⬟', '◎', '◮', '◑', '◒', '⊕'];
const SYMBOLS_HARD = ['b', 'd', 'p', 'q', '6', '9', 'u', 'n', 'W', 'M', 'O', '0', 'I', 'l', '1', 'C', 'G'];

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < n; i++) {
    if (copy.length === 0) break;
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function generateTrial(difficultyLevel: number): Trial {
  const pool = difficultyLevel === 3 ? SYMBOLS_HARD : SYMBOLS_EASY;
  const numDistractors = difficultyLevel >= 2 ? 7 : 5;

  const targets = pickRandom(pool, 2);
  const hasMatch = Math.random() > 0.5;

  let searchSymbols: string[];
  if (hasMatch) {
    const matchTarget = targets[Math.floor(Math.random() * 2)];
    const others = pickRandom(pool.filter(s => !targets.includes(s)), numDistractors - 1);
    searchSymbols = [...others, matchTarget].sort(() => Math.random() - 0.5);
  } else {
    searchSymbols = pickRandom(pool.filter(s => !targets.includes(s)), numDistractors);
  }

  return { targets, searchSymbols, hasMatch };
}

const TOTAL_ITEMS = 100;

const SymbolGame: React.FC<SymbolGameProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { movementCount } = useMovementCounter(containerRef);

  const [hasStarted, setHasStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const [difficulty, setDifficulty] = useState(1);
  const [recentAccuracy, setRecentAccuracy] = useState<boolean[]>([]);

  const [currentTrial, setCurrentTrial] = useState<Trial>(() => generateTrial(1));

  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [score, setScore] = useState(0);
  const [metrics, setMetrics] = useState<Array<{
    index: number;
    difficulty: number;
    isCorrect: boolean;
    latencyMs: number;
  }>>([]);
  const lastActionTime = useRef(Date.now());

  const handleFinish = useCallback((_forced = false, elapsed = 120) => {
    if (!finished) {
      setFinished(true);

      const blockSize = Math.max(1, Math.floor(metrics.length / 4));
      const blocks: number[] = [];
      for (let i = 0; i < 4; i++) {
        const blockMetrics = metrics.slice(i * blockSize, (i + 1) * blockSize);
        const avgLat = blockMetrics.reduce((a, b) => a + b.latencyMs, 0) / (blockMetrics.length || 1);
        blocks.push(avgLat);
      }

      const fatigueIndex = blocks[0] > 0 ? ((blocks[3] - blocks[0]) / blocks[0]) * 100 : 0;

      onComplete({
        game_type: 'SS',
        score: score,
        movement_count: movementCount,
        completion_time_seconds: elapsed,
        timeExpired: _forced,
        advanced_metrics: {
          correct,
          wrong,
          fatigueIndex: Math.round(fatigueIndex),
          averageLatencyMs: Math.round(metrics.reduce((a, b) => a + b.latencyMs, 0) / (metrics.length || 1)),
          highestDifficultyReached: difficulty
        }
      });
    }
  }, [finished, correct, wrong, metrics, movementCount, difficulty, onComplete]);

  const { timeLeft, timeElapsed } = useTimer(hasStarted, 120, () => {
    handleFinish(true, 120);
  });

  const handleResponse = (selectedSymbol: string | null, isNoButton: boolean) => {
    if (!hasStarted || finished) return;

    const now = Date.now();
    const latency = now - lastActionTime.current;
    lastActionTime.current = now;

    let isCorrect = false;
    if (isNoButton) {
      isCorrect = !currentTrial.hasMatch;
    } else {
      isCorrect = selectedSymbol !== null && currentTrial.targets.includes(selectedSymbol);
    }

    if (isCorrect) setCorrect(p => p + 1);
    else setWrong(p => p + 1);
    
    setScore(p => Math.max(0, p + (isCorrect ? 1 : -1)));

    const newRecent = [...recentAccuracy, isCorrect].slice(-5);
    setRecentAccuracy(newRecent);

    let nextDifficulty = difficulty;
    if (newRecent.length === 5) {
      const acc = newRecent.filter(x => x).length;
      if (acc >= 4 && difficulty < 3) {
        nextDifficulty++;
        setRecentAccuracy([]);
      } else if (acc <= 2 && difficulty > 1) {
        nextDifficulty--;
        setRecentAccuracy([]);
      }
    }
    setDifficulty(nextDifficulty);

    setMetrics(prev => [...prev, {
      index: currentIndex,
      difficulty: nextDifficulty,
      isCorrect,
      latencyMs: latency
    }]);

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    if (nextIndex >= TOTAL_ITEMS) {
      handleFinish(false, timeElapsed);
    } else {
      setCurrentTrial(generateTrial(nextDifficulty));
    }
  };

  const handleStart = () => {
    setHasStarted(true);
    lastActionTime.current = Date.now();
  };

  if (!hasStarted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
        <h2 className="text-2xl font-black text-foreground tracking-wider">Visual Pattern Search Task</h2>
        <p className="text-muted-foreground max-w-md leading-relaxed">
          Does either target symbol on the left appear in the search group on the right?
          If yes, tap the matching symbol. If no, tap <strong>NO</strong>. Work as fast as you can.
        </p>
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl text-primary text-sm font-medium">
          Time limit: 120 Seconds • Errors subtract points
        </div>
        <button onClick={handleStart} className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:-translate-y-1">
          <Play fill="currentColor" /> Begin Task
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-5 select-none flex flex-col h-full">
      <div className="flex flex-col bg-card p-4 rounded-xl shadow-sm border border-border">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="font-bold text-card-foreground">Visual Pattern Search</h3>
            <p className="text-xs text-muted-foreground font-mono">Lvl {difficulty} Adapt</p>
          </div>
          <div className={`font-mono text-2xl font-black ${timeLeft <= 15 ? 'text-red-500 animate-pulse scale-110 transition-transform' : 'text-foreground'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 15 ? 'bg-red-500' : timeLeft <= 60 ? 'bg-amber-400' : 'bg-emerald-500'}`}
            style={{ width: `${(timeLeft / 120) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <div className="flex flex-col md:flex-row items-center gap-8 bg-card p-8 rounded-3xl shadow-lg border border-border">

          <div className="bg-muted/50 border border-border rounded-2xl p-4 flex gap-4 shadow-inner">
            {currentTrial.targets.map((sym, i) => (
              <div key={`target-${i}`} className="bg-background text-5xl p-2 rounded-xl border border-border w-20 h-20 flex items-center justify-center font-serif text-foreground shadow-sm">
                {sym}
              </div>
            ))}
          </div>

          <div className="text-muted-foreground/30 font-black text-3xl hidden md:block">|</div>

          <div className="flex flex-wrap justify-center gap-3">
            {currentTrial.searchSymbols.map((sym, i) => (
              <button
                key={`search-${i}`}
                onClick={() => handleResponse(sym, false)}
                className="bg-background text-4xl p-2 rounded-xl border-2 border-border w-16 h-16 md:w-20 md:h-20 flex items-center justify-center transition-all cursor-pointer shadow-sm hover:border-primary hover:bg-primary/10 hover:scale-105 active:scale-95 font-serif text-foreground"
              >
                {sym}
              </button>
            ))}

            <button
              onClick={() => handleResponse(null, true)}
              className="ml-2 md:ml-4 text-xl font-black p-2 rounded-xl border-2 border-border w-16 h-16 md:w-20 md:h-20 flex items-center justify-center transition-all cursor-pointer shadow-sm bg-muted/50 text-muted-foreground hover:border-red-400 hover:bg-red-50 hover:text-red-600 hover:scale-105 active:scale-95"
            >
              NO
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border mt-auto shrink-0">
        <div className="text-sm text-muted-foreground space-x-4 flex-wrap flex">
          <span>Trial: <strong className="text-foreground">{Math.min(currentIndex + 1, TOTAL_ITEMS)} / {TOTAL_ITEMS}</strong></span>
          <span>Score: <strong className={score > 0 ? 'text-green-500' : 'text-foreground'}>
            {score}
          </strong></span>
          {(correct + wrong) > 0 && (
            <span>Accuracy: <strong className={`${
              (correct / (correct + wrong)) >= 0.7 ? 'text-green-500' :
              (correct / (correct + wrong)) >= 0.5 ? 'text-amber-400' : 'text-red-400'
            }`}>{Math.round((correct / (correct + wrong)) * 100)}%</strong></span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SymbolGame;