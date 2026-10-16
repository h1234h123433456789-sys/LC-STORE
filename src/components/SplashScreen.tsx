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
  const [isClosing, setIsClosing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Stage 1: Run the glorious gold emergence and shimmer animation
    const exitTimer = setTimeout(() => {
      setIsClosing(true);
    }, minDuration);

    // Stage 2: Smooth cinematic dissolve into the store
    const finishTimer = setTimeout(() => {
      setIsDone(true);
      if (onFinish) onFinish();
    }, minDuration + 500);

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
    }, 400);
  };

  if (isDone) return null;

  return (
    <div
      onClick={handleSkip}
      role="button"
      tabIndex={0}
      aria-label="تخطي شاشة البداية"
      className={`fixed inset-0 z-[999999] bg-[#050507] flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer transition-all duration-500 ease-out ${
        isClosing
          ? 'opacity-0 scale-105 pointer-events-none filter blur-[6px]'
          : 'opacity-100 scale-100 filter blur-0'
      }`}
    >
      {/* 1. Ambient Expanding Golden Radial Aura */}
      <div 
        className="absolute w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.35) 0%, rgba(184, 138, 34, 0.15) 35%, rgba(117, 80, 10, 0.05) 60%, transparent 80%)',
          animation: 'auraBurst 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite alternate',
        }}
      />

      {/* 2. Concentric Golden Halo Rings for Depth */}
      <div 
        className="absolute w-[260px] h-[260px] sm:w-[360px] sm:h-[360px] rounded-full border border-[#D4AF37]/20 pointer-events-none animate-halo-expand"
        style={{
          boxShadow: '0 0 45px rgba(212, 175, 55, 0.12), inset 0 0 45px rgba(212, 175, 55, 0.08)',
        }}
      />

      {/* 3. The Grand LC Emergence (انبثاق الحروف الملكية وتدرج الإضاءة) */}
      <div className="relative flex flex-col items-center justify-center z-10 px-4">
        
        {/* Monogram Stage with Spring Burst and Shimmer */}
        <div className="relative inline-block mb-3 animate-lc-burst">
          
          {/* Intense 24K Royal Gold Embossed Serif Typography */}
          <span 
            className="block text-8xl sm:text-9xl font-extrabold tracking-wider"
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8D6 15%, #F7E7B4 35%, #E5C158 55%, #C29B27 75%, #8F6A10 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 35px rgba(212, 175, 55, 0.6)) drop-shadow(0 15px 40px rgba(0,0,0,0.95))',
            }}
          >
            LC
          </span>

          {/* Sweeping Shimmer Light Beam across the gold surface */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.75) 50%, transparent 80%)',
              backgroundSize: '200% 100%',
              mixBlendMode: 'overlay',
              animation: 'goldGleamSweep 1.8s ease-in-out infinite',
            }}
          />

          {/* 4-Point Brilliant Star Sparkle with Glowing Core */}
          <div 
            className="absolute -top-1 -right-3 text-[#FFF8D6] animate-sparkle-pop"
            style={{
              filter: 'drop-shadow(0 0 12px rgba(255, 248, 214, 1)) drop-shadow(0 0 25px rgba(212, 175, 55, 0.8))',
            }}
          >
            <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-[#FFF8D6] fill-[#FFF8D6]" />
          </div>
        </div>

        {/* 4. Brand Typography with Elegant Letter-Spacing Expansion */}
        <div className="space-y-1.5 text-center animate-brand-reveal">
          <div 
            className="text-base sm:text-lg font-bold uppercase text-white/95"
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              letterSpacing: '0.35em',
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            }}
          >
            LC STORE
          </div>
          <div 
            className="text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#D4AF37] uppercase font-sans"
            style={{
              textShadow: '0 0 15px rgba(212, 175, 55, 0.4)',
            }}
          >
            متجر LC الرسمي
          </div>
          <div className="text-[11px] text-neutral-400 font-arabic pt-0.5 tracking-wider">
            أفخم المعروضات والأزياء الراقية
          </div>
        </div>

        {/* 5. Minimalist 24K Gold Progress Hairline */}
        <div className="mt-8 w-40 sm:w-52 h-[2px] bg-white/10 rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#AA7A1E] via-[#FFF3C4] to-[#D4AF37] rounded-full shadow-[0_0_12px_#D4AF37]"
            style={{
              animation: 'progressFill 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            }}
          />
        </div>

        {/* Skip hint */}
        <div className="mt-5 text-[10px] text-neutral-500 tracking-wider">
          انقر في أي مكان للتخطي الفوري
        </div>
      </div>

      {/* Embedded High-Performance Keyframes */}
      <style>{`
        /* 1. Grand LC Burst: scales up from deep focus with subtle bounce */
        @keyframes lcBurst {
          0% {
            transform: scale(0.35) translateY(20px);
            opacity: 0;
            filter: blur(14px) brightness(1.8);
          }
          65% {
            transform: scale(1.06) translateY(-4px);
            opacity: 1;
            filter: blur(0px) brightness(1.2);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
            filter: blur(0px) brightness(1);
          }
        }
        .animate-lc-burst {
          animation: lcBurst 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* 2. Golden Aura Expansion */
        @keyframes auraBurst {
          0% {
            transform: scale(0.75);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.85;
          }
          100% {
            transform: scale(1);
            opacity: 0.7;
          }
        }

        /* 3. Concentric Halo Expansion */
        @keyframes haloExpand {
          0% {
            transform: scale(0.85);
            opacity: 0;
          }
          60% {
            transform: scale(1.05);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 0.5;
          }
        }
        .animate-halo-expand {
          animation: haloExpand 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }

        /* 4. Gleam light beam sweep across the gold letters */
        @keyframes goldGleamSweep {
          0% {
            background-position: -150% 0;
          }
          50%, 100% {
            background-position: 150% 0;
          }
        }

        /* 5. Sparkle pop & twinkle */
        @keyframes sparklePop {
          0% {
            transform: scale(0) rotate(-45deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.25) rotate(15deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.95;
          }
        }
        .animate-sparkle-pop {
          animation: sparklePop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s both;
        }

        /* 6. Typography Reveal */
        @keyframes brandReveal {
          0% {
            transform: translateY(16px);
            opacity: 0;
            filter: blur(4px);
          }
          100% {
            transform: translateY(0);
            opacity: 1;
            filter: blur(0px);
          }
        }
        .animate-brand-reveal {
          animation: brandReveal 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }

        /* 7. Progress Line */
        @keyframes progressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};
