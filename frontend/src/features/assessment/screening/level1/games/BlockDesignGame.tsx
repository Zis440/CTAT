import React, { useRef, useState } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';

interface BlockDesignGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
  }) => void;
}

interface Pattern {
  grid: number;
  target: number[];
  label: string;
  timeBonus: number;
}

const PATTERNS: Pattern[] = [
  { grid: 2, target: [0, 1, 1, 0], label: 'Pattern 1', timeBonus: 30 },
  { grid: 2, target: [1, 0, 0, 1], label: 'Pattern 2', timeBonus: 30 },
  { grid: 2, target: [0, 0, 1, 1], label: 'Pattern 3', timeBonus: 30 },
  { grid: 3, target: [0, 1, 0, 1, 0, 1, 0, 1, 0], label: 'Pattern 4', timeBonus: 60 },
  { grid: 3, target: [1, 0, 1, 0, 1, 0, 1, 0, 1], label: 'Pattern 5', timeBonus: 60 },
  { grid: 3, target: [0, 0, 0, 1, 1, 1, 0, 0, 0], label: 'Pattern 6', timeBonus: 60 },
  { grid: 4, target: [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0], label: 'Pattern 7', timeBonus: 120 },
  { grid: 4, target: [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1], label: 'Pattern 8', timeBonus: 120 },
];

const BlockDesignGame: React.FC<BlockDesignGameProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { movementCount } = useMovementCounter(containerRef);
  const [currentPattern, setCurrentPattern] = useState(0);
  const [userGrid, setUserGrid] = useState<number[]>(
    () => new Array(PATTERNS[0].grid * PATTERNS[0].grid).fill(0)
  );
  const [rawScore, setRawScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [consecutiveFails, setConsecutiveFails] = useState(0);

  const rawScoreRef = useRef(rawScore);
  rawScoreRef.current = rawScore;
  const movementRef = useRef(movementCount);
  movementRef.current = movementCount;

  const { timeLeft, timeElapsed } = useTimer(true, 300, () => {
    onComplete({ game_type: 'BD', score: rawScoreRef.current, movement_count: movementRef.current, completion_time_seconds: 300 });
  });

  const handleFinish = () => {
    onComplete({ game_type: 'BD', score: rawScore, movement_count: movementCount, completion_time_seconds: timeElapsed });
  };

  const toggleCell = (idx: number) => {
    const newGrid = [...userGrid];
    newGrid[idx] = newGrid[idx] === 0 ? 1 : 0;
    setUserGrid(newGrid);
  };

  const handleSubmitPattern = () => {
    const pattern = PATTERNS[currentPattern];
    const correct = JSON.stringify(userGrid) === JSON.stringify(pattern.target);

    if (correct) {
      setRawScore(prev => prev + 1);
      setConsecutiveFails(0);
      setFeedback('correct');
    } else {
      setConsecutiveFails(prev => prev + 1);
      setFeedback('wrong');
    }

    setTimeout(() => {
      setFeedback(null);
      if (consecutiveFails + (correct ? 0 : 1) >= 2 || currentPattern >= PATTERNS.length - 1) {
        handleFinish();
      } else {
        const next = currentPattern + 1;
        setCurrentPattern(next);
        setUserGrid(new Array(PATTERNS[next].grid * PATTERNS[next].grid).fill(0));
      }
    }, 1000);
  };

  const pattern = PATTERNS[currentPattern];
  const gridSize = pattern.grid;

  return (
    <div ref={containerRef} className="space-y-5">
      <h3 className="text-lg font-bold">Spatial Construction Task</h3>
      <p className="text-slate-600 text-sm">
        Reproduce the target pattern by clicking cells to toggle their color. Red = filled, White = empty.
      </p>

      <div className="flex gap-8 justify-center items-start">

        <div>
          <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2 text-center">Target</div>
          <div className="inline-grid gap-1 border-2 border-blue-300 p-2 rounded-xl bg-blue-50" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
            {pattern.target.map((v, i) => (
              <div key={i} className="w-12 h-12 rounded border border-slate-200" style={{ backgroundColor: v ? '#ef4444' : '#ffffff' }} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Your Design</div>
          <div className={`inline-grid gap-1 border-2 p-2 rounded-xl ${feedback === 'correct' ? 'border-green-400 bg-green-50' : feedback === 'wrong' ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50'}`} style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
            {userGrid.map((v, i) => (
              <button key={i} onClick={() => toggleCell(i)} className={`w-12 h-12 rounded border border-slate-300 transition-all duration-150 hover:scale-105 cursor-pointer`} style={{ backgroundColor: v ? '#ef4444' : '#ffffff' }} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={handleSubmitPattern} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
          Check Pattern
        </button>
      </div>

      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="text-sm text-slate-500 space-x-3">
          <span>Score: <strong className="text-slate-700">{rawScore}</strong></span>
          <span>Pattern: <strong className="text-slate-700">{currentPattern + 1}/{PATTERNS.length}</strong></span>
          <span>Time Left: <strong className={`${timeLeft <= 30 ? 'text-red-600' : 'text-slate-700'}`}>{timeLeft}s</strong></span>
        </div>

      </div>
    </div>
  );
};

export default BlockDesignGame;
