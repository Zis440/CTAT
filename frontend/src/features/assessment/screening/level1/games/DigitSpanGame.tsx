import React, { useRef, useState, useEffect, useCallback } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';

interface DigitSpanGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
  }) => void;
}

type Mode = 'Forward' | 'Backward' | 'Sequencing';

const MODES: Array<{
  name: Mode;
  instruction: string;
  transform: (d: number[]) => number[];
}> = [
    { name: 'Forward', instruction: 'Repeat the digits in the SAME order', transform: (d) => [...d] },
    { name: 'Backward', instruction: 'Repeat the digits in REVERSE order', transform: (d) => [...d].reverse() },
    { name: 'Sequencing', instruction: 'Repeat the digits in ASCENDING order', transform: (d) => [...d].sort((a, b) => a - b) },
  ];

function generateDigits(length: number): number[] {
  const digits = [];
  for (let i = 0; i < length; i++) {
    digits.push(Math.floor(Math.random() * 9) + 1);
  }
  return digits;
}

const DigitSpanGame: React.FC<DigitSpanGameProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { movementCount } = useMovementCounter(containerRef);
  const [rawScore, setRawScore] = useState(0);
  const [modeIdx, setModeIdx] = useState(0);
  const [seqLength, setSeqLength] = useState(2);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'showing' | 'input' | 'feedback'>('ready');
  const [currentDigits, setCurrentDigits] = useState<number[]>([]);
  const [showIdx, setShowIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; expected: string } | null>(null);
  const [finished, setFinished] = useState(false);

  const rawScoreRef = useRef(rawScore);
  rawScoreRef.current = rawScore;
  const movementRef = useRef(movementCount);
  movementRef.current = movementCount;

  const { timeLeft, timeElapsed } = useTimer(true, 180, () => {
    if (!finished) { setFinished(true); onComplete({ game_type: 'DS', score: rawScoreRef.current, movement_count: movementRef.current, completion_time_seconds: 180 }); }
  });

  const handleFinish = useCallback(() => {
    if (!finished) { setFinished(true); onComplete({ game_type: 'DS', score: rawScore, movement_count: movementCount, completion_time_seconds: timeElapsed }); }
  }, [finished, rawScore, movementCount, timeElapsed, onComplete]);

  const startTrial = useCallback(() => {
    const digits = generateDigits(seqLength);
    setCurrentDigits(digits);
    setShowIdx(0);
    setUserInput('');
    setFeedback(null);
    setPhase('showing');
  }, [seqLength]);

  useEffect(() => {
    if (phase === 'showing' && showIdx < currentDigits.length) {
      const t = setTimeout(() => setShowIdx(prev => prev + 1), 800);
      return () => clearTimeout(t);
    } else if (phase === 'showing' && showIdx >= currentDigits.length) {
      setPhase('input');
    }
  }, [phase, showIdx, currentDigits.length]);

  useEffect(() => {
    if (phase === 'ready' && !finished) {
      const t = setTimeout(() => startTrial(), 800);
      return () => clearTimeout(t);
    }
  }, [phase, finished, startTrial]);

  const handleSubmit = () => {
    const expected = MODES[modeIdx].transform(currentDigits);
    const userDigits = userInput.trim().split('').filter(c => /\d/.test(c)).map(Number);
    const correct = JSON.stringify(userDigits) === JSON.stringify(expected);

    if (correct) {
      setRawScore(prev => prev + 1);
      setConsecutiveFails(0);
      setFeedback({ correct: true, expected: expected.join(' ') });
      setTimeout(() => {
        setSeqLength(prev => prev + 1);
        setPhase('ready');
      }, 800);
    } else {
      const newFails = consecutiveFails + 1;
      setConsecutiveFails(newFails);
      setFeedback({ correct: false, expected: expected.join(' ') });

      if (newFails >= 2) {
        if (modeIdx < MODES.length - 1) {
          setTimeout(() => {
            setModeIdx(prev => prev + 1);
            setSeqLength(2);
            setConsecutiveFails(0);
            setPhase('ready');
          }, 1000);
        } else {
          setTimeout(() => handleFinish(), 1000);
        }
      } else {
        setTimeout(() => setPhase('ready'), 1000);
      }
    }
    setPhase('feedback');
  };

  const mode = MODES[modeIdx];

  return (
    <div ref={containerRef} className="space-y-5">
      <h3 className="text-lg font-bold">Sequential Memory Challenge — {mode.name}</h3>
      <p className="text-slate-600 text-sm">{mode.instruction}</p>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-[160px] flex flex-col items-center justify-center">
        {phase === 'ready' && <div className="text-slate-400 font-medium animate-pulse">Get ready...</div>}
        {phase === 'showing' && showIdx < currentDigits.length && (
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Remember</div>
            <div className="text-7xl font-black text-blue-600 animate-pulse">{currentDigits[showIdx]}</div>
            <div className="mt-3 text-sm text-slate-400">{showIdx + 1} / {currentDigits.length}</div>
          </div>
        )}
        {phase === 'input' && (
          <div className="w-full max-w-sm text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Type the digits ({mode.name})</div>
            <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} autoFocus
              className="w-full text-center text-2xl font-mono tracking-[0.5em] px-4 py-3 border-2 border-blue-300 rounded-xl focus:border-blue-500 outline-none"
              placeholder={'_'.repeat(seqLength)} />
            <button onClick={handleSubmit} className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Submit</button>
          </div>
        )}
        {phase === 'feedback' && feedback && (
          <div className={`text-center p-4 rounded-xl ${feedback.correct ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-2xl font-bold ${feedback.correct ? 'text-green-600' : 'text-red-600'}`}>
              {feedback.correct ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            <div className="text-sm text-slate-500 mt-1">Expected: <span className="font-mono font-bold">{feedback.expected}</span></div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="text-sm text-slate-500 space-x-3">
          <span>Score: <strong className="text-slate-700">{rawScore}</strong></span>
          <span>Mode: <strong className="text-slate-700">{mode.name}</strong></span>
          <span>Length: <strong className="text-slate-700">{seqLength}</strong></span>
          <span>Time: <strong className={`${timeLeft <= 15 ? 'text-red-600' : 'text-slate-700'}`}>{timeLeft}s</strong></span>
        </div>

      </div>
    </div>
  );
};

export default DigitSpanGame;
