import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDuration = 1000,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Cleanly remove any static HTML preloader left behind by index.html
    const preloader = document.getElementById('lc-preloader');
    if (preloader) {
      preloader.remove();
    }

    const exitTimer = setTimeout(() => {
      setIsClosing(true);
    }, minDuration);

    const finishTimer = setTimeout(() => {
      setIsDone(true);
      if (onFinish) onFinish();
    }, minDuration + 480);

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
    }, 240);
  };

  if (isDone) return null;

  return (
    <div
      onClick={handleSkip}
      role="button"
      tabIndex={0}
      aria-label="تخطي شاشة البداية"
      style={{ height: '100dvh', maxHeight: '-webkit-fill-available' }}
      className={`fixed inset-0 z-[999999] w-screen h-screen bg-white flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer transition-all duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isClosing
          ? 'opacity-0 scale-[1.04] pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Centerpiece Luxury Emblem - Exactly aligned with Android System Splash icon */}
      <div className="relative flex flex-col items-center justify-center z-10 px-4">
        {/* Soft Golden Ambient Halo */}
        <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.18)_0%,rgba(212,175,55,0.03)_65%,transparent_100%)] pointer-events-none animate-pulse-glow" />

        {/* Squircle Brand Card with 24K Gold Detailing */}
        <div className="relative">
          <img
            src="/pwa-512x512.png"
            alt="متجر LC الرسمي"
            className="w-[152px] h-[152px] sm:w-[162px] sm:h-[162px] rounded-[34px] sm:rounded-[36px] shadow-[0_16px_40px_rgba(184,134,11,0.14)] relative z-10 select-none transition-transform duration-500 hover:scale-102"
          />
        </div>

        {/* Official Brand Typography */}
        <div className="mt-4 flex flex-col items-center text-center select-none z-10">
          <span className="text-sm sm:text-base font-bold text-[#8B6914] tracking-wide">
            متجر LC الرسمي
          </span>
          <span className="text-[10px] sm:text-[11px] font-brand font-semibold text-neutral-400 tracking-[0.28em] mt-0.5 uppercase">
            OFFICIAL BOUTIQUE
          </span>
        </div>

        {/* 24K Gold Molten Progress Bar */}
        <div className="mt-4 w-36 sm:w-40 h-[2.5px] bg-[#D4AF37]/20 rounded-full overflow-hidden relative z-10">
          <div
            className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-[#AA7A1E] via-[#D4AF37] to-[#8A6415] rounded-full"
            style={{
              animation: `splashProgress ${minDuration}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
            }}
          />
        </div>

        {/* Instant Skip Hint */}
        <p className="mt-3.5 text-[11px] text-neutral-400 font-medium tracking-wide z-10">
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
