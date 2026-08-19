import React, { useRef, useState } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';

interface InformationGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
  }) => void;
}

const ITEMS = [
  { question: 'How many days are in a week?', options: ['5', '6', '7', '8'], correct: 2 },
  { question: 'What is the boiling point of water in degrees Celsius?', options: ['50', '100', '200', '150'], correct: 1 },
  { question: 'Which planet is closest to the Sun?', options: ['Venus', 'Earth', 'Mars', 'Mercury'], correct: 3 },
  { question: 'Who wrote Romeo and Juliet?', options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], correct: 1 },
  { question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], correct: 2 },
  { question: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], correct: 2 },
  { question: 'What is the chemical symbol for gold?', options: ['Gd', 'Go', 'Au', 'Ag'], correct: 2 },
  { question: 'How many bones are in the adult human body?', options: ['186', '196', '206', '216'], correct: 2 },
  { question: 'What gas do plants primarily absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correct: 2 },
  { question: 'Which ancient civilization built the pyramids of Giza?', options: ['Roman', 'Greek', 'Egyptian', 'Persian'], correct: 2 },
  { question: 'What is the speed of light approximately in km/s?', options: ['100,000', '200,000', '300,000', '400,000'], correct: 2 },
  { question: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], correct: 2 },
];

const InformationGame: React.FC<InformationGameProps> = ({ onComplete }) => {
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
    onComplete({ game_type: 'IN', score: rawScoreRef.current, movement_count: movementRef.current, completion_time_seconds: 180 });
  });

  const handleFinish = () => {
    onComplete({ game_type: 'IN', score: rawScore, movement_count: movementCount, completion_time_seconds: timeElapsed });
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
      <h3 className="text-lg font-bold">General Knowledge Assessment</h3>
      <p className="text-slate-600 text-sm">Answer each general knowledge question.</p>

      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6 text-center">
        <div className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-3">Question {currentIdx + 1}</div>
        <div className="text-xl font-bold text-slate-800">{item.question}</div>
      </div>

      <div className="space-y-3">
        {item.options.map((opt, i) => (
          <button key={i} onClick={() => handleAnswer(i)} disabled={feedback !== null}
            className={`w-full text-left px-6 py-4 rounded-xl border transition-all font-medium
              ${feedback !== null && i === item.correct ? 'border-green-400 bg-green-50 text-green-700' :
                'border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 text-slate-700'}`}>
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
          <span>Time: <strong className={`${timeLeft <= 15 ? 'text-red-600' : 'text-slate-700'}`}>{timeLeft}s</strong></span>
        </div>

      </div>
    </div>
  );
};

export default InformationGame;
