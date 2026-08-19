import React, { useRef, useState, useEffect, useCallback } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';

interface PatternMemoryGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
  }) => void;
}

function generateSequence(length: number): string[] {
  const pool = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T'];
  const seq = [];
  for (let i = 0; i < length; i++) {
    seq.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return seq;
}

const PatternMemoryGame: React.FC<PatternMemoryGameProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { movementCount } = useMovementCounter(containerRef);
  const [rawScore, setRawScore] = useState(0);
  const [seqLength, setSeqLength] = useState(2);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'showing' | 'input' | 'feedback'>('ready');
  const [currentSeq, setCurrentSeq] = useState<string[]>([]);
  const [showIdx, setShowIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; expected: string; got: string } | null>(null);
  const [round, setRound] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const rawScoreRef = useRef(rawScore);
  rawScoreRef.current = rawScore;
  const movementRef = useRef(movementCount);
  movementRef.current = movementCount;

  const { timeLeft, timeElapsed } = useTimer(true, 120, () => {
    onComplete({
      game_type: 'pattern_memory',
      score: rawScoreRef.current,
      movement_count: movementRef.current,
      completion_time_seconds: 120,
    });
  });

  const handleFinish = () => {
    onComplete({
      game_type: 'pattern_memory',
      score: rawScore,
      movement_count: movementCount,
      completion_time_seconds: timeElapsed,
    });
  };

  const startTrial = useCallback(() => {
    const seq = generateSequence(seqLength);
    setCurrentSeq(seq);
    setShowIdx(0);
    setUserInput('');
    setFeedback(null);
    setPhase('showing');
    setRound(prev => prev + 1);
  }, [seqLength]);

  useEffect(() => {
    if (phase !== 'showing') return;
    if (showIdx >= currentSeq.length) {
      setPhase('input');
      return;
    }
    const timer = setTimeout(() => {
      setShowIdx(prev => prev + 1);
    }, 900);
    return () => clearTimeout(timer);
  }, [phase, showIdx, currentSeq.length]);

  const handleSubmit = () => {
    const userChars = userInput.toUpperCase().trim().split('').filter(c => c !== ' ');
    const correct = JSON.stringify(userChars) === JSON.stringify(currentSeq);

    if (correct) {
      setRawScore(prev => prev + 1);
      setConsecutiveFails(0);
      setFeedback({ correct: true, expected: currentSeq.join(' '), got: userChars.join(' ') });
      setTimeout(() => {
        setSeqLength(prev => prev + 1);
        startTrial();
      }, 1000);
    } else {
      const newFails = consecutiveFails + 1;
      setConsecutiveFails(newFails);
      setFeedback({ correct: false, expected: currentSeq.join(' '), got: userChars.join(' ') });

      if (newFails >= 2) {
        setGameOver(true);
        setTimeout(() => handleFinish(), 1500);
      } else {
        setTimeout(() => startTrial(), 1200);
      }
    }
    setPhase('feedback');
  };

  useEffect(() => {
    if (phase === 'ready') {
      const t = setTimeout(() => startTrial(), 1000);
      return () => clearTimeout(t);
    }
  }, [phase, startTrial]);

  return (
    <div ref={containerRef} className="space-y-5">
      <h3 className="text-lg font-bold">Pattern Memory — Letter-Number Sequencing</h3>
      <p className="text-slate-600 text-sm">
        Watch the sequence, then type it back in order. Difficulty increases with each correct answer.
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-[160px] flex flex-col items-center justify-center">
        {phase === 'ready' && (
          <div className="text-slate-400 font-medium animate-pulse">Get ready...</div>
        )}

        {phase === 'showing' && showIdx < currentSeq.length && (
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Memorize</div>
            <div className="text-7xl font-black text-blue-600 animate-pulse transition-all">
              {currentSeq[showIdx]}
            </div>
            <div className="mt-3 text-sm text-slate-400">{showIdx + 1} / {currentSeq.length}</div>
          </div>
        )}

        {phase === 'showing' && showIdx >= currentSeq.length && (
          <div className="text-slate-400 animate-pulse">Processing...</div>
        )}

        {phase === 'input' && (
          <div className="w-full max-w-sm text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">
              Type the sequence ({seqLength} characters)
            </div>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              maxLength={seqLength + 2}
              autoFocus
              className="w-full text-center text-2xl font-mono tracking-[0.5em] px-4 py-3 border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder={'_'.repeat(seqLength)}
            />
            <button
              onClick={handleSubmit}
              className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Submit
            </button>
          </div>
        )}

        {phase === 'feedback' && feedback && (
          <div className={`text-center p-4 rounded-xl ${feedback.correct ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-2xl font-bold ${feedback.correct ? 'text-green-600' : 'text-red-600'}`}>
              {feedback.correct ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Expected: <span className="font-mono font-bold">{feedback.expected}</span>
            </div>
            {gameOver && (
              <div className="text-sm text-amber-600 mt-2 font-medium">
                Test complete — two misses at length {seqLength}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="text-sm text-slate-500 space-x-3">
          <span>Score: <strong className="text-slate-700">{rawScore}</strong></span>
          <span>Length: <strong className="text-slate-700">{seqLength}</strong></span>
          <span>Round: <strong className="text-slate-700">{round}</strong></span>
          <span>Time Left: <strong className={`${timeLeft <= 15 ? 'text-red-600' : 'text-slate-700'}`}>{timeLeft}s</strong></span>
        </div>
      </div>
    </div>
  );
};

export default PatternMemoryGame;