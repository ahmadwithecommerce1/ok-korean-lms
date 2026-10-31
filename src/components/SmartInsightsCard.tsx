import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  FileText, 
  MessageSquare,
  Sparkles,
  ChevronRight,
  RotateCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { Student, AttendanceRecord, FeeRecord, WeeklyTest, TabId } from '../types';
import { useTheme } from '../context/ThemeContext';

export interface SmartInsightsCardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  fees: FeeRecord[];
  tests: WeeklyTest[];
  onNavigate?: (tab: TabId) => void;
  className?: string;
}

export const SmartInsightsCard: React.FC<SmartInsightsCardProps> = ({
  students,
  attendance,
  fees,
  tests,
  onNavigate,
  className = '',
}) => {
  const { activeTheme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // System Health Metrics
  const systemHealth = 98;
  const performanceLabel = 'SYSTEM HEALTH: OPTIMAL';

  // 7-Day Attendance Trend Sparkline data ending with 79% (▲ 2.31%)
  const sparklineData = [
    { day: 'Day 1', label: 'Mon', value: 73 },
    { day: 'Day 2', label: 'Tue', value: 75 },
    { day: 'Day 3', label: 'Wed', value: 72 },
    { day: 'Day 4', label: 'Thu', value: 76 },
    { day: 'Day 5', label: 'Fri', value: 74 },
    { day: 'Day 6', label: 'Sat', value: 77 },
    { day: 'Day 7', label: 'Sun', value: 79 },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleTakeAction = () => {
    if (onNavigate) {
      onNavigate('whatsapp');
    } else {
      setActionSuccessMessage('System efficiency protocol active.');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    }
  };

  // Speedometer Geometry
  const cx = 150;
  const cy = 115;
  const r = 85;
  const strokeWidth = 15;

  const getArc = (startDeg: number, endDeg: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx - r * Math.cos(toRad(startDeg));
    const y1 = cy - r * Math.sin(toRad(startDeg));
    const x2 = cx - r * Math.cos(toRad(endDeg));
    const y2 = cy - r * Math.sin(toRad(endDeg));
    const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Needle angle for 98% (from -90° pointing left to +90° pointing right)
  const needleRotation = -90 + (systemHealth / 100) * 180;

  // Chart line color from active theme (Cyan for Cyberpunk, Green for Matrix, Blue/Teal for Oceanic)
  const chartStroke = activeTheme.chartColor;

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-2xl text-white min-h-[490px] flex flex-col justify-between transition-all duration-300 border backdrop-blur-md ${className}`}
      style={{
        backgroundColor: activeTheme.cardBg,
        borderColor: activeTheme.borderColor,
        boxShadow: `0 10px 30px rgba(0,0,0,0.6), 0 0 25px ${activeTheme.glowColor}`
      }}
    >
      
      {/* Background Subtle Tech Ambient Glow matching active theme */}
      <div 
        className="absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-500" 
        style={{ backgroundColor: activeTheme.primary }}
      />
      <div 
        className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-500" 
        style={{ backgroundColor: activeTheme.secondary }}
      />

      {/* ========================================================= */}
      {/* 1. TOP SECTION (HEADER)                                   */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Circular Coin-Style Icon with Theme Primary Glow */}
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border shadow-md transition-all duration-300"
            style={{
              backgroundColor: `${activeTheme.primary}20`,
              borderColor: activeTheme.primary,
              boxShadow: `0 0 12px ${activeTheme.glowColor}`
            }}
          >
            <Sparkles className="w-4 h-4 animate-pulse" style={{ color: activeTheme.secondary }} />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>AI Status</span>
            </h3>
            <p className="text-[11px] text-slate-400 line-clamp-1">
              Real-time system health & intelligence
            </p>
          </div>
        </div>

        {/* Right side: 'LIVE' badge with small pulsing green dot + actions */}
        <div className="flex items-center gap-2">
          {/* Requirement 1: 'LIVE' badge with small pulsing green dot */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.35)] tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="font-extrabold tracking-widest text-[11px]">LIVE</span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            title="Recalculate AI Health"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('reports')}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="View Details"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MIDDLE SECTION (THE GAUGE / SPEEDOMETER CHART)         */}
      {/* ========================================================= */}
      <div className="relative flex flex-col items-center justify-center pt-2">
        <svg
          viewBox="0 0 300 135"
          className="w-full max-w-[270px] sm:max-w-[290px] h-auto overflow-visible"
        >
          <defs>
            {/* Speedometer Glow Filter */}
            <filter id="aiGaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#10b981" floodOpacity="0.5" />
            </filter>

            {/* Hub Metallic Gradient */}
            <radialGradient id="aiGaugeHub" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="60%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>

          {/* Segment 1: Red (0 - 40%) */}
          <path
            d={getArc(0, 70)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeOpacity={0.85}
          />

          {/* Segment 2: Yellow (41 - 70%) */}
          <path
            d={getArc(72, 124)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeOpacity={0.85}
          />

          {/* Segment 3: Green (71 - 100%) */}
          <path
            d={getArc(126, 180)}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter="url(#aiGaugeGlow)"
          />

          {/* Speedometer Needle */}
          <g transform={`rotate(${needleRotation}, ${cx}, ${cy})`}>
            {/* Needle Body */}
            <polygon
              points={`${cx - 3},${cy} ${cx + 3},${cy} ${cx},${cy - r + 8}`}
              fill="#10b981"
              filter="url(#aiGaugeGlow)"
            />
            {/* Inner Needle Highlight */}
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - r + 10}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          </g>

          {/* Center Pivot Hub */}
          <circle cx={cx} cy={cy} r="9" fill="url(#aiGaugeHub)" stroke="#090514" strokeWidth="2.5" />
          <circle cx={cx} cy={cy} r="3" fill="#090514" />
        </svg>

        {/* Center Readout: Big Percentage & Optimal Label */}
        <div className="text-center -mt-6 mb-1">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums">
              {systemHealth}%
            </span>
          </div>
          <div className="mt-0.5">
            <span className="text-xs font-black tracking-widest text-emerald-400 uppercase shadow-[0_0_10px_rgba(16,185,129,0.4)]">
              {performanceLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SECTION DIVIDER                                        */}
      {/* ========================================================= */}
      <div className="w-full border-t border-white/10 my-2" />

      {/* ========================================================= */}
      {/* 4. BOTTOM STATISTICS & SPARKLINE SECTION                  */}
      {/* ========================================================= */}
      <div className="space-y-2">
        {/* Left Side Stats & Right Side Stat */}
        <div className="flex items-start justify-between gap-3 px-1">
          {/* Left Side Stats (Text & Trend) */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums">
                79%
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                <span>▲ 2.31%</span>
              </span>
            </div>
            <p className="text-sm font-bold text-white mt-0.5 tracking-tight">
              Attendance
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Last 7 Days Trend
            </p>
          </div>

          {/* Requirement 2: Beautified 'VERIFIED SCAN / 100% OK' Widget */}
          <div className="relative p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-cyan-950/50 backdrop-blur-md border border-cyan-500/40 text-right flex flex-col justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all group min-w-[125px]">
            {/* Top Label with Shield Icon & Animated Checkmark inside */}
            <div className="flex items-center justify-end gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              {/* Shield with animated checkmark inside */}
              <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                <svg className="w-4 h-4 text-cyan-400 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                {/* Small animated checkmark inside shield */}
                <svg className="w-2.5 h-2.5 text-emerald-300 absolute inset-0 m-auto animate-pulse stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="tracking-widest">VERIFIED SCAN</span>
            </div>

            {/* '100% OK' glowing neon cyan text */}
            <div className="text-base sm:text-lg font-black font-mono tracking-tight mt-1 text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]">
              100% OK
            </div>
          </div>
        </div>

        {/* Mini Sparkline Graph (Theme dynamic cyan / green / blue) */}
        <div className="w-full h-18 sm:h-20 -mx-1 relative pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sparklineData}
              margin={{ top: 6, right: 6, left: 6, bottom: 2 }}
            >
              <defs>
                {/* Continuous Glowing Gradient matching theme chart color */}
                <linearGradient id="aiSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartStroke} stopOpacity={0.5} />
                  <stop offset="60%" stopColor={chartStroke} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={chartStroke} stopOpacity={0.0} />
                </linearGradient>
                {/* Soft Glowing Shadow */}
                <filter id="aiSparklineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor={chartStroke} floodOpacity={0.7} />
                </filter>
              </defs>

              {/* Subtle baseline/grid */}
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} vertical={false} />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900/95 border border-white/20 px-2.5 py-1 rounded-lg shadow-xl text-xs backdrop-blur-md">
                        <span className="text-slate-400 font-mono text-[10px] mr-1.5">{payload[0].payload.label}:</span>
                        <span className="font-bold font-mono" style={{ color: chartStroke }}>{payload[0].value}%</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke={chartStroke}
                strokeWidth={2.5}
                fill="url(#aiSparklineGrad)"
                filter="url(#aiSparklineGlow)"
                dot={{ r: 2.5, fill: chartStroke, stroke: '#090514', strokeWidth: 1.5 }}
                activeDot={{ r: 4.5, fill: '#ffffff', stroke: chartStroke, strokeWidth: 2 }}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action Notification Message if triggered */}
      {actionSuccessMessage && (
        <div className="my-1.5 p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs font-semibold text-emerald-300 text-center animate-fade-in">
          {actionSuccessMessage}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. BOTTOM ACTION BUTTONS                                  */}
      {/* ========================================================= */}
      <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between gap-2.5">
        {/* Take Action Button: Styled dynamically with Theme Button Gradient & Glowing Shadow */}
        <button
          type="button"
          onClick={handleTakeAction}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r ${activeTheme.buttonGradient} ${activeTheme.buttonShadow} text-white font-bold text-xs tracking-wide hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-white" />
          <span>Take Action</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>

        {/* Generate Report Button: Sleek Outline Button */}
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('reports')}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white font-semibold text-xs tracking-wide transition-all cursor-pointer active:scale-95 shadow-sm"
          style={{ borderColor: activeTheme.borderColor }}
        >
          <FileText className="w-3.5 h-3.5" style={{ color: activeTheme.primary }} />
          <span>Generate Report</span>
        </button>
      </div>

    </div>
  );
};
