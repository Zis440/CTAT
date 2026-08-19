import { useState, useEffect, useRef, useCallback } from 'react';

interface TimerReturn {
  timeLeft: number;
  timeElapsed: number;
  resetTimer: () => void;
}

function useTimer(isActive = false, initialTime = 120, onExpire: (() => void) | null = null): TimerReturn {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            if (onExpireRef.current) onExpireRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const resetTimer = useCallback(() => setTimeLeft(initialTime), [initialTime]);
  const timeElapsed = initialTime - timeLeft;

  return { timeLeft, timeElapsed, resetTimer };
}

export default useTimer;