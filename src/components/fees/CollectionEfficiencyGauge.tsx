import React, { useMemo } from 'react';
import { Gauge, CheckCircle2, AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react';
import { FeeRecord } from '../../types';

interface CollectionEfficiencyGaugeProps {
  fees: FeeRecord[];
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
}

export const CollectionEfficiencyGauge: React.FC<CollectionEfficiencyGaugeProps> = ({
  fees,
  totalExpected,
  totalCollected,
  totalPending,
}) => {
  // Calculate percentage (0 - 100)
  const percentage = useMemo(() => {
    if (!totalExpected || totalExpected <= 0) {
      if (fees.length > 0) return 100;
      return 100;
    }
    const ratio = Math.round((totalCollected / totalExpected) * 100);
    return Math.min(Math.max(ratio, 0), 100);
  }, [totalExpected, totalCollected, fees.length]);

  // Determine efficiency level and color scale
  const { statusLabel, statusColor, badgeBg, badgeBorder, badgeText, activeColor, description } = useMemo(() => {
    if (percentage >= 71) {
      return {
        statusLabel: 'Excellent',
        statusColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10',
        badgeBorder: 'border-emerald-500/30',
        badgeText: 'text-emerald-400',
        activeColor: '#10b981',
        description: 'Optimal recovery rate with minimal tuition arrears.',
      };
    } else if (percentage >= 41) {
      return {
        statusLabel: 'Moderate',
        statusColor: 'text-amber-400',
        badgeBg: 'bg-amber-500/10',
        badgeBorder: 'border-amber-500/30',
        badgeText: 'text-amber-400',
        activeColor: '#f59e0b',
        description: 'Substantial outstanding dues requiring follow-up notices.',
      };
    } else {
      return {
        statusLabel: 'Critical',
        statusColor: 'text-rose-400',
        badgeBg: 'bg-rose-500/10',
        badgeBorder: 'border-rose-500/30',
        badgeText: 'text-rose-400',
        activeColor: '#ef4444',
        description: 'High pending tuition volume requiring immediate attention.',
      };
    }
  }, [percentage]);

  // Speedometer geometry calculation:
  // Center (cx, cy) = (160, 140)
  // Radius R = 110, Inner r = 85 (thickness 25px)
  // Angles: 180° (left, 0%) to 0° (right, 100%)
  const cx = 160;
  const cy = 135;
  const radius = 100;
  const strokeWidth = 20;

  // Function to describe an arc path from angle start to end (in degrees)
  const getArcPath = (startAngleDeg: number, endAngleDeg: number, r: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const startX = cx - r * Math.cos(toRad(startAngleDeg));
    const startY = cy - r * Math.sin(toRad(startAngleDeg));
    const endX = cx - r * Math.cos(toRad(endAngleDeg));
    const endY = cy - r * Math.sin(toRad(endAngleDeg));

    const largeArc = endAngleDeg - startAngleDeg <= 180 ? 0 : 1;
    return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
  };

  // Needle angle: 0% is 180 deg (points left), 100% is 0 deg (points right)
  // In standard SVG rotation around (cx, cy), -90 deg points left, 90 deg points right
  const needleRotation = -90 + (percentage / 100) * 180;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Collection Efficiency
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ratio of collected fees vs. total billed dues
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${badgeBg} ${badgeText} border ${badgeBorder}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Speedometer Gauge Visual */}
      <div className="relative flex flex-col items-center justify-center pt-2">
        <svg
          viewBox="0 0 320 185"
          className="w-full max-w-[280px] sm:max-w-[310px] h-auto overflow-visible"
        >
          <defs>
            {/* Soft Glow for Needle & Active Track */}
            <filter id="gaugeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={activeColor} floodOpacity="0.45" />
            </filter>

            {/* Needle Hub Gradient */}
            <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="60%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>
          </defs>

          {/* Background Track Segments: 
              Red (0-40%): 0° to 72° (from left: 0 to 72)
              Yellow (40-70%): 72° to 126°
              Green (70-100%): 126° to 180°
          */}
          {/* 1. Red Zone (0 - 40%) */}
          <path
            d={getArcPath(0, 72, radius)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeOpacity={0.25}
            strokeLinecap="round"
          />

          {/* 2. Yellow Zone (40 - 70%) */}
          <path
            d={getArcPath(72, 126, radius)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeOpacity={0.25}
          />

          {/* 3. Green Zone (70 - 100%) */}
          <path
            d={getArcPath(126, 180, radius)}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeOpacity={0.25}
            strokeLinecap="round"
          />

          {/* Active Highlighted Progress Fill Arc */}
          {percentage > 0 && (
            <path
              d={getArcPath(0, (percentage / 100) * 180, radius)}
              fill="none"
              stroke={activeColor}
              strokeWidth={strokeWidth + 2}
              strokeLinecap="round"
              filter="url(#gaugeGlow)"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Speedometer Scale Ticks */}
          {[0, 20, 40, 60, 80, 100].map((tick) => {
            const rad = ((tick / 100) * 180 * Math.PI) / 180;
            const innerX = cx - (radius - 18) * Math.cos(rad);
            const innerY = cy - (radius - 18) * Math.sin(rad);
            const textX = cx - (radius - 32) * Math.cos(rad);
            const textY = cy - (radius - 32) * Math.sin(rad);

            return (
              <g key={tick}>
                <circle cx={innerX} cy={innerY} r="1.5" fill="#64748b" opacity="0.7" />
                <text
                  x={textX}
                  y={textY + 3}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-400 font-mono font-medium"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Speedometer Needle */}
          <g
            transform={`rotate(${needleRotation}, ${cx}, ${cy})`}
            className="transition-transform duration-700 ease-out"
          >
            {/* Needle Spine */}
            <polygon
              points={`${cx - 3},${cy} ${cx + 3},${cy} ${cx},${cy - radius + 10}`}
              fill={activeColor}
              filter="url(#gaugeGlow)"
            />
            {/* Inner Needle highlight */}
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - radius + 12}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />
          </g>

          {/* Center Pivot Hub */}
          <circle cx={cx} cy={cy} r="11" fill="url(#hubGradient)" stroke="#0f172a" strokeWidth="2.5" />
          <circle cx={cx} cy={cy} r="4" fill="#0f172a" />
        </svg>

        {/* Center Readout Overlay */}
        <div className="text-center -mt-8 sm:-mt-9">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              {percentage}%
            </span>
          </div>
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <span className={`text-xs font-bold ${statusColor} tracking-wide uppercase`}>
              {statusLabel} Performance
            </span>
          </div>
        </div>
      </div>

      {/* Scale Legend & Collected vs Pending Stats */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Collected
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              Rs. {totalCollected.toLocaleString()}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Pending
            </span>
            <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              Rs. {totalPending.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Speedometer Scale Color Guide */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 pt-0.5">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>0-40% Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>41-70% Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>71-100% Excellent</span>
          </div>
        </div>
      </div>
    </div>
  );
};
