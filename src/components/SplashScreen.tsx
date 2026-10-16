import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDuration = 1800,
}) => {
  // CRITICAL FIX: Only show splash screen once upon fresh app open/boot!
  // NEVER show when switching from Admin to Storefront or toggling views.
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        // If already shown in this session, do not show again
        if (sessionStorage.getItem('lc_splash_shown') === 'true') {
          return false;
        }
      }
    } catch {
      // ignore storage errors
    }
    return true;
  });

  const [isExiting, setIsExiting] = useState(false);

  const dismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lc_splash_shown', 'true');
      }
    } catch {
      // ignore storage errors
    }
    setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, 400);
  };

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      dismiss();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, isVisible]);

  if (!isVisible) return null;

  return (
    <div
      onClick={dismiss}
      role="button"
      tabIndex={0}
      aria-label="تخطي شاشة البدء"
      className={`fixed inset-0 z-[99999] bg-[#070709] flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer transition-all duration-400 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient Luxury Gold Radial Aura in Background */}
      <div 
        className="absolute w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, rgba(168, 122, 30, 0.05) 50%, transparent 75%)',
          animation: 'splashAuraPulse 3s ease-in-out infinite alternate',
        }}
      />

      {/* Centerpiece: Pure Golden "LC" Monogram & Sparkle */}
      <div className="relative flex flex-col items-center justify-center z-10">
        
        {/* The LC Monogram Stage */}
        <div className="relative inline-block mb-3 animate-splash-logo">
          
          {/* Pure Serif "LC" Wordmark */}
          <span 
            className="block text-7xl sm:text-8xl font-extrabold tracking-wider"
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF5D6 20%, #F5DE88 45%, #D4AF37 70%, #AA7A1E 90%, #75500A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 4px 20px rgba(212, 175, 55, 0.4)) drop-shadow(0 15px 35px rgba(0,0,0,0.95))',
            }}
          >
            LC
          </span>

          {/* Shimmer Light Sweep across the letters */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 20%, rgba(255, 255, 255, 0.6) 50%, transparent 80%)',
              backgroundSize: '200% 100%',
              mixBlendMode: 'overlay',
              animation: 'splashShimmer 2s infinite',
            }}
          />

          {/* Golden 4-Point Star Sparkle nestled at the bottom-right */}
          <div 
            className="absolute -bottom-1 -right-3 text-[#FFF8D6] animate-splash-sparkle"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.9))',
            }}
          >
            <Sparkles className="w-6 h-6 text-[#F3E5AB] fill-[#FFF8D6]" />
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1.5 animate-splash-text text-center">
          <div className="text-sm sm:text-base font-bold tracking-[0.3em] uppercase text-white/95">
            LC STORE
          </div>
          <div className="text-[11px] sm:text-xs font-medium tracking-[0.2em] text-[#D4AF37]/90 uppercase font-sans">
            LUXURY BOUTIQUE
          </div>
          <div className="text-[10px] text-neutral-500 font-arabic pt-0.5">
            متجر إل سي الرسمي للأزياء الفاخرة
          </div>
        </div>

        {/* Elegant Minimalist Gold Hairline Progress Bar */}
        <div className="mt-8 w-36 sm:w-44 h-[2px] bg-white/10 rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#AA7A1E] via-[#F3E5AB] to-[#D4AF37] rounded-full"
            style={{
              animation: 'splashProgressFill 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            }}
          />
        </div>

        {/* Tap to skip prompt */}
        <div className="mt-4 text-[10px] text-neutral-600 tracking-wider">
          انقر في أي مكان للتخطي
        </div>
      </div>

      {/* Keyframe Styles */}
      <style>{`
        @keyframes splashAuraPulse {
          0% { transform: scale(0.92); opacity: 0.6; }
          100% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes splashShimmer {
          0% { background-position: -150% 0; }
          100% { background-position: 150% 0; }
        }
        @keyframes splashProgressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-splash-logo {
          animation: splashLogoIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes splashLogoIn {
          0% { transform: scale(0.85); opacity: 0; filter: blur(8px); }
          100% { transform: scale(1); opacity: 1; filter: blur(0px); }
        }
        .animate-splash-sparkle {
          animation: splashSparkleTwinkle 2s ease-in-out infinite alternate;
        }
        @keyframes splashSparkleTwinkle {
          0% { transform: scale(0.9) rotate(-10deg); opacity: 0.8; }
          100% { transform: scale(1.15) rotate(15deg); opacity: 1; }
        }
        .animate-splash-text {
          animation: splashTextIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }
        @keyframes splashTextIn {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
