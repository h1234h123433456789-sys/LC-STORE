import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDuration = 520,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Stage 1: Trigger store pop-up simultaneously as icon expands outward
    const exitTimer = setTimeout(() => {
      setIsClosing(true);
      if (onFinish) onFinish();
    }, minDuration);

    // Stage 2: Unmount overlay after morph animation completes
    const finishTimer = setTimeout(() => {
      setIsDone(true);
    }, minDuration + 320);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [minDuration, onFinish]);

  const handleSkip = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (onFinish) onFinish();
    setTimeout(() => {
      setIsDone(true);
    }, 260);
  };

  if (isDone) return null;

  return (
    <div
      onClick={handleSkip}
      role="button"
      tabIndex={0}
      aria-label="تخطي شاشة البداية"
      style={{ height: '100dvh', maxHeight: '-webkit-fill-available' }}
      className={`fixed inset-0 z-[999999] w-screen h-screen bg-white flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isClosing
          ? 'opacity-0 scale-[1.18] pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Centerpiece Luxury Squircle Icon with Xiaomi HyperOS Spring Pop */}
      <div className="relative flex flex-col items-center justify-center z-10 px-4 animate-xiaomi-icon-pop">
        <img
          src="/icon.svg?v=white2"
          alt="متجر LC الرسمي"
          className="w-[148px] h-[148px] rounded-[34px] shadow-[0_18px_45px_rgba(184,134,11,0.16)]"
        />

        {/* Minimalist 24K Gold Progress Line */}
        <div className="mt-6 w-32 h-[2.5px] bg-[#D4AF37]/20 rounded-full overflow-hidden relative">
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#AA7A1E] via-[#D4AF37] to-[#8A6415] rounded-full"
            style={{
              animation: 'progressFill 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes xiaomiIconPop {
          0% {
            transform: scale(0.45) translateY(20px);
            opacity: 0;
          }
          68% {
            transform: scale(1.04) translateY(-2px);
            opacity: 1;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        .animate-xiaomi-icon-pop {
          animation: xiaomiIconPop 0.48s cubic-bezier(0.22, 1.15, 0.36, 1) both;
          will-change: transform, opacity;
        }
        @keyframes progressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};
