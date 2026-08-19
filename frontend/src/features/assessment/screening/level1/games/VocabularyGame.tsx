import React, { useRef, useState } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';

interface VocabularyGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
  }) => void;
}

const ITEMS = [
  { word: 'Bed', options: ['A piece of furniture for sleeping', 'A type of vehicle', 'A musical instrument', 'A cooking utensil'], correct: 0 },
  { word: 'Clock', options: ['A writing tool', 'A device that tells time', 'A type of clothing', 'A building material'], correct: 1 },
  { word: 'Breakfast', options: ['An evening activity', 'A type of exercise', 'The first meal of the day', 'A cleaning product'], correct: 2 },
  { word: 'Transparent', options: ['Very heavy', 'Extremely loud', 'Brightly coloured', 'See-through; allowing light to pass'], correct: 3 },
  { word: 'Consume', options: ['To eat, drink, or use up', 'To build something', 'To travel quickly', 'To hide or conceal'], correct: 0 },
  { word: 'Reluctant', options: ['Eager to proceed', 'Unwilling or hesitant', 'Extremely happy', 'Physically strong'], correct: 1 },
  { word: 'Compassion', options: ['A type of competition', 'A scientific measurement', 'Sympathetic concern for others\' suffering', 'A mathematical formula'], correct: 2 },
  { word: 'Pragmatic', options: ['Highly theoretical', 'Extremely emotional', 'Very artistic', 'Dealing with things in a practical way'], correct: 3 },
  { word: 'Audacious', options: ['Showing a willingness to take bold risks', 'Extremely quiet and reserved', 'Related to hearing', 'Very slow-moving'], correct: 0 },
  { word: 'Ephemeral', options: ['Lasting forever', 'Lasting for a very short time', 'Related to the moon', 'Extremely heavy'], correct: 1 },
];

const VocabularyGame: React.FC<VocabularyGameProps> = ({ onComplete }) => {
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
    onComplete({ game_type: 'VC', score: rawScoreRef.current, movement_count: movementRef.current, completion_time_seconds: 180 });
  });

  const handleFinish = () => {
    onComplete({ game_type: 'VC', score: rawScore, movement_count: movementCount, completion_time_seconds: timeElapsed });
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
      <h3 className="text-lg font-bold">Verbal Knowledge Assessment</h3>
      <p className="text-slate-600 text-sm">Select the best definition for the word shown.</p>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Define this word</div>
        <div className="text-4xl font-black text-slate-800">{item.word}</div>
      </div>

      <div className="space-y-3">
        {item.options.map((opt, i) => (
          <button key={i} onClick={() => handleAnswer(i)} disabled={feedback !== null}
            className={`w-full text-left px-6 py-4 rounded-xl border transition-all duration-200 font-medium
              ${feedback !== null && i === item.correct ? 'border-green-400 bg-green-50 text-green-700' :
                'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700'}`}>
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

export default VocabularyGame;
