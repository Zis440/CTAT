import React, { useRef, useState } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';

interface SimilaritiesGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
  }) => void;
}

const ITEMS = [
  { words: ['Dog', 'Lion'], options: ['Both are animals', 'Both have wings', 'Both live in water', 'Both are plants'], correct: 0 },
  { words: ['Piano', 'Drum'], options: ['Both are weapons', 'Both are musical instruments', 'Both are vehicles', 'Both are tools'], correct: 1 },
  { words: ['Shirt', 'Jacket'], options: ['Both are furniture', 'Both are buildings', 'Both are clothing', 'Both are foods'], correct: 2 },
  { words: ['Poem', 'Novel'], options: ['Both are machines', 'Both are sports', 'Both are dances', 'Both are forms of literature'], correct: 3 },
  { words: ['Mountain', 'Lake'], options: ['Both are geographic features', 'Both are buildings', 'Both are animals', 'Both are foods'], correct: 0 },
  { words: ['Anger', 'Joy'], options: ['Both are colours', 'Both are emotions', 'Both are shapes', 'Both are sounds'], correct: 1 },
  { words: ['Democracy', 'Monarchy'], options: ['Both are religions', 'Both are sports', 'Both are forms of government', 'Both are dances'], correct: 2 },
  { words: ['Enzyme', 'Hormone'], options: ['Both are metals', 'Both are planets', 'Both are buildings', 'Both are biological substances'], correct: 3 },
  { words: ['Liberty', 'Justice'], options: ['Both are fundamental principles', 'Both are animals', 'Both are tools', 'Both are diseases'], correct: 0 },
  { words: ['Empathy', 'Compassion'], options: ['Both are chemicals', 'Both involve understanding others\' feelings', 'Both are musical genres', 'Both are weather patterns'], correct: 1 },
];

const SimilaritiesGame: React.FC<SimilaritiesGameProps> = ({ onComplete }) => {
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
    onComplete({ game_type: 'SI', score: rawScoreRef.current, movement_count: movementRef.current, completion_time_seconds: 180 });
  });

  const handleFinish = () => {
    onComplete({ game_type: 'SI', score: rawScore, movement_count: movementCount, completion_time_seconds: timeElapsed });
  };

  const handleAnswer = (optionIdx: number) => {
    const correct = optionIdx === ITEMS[currentIdx].correct;
    if (correct) {
      setRawScore(prev => prev + 1);
      setConsecutiveFails(0);
    } else {
      setConsecutiveFails(prev => prev + 1);
    }
    setFeedback(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setFeedback(null);
      if (consecutiveFails + (correct ? 0 : 1) >= 3 || currentIdx >= ITEMS.length - 1) {
        handleFinish();
      } else {
        setCurrentIdx(prev => prev + 1);
      }
    }, 800);
  };

  const item = ITEMS[currentIdx];

  return (
    <div ref={containerRef} className="space-y-5">
      <h3 className="text-lg font-bold">Conceptual Relationship Assessment</h3>
      <p className="text-slate-600 text-sm">How are these two things alike? Select the best answer.</p>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-3">How are these alike?</div>
        <div className="text-3xl font-black text-slate-800">
          {item.words[0]} <span className="text-blue-400 text-xl mx-3">&</span> {item.words[1]}
        </div>
      </div>

      <div className="space-y-3">
        {item.options.map((opt, i) => (
          <button key={i} onClick={() => handleAnswer(i)} disabled={feedback !== null}
            className={`w-full text-left px-6 py-4 rounded-xl border transition-all duration-200 font-medium
              ${feedback !== null && i === item.correct ? 'border-green-400 bg-green-50 text-green-700' :
                feedback === 'wrong' && i !== item.correct ? 'border-slate-200 text-slate-400' :
                  'border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 active:scale-[0.98]'}`}
          >
            <span className="inline-flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-400">{String.fromCharCode(65 + i)}</span>
              {opt}
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="text-sm text-slate-500 space-x-3">
          <span>Score: <strong className="text-slate-700">{rawScore}</strong></span>
          <span>Item: <strong className="text-slate-700">{currentIdx + 1}/{ITEMS.length}</strong></span>
          <span>Time Left: <strong className={`${timeLeft <= 15 ? 'text-red-600' : 'text-slate-700'}`}>{timeLeft}s</strong></span>
        </div>

      </div>
    </div>
  );
};

export default SimilaritiesGame;
