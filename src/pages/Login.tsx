import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  GraduationCap,
  Fingerprint,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { AuroraBackground } from '../components/common/AuroraBackground';
import { BlurTextScroller3D } from '../components/common/BlurTextScroller3D';

export const Login: React.FC = () => {
  const { login } = useAuth();

  const [portal, setPortal] = useState<UserRole>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Input focus states for active glowing pulse border animation
  const [isUsernameActive, setIsUsernameActive] = useState(false);
  const [isPasswordActive, setIsPasswordActive] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const res = login(username, password, portal);
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please verify credentials.');
        setIsSubmitting(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen w-full font-sans transition-colors duration-300 selection:bg-cyan-500 selection:text-white relative flex items-center justify-center dark isolate bg-transparent text-slate-100">
      
      {/* 1. Subtle, Calm & Elegant Aurora Gradient Background */}
      <AuroraBackground />

      {/* Main Grid: Split Screen on Desktop, Vertical Single Screen on Mobile */}
      <div className="w-full h-full min-h-screen grid grid-cols-1 md:grid-cols-2 relative z-10 pointer-events-auto">

        {/* ========================================================= */}
        {/* LEFT COLUMN: Hero Copy & Features (Calm, High-Tech Feel)  */}
        {/* ========================================================= */}
        <div className="hidden md:flex relative flex-col justify-between p-10 lg:p-14 bg-black/15 text-white border-r border-slate-800/40 backdrop-blur-[2px]">

          {/* Top Brand Header with Glowing Ring Behind Logo */}
          <div className="relative z-10 flex items-center gap-4">
            <div className="relative w-13 h-13 flex items-center justify-center shrink-0">
              {/* Rotating Glow Ring behind logo */}
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-purple-500 via-cyan-400 to-indigo-500 blur-sm opacity-80 animate-spin-glow" />
              
              <div className="relative w-12 h-12 rounded-full bg-white p-0.5 shadow-2xl flex items-center justify-center z-10 ring-2 ring-white/50 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="OK Korean Language Center Logo"
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>OK KOREAN</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  LMS v4.2
                </span>
              </h1>
              <p className="text-xs text-indigo-200/80 font-medium font-korean">
                오케이 한국어 학원 • 스마트 교육 포털
              </p>
            </div>
          </div>

          {/* Central Animated Hero Copy */}
          <div className="relative z-10 my-auto py-6 max-w-lg space-y-4">
            {/* High-tech badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Welcome to the Future of Learning</span>
            </div>

            {/* 3D Blur Text Scroller (Continuous Vertical Loop with 3D Perspective & Blur) */}
            <BlurTextScroller3D />



            {/* Feature Cards: 3D Hover Lift & Vivid Glowing Aura */}
            <div className="grid grid-cols-1 gap-3 pt-3">
              {/* Feature 1: ZKTeco K40 */}
              <div className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/75 border border-white/10 hover:border-cyan-400/60 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_14px_30px_-5px_rgba(6,182,212,0.35),0_0_20px_rgba(6,182,212,0.25)] cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-110 group-hover:bg-cyan-500/25 transition-transform duration-300 animate-icon-pulse">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block group-hover:text-cyan-300 transition-colors">ZKTeco K40 ADMS Push Sync</span>
                  <span className="text-slate-400 text-[11px]">Real-time Red-to-Green biometric attendance logs</span>
                </div>
              </div>

              {/* Feature 2: TOPIK I & II */}
              <div className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/75 border border-white/10 hover:border-purple-400/60 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_14px_30px_-5px_rgba(168,85,247,0.35),0_0_20px_rgba(168,85,247,0.25)] cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)] group-hover:scale-110 group-hover:bg-purple-500/25 transition-transform duration-300 animate-icon-pulse" style={{ animationDelay: '1s' }}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block group-hover:text-purple-300 transition-colors">TOPIK I & II Examination Matrix</span>
                  <span className="text-slate-400 text-[11px]">Vocab, Grammar, Reading, Sentences, Listening & MCQs</span>
                </div>
              </div>

              {/* Feature 3: Bulk Excel */}
              <div className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/75 border border-white/10 hover:border-emerald-400/60 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_14px_30px_-5px_rgba(16,185,129,0.35),0_0_20px_rgba(16,185,129,0.25)] cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-110 group-hover:bg-emerald-500/25 transition-transform duration-300 animate-icon-pulse" style={{ animationDelay: '2s' }}>
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block group-hover:text-emerald-300 transition-colors">Bulk Excel SheetJS Ingestion</span>
                  <span className="text-slate-400 text-[11px]">Direct Firestore batch upload with verification queuing</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 flex items-center justify-between text-xs text-indigo-200/60 pt-4 border-t border-indigo-950/60">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>TLS 1.3 • AES-256 Cloud Infrastructure</span>
            </span>
            <span className="font-mono text-cyan-400/80">OK-KOREAN-2026</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Ultra-Premium Floating Glassmorphic Login Box */}
        {/* ========================================================= */}
        <div className="relative flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 lg:p-12 min-h-screen text-white">

          {/* Mobile-Only Header */}
          <div className="md:hidden flex flex-col items-center text-center mb-5 relative z-10">
            <div className="relative w-15 h-15 flex items-center justify-center mb-2">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 blur-sm opacity-80 animate-spin-glow" />
              <div className="relative w-14 h-14 rounded-full bg-white p-0.5 shadow-xl flex items-center justify-center z-10 ring-2 ring-white/50 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="OK Korean Language Center Logo"
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <h1 className="text-lg font-black tracking-tight text-white">
              OK Korean Language Center
            </h1>
            <p className="text-xs text-cyan-300 font-medium">
              Enterprise Academic Workspace
            </p>
          </div>

          {/* ========================================================= */}
          {/* LOGIN CARD: Gentle Floating Animation (Up & Down)         */}
          {/* bg-black/40, backdrop-blur-2xl, soft glowing border       */}
          {/* ========================================================= */}
          <div className="w-full max-w-sm mx-auto relative z-10 animate-gentle-float">
            
            {/* Soft, slow-pulsing glow aura behind the login box */}
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-r from-purple-600/25 via-indigo-600/20 to-cyan-500/25 blur-2xl opacity-70 animate-pulse pointer-events-none -z-10" />

            {/* Subtle slow-pulsing glowing border wrapper (Purple / Cyan) */}
            <div className="rounded-3xl p-[1.5px] border transition-all duration-500 animate-login-border-glow bg-gradient-to-br from-purple-500/40 via-cyan-500/30 to-indigo-500/40">
              
              {/* Deep Glassmorphic Box Content: bg-black/40 with backdrop-blur-2xl */}
              <div className="bg-black/40 backdrop-blur-2xl rounded-[calc(1.5rem-1.5px)] p-6 sm:p-8 border border-white/10 shadow-2xl">
                
                {/* Card Header */}
                <div className="text-center mb-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 text-xs font-bold mb-2 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
                    <span>Secure Access</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Sign In to Workspace
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Enter your credentials to enter your role console
                  </p>
                </div>

                {/* Smooth Sliding Toggle for Admin / Teacher */}
                <div className="relative grid grid-cols-2 p-1 bg-black/60 rounded-2xl mb-5 border border-white/10 shadow-inner">
                  {/* Sliding Pill Indicator */}
                  <div 
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-600/40 transition-transform duration-300 ease-out ${
                      portal === 'admin' ? 'translate-x-1' : 'translate-x-[calc(100%+2px)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setPortal('admin')}
                    className={`relative z-10 py-2 px-3 text-xs font-bold rounded-xl transition-colors duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                      portal === 'admin'
                        ? 'text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortal('teacher')}
                    className={`relative z-10 py-2 px-3 text-xs font-bold rounded-xl transition-colors duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                      portal === 'teacher'
                        ? 'text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Teacher</span>
                  </button>
                </div>

                {/* Error Notification Alert */}
                {error && (
                  <div className="mb-4 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5 animate-bounce shadow-lg shadow-rose-950/40">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-medium leading-tight">{error}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username Input with Active Glowing Pulse on Focus/Typing */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onFocus={() => setIsUsernameActive(true)}
                        onBlur={() => setIsUsernameActive(false)}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-black/60 text-white placeholder-slate-400 text-xs sm:text-sm transition-all duration-300 shadow-inner focus:outline-none ${
                          isUsernameActive 
                            ? 'border-cyan-400 ring-2 ring-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.35)]' 
                            : 'border-white/15 hover:border-white/30'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Password Input with Active Glowing Pulse on Focus/Typing */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onFocus={() => setIsPasswordActive(true)}
                        onBlur={() => setIsPasswordActive(false)}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-black/60 text-white placeholder-slate-400 text-xs sm:text-sm transition-all duration-300 shadow-inner focus:outline-none ${
                          isPasswordActive 
                            ? 'border-cyan-400 ring-2 ring-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.35)]' 
                            : 'border-white/15 hover:border-white/30'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-md border-white/20 bg-black/40 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <span>Remember session</span>
                    </label>
                  </div>

                  {/* Submit Button with Shiny Shifting Gradient & Soft Glow */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="relative overflow-hidden w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 via-cyan-500 to-purple-600 hover:from-purple-500 hover:via-cyan-400 hover:to-indigo-500 animate-shiny-btn shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.65)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed group mt-2"
                  >
                    {/* Continuous Shimmer Light Sheen */}
                    <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none animate-shimmer-sweep" />

                    {isSubmitting ? (
                      <div className="relative z-10 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying Credentials...</span>
                      </div>
                    ) : (
                      <div className="relative z-10 flex items-center gap-2">
                        <span>Sign In to {portal === 'admin' ? 'Admin' : 'Teacher'} Portal</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LoginPage = Login;
export default Login;
