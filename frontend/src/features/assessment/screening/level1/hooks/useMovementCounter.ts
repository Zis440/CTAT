import { useState, useEffect, type RefObject } from 'react';

function useMovementCounter(elementRef: RefObject<HTMLElement | null>): {
  movementCount: number;
  setMovementCount: React.Dispatch<React.SetStateAction<number>>;
} {
  const [movementCount, setMovementCount] = useState(0);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const increment = () => setMovementCount(prev => prev + 1);

    el.addEventListener('click', increment);
    el.addEventListener('keydown', increment);
    el.addEventListener('dragstart', increment);
    el.addEventListener('touchstart', increment);

    return () => {
      el.removeEventListener('click', increment);
      el.removeEventListener('keydown', increment);
      el.removeEventListener('dragstart', increment);
      el.removeEventListener('touchstart', increment);
    };
  }, [elementRef]);

  return { movementCount, setMovementCount };
}

export default useMovementCounter;