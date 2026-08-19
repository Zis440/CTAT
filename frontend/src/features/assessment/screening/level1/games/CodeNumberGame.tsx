import React, { useRef, useState, useCallback, useMemo } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';
import { Play } from 'lucide-react';

interface CodeNumberGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
    timeExpired?: boolean;
    advanced_metrics: {
      correct: number;
      wrong: number;
      omissions: number;
      learningEfficiency: number;
      averageLatencyMs: number;
      microMetrics: Array<{
        index: number;
        expected: string;
        selected: string;
        isCorrect: boolean;
        latencyMs: number;
      }>;
    };
  }) => void;
}

interface KeyItem {
  number: number;
  symbol: string;
}

const GENERATE_KEY = (): KeyItem[] => {
  const SYMBOLS = ['⊥', '⊣', 'Λ', '−', '∐', '⊢', '⸦', '⸢', '⸣'];
  const shuffled = [...SYMBOLS].sort(() => 0.5 - Math.random());
  return Array.from({ length: 9 }, (_, i) => ({
    number: i + 1,
    symbol: shuffled[i],
  }));
};

const TOTAL_ITEMS = 120;

const CodeNumberGame: React.FC<CodeNumberGameProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { movementCount } = useMovementCounter(containerRef);

  const [hasStarted, setHasStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const activeKey = useMemo(() => GENERATE_KEY(), []);

  const sequence = useMemo(() => {
    return Array.from({ length: TOTAL_ITEMS }, () => {
      const randomKey = activeKey[Math.floor(Math.random() * activeKey.length)];
      return { number: randomKey.number, expected: randomKey.symbol };
    });
  }, [activeKey]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<(string | null)[]>(Array(TOTAL_ITEMS).fill(null));

  const [metrics, setMetrics] = useState<Array<{
    index: number;
    expected: string;
    selected: string;
    isCorrect: boolean;
    latencyMs: number;
  }>>([]);
  const lastActionTime = useRef(Date.now());

  const PAGE_SIZE = 30;
  const currentPage = Math.floor(currentIndex / PAGE_SIZE);
  const visibleSequence = sequence.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleFinish = useCallback((_forced = false, elapsed = 120) => {
    if (!finished) {
      setFinished(true);

      let correct = 0;
      let wrong = 0;
      let omissions = 0;

      responses.forEach((resp, idx) => {
        if (idx < currentIndex) {
          if (resp === sequence[idx].expected) correct++;
          else wrong++;
        } else {
          omissions++;
        }
      });

      const latencies = metrics.map(m => m.latencyMs);
      const earlyLatency = latencies.slice(0, 20).reduce((a, b) => a + b, 0) / (Math.min(20, latencies.length) || 1);
      const lateLatency = latencies.slice(-20).reduce((a, b) => a + b, 0) / (Math.min(20, latencies.length) || 1);
      const learningEfficiency = earlyLatency > 0 ? ((earlyLatency - lateLatency) / earlyLatency) * 100 : 0;

      onComplete({
        game_type: 'CD',
        score: Math.max(0, correct - wrong),
        movement_count: movementCount,
        completion_time_seconds: elapsed,
        timeExpired: _forced,
        advanced_metrics: {
          correct,
          wrong,
          omissions,
          learningEfficiency: Math.round(learningEfficiency),
          averageLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1)),
          microMetrics: metrics
        }
      });
    }
  }, [finished, onComplete, responses, currentIndex, sequence, metrics, movementCount]);

  const { timeLeft, timeElapsed } = useTimer(hasStarted, 120, () => {
    handleFinish(true, 120);
  });

  const handleKeypadPress = (symbol: string) => {
    if (!hasStarted || finished || currentIndex >= TOTAL_ITEMS) return;

    const now = Date.now();
    const latency = now - lastActionTime.current;
    lastActionTime.current = now;

    const isCorrect = symbol === sequence[currentIndex].expected;

    setMetrics(prev => [...prev, {
      index: currentIndex,
      expected: sequence[currentIndex].expected,
      selected: symbol,
      isCorrect,
      latencyMs: latency
    }]);

    const newResponses = [...responses];
    newResponses[currentIndex] = symbol;
    setResponses(newResponses);

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    if (nextIndex >= TOTAL_ITEMS) {
      handleFinish(false, timeElapsed);
    }
  };

  const handleStart = () => {
    setHasStarted(true);
    lastActionTime.current = Date.now();
  };

  if (!hasStarted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
        <h2 className="text-2xl font-black text-foreground tracking-wider">Symbol-Number Association Task</h2>
        <p className="text-muted-foreground max-w-md leading-relaxed">
          You will see a key mapping numbers to symbols. Below it is a grid of numbers with empty boxes.
          Tap the correct symbol on the keypad for the highlighted box. Work as quickly and accurately as you can.
        </p>
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl text-primary text-sm font-medium">
          Time limit: 120 Seconds
        </div>
        <button onClick={handleStart} className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:-translate-y-1">
          <Play fill="currentColor" /> Begin Task
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none flex flex-col w-full">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl shadow-sm border border-border shrink-0">
        <h3 className="font-bold text-card-foreground">Symbol-Number Association</h3>
        <div className={`font-mono text-xl font-black ${timeLeft <= 15 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="sticky top-0 bg-muted/50 border-2 border-border rounded-xl p-3 shadow-md z-10">
        <div className="flex justify-center gap-1 md:gap-3 flex-wrap">
          {activeKey.map((item) => (
            <div key={item.number} className="flex flex-col items-center border border-border bg-card w-10 md:w-16 rounded overflow-hidden">
              <div className="font-bold text-muted-foreground py-1 bg-muted w-full text-center border-b border-border text-sm md:text-base">{item.number}</div>
              <div className="text-lg md:text-2xl py-1 w-full text-center font-serif text-card-foreground">{item.symbol}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted/10 border border-border rounded-xl p-4 shadow-inner">
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {visibleSequence.map((item, localIdx) => {
            const globalIdx = currentPage * PAGE_SIZE + localIdx;
            const isActive = globalIdx === currentIndex;
            const isCompleted = globalIdx < currentIndex;
            const response = responses[globalIdx];

            return (
              <div
                key={globalIdx}
                className={`flex flex-col items-center border-2 rounded ${isActive ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30 ring-offset-1 transform scale-110 z-10 transition-all' :
                    isCompleted ? 'border-border bg-muted opacity-70' :
                      'border-border bg-background'
                  }`}
              >
                <div className={`w-full text-center py-1 font-bold border-b-2 ${isActive ? 'border-primary/30 text-primary' : 'border-border text-muted-foreground'}`}>
                  {item.number}
                </div>
                <div className="w-full h-8 md:h-10 flex items-center justify-center text-lg md:text-2xl font-serif text-foreground">
                  {response || ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-lg shrink-0">
        <div className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Input Keypad</div>
        <div className="flex justify-center gap-2 flex-wrap">
          {activeKey.map((item) => (
            <button
              key={`btn-${item.number}`}
              onClick={() => handleKeypadPress(item.symbol)}
              disabled={finished}
              className="bg-background text-foreground text-2xl md:text-3xl font-serif p-2 rounded-lg border-2 border-border w-14 h-14 md:w-20 md:h-20 flex items-center justify-center transition-all cursor-pointer shadow-sm hover:border-primary hover:bg-primary/10 hover:-translate-y-1 active:translate-y-1 active:shadow-none"
            >
              {item.symbol}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CodeNumberGame;
