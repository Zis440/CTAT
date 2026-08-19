import React, { useRef, useState } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';

interface ArithmeticGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
  }) => void;
}

const ITEMS = [
  { question: 'If you have 3 apples and get 2 more, how many do you have?', answer: 5 },
  { question: 'What is 15 minus 7?', answer: 8 },
  { question: 'If 6 pencils cost 30 rupees, how much does 1 pencil cost?', answer: 5 },
  { question: 'A shirt costs 200 rupees. If it is 25% off, what is the discount amount?', answer: 50 },
  { question: 'If you drive 60 km/h for 2.5 hours, how many km do you travel?', answer: 150 },
  { question: 'What is 144 divided by 12?', answer: 12 },
  { question: 'A factory produces 480 items in 8 hours. How many per hour?', answer: 60 },
  { question: 'If 3/4 of a number is 36, what is the number?', answer: 48 },
  { question: 'A room is 5m long and 4m wide. What is its area in square meters?', answer: 20 },
  { question: 'If you invest 1000 at 10% simple interest, how much interest after 3 years?', answer: 300 },
  { question: 'What is 17 × 13?', answer: 221 },
  { question: 'A train travels 360 km in 4 hours. What is its speed in km/h?', answer: 90 },
];

const ArithmeticGame: React.FC<ArithmeticGameProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { movementCount } = useMovementCounter(containerRef);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [rawScore, setRawScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [consecutiveFails, setConsecutiveFails] = useState(0);

  const rawScoreRef = useRef(rawScore);
  rawScoreRef.current = rawScore;
  const movementRef = useRef(movementCount);
  movementRef.current = movementCount;

  const { timeLeft, timeElapsed } = useTimer(true, 180, () => {
    onComplete({ game_type: 'AR', score: rawScoreRef.current, movement_count: movementRef.current, completion_time_seconds: 180 });
  });

  const handleFinish = () => {
    onComplete({ game_type: 'AR', score: rawScore, movement_count: movementCount, completion_time_seconds: timeElapsed });
  };

  const handleSubmit = () => {
    const num = parseFloat(userAnswer);
    const correct = num === ITEMS[currentIdx].answer;
    if (correct) { setRawScore(prev => prev + 1); setConsecutiveFails(0); }
    else { setConsecutiveFails(prev => prev + 1); }
    setFeedback(correct ? 'correct' : 'wrong');

    setTimeout(() => {
      setFeedback(null);
      setUserAnswer('');
      if (consecutiveFails + (correct ? 0 : 1) >= 3 || currentIdx >= ITEMS.length - 1) { handleFinish(); }
      else { setCurrentIdx(prev => prev + 1); }
    }, 800);
  };

  const item = ITEMS[currentIdx];

  return (
    <div ref={containerRef} className="space-y-5">
      <h3 className="text-lg font-bold">Quantitative Reasoning Assessment</h3>
      <p className="text-slate-600 text-sm">Solve each problem mentally and type your answer. No calculator allowed.</p>

      <div className={`bg-amber-50 border rounded-xl p-6 text-center transition-all ${feedback === 'correct' ? 'border-green-400' : feedback === 'wrong' ? 'border-red-400' : 'border-amber-200'}`}>
        <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-3">Problem {currentIdx + 1}</div>
        <div className="text-xl font-bold text-slate-800 leading-relaxed">{item.question}</div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <input type="number" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && userAnswer && handleSubmit()} autoFocus
          className="w-40 text-center text-3xl font-bold px-4 py-3 border-2 border-amber-300 rounded-xl focus:border-amber-500 outline-none"
          placeholder="?" disabled={feedback !== null} />
        <button onClick={handleSubmit} disabled={!userAnswer || feedback !== null}
          className="bg-amber-600 text-white px-8 py-2 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50">
          Submit
        </button>
      </div>

      {feedback === 'wrong' && (
        <div className="text-center text-sm text-red-500">Correct answer: <strong>{ITEMS[currentIdx].answer}</strong></div>
      )}

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

export default ArithmeticGame;
