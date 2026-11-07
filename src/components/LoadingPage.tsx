import React, { useEffect, useState } from 'react';
import { Sparkles, Shield, Cpu } from 'lucide-react';

interface LoadingPageProps {
  onComplete?: () => void;
  durationMs?: number;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  onComplete,
  durationMs = 2000
}) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / durationMs) * 100), 100);
      setProgress(pct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setIsExiting(true);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 150);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [onComplete, durationMs]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#060814] text-white overflow-hidden transition-opacity duration-300 ${
        isExiting ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Animated Glowing Mesh & Radial Bloom */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      {/* Decorative Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Center Content Card */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full">
        {/* Pulsing Logo with Glowing Ring */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center mb-8">
          {/* Outer glowing pulsing orb */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-blue-500 opacity-40 blur-xl animate-pulse" />

          {/* Sleek Spinning Ring */}
          <div className="absolute -inset-2 rounded-full border-2 border-transparent border-t-purple-500 border-r-indigo-400 border-b-cyan-400 animate-spin" />

          {/* Logo Frame */}
          <div className="relative w-24 h-24 sm:w-26 sm:h-26 rounded-full bg-white/95 p-3 shadow-2xl ring-2 ring-white/20 flex items-center justify-center overflow-hidden animate-pulse">
            <img
              src="/assets/aistudio/logo_-_Copy_d3a62f9d.png"
              alt="OK Korean Language Center"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Brand Title */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 mb-1">
          <span>OK Korean Language Center</span>
        </h2>
        <p className="text-xs sm:text-sm text-indigo-300 font-medium font-korean mb-6">
          오케이 한국어 학원 종합 관리 포털
        </p>

        {/* Sleek Loading Bar */}
        <div className="w-full max-w-xs space-y-2 mb-5">
          <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-100 ease-out shadow-[0_0_15px_rgba(139,92,246,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Fading In/Out Text */}
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-indigo-200/90 animate-pulse">
          <Sparkles className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Initializing Secure Portal...</span>
        </div>

        {/* Sub-label */}
        <p className="text-[11px] text-slate-400 mt-2 font-mono tabular-nums">
          Establishing encrypted session • {progress}%
        </p>
      </div>
    </div>
  );
};

export default LoadingPage;
