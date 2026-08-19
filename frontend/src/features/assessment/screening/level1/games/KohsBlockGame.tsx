import React, { useEffect, useRef } from 'react';
import useMovementCounter from '../hooks/useMovementCounter';
import useTimer from '../hooks/useTimer';

interface KohsBlockGameProps {
  onComplete: (data: {
    game_type: string;
    score: number;
    movement_count: number;
    completion_time_seconds: number;
  }) => void;
}

const KohsBlockGame: React.FC<KohsBlockGameProps> = ({ onComplete }) => {
  const containerRef = useRef < HTMLDivElement > (null);
  const canvasRef = useRef < HTMLCanvasElement > (null);
  const { movementCount } = useMovementCounter(containerRef);

  const { timeLeft, timeElapsed } = useTimer(true, 120, () => {
    const score = Math.max(0, 100 - timeElapsed - movementCount * 2);
    onComplete({ game_type: 'kohs', score, movement_count: movementCount, completion_time_seconds: timeElapsed });
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(150, 150);
    ctx.lineTo(0, 150);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(150, 0);
    ctx.lineTo(150, 150);
    ctx.fill();

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.fillText('Interactive Block Pattern', 75, 200);
  }, []);

  const handleFinish = () => {
    const score = Math.max(0, 100 - timeElapsed - movementCount * 2);
    onComplete({ game_type: 'kohs', score, movement_count: movementCount, completion_time_seconds: timeElapsed });
  };

  return (
    <div ref={containerRef} className="space-y-4">
      <h3 className="text-lg font-bold">Kohs Spatial Construction Task Test</h3>
      <p className="text-slate-600">Recreate the pattern shown using the blocks. (Interactive placeholder)</p>
      <div className="canvas-container">
        <canvas ref={canvasRef} width={150} height={250} className="border border-slate-300 rounded shadow-sm bg-white" />
      </div>
      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="text-sm text-slate-500">Movements: {movementCount} | Time Left: {timeLeft}s</div>
        <button onClick={handleFinish} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">Submit Pattern</button>
      </div>
    </div>
  );
};

export default KohsBlockGame;