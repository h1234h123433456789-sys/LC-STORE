import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDuration = 1200,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Stage 1: Play the vibrant gold burst animation (1.2s total)
    const exitTimer = setTimeout(() => {
      setIsClosing(true);
    }, minDuration);

    // Stage 2: Smooth fade out into the store
    const finishTimer = setTimeout(() => {
      setIsDone(true);
      if (onFinish) onFinish();
    }, minDuration + 350);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [minDuration, onFinish]);

  const handleSkip = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsDone(true);
      if (onFinish) onFinish();
    }, 250);
  };

  if (isDone) return null;

  return (
    <div
      onClick={handleSkip}
      role="button"
      tabIndex={0}
      aria-label="تخطي شاشة البداية"
      style={{ height: '100dvh', maxHeight: '-webkit-fill-available' }}
      className={`fixed inset-0 z-[999999] w-screen h-screen bg-[#070709] flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer transition-opacity duration-300 ease-out ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 1. Large Radiant Golden Background Aura */}
      <div 
        className="absolute w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] rounded-full pointer-events-none animate-aura-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, rgba(184, 138, 34, 0.18) 40%, rgba(117, 80, 10, 0.05) 70%, transparent 85%)',
        }}
      />

      {/* 2. Concentric Golden Halo Ring */}
      <div 
        className="absolute w-[240px] h-[240px] sm:w-[340px] sm:h-[340px] rounded-full border border-[#D4AF37]/35 pointer-events-none animate-halo-expand"
        style={{
          boxShadow: '0 0 35px rgba(212, 175, 55, 0.25), inset 0 0 35px rgba(212, 175, 55, 0.15)',
        }}
      />

      {/* 3. The Grand LC Emergence using 100% Native SVG (Guaranteed visible on ALL phones) */}
      <div className="relative flex flex-col items-center justify-center z-10 px-4">
        
        {/* Monogram SVG Stage with Spring Burst Animation */}
        <div className="relative animate-lc-burst">
          <svg 
            viewBox="0 0 300 180" 
            className="w-56 h-36 sm:w-72 sm:h-44 overflow-visible"
            style={{ filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.9))' }}
          >
            <defs>
              {/* 24K Royal Gold Gradient */}
              <linearGradient id="splashGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="15%" stopColor="#FFF8D6" />
                <stop offset="35%" stopColor="#F7E7B4" />
                <stop offset="60%" stopColor="#E5C158" />
                <stop offset="85%" stopColor="#C29B27" />
                <stop offset="100%" stopColor="#8F6A10" />
              </linearGradient>

              {/* Golden Bloom Filter */}
              <filter id="goldBloom" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feColorMatrix type="matrix" values="
                  1 0 0 0 0.83
                  0 1 0 0 0.68
                  0 0 1 0 0.21
                  0 0 0 0.5 0" in="blur" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glowing Halo Layer */}
            <text 
              x="150" 
              y="105" 
              textAnchor="middle" 
              dominantBaseline="central" 
              fontFamily="'Cinzel', 'Times New Roman', Georgia, serif" 
              fontSize="125" 
              fontWeight="900" 
              fill="#D4AF37" 
              opacity="0.6"
              filter="url(#goldBloom)"
              letterSpacing="6"
            >
              LC
            </text>

            {/* Main High-Contrast Metallic Gold Text Layer */}
            <text 
              x="150" 
              y="105" 
              textAnchor="middle" 
              dominantBaseline="central" 
              fontFamily="'Cinzel', 'Times New Roman', Georgia, serif" 
              fontSize="125" 
              fontWeight="900" 
              fill="url(#splashGoldGrad)" 
              letterSpacing="6"
            >
              LC
            </text>
          </svg>

          {/* 4-Point Brilliant Star Sparkle Pop */}
          <div 
            className="absolute top-1 -right-2 text-[#FFF8D6] animate-sparkle-pop"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(255, 248, 214, 1)) drop-shadow(0 0 20px rgba(212, 175, 55, 0.9))',
            }}
          >
            <Sparkles className="w-8 h-8 text-[#FFF8D6] fill-[#FFF8D6]" />
          </div>
        </div>

        {/* 4. Brand Typography */}
        <div className="space-y-1 text-center animate-brand-reveal mt-2">
          <div 
            className="text-base sm:text-lg font-bold uppercase text-white tracking-[0.35em]"
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              textShadow: '0 2px 8px rgba(0,0,0,0.9)',
            }}
          >
            LC STORE
          </div>
          <div className="text-xs sm:text-sm font-semibold tracking-[0.2em] text-[#D4AF37]">
            متجر LC الرسمي
          </div>
        </div>

        {/* 5. Minimalist 24K Gold Progress Line */}
        <div className="mt-6 w-36 sm:w-48 h-[2px] bg-white/10 rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#AA7A1E] via-[#FFF3C4] to-[#D4AF37] rounded-full shadow-[0_0_10px_#D4AF37]"
            style={{
              animation: 'progressFill 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            }}
          />
        </div>

        {/* Quick Skip Prompt */}
        <div className="mt-4 text-[10px] text-neutral-500 tracking-wider">
          انقر في أي مكان للدخول الفوري
        </div>
      </div>

      {/* Hardware-Accelerated Safe Keyframes (No blur filters that break mobile WebKit) */}
      <style>{`
        /* 1. Dramatic Spring Burst: scales up with clean GPU transform */
        @keyframes lcBurst {
          0% {
            transform: scale(0.3) translateY(25px);
            opacity: 0;
          }
          60% {
            transform: scale(1.08) translateY(-4px);
            opacity: 1;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        .animate-lc-burst {
          animation: lcBurst 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
          will-change: transform, opacity;
        }

        /* 2. Golden Aura Expansion */
        @keyframes auraPulse {
          0% {
            transform: scale(0.75);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.1);
            opacity: 0.9;
          }
        }
        .animate-aura-pulse {
          animation: auraPulse 1.8s ease-in-out infinite alternate;
          will-change: transform, opacity;
        }

        /* 3. Concentric Halo Expansion */
        @keyframes haloExpand {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0.6;
          }
        }
        .animate-halo-expand {
          animation: haloExpand 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }

        /* 4. Sparkle pop & twinkle */
        @keyframes sparklePop {
          0% {
            transform: scale(0) rotate(-45deg);
            opacity: 0;
          }
          60% {
            transform: scale(1.3) rotate(15deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.95;
          }
        }
        .animate-sparkle-pop {
          animation: sparklePop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both;
        }

        /* 5. Typography Reveal */
        @keyframes brandReveal {
          0% {
            transform: translateY(14px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-brand-reveal {
          animation: brandReveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }

        /* 6. Progress Line */
        @keyframes progressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};
