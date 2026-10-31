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
    const exitTimer = setTimeout(() => {
      setIsClosing(true);
    }, minDuration);

    const finishTimer = setTimeout(() => {
      setIsDone(true);
      if (onFinish) onFinish();
    }, minDuration + 320);

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
    }, 220);
  };

  if (isDone) return null;

  return (
    <div
      onClick={handleSkip}
      role="button"
      tabIndex={0}
      aria-label="تخطي شاشة البداية"
      style={{ height: '100dvh', maxHeight: '-webkit-fill-available' }}
      className={`fixed inset-0 z-[999999] w-screen h-screen bg-white flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer transition-all duration-300 ease-out ${
        isClosing
          ? 'opacity-0 scale-105 pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Centerpiece Circular Luxury Emblem */}
      <div className="relative flex flex-col items-center justify-center z-10 px-4 animate-ios-fade-in">
        {/* Outer Subtle Concentric Gold Rings */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full border border-[#D4AF37]/10 pointer-events-none" />
          <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-[#D4AF37]/20 pointer-events-none" />

          {/* Main Circular Card */}
          <div className="relative w-56 h-56 sm:w-60 sm:h-60 rounded-full bg-white border border-[#D4AF37]/40 shadow-[0_12px_45px_rgba(212,175,55,0.14)] flex flex-col items-center justify-center px-6 text-center">
            {/* Floating Gold Sparkles Badge at Top-Right */}
            <div className="absolute -top-1 -right-1 w-11 h-11 rounded-full bg-white shadow-[0_8px_24px_rgba(212,175,55,0.22)] flex items-center justify-center animate-luxury-float">
              <Sparkles className="w-6 h-6 text-[#D4AF37]" />
            </div>

            {/* Giant LC Monogram */}
            <span className="text-6xl sm:text-7xl font-brand font-extrabold gold-gradient-text tracking-wider leading-none select-none">
              LC
            </span>

            {/* Spaced English Subtitle */}
            <span className="mt-4 text-[11px] sm:text-xs font-brand font-bold text-[#1A1814] tracking-[0.38em] uppercase">
              LC STORE
            </span>

            {/* Arabic Official Store Title */}
            <span className="mt-1.5 text-xs sm:text-sm font-bold text-[#9A7217]">
              متجر LC الرسمي
            </span>

            {/* Gold Progress Bar inside bottom of circle */}
            <div className="mt-4 w-36 h-[2.5px] bg-[#D4AF37]/20 rounded-full overflow-hidden relative">
              <div
                className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-[#AA7A1E] via-[#D4AF37] to-[#8A6415] rounded-full"
                style={{
                  animation: `splashProgress ${minDuration}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Instant Skip Hint */}
        <p className="mt-3 text-[11px] text-neutral-500 font-medium tracking-wide">
          انقر في أي مكان للدخول الفوري
        </p>
      </div>

      <style>{`
        @keyframes splashProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};
