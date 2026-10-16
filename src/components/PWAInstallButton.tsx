import React from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'banner' | 'footer';
  onToast?: (msg: string) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar', onToast }) => {
  const { isInstalled, install, isIOS } = usePWAInstall();

  // If already running inside installed standalone PWA app, hide button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    // Directly trigger the native installation prompt (WebAPK / Android PWA / Desktop App)
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
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#F3E5AB] bg-gradient-to-r from-[#1E1B13] via-[#2A2315] to-[#1E1B13] hover:from-[#2A2315] hover:to-[#382F1B] border border-[#D4AF37]/50 hover:border-[#D4AF37] rounded-lg shadow-sm hover:shadow-[0_0_12px_rgba(212,175,55,0.2)] transition-all active:scale-95 cursor-pointer"
          title="تثبيت تطبيق متجر LC مباشرة"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
          <span className="hidden sm:inline font-semibold">تثبيت التطبيق</span>
          <span className="sm:hidden font-semibold">التطبيق</span>
        </button>
      )}

      {/* Banner Variant */}
      {variant === 'banner' && (
        <div className="relative overflow-hidden bg-gradient-to-r from-[#17140B] via-[#221C11] to-[#17140B] border border-[#D4AF37]/30 rounded-2xl p-4 sm:p-5 shadow-lg my-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-right w-full sm:w-auto">
              {/* Luxury Squircle Logo Emblem matching website */}
              <div className="w-12 h-12 rounded-xl bg-[#14141B] border border-[#D4AF37]/60 flex items-center justify-center shrink-0 shadow-md relative">
                <span className="font-brand font-bold text-lg gold-gradient-text">LC</span>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0A0A0E] border border-[#D4AF37] flex items-center justify-center">
                  <span className="text-[8px] text-[#F3E5AB]">✦</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#F3E5AB]">تطبيق متجر LC الرسمي</h4>
                  <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/30 font-semibold">
                    تثبيت مباشر
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  ثبّت التطبيق مباشرة على هاتفك لتصفح المعروضات والطلب بلمسة واحدة.
                </p>
              </div>
            </div>

            <button
              onClick={handleClick}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA7A1E] text-black font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-black" />
              <span>تثبيت التطبيق الآن</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Variant */}
      {variant === 'footer' && (
        <button
          onClick={handleClick}
          className="text-neutral-400 hover:text-[#D4AF37] transition-colors flex items-center gap-1.5 text-[11px] cursor-pointer"
          title="تثبيت التطبيق مباشرة"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>تثبيت نسخة التطبيق (App)</span>
        </button>
      )}
    </>
  );
};
