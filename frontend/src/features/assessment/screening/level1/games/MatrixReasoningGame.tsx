import React, { useRef, useState } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';

interface MatrixReasoningGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
  }) => void;
}

const ITEMS = [
  { matrix: ['●', '●', '●', '●', '●', '?'], options: ['●', '○', '▲', '□'], correct: 0 },
  { matrix: ['▲', '○', '▲', '○', '▲', '?'], options: ['▲', '●', '○', '□'], correct: 2 },
  { matrix: ['□', '■', '□', '■', '□', '?'], options: ['○', '□', '■', '▲'], correct: 2 },
  { matrix: ['●○', '○●', '●○', '○●', '●○', '?'], options: ['●○', '○●', '●●', '○○'], correct: 1 },
  { matrix: ['1', '2', '3', '4', '5', '?'], options: ['7', '6', '8', '0'], correct: 1 },
  { matrix: ['A', 'C', 'E', 'G', 'I', '?'], options: ['J', 'K', 'L', 'M'], correct: 1 },
  { matrix: ['▲▲', '▲▲▲', '▲▲▲▲', '▲▲▲▲▲', '▲▲▲▲▲▲', '?'], options: ['▲▲▲▲▲', '▲▲▲▲▲▲▲', '▲▲▲', '▲▲'], correct: 1 },
  { matrix: ['2', '4', '8', '16', '32', '?'], options: ['48', '64', '128', '36'], correct: 1 },
  { matrix: ['●', '○○', '●●●', '○○○○', '●●●●●', '?'], options: ['●●●●●●', '○○○○○○', '●●●●', '○○○○○'], correct: 1 },
  { matrix: ['Z', 'Y', 'X', 'W', 'V', '?'], options: ['T', 'U', 'S', 'R'], correct: 1 },
];

const MatrixReasoningGame: React.FC<MatrixReasoningGameProps> = ({ onComplete }) => {
  const containerRef = useRef < HTMLDivElement > (null);
  const { movementCount } = useMovementCounter(containerRef);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [rawScore, setRawScore] = useState(0);
  const [feedback, setFeedback] = useState < string | null > (null);
  const [consecutiveFails, setConsecutiveFails] = useState(0);

  const rawScoreRef = useRef(rawScore);
  rawScoreRef.current = rawScore;
  const movementRef = useRef(movementCount);
  movementRef.current = movementCount;

  const { timeLeft, timeElapsed } = useTimer(true, 180, () => {
    onComplete({ game_type: 'MR', score: rawScoreRef.current, movement_count: movementRef.current, completion_time_seconds: 180 });
  });

  const handleFinish = () => {
    onComplete({ game_type: 'MR', score: rawScore, movement_count: movementCount, completion_time_seconds: timeElapsed });
  };

  const handleAnswer = (optionIdx: number) => {
    const correct = optionIdx === ITEMS[currentIdx].correct;
    if (correct) { setRawScore(prev => prev + 1); setConsecutiveFails(0); }
    else { setConsecutiveFails(prev => prev + 1); }
    setFeedback(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setFeedback(null);
      if (consecutiveFails + (correct ? 0 : 1) >= 3 || currentIdx >= ITEMS.length - 1) { handleFinish(); }
      else { setCurrentIdx(prev => prev + 1); }
    }, 800);
  };

  const item = ITEMS[currentIdx];

  return (
    <div ref={containerRef} className="space-y-5">
      <h3 className="text-lg font-bold">Abstract Pattern Reasoning Task</h3>
      <p className="text-slate-600 text-sm">Find the pattern and select what comes next.</p>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
        <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3 text-center">Pattern Sequence</div>
        <div className="flex gap-3 justify-center items-center flex-wrap">
          {item.matrix.map((cell, i) => (
            <div key={i} className={`px-4 py-3 rounded-lg text-2xl font-bold ${cell === '?' ? 'bg-amber-100 border-2 border-amber-400 text-amber-600 animate-pulse' : 'bg-white border border-indigo-200 text-slate-800'}`}>
              {cell}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {item.options.map((opt, i) => (
          <button key={i} onClick={() => handleAnswer(i)} disabled={feedback !== null}
            className={`px-6 py-4 rounded-xl border text-xl font-bold transition-all
              ${feedback !== null && i === item.correct ? 'border-green-400 bg-green-50 text-green-700' :
                'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 text-slate-700'}`}>
            {opt}
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

export default MatrixReasoningGame;