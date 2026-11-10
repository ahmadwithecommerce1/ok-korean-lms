import React, { useState, useEffect, useRef } from 'react';

const PHRASES = [
  "Topik Preparation",
  "Enterprise Precision",
  "Native Educators",
  "EPS-TOPIK Aspirants",
  "Master the Korean Language"
];

// Smooth cubic ease-in-out easing for natural cinematic scroll
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const BlurTextScroller3D: React.FC = () => {
  const [baseIndex, setBaseIndex] = useState(0);
  const [fraction, setFraction] = useState(0);
  const [isPausedHover, setIsPausedHover] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const elapsedInCycleRef = useRef<number>(0);

  // Geometry: Height of each line in pixels
  const ITEM_HEIGHT = 56;
  // Timing requirements: exactly 3 seconds (3000ms) static hold in center
  const PAUSE_DURATION = 3000;
  // Smooth scroll transition duration
  const SCROLL_DURATION = 850;
  const TOTAL_CYCLE = PAUSE_DURATION + SCROLL_DURATION;

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      if (!isPausedHover) {
        elapsedInCycleRef.current += delta;

        if (elapsedInCycleRef.current < PAUSE_DURATION) {
          // Phase 1: 3-Second static pause in center (completely static and sharp)
          setFraction(0);
          setIsScrolling(false);
        } else if (elapsedInCycleRef.current < TOTAL_CYCLE) {
          // Phase 2: Smooth upward scroll transition into blur
          const scrollProgress = (elapsedInCycleRef.current - PAUSE_DURATION) / SCROLL_DURATION;
          const eased = easeInOutCubic(Math.min(scrollProgress, 1));
          setFraction(eased);
          setIsScrolling(true);
        } else {
          // Phase 3: Cycle complete -> Advance to next phrase and reset
          elapsedInCycleRef.current = 0;
          setFraction(0);
          setIsScrolling(false);
          setBaseIndex((prev) => (prev + 1) % PHRASES.length);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPausedHover]);

  // 7 slots visible at any given moment (-3 to +3 around the center)
  const slots = [-3, -2, -1, 0, 1, 2, 3];

  return (
    <div className="relative w-full max-w-lg my-2">
      {/* 3D Perspective Stage */}
      <div
        className="relative w-full h-[300px] sm:h-[340px] select-none overflow-hidden rounded-3xl bg-black/60 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center justify-center"
        style={{
          perspective: '900px',
          perspectiveOrigin: '50% 50%',
          transformStyle: 'preserve-3d',
        }}
        onMouseEnter={() => setIsPausedHover(true)}
        onMouseLeave={() => setIsPausedHover(false)}
      >
        {/* Subtle center focus line backdrop glow */}
        <div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 h-14 rounded-2xl bg-gradient-to-r from-transparent via-white/[0.08] to-transparent border-y border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.06)] z-0" />

        {/* Top atmospheric fade mask */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black via-black/80 to-transparent z-20" />

        {/* Bottom atmospheric fade mask */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent z-20" />

        {/* Vertically Scrolling 3D Cylinder Lines */}
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
          {slots.map((s) => {
            // Distance d in px from the center line:
            // As fraction increases (0 -> 1 during scroll), d decreases, causing lines to move UPWARDS
            const d = (s - fraction) * ITEM_HEIGHT;
            const absDist = Math.abs(d);
            const maxDist = ITEM_HEIGHT * 2.7; // ~150px
            const ratio = Math.min(absDist / maxDist, 1);

            // Progressive blur: exactly 0px at center, up to 9px at edges
            const blur = Math.pow(ratio, 1.2) * 9;

            // Progressive opacity: 1 in center, fading to 0 at edges
            const opacity = Math.max(0, 1 - Math.pow(ratio, 1.05) * 0.98);

            // 3D scale: 1.15 in center, 0.78 at edges
            const scale = 1.15 - Math.pow(ratio, 1.2) * 0.37;

            // 3D rotateX: curves away along cylinder surface (tilts up when above, down when below)
            const rotateX = (d / (ITEM_HEIGHT * 2.8)) * 38;

            // 3D translateZ: pushes edges back into depth
            const z = -Math.pow(ratio, 1.4) * 65;

            // Phrase text calculation
            const rawIndex = (baseIndex + s) % PHRASES.length;
            const phraseIndex = rawIndex < 0 ? (rawIndex + PHRASES.length) % PHRASES.length : rawIndex;
            const phraseText = PHRASES[phraseIndex];

            // Is this item right in the center focus zone?
            const isCenter = absDist < 12;

            return (
              <div
                key={`slot-${s}`}
                className="absolute inset-x-0 flex items-center justify-center text-center px-4 will-change-transform"
                style={{
                  transform: `translateY(${d.toFixed(2)}px) translateZ(${z.toFixed(2)}px) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
                  filter: `blur(${blur.toFixed(2)}px)`,
                  opacity: Number(opacity.toFixed(3)),
                  zIndex: isCenter ? 15 : 10 - Math.round(absDist / 20),
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="inline-flex items-center gap-2">
                  {/* Active Arrow Indicator for the Center Phrase (as in reference image: '→ Motion') */}
                  <span
                    className={`font-black transition-all duration-200 text-lg sm:text-xl lg:text-2xl ${
                      isCenter
                        ? 'text-cyan-400 opacity-100 scale-100 translate-x-0 drop-shadow-[0_0_12px_rgba(6,182,212,0.9)]'
                        : 'opacity-0 scale-50 -translate-x-3 pointer-events-none'
                    }`}
                  >
                    →
                  </span>

                  {/* Main Bold White Text */}
                  <span
                    className={`font-black text-xl sm:text-2xl lg:text-3xl tracking-tight leading-none whitespace-nowrap transition-colors duration-200 ${
                      isCenter
                        ? 'text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.85)]'
                        : 'text-slate-300'
                    }`}
                  >
                    {phraseText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info: Status indicator & 3s timer status */}
      <div className="flex items-center justify-between px-3 mt-1.5 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${
            isPausedHover 
              ? 'bg-amber-400' 
              : isScrolling 
                ? 'bg-indigo-400 animate-ping' 
                : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
          }`} />
          <span className="uppercase tracking-wider">
            {isPausedHover 
              ? 'PAUSED' 
              : isScrolling 
                ? 'SCROLLING UPWARDS' 
                : 'CENTER FOCUS (3s PAUSE)'}
          </span>
        </div>
        <span className="text-slate-400 tracking-wider">OK KOREAN LMS</span>
      </div>
    </div>
  );
};
