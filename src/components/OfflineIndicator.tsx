import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, AlertCircle, Wifi, Sparkles, Smartphone, ShieldAlert, WifiHigh } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic live ping check every 6 seconds
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine !== isOnline) {
        setIsOnline(navigator.onLine);
      }
    }, 6000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  return isOnline;
}

interface FullOfflineScreenProps {
  onRetry?: () => void;
}

export const FullOfflineScreen: React.FC<FullOfflineScreenProps> = ({ onRetry }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const handleManualRetry = async () => {
    setIsChecking(true);
    setCheckError(null);

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('offline');
      }

      // Live fetch probe
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`/favicon.ico?_t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok || response.status < 500) {
        if (onRetry) {
          onRetry();
        } else {
          window.location.reload();
        }
      } else {
        throw new Error('failed');
      }
    } catch {
      setCheckError('لم يتم العثور على اتصال بالإنترنت حتى الآن. يرجى تفعيل الواي فاي أو بيانات الهاتف والمحاولة مجدداً.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div 
      dir="rtl"
      className="fixed inset-0 z-[9999] min-h-screen w-full bg-[#080809] text-[#EDEDED] flex flex-col overflow-y-auto selection:bg-[#D4AF37]/30 selection:text-[#F3E5AB] animate-mac-page"
    >
      {/* 1. Luxury Sticky Top Header (Directly in the face/view) */}
      <header className="sticky top-0 z-20 bg-[#0A0A0C]/95 backdrop-blur-md border-b border-[#D4AF37]/25 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span>تنبيه: انقطاع الاتصال بالإنترنت</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="gold-gradient-text tracking-widest font-brand font-extrabold text-base">LC BOUTIQUE</span>
        </div>
      </header>

      {/* 2. Main Viewport Content Body */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-start space-y-6">
        
        {/* Disconnected Hero Card */}
        <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#181824] via-[#111116] to-[#0A0A0E] border border-[#D4AF37]/40 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-6 sm:p-8 text-center space-y-6 overflow-hidden">
          
          {/* Top Gold Corner Lines */}
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#D4AF37]/50" />
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37]/50" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37]/50" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#D4AF37]/50" />

          {/* Big Disconnected Icon & LC Badge */}
          <div className="space-y-4 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181812] border border-[#D4AF37]/35 text-[#D4AF37] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>متجر LC الرسمي المعتمد</span>
            </div>

            <div className="relative inline-block mx-auto">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#1C1217] border-2 border-red-500/60 flex items-center justify-center shadow-[0_0_35px_rgba(239,68,68,0.3)] mx-auto">
                <WifiOff className="w-12 h-12 sm:w-14 sm:h-14 text-red-400 animate-pulse" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#0A0A0E] border-2 border-red-500 flex items-center justify-center shadow-lg">
                <ShieldAlert className="w-4 h-4 text-red-400" />
              </div>
            </div>
          </div>

          {/* Bold Notice Message */}
          <div className="space-y-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              الإنترنت مقطوع لديك
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-md mx-auto">
              عذراً، لا يمكنك تصفح المتجر أو استعراض المنتجات والأسعار لأنك غير متصل بالإنترنت حالياً. يرجى الاتصال بالشبكة للمتابعة.
            </p>
          </div>

          {/* Practical Reconnection Tips */}
          <div className="bg-[#12121A] p-4 rounded-2xl border border-neutral-800/90 text-right space-y-2.5 text-xs text-neutral-300">
            <div className="font-bold text-[#F3E5AB] flex items-center gap-2">
              <WifiHigh className="w-4 h-4 text-[#D4AF37]" />
              <span>خطوات استعادة الاتصال والتصفح:</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300 pr-1">
              <Wifi className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>تأكد من تفعيل شبكة الواي فاي (Wi-Fi) والاتصال بها.</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300 pr-1">
              <Smartphone className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>أو قم بتفعيل بيانات الجوال (بيانات الهاتف 4G / 5G).</span>
            </div>
          </div>

          {/* Error Message if Check Failed */}
          {checkError && (
            <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-center gap-2 text-right animate-ios-slide-up">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{checkError}</span>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleManualRetry}
              disabled={isChecking}
              className="w-full py-4 px-6 rounded-2xl gold-gradient-bg text-[#09090B] font-extrabold text-sm sm:text-base hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'جاري فحص الاتصال وتحديث المتجر...' : 'إعادة المحاولة والاتصال الآن'}</span>
            </button>

            <p className="text-[11px] text-neutral-500">
              سيتعرف النظام تلقائياً على الإنترنت فور عودته ويفتح لك المتجر مباشرة.
            </p>
          </div>

        </div>

      </main>

      {/* 3. Luxury Bottom Footer Bar */}
      <footer className="w-full bg-[#060608]/80 border-t border-[#D4AF37]/15 py-4 px-6 text-center text-[11px] text-neutral-500">
        جميع الحقوق محفوظة © {new Date().getFullYear()} لمتجر <span className="text-[#F3E5AB] font-semibold">LC Store</span>
      </footer>

    </div>
  );
};

export const OfflineIndicator = FullOfflineScreen;
