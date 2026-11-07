import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  GraduationCap, 
  BookOpen, 
  Check, 
  ArrowRight,
  Database,
  Cpu
} from 'lucide-react';
import { UserSession } from '../../types';

interface SystemLoadingScreenProps {
  user: UserSession;
  onComplete: () => void;
}

interface StepItem {
  id: number;
  labelEn: string;
  labelKr: string;
  icon: React.ElementType;
}

const STEPS: StepItem[] = [
  { 
    id: 1, 
    labelEn: 'Verifying Security Credentials & Role Permissions', 
    labelKr: '보안 자격 증명 및 권한 검증 완료',
    icon: ShieldCheck 
  },
  { 
    id: 2, 
    labelEn: 'Synchronizing Batches, Students & Attendance Ledgers', 
    labelKr: '학습자 명부 및 일일 출결 기록 동기화',
    icon: Database 
  },
  { 
    id: 3, 
    labelEn: 'Calibrating Examination Matrices & MCQs Engine', 
    labelKr: '주간 평가 및 객관식(MCQs) 채점 시스템 구성',
    icon: Cpu 
  },
  { 
    id: 4, 
    labelEn: 'Launching Institutional Portal Workspace', 
    labelKr: '오케이 한국어 학원 종합 시스템 접속 준비 완료',
    icon: Sparkles 
  },
];

export const SystemLoadingScreen: React.FC<SystemLoadingScreenProps> = ({ user, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    // Stage 1: Quick verification (0% -> 35%)
    const t1 = setTimeout(() => {
      setProgress(35);
      setActiveStepIndex(1);
    }, 280);

    // Stage 2: Syncing records (35% -> 70%)
    const t2 = setTimeout(() => {
      setProgress(70);
      setActiveStepIndex(2);
    }, 650);

    // Stage 3: Setting up exams & MCQs (70% -> 95%)
    const t3 = setTimeout(() => {
      setProgress(95);
      setActiveStepIndex(3);
    }, 1050);

    // Stage 4: Ready! (95% -> 100%)
    const t4 = setTimeout(() => {
      setProgress(100);
      setActiveStepIndex(4);
    }, 1400);

    // Smooth exit
    const t5 = setTimeout(() => {
      setIsFinishing(true);
    }, 1600);

    const t6 = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [onComplete]);

  const isAdmin = user.role === 'admin';

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white overflow-hidden transition-all duration-500 ${
        isFinishing ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Decorative Korean Hangul Motifs */}
      <div className="absolute inset-0 select-none pointer-events-none overflow-hidden opacity-5 font-korean">
        <span className="absolute -top-10 -left-10 text-[180px] font-black text-indigo-400">배움</span>
        <span className="absolute top-1/4 -right-20 text-[220px] font-black text-rose-500">한글</span>
        <span className="absolute -bottom-16 left-1/3 text-[200px] font-black text-amber-300">미래</span>
        <span className="absolute bottom-10 right-10 text-[140px] font-black text-indigo-300">성공</span>
      </div>

      {/* Ambient Gradient Glows (Korean Taegeuk Red & Blue palette) */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/25 via-blue-700/15 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-rose-600/20 via-pink-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Skip Button in upper corner */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-400 hover:text-white border border-slate-700/60 backdrop-blur-md transition-all shadow-md cursor-pointer group"
        title="Direct entry"
      >
        <span>Skip</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Main Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-lg mx-4 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800/90 shadow-2xl backdrop-blur-2xl">
        {/* Animated Brand Emblem Centerpiece */}
        <div className="relative flex flex-col items-center text-center">
          {/* Glowing Orbit Rings */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center mb-6">
            {/* Outer expanding ripple */}
            <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-ping opacity-30" />
            
            {/* Spinning decorative orbit */}
            <div className="absolute -inset-2 rounded-full border-2 border-dashed border-indigo-500/40 animate-[spin_8s_linear_infinite]" />
            <div className="absolute -inset-3.5 rounded-full border border-rose-500/30 animate-[spin_12s_linear_infinite_reverse]" />
            
            {/* Soft backdrop glow */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-rose-500 blur-lg opacity-60 animate-pulse" />

            {/* Official Logo Card */}
            <div className="relative w-24 h-24 sm:w-26 sm:h-26 rounded-full bg-white p-2 shadow-2xl ring-4 ring-indigo-400/40 flex items-center justify-center overflow-hidden">
              <img
                src="/assets/aistudio/logo_-_Copy_d3a62f9d.png"
                alt="OK Korean Language Center"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Mini floating Korean flag dot */}
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-900 border-2 border-indigo-500 text-[10px] shadow-lg">
              🇰🇷
            </div>
          </div>

          {/* Academy Brand Title */}
          <div className="space-y-1 mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold tracking-wide">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>OK KOREAN LANGUAGE CENTRE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isAdmin ? 'Principal Executive Portal' : 'Faculty Classroom Workspace'}
            </h2>
            <p className="text-xs text-indigo-200/70 font-medium font-korean">
              오케이 한국어 학원 • 스마트 학사 관리 시스템
            </p>
          </div>

          {/* User Identity Welcome Badge */}
          <div className="w-full p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 mb-6 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 font-bold text-xs">
                {isAdmin ? <GraduationCap className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  <span>{user.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-700 text-slate-300 font-normal">
                    @{user.username}
                  </span>
                </p>
                <p className="text-[10px] text-slate-400">
                  {isAdmin ? 'Administrator Authority' : 'Assigned Instructor'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Authenticated</span>
            </div>
          </div>

          {/* Progress Bar & Percentage */}
          <div className="w-full space-y-2 mb-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                {progress < 100 ? 'System Loading...' : 'All Modules Ready!'}
              </span>
              <span className="font-mono font-bold text-indigo-300 tabular-nums text-sm">
                {progress}%
              </span>
            </div>

            {/* Glowing Track */}
            <div className="relative h-2.5 w-full bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 transition-all duration-500 ease-out shadow-lg shadow-indigo-500/50 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                {/* Shimmer light streak */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
              </div>
            </div>
          </div>

          {/* Milestones Step List */}
          <div className="w-full space-y-2 text-left">
            {STEPS.map((step, idx) => {
              const isDone = activeStepIndex > idx || progress === 100;
              const isCurrent = activeStepIndex === idx && progress < 100;

              return (
                <div
                  key={step.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                      : isCurrent
                      ? 'bg-indigo-950/40 border-indigo-500/40 text-white shadow-sm ring-1 ring-indigo-500/20'
                      : 'bg-slate-900/30 border-slate-800/40 text-slate-500 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-xs transition-colors ${
                        isDone
                          ? 'bg-emerald-500 text-slate-950'
                          : isCurrent
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      ) : (
                        <span className="text-[10px]">{step.id}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-indigo-200' : ''}`}>
                        {step.labelEn}
                      </p>
                      <p className="text-[10px] text-slate-400/80 truncate font-korean">
                        {step.labelKr}
                      </p>
                    </div>
                  </div>

                  {isDone && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Subtext */}
          <div className="mt-6 pt-4 border-t border-slate-800/60 w-full flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
              Academic Management & TOPIK Grading Ready
            </span>
            <span className="font-mono text-[10px] text-slate-400">v4.5 Enterprise</span>
          </div>
        </div>
      </div>
    </div>
  );
};
