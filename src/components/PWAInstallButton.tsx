import React from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'banner' | 'footer';
  onToast?: (msg: string) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar', onToast }) => {
  const { isInstalled, install } = usePWAInstall();

  // If already running inside installed standalone PWA app, hide button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    try {
      const installed = await install();
      if (installed && onToast) {
        onToast('تم بدء تثبيت تطبيق LC على هاتفك بنجاح!');
      }
    } catch (e) {
      console.error('PWA Install trigger error:', e);
    }
  };

  return (
    <>
      {/* Navbar Variant */}
      {variant === 'navbar' && (
        <button
          onClick={handleClick}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-[#8B6914] bg-gradient-to-r from-[#FDF9EE] via-[#FAF3E0] to-[#FDF9EE] hover:from-[#FAF3E0] hover:to-[#F5E9CA] border border-[#D4AF37]/60 hover:border-[#D4AF37] rounded-lg shadow-xs hover:shadow-[0_0_12px_rgba(212,175,55,0.25)] transition-all active:scale-95 cursor-pointer"
          title="تثبيت تطبيق متجر LC مباشرة"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
          <span className="hidden sm:inline font-bold">تثبيت التطبيق</span>
          <span className="sm:hidden font-bold">التطبيق</span>
        </button>
      )}

      {/* Compact Banner Variant */}
      {variant === 'banner' && (
        <div className="relative overflow-hidden bg-gradient-to-r from-white via-[#FDF9EE] to-white border border-[#D4AF37]/45 rounded-xl p-3 sm:p-3.5 shadow-[0_8px_24px_rgba(212,175,55,0.12)] my-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-right w-full sm:w-auto">
              {/* Compact Luxury Squircle Logo Emblem */}
              <div className="w-10 h-10 rounded-xl bg-[#FAF5E6] border border-[#D4AF37] flex items-center justify-center shrink-0 shadow-xs relative">
                <span className="font-brand font-bold text-base gold-gradient-text">LC</span>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white border border-[#D4AF37] flex items-center justify-center">
                  <span className="text-[7px] text-[#B8860B]">✦</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-neutral-900">تطبيق متجر LC الرسمي</h4>
                  <span className="text-[9.5px] bg-[#FAF3E0] text-[#8B6914] px-2 py-0.5 rounded-full border border-[#D4AF37]/45 font-bold">
                    تثبيت مباشر
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  ثبّت التطبيق مباشرة على هاتفك لتصفح المعروضات والطلب بلمسة واحدة.
                </p>
              </div>
            </div>

            <button
              onClick={handleClick}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg gold-gradient-bg text-black font-bold text-[11px] shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>تثبيت التطبيق الآن</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Variant */}
      {variant === 'footer' && (
        <button
          onClick={handleClick}
          className="text-neutral-600 hover:text-[#8B6914] transition-colors flex items-center gap-1.5 text-[11px] cursor-pointer font-semibold"
          title="تثبيت التطبيق مباشرة"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>تثبيت نسخة التطبيق (App)</span>
        </button>
      )}
    </>
  );
};
