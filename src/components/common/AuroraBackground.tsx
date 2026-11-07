import React, { useMemo } from 'react';

/**
 * AuroraBackground
 * 
 * Simple, elegant, and calm animated background:
 * - Smooth, slow-moving mesh gradient & aurora effect (dark purple and deep blue)
 * - Premium, calm nebula feel that is gentle and non-distracting
 * - Few very small, slow-floating glowing dots for a high-tech feel
 * - 100% GPU-accelerated CSS animations with pointer-events: none
 */
export const AuroraBackground: React.FC = () => {
  // A curated collection of small, subtle glowing particles floating at different speeds
  const particles = useMemo(() => [
    { top: '12%', left: '15%', size: 2.5, color: '#38bdf8', duration: '11s', delay: '0s' },
    { top: '22%', left: '38%', size: 2, color: '#c084fc', duration: '14s', delay: '2s' },
    { top: '18%', left: '72%', size: 3, color: '#818cf8', duration: '16s', delay: '1s' },
    { top: '35%', left: '88%', size: 2, color: '#38bdf8', duration: '13s', delay: '3s' },
    { top: '48%', left: '24%', size: 2.5, color: '#c084fc', duration: '15s', delay: '4s' },
    { top: '62%', left: '10%', size: 3, color: '#67e8f9', duration: '12s', delay: '1.5s' },
    { top: '75%', left: '32%', size: 2, color: '#a855f7', duration: '17s', delay: '5s' },
    { top: '68%', left: '55%', size: 2.5, color: '#38bdf8', duration: '14s', delay: '2.5s' },
    { top: '82%', left: '78%', size: 2, color: '#c084fc', duration: '18s', delay: '0.5s' },
    { top: '28%', left: '52%', size: 2, color: '#818cf8', duration: '13s', delay: '3.5s' },
    { top: '88%', left: '18%', size: 2.5, color: '#67e8f9', duration: '16s', delay: '4.5s' },
    { top: '42%', left: '76%', size: 2, color: '#c084fc', duration: '12s', delay: '1s' },
    { top: '56%', left: '92%', size: 3, color: '#38bdf8', duration: '15s', delay: '2s' },
    { top: '8%', left: '84%', size: 2, color: '#a855f7', duration: '19s', delay: '0s' },
    { top: '92%', left: '48%', size: 2.5, color: '#818cf8', duration: '14s', delay: '3s' },
    { top: '3%', left: '45%', size: 2, color: '#38bdf8', duration: '11s', delay: '2s' },
  ], []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none select-none overflow-hidden -z-10 bg-[#070913]"
      aria-hidden="true"
    >
      {/* 1. Deep Base Nebula Mesh Gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-[#0c0d1f] via-[#070913] to-[#04050a]" 
      />

      {/* 2. Slow-Moving Aurora Blob 1 (Dark Purple / Deep Indigo Nebula) */}
      <div 
        className="absolute -top-[18%] -left-[12%] w-[720px] h-[720px] rounded-full blur-[140px] bg-gradient-to-br from-purple-800/30 via-indigo-900/25 to-transparent pointer-events-none animate-aurora-1" 
      />

      {/* 3. Slow-Moving Aurora Blob 2 (Deep Blue / Ocean Indigo Nebula) */}
      <div 
        className="absolute -bottom-[22%] -right-[12%] w-[780px] h-[780px] rounded-full blur-[150px] bg-gradient-to-tl from-blue-900/30 via-indigo-950/25 to-transparent pointer-events-none animate-aurora-2" 
      />

      {/* 4. Slow-Moving Aurora Blob 3 (Subtle Violet Center Cloud) */}
      <div 
        className="absolute top-[28%] left-[32%] w-[600px] h-[600px] rounded-full blur-[160px] bg-gradient-to-tr from-purple-900/20 via-blue-950/20 to-transparent pointer-events-none animate-aurora-3" 
      />

      {/* 5. Subtle High-Tech Micro Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_50%,#000_60%,transparent_100%)] opacity-60" 
      />

      {/* 6. Subtle Floating Glowing Particles (Dots) */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((pt, idx) => (
          <div
            key={idx}
            className="absolute rounded-full animate-particle-drift pointer-events-none"
            style={{
              top: pt.top,
              left: pt.left,
              width: `${pt.size}px`,
              height: `${pt.size}px`,
              backgroundColor: pt.color,
              boxShadow: `0 0 ${pt.size * 3.5}px ${pt.color}, 0 0 ${pt.size * 6}px ${pt.color}66`,
              animationDuration: pt.duration,
              animationDelay: pt.delay,
            }}
          />
        ))}
      </div>

      {/* 7. Soft Vignette Darkening at Viewport Edges */}
      <div className="absolute inset-0 bg-radial-at-c from-transparent via-transparent to-[#04050a]/80 pointer-events-none" />
    </div>
  );
};

export default AuroraBackground;
