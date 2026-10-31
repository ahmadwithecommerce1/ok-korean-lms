import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Database, Cpu, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
  onComplete?: () => void;
  fullScreen?: boolean;
}

const DEFAULT_STAGES = [
  'Authenticating security credentials...',
  'Synchronizing real-time databases...',
  'Preparing your workspace...',
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message,
  onComplete,
  fullScreen = true,
}) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStageIndex(1);
      setProgress(55);
    }, 600);

    const t2 = setTimeout(() => {
      setStageIndex(2);
      setProgress(95);
    }, 1300);

    const t3 = setTimeout(() => {
      setProgress(100);
      if (onComplete) {
        onComplete();
      }
    }, 1900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const currentMessage = message || DEFAULT_STAGES[stageIndex];

  const content = (
    <div className="relative flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl bg-black/60 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(168,85,247,0.3)] ring-1 ring-purple-500/20 max-w-md w-full mx-4">
      {/* Glowing Orbit Centerpiece */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center mb-6">
        {/* Pulsing Ripple */}
        <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping opacity-25" />
        {/* Spinning Cyber Dashed Orbit */}
        <div className="absolute -inset-2 rounded-full border-2 border-dashed border-purple-500/50 animate-[spin_8s_linear_infinite]" />
        <div className="absolute -inset-4 rounded-full border border-cyan-500/30 animate-[spin_12s_linear_infinite_reverse]" />
        
        {/* Neon Backdrop Glow */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-cyan-400 blur-xl opacity-60 animate-pulse" />

        {/* Pulsing Academy Logo */}
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-black/80 p-2 shadow-2xl ring-2 ring-purple-500/60 flex items-center justify-center overflow-hidden"
        >
          <img
            src="/assets/aistudio/logo_-_Copy_d3a62f9d.png"
            alt="OK Korean Language Center"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </div>

      {/* Brand & Stage Heading */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-bold mb-3 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span>OK KOREAN ACADEMY</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={currentMessage}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="text-base sm:text-lg font-bold text-white tracking-tight mb-5 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
        >
          {currentMessage}
        </motion.p>
      </AnimatePresence>

      {/* Neon Progress Bar */}
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse" />
            Loading Modules
          </span>
          <span className="font-bold text-purple-300">{progress}%</span>
        </div>
        <div className="relative h-2 w-full bg-[#0a0d1d] rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            style={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.4 }}
          />
        </div>
      </div>
    </div>
  );

  if (!fullScreen) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070f] text-slate-100 overflow-hidden">
      {/* Background ambient mesh glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />
      {content}
    </div>
  );
};

export default LoadingScreen;
