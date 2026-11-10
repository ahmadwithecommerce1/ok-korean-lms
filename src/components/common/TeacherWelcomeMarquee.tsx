import React, { useState, useEffect } from 'react';
import { Volume2, Sparkles, X, Clock, Megaphone } from 'lucide-react';
import { WelcomeMessageSettings } from '../../types';
import { StorageService } from '../../services/storageService';
import { useAuth } from '../../context/AuthContext';

interface TeacherWelcomeMarqueeProps {
  forceShowForPreview?: boolean;
  previewSettings?: WelcomeMessageSettings;
}

export const TeacherWelcomeMarquee: React.FC<TeacherWelcomeMarqueeProps> = ({ 
  forceShowForPreview = false,
  previewSettings 
}) => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const [settings, setSettings] = useState<WelcomeMessageSettings>(() => 
    StorageService.getWelcomeMessageSettings()
  );
  const [isVisible, setIsVisible] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);

  // Subscribe to live welcome message settings from Firestore
  useEffect(() => {
    const unsub = StorageService.subscribeWelcomeMessageSettings((live) => {
      setSettings(live);
    });
    return () => unsub();
  }, []);

  const activeSettings = previewSettings || settings;

  // 2-Minute (120s) Session Timer logic
  useEffect(() => {
    if (!forceShowForPreview && !isTeacher) {
      setIsVisible(false);
      return;
    }

    if (!activeSettings.enabled || !activeSettings.message.trim()) {
      setIsVisible(false);
      return;
    }

    const DURATION_SECONDS = (activeSettings.durationMinutes || 2) * 60; // 120 seconds
    const storageKey = `ok_teacher_welcome_start_${user?.username || 'teacher'}`;
    const storedStart = sessionStorage.getItem(storageKey);
    const now = Date.now();

    let startTime = now;
    if (storedStart) {
      startTime = parseInt(storedStart, 10);
    } else {
      sessionStorage.setItem(storageKey, String(now));
    }

    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const remaining = Math.max(0, DURATION_SECONDS - elapsedSeconds);

    if (remaining <= 0 && !forceShowForPreview) {
      setIsVisible(false);
      return;
    }

    setSecondsRemaining(forceShowForPreview ? 120 : remaining);
    setIsVisible(true);

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!forceShowForPreview) {
            setIsVisible(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSettings, isTeacher, forceShowForPreview, user?.username]);

  if (!isVisible && !forceShowForPreview) {
    return null;
  }

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const speedSeconds = (() => {
    switch (activeSettings.speed) {
      case 'glacial': return 120;
      case 'very_very_slow':
      case 'ultra_slow': return 90;
      case 'very_slow': return 60;
      case 'slow': return 38;
      case 'medium':
      case 'normal': return 20;
      case 'high': return 10;
      case 'fast': return 5;
      default: return 20;
    }
  })();

  const speedClass = (() => {
    switch (activeSettings.speed) {
      case 'glacial': return 'animate-marquee-glacial';
      case 'very_very_slow':
      case 'ultra_slow': return 'animate-marquee-very-very-slow';
      case 'very_slow': return 'animate-marquee-very-slow';
      case 'slow': return 'animate-marquee-slow';
      case 'medium':
      case 'normal': return 'animate-marquee-medium';
      case 'high': return 'animate-marquee-high';
      case 'fast': return 'animate-marquee-fast';
      default: return 'animate-marquee-medium';
    }
  })();

  return (
    <div className="relative z-40 bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-purple-950/95 border-b border-purple-500/30 text-white shadow-md backdrop-blur-md overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3">
        {/* Left Badge: Faculty Broadcast Tag */}
        <div className="flex items-center gap-2 shrink-0 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
          <Megaphone className="w-3.5 h-3.5 text-purple-300 animate-bounce" />
          <span className="text-[11px] font-black uppercase tracking-wider text-purple-200 hidden sm:inline">
            Faculty Notice
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-black/30 px-1.5 py-0.5 rounded">
            <Clock className="w-2.5 h-2.5" />
            <span>{formatCountdown(secondsRemaining)}</span>
          </span>
        </div>

        {/* Center: Marquee Scrolling Message with Dynamic animation-duration */}
        <div className="flex-1 overflow-hidden whitespace-nowrap relative select-none">
          <div 
            className={`inline-block ${speedClass} pl-[100%] hover:[animation-play-state:paused] cursor-default`}
            style={{ animationDuration: `${speedSeconds}s` }}
          >
            <span className="text-xs sm:text-sm font-semibold tracking-wide text-white drop-shadow-xs flex items-center gap-6">
              <span>{activeSettings.message}</span>
              <span className="opacity-40">✦</span>
              <span>{activeSettings.message}</span>
            </span>
          </div>
        </div>

        {/* Right: Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors shrink-0 cursor-pointer"
          title="Dismiss notification"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
