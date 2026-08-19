import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const METRICS = [
  { id: "A1", label: "NEURAL_SYNC", target: 98.4 },
  { id: "B2", label: "COG_LOAD", target: 42.1 },
  { id: "C3", label: "STRESS_LVL", target: 12.8 },
];

export function BrainAnalysisUI() {
  const [data, setData] = useState(METRICS.map(m => ({ ...m, current: 0 })));

  useEffect(() => {
    // Randomly fluctuate data
    const interval = setInterval(() => {
      setData(prev => prev.map(m => ({
        ...m,
        current: m.target + (Math.random() * 4 - 2)
      })));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible z-30">

      {/* Sleek Orbit Rings */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full border-[0.5px] border-primary/20 border-dashed"
        style={{ top: 'calc(50% - 200px)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full border-[0.5px] border-primary/10 border-dotted"
        style={{ top: 'calc(50% - 250px)' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />

      {/* Target Reticle / Center Marker */}
      <div className="absolute w-[60px] h-[60px] rounded-full border-[0.5px] border-primary/30" style={{ top: 'calc(50% - 30px)' }}>
        <div className="absolute top-1/2 -left-2 w-4 h-[1px] bg-primary/50" />
        <div className="absolute top-1/2 -right-2 w-4 h-[1px] bg-primary/50" />
        <div className="absolute -top-2 left-1/2 w-[1px] h-4 bg-primary/50" />
        <div className="absolute -bottom-2 left-1/2 w-[1px] h-4 bg-primary/50" />
      </div>

      {/* Vertical Scanning Laser */}
      <motion.div
        className="absolute w-[300px] h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent blur-[1px] opacity-60"
        animate={{ y: [-250, -20, -250] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* HUD Data Overlay (Right side) */}
      <div className="absolute -right-[15%] top-[0%] w-[240px] space-y-6 font-mono">

        {/* Status Header */}
        <div className="flex flex-col">
          <div className="text-[10px] text-primary/60 tracking-[0.2em] mb-1">SYS.STATUS</div>
          <div className="flex items-center space-x-2">
            <motion.div
              className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_#39ff14]"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <div className="text-sm text-primary font-bold tracking-widest">ACTIVE_SCAN</div>
          </div>
          <div className="w-full h-[1px] bg-gradient-to-r from-primary/50 to-transparent mt-2" />
        </div>

        {/* Dynamic Metrics */}
        <div className="space-y-4">
          {data.map((m, i) => (
            <motion.div
              key={m.id}
              className="relative pl-3 border-l border-primary/30"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 }}
            >
              <div className="text-[9px] text-primary/50 tracking-wider mb-1">[{m.id}] {m.label}</div>
              <div className="text-lg text-primary shadow-primary drop-shadow-[0_0_2px_rgba(57,255,20,0.5)]">
                {m.current.toFixed(2)}<span className="text-xs text-primary/40 ml-1">%</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Minimalist chart/graph representation */}
        <div className="mt-8 flex items-end space-x-1 h-12">
          {[...Array(24)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-primary/40"
              animate={{ height: ['20%', `${Math.random() * 80 + 20}%`, '20%'] }}
              transition={{ duration: 2 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
