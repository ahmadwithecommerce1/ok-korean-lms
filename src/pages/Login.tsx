import React, { useState, useEffect } from 'react';
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
  Sun,
  Moon,
  GraduationCap,
  Fingerprint,
  FileSpreadsheet,
  X,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [portal, setPortal] = useState<UserRole>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Give a smooth 400ms button state transition before full-screen LoadingPage kicks in
    setTimeout(() => {
      const res = login(username, password, portal);
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please verify credentials.');
        setIsSubmitting(false);
      }
    }, 400);
  };

  // Star particles for glowing mesh background
  const particles = [
    { id: 1, top: '15%', left: '18%', size: 6, delay: '0s' },
    { id: 2, top: '38%', left: '72%', size: 8, delay: '1.2s' },
    { id: 3, top: '65%', left: '25%', size: 5, delay: '0.8s' },
    { id: 4, top: '82%', left: '80%', size: 7, delay: '2.4s' },
    { id: 5, top: '24%', left: '55%', size: 4, delay: '1.6s' },
    { id: 6, top: '50%', left: '12%', size: 6, delay: '2s' },
  ];

  return (
    <div className={`min-h-screen w-full font-sans transition-colors duration-300 selection:bg-purple-500 selection:text-white relative overflow-hidden flex items-center justify-center ${
      isDark ? 'dark bg-[#060814] text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>

      {/* Floating Theme Toggle (Always Accessible in Top-Right) */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle Theme"
        className="fixed top-4 right-4 z-40 p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
        title={isDark ? 'Switch to Day / Light Mode' : 'Switch to Night / Dark Mode'}
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-amber-400" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-600" />
        )}
      </button>

      {/* Main Grid Container: Split Screen on Desktop, Vertical Single Screen on Mobile */}
      <div className="w-full h-full min-h-screen grid grid-cols-1 md:grid-cols-2">

        {/* ========================================================= */}
        {/* LEFT COLUMN: Animated Glowing Mesh & Branding (Hidden on Mobile) */}
        {/* ========================================================= */}
        <div className="hidden md:flex relative flex-col justify-between p-10 lg:p-14 overflow-hidden bg-gradient-to-br from-[#060814] via-[#0d0f2b] to-[#120f38] text-white border-r border-indigo-950/60">
          
          {/* Animated Glowing Mesh Blobs (Continuous slow movement) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 -left-20 w-[440px] h-[440px] rounded-full bg-purple-600/30 blur-[120px] animate-mesh-1" />
            <div className="absolute bottom-10 -right-20 w-[500px] h-[500px] rounded-full bg-indigo-600/25 blur-[130px] animate-mesh-2" />
            <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-88 h-88 rounded-full bg-pink-600/20 blur-[100px] animate-pulse" />
            
            {/* Ambient Star Particles */}
            {particles.map(p => (
              <div
                key={p.id}
                className="absolute rounded-full bg-white/60 animate-particle shadow-[0_0_8px_white]"
                style={{
                  top: p.top,
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  animationDelay: p.delay,
                }}
              />
            ))}

            {/* Subtle Grid Pattern Overlay */}
            <div 
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                backgroundSize: '36px 36px',
              }}
            />
          </div>

          {/* Top Brand Header with Rotating Glow Behind Logo */}
          <div className="relative z-10 flex items-center gap-4">
            <div className="relative w-13 h-13 flex items-center justify-center shrink-0">
              {/* Rotating Glow Effect behind the OK Korean logo */}
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 blur-sm opacity-75 animate-spin-glow" />
              
              <div className="relative w-12 h-12 rounded-2xl bg-white p-1.5 shadow-2xl flex items-center justify-center z-10 ring-1 ring-white/30">
                <img
                  src="/assets/aistudio/logo_-_Copy_d3a62f9d.png"
                  alt="OK Korean Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>OK KOREAN</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  LMS v4.2
                </span>
              </h1>
              <p className="text-xs text-indigo-300/80 font-medium font-korean">
                오케이 한국어 학원 • 스마트 교육 포털
              </p>
            </div>
          </div>

          {/* Central Animated Hero Copy */}
          <div className="relative z-10 my-auto py-6 max-w-lg space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Welcome to the Future of Learning</span>
            </div>

            {/* Main Heading with Premium Continuous Shiny Sweep on 'Enterprise Precision.' */}
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight">
              Master the Korean Language with{' '}
              <span className="animate-shiny-sweep font-black tracking-tight">
                Enterprise Precision.
              </span>
            </h2>

            {/* Subtitle with subtle repeating fade-in / fade-out */}
            <p className="text-sm lg:text-base text-indigo-200/90 font-normal leading-relaxed animate-subtle-fade">
              Institutional portal for EPS-TOPIK aspirants, biometric attendance synchronization, real-time weekly evaluations, and automated transcripts.
            </p>

            {/* 3. Floating Animations for Feature Cards with Glowing Border on Hover */}
            <div className="grid grid-cols-1 gap-3 pt-4">
              {/* Feature 1: ZKTeco K40 */}
              <div 
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 hover:border-purple-400/70 hover:shadow-[0_0_25px_rgba(168,85,247,0.35)] hover:scale-[1.01] animate-float"
                style={{ animationDelay: '0s' }}
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">ZKTeco K40 ADMS Push Sync</span>
                  <span className="text-slate-400 text-[11px]">Real-time Red-to-Green biometric attendance logs</span>
                </div>
              </div>

              {/* Feature 2: TOPIK I & II */}
              <div 
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 hover:border-indigo-400/70 hover:shadow-[0_0_25px_rgba(99,102,241,0.35)] hover:scale-[1.01] animate-float"
                style={{ animationDelay: '1.5s' }}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">TOPIK I & II Examination Matrix</span>
                  <span className="text-slate-400 text-[11px]">Vocab, Grammar, Reading, Sentences, Listening & MCQs</span>
                </div>
              </div>

              {/* Feature 3: Bulk Excel */}
              <div 
                className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 hover:border-emerald-400/70 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:scale-[1.01] animate-float"
                style={{ animationDelay: '3s' }}
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-white block">Bulk Excel SheetJS Ingestion</span>
                  <span className="text-slate-400 text-[11px]">Direct Firestore batch upload with verification queuing</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 flex items-center justify-between text-xs text-indigo-300/60 pt-4 border-t border-indigo-950/60">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>TLS 1.3 • AES-256 Cloud Infrastructure</span>
            </span>
            <span className="font-mono">OK-KOREAN-2026</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Sleek Glassmorphism Login Card (PC & Mobile) */}
        {/* ========================================================= */}
        <div className="relative flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 lg:p-12 min-h-screen overflow-y-auto bg-slate-900/50 dark:bg-[#050713]/90 transition-colors">
          
          {/* Enhanced Mesh Gradient Glows behind the login card for superior depth */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] rounded-full bg-purple-600/15 dark:bg-purple-600/20 blur-[130px] animate-mesh-1" />
            <div className="absolute bottom-1/4 right-1/4 w-[380px] h-[380px] rounded-full bg-indigo-600/15 dark:bg-indigo-600/20 blur-[110px] animate-mesh-2" />
            <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-pink-600/10 dark:bg-pink-600/15 blur-[90px]" />
          </div>

          {/* Mobile-Only Compact Header (Ensures zero scroll on mobile) */}
          <div className="md:hidden flex flex-col items-center text-center mb-5 animate-fade-in-up">
            <div className="relative w-15 h-15 flex items-center justify-center mb-2">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 blur-sm opacity-70 animate-spin-glow" />
              <div className="relative w-14 h-14 rounded-2xl bg-white p-2 shadow-xl flex items-center justify-center z-10">
                <img
                  src="/assets/aistudio/logo_-_Copy_d3a62f9d.png"
                  alt="OK Korean Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              OK Korean Language Center
            </h1>
            <p className="text-xs text-slate-600 dark:text-purple-300 font-medium">
              Enterprise Academic Workspace
            </p>
          </div>

          {/* Sleek Dark Glassmorphism Login Card with Thin Animated Neon Border & Color-Shifting Glow */}
          <div className="w-full max-w-sm mx-auto rounded-3xl p-6 sm:p-8 bg-[#090d24]/90 dark:bg-[#070a1f]/90 backdrop-blur-2xl border-[1px] animate-neon-glow transition-transform duration-300 hover:scale-[1.02] relative z-10 text-white">
            
            {/* Card Header with Slide-up Animation */}
            <div className="text-center mb-5 animate-fade-in-up">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold mb-2 border border-purple-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Secure Access</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Sign In to Workspace
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Enter your credentials to enter your role console
              </p>
            </div>

            {/* Smooth Sliding Background Animation for Admin / Teacher Toggle */}
            <div className="relative grid grid-cols-2 p-1 bg-black/50 rounded-2xl mb-5 border border-white/10">
              {/* Sliding Pill Indicator */}
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-purple-600 shadow-md shadow-purple-600/30 transition-transform duration-300 ease-out ${
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
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5 animate-bounce">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-medium leading-tight">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={portal === 'admin' ? 'Ok-Korean' : 'e.g. rashid.minhas'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-300 shadow-xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-200">
                    Password
                  </label>
                  {/* Forgot Password Link */}
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 hover:underline cursor-pointer transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-300 shadow-xs"
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
                    className="w-4 h-4 rounded-md border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span>Remember session</span>
                </label>
              </div>

              {/* Submit Button with Continuous Shimmer/Shine Sweep & Smooth Spinner Transition */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="relative overflow-hidden w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed group mt-2"
              >
                {/* Continuous Shimmer Light Sweep */}
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none animate-shimmer-sweep" />

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

      {/* Forgot Password Modal (Clean Centered Information Only) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 sm:p-8 shadow-2xl relative text-center text-slate-900 dark:text-white flex flex-col items-center">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 border border-purple-200/60 dark:border-purple-800/60 shadow-xs">
              <HelpCircle className="w-7 h-7" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Password Reset Assistance
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed max-w-xs">
              Please contact the Administrator to reset your password.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export const LoginPage = Login;
export default Login;
