import React, { useRef, useState } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';

interface VisualPuzzlesGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
  }) => void;
}

const ITEMS = [
  {
    puzzle: '▣', description: 'A complete square',
    options: [['◸', '◹'], ['◸', '△'], ['○', '□'], ['◹', '▽']],
    correct: 0
  },
  {
    puzzle: '⬡', description: 'A hexagon',
    options: [['△', '□'], ['◁', '▷', '□'], ['◸', '◹', '◻'], ['△', '▽', '□']],
    correct: 3
  },
  {
    puzzle: '◆', description: 'A diamond',
    options: [['◸', '◺'], ['▲', '▼'], ['◁', '▷'], ['△', '□']],
    correct: 1
  },
  {
    puzzle: '⬟', description: 'A pentagon',
    options: [['□', '△'], ['◸', '▽', '◹'], ['△', '◻'], ['▲', '□', '△']],
    correct: 0
  },
  {
    puzzle: '⏣', description: 'A complex shape',
    options: [['◁', '□', '▷'], ['△', '○', '□'], ['▲', '◻', '▽'], ['◸', '◹', '▽']],
    correct: 0
  },
  {
    puzzle: '⬢', description: 'A filled hexagon',
    options: [['▲', '□', '▽'], ['◁', '□', '▷'], ['△', '◻', '▼'], ['▲', '▼', '◁']],
    correct: 1
  },
];

const VisualPuzzlesGame: React.FC<VisualPuzzlesGameProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { movementCount } = useMovementCounter(containerRef);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [rawScore, setRawScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [consecutiveFails, setConsecutiveFails] = useState(0);

  const rawScoreRef = useRef(rawScore);
  rawScoreRef.current = rawScore;
  const movementRef = useRef(movementCount);
  movementRef.current = movementCount;

  const { timeLeft, timeElapsed } = useTimer(true, 180, () => {
    onComplete({ game_type: 'VP', score: rawScoreRef.current, movement_count: movementRef.current, completion_time_seconds: 180 });
  });

  const handleFinish = () => {
    onComplete({ game_type: 'VP', score: rawScore, movement_count: movementCount, completion_time_seconds: timeElapsed });
  };

  const handleAnswer = (optionIdx: number) => {
    const correct = optionIdx === ITEMS[currentIdx].correct;
    if (correct) { setRawScore(prev => prev + 1); setConsecutiveFails(0); }
    else { setConsecutiveFails(prev => prev + 1); }
    setFeedback(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setFeedback(null);
      if (consecutiveFails + (correct ? 0 : 1) >= 3 || currentIdx >= ITEMS.length - 1) handleFinish();
      else setCurrentIdx(prev => prev + 1);
    }, 800);
  };

  const item = ITEMS[currentIdx];

  return (
    <div ref={containerRef} className="space-y-5">
      <h3 className="text-lg font-bold">Visual Puzzles</h3>
      <p className="text-slate-600 text-sm">Which set of pieces can be assembled to form the target shape?</p>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 text-center">
        <div className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-2">Target Shape</div>
        <div className="text-7xl">{item.puzzle}</div>
        <div className="text-sm text-slate-500 mt-2">{item.description}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {item.options.map((opt, i) => (
          <button key={i} onClick={() => handleAnswer(i)} disabled={feedback !== null}
            className={`px-6 py-5 rounded-xl border text-center transition-all
              ${feedback !== null && i === item.correct ? 'border-green-400 bg-green-50' :
                'border-slate-200 bg-white hover:border-violet-400 hover:bg-violet-50'}`}>
            <div className="text-3xl tracking-wider">{opt.join(' + ')}</div>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="text-sm text-slate-500 space-x-3">
          <span>Score: <strong className="text-slate-700">{rawScore}</strong></span>
          <span>Item: <strong className="text-slate-700">{currentIdx + 1}/{ITEMS.length}</strong></span>
          <span>Time: <strong className={`${timeLeft <= 15 ? 'text-red-600' : 'text-slate-700'}`}>{timeLeft}s</strong></span>
        </div>

      </div>
    </div>
  );
};

export default VisualPuzzlesGame;
