import React from 'react';
import { ShieldCheck, Clock, Banknote, Lock, Headphones } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface FooterProps {
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="w-full bg-[#060608]/40 border-t border-[#D4AF37]/15 text-neutral-400 text-xs mt-20 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right items-center">
          
          {/* Brand Info */}
          <div className="space-y-2.5">
            <span className="text-3xl font-brand font-bold gold-gradient-text tracking-widest block">
              LC
            </span>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-md">
              متجر LC الرسمي - تسوق مباشر وتوصيل سريع لكافة المحافظات مع ميزة المعاينة قبل الاستلام والدفع كاش عند الاستلام.
            </p>
          </div>

          {/* Core Guarantees & Customer Service */}
          <div className="flex flex-col sm:flex-row gap-6 sm:justify-end text-neutral-350 items-start sm:items-center">
            <div className="bg-[#12121A] border border-[#D4AF37]/30 px-4 py-3 rounded-2xl flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#D4AF37]/25 text-[#D4AF37]">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-[11px] text-neutral-400">خدمة العملاء والدعم الفني</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <a href="tel:07707387227" className="font-mono text-sm font-bold text-[#F3E5AB] hover:underline" dir="ltr">07707387227</a>
                  <div className="flex items-center gap-1.5 mr-2">
                    <a
                      href="https://wa.me/9647707387227"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all"
                    >
                      واتساب
                    </a>
                    <a
                      href="tel:07707387227"
                      className="px-2 py-0.5 rounded-lg bg-[#222230] hover:bg-[#2A2A3D] text-[#F3E5AB] border border-[#D4AF37]/40 text-[11px] font-bold transition-all"
                    >
                      اتصال
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-neutral-300">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-[#D4AF37]" />
                <span>دفع كاش عند الاستلام</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>معاينة الطلب قبل الدفع</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar with discrete Admin Portal link */}
        <div className="mt-10 pt-6 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} لمتجر <span className="text-[#F3E5AB] font-semibold">LC Store</span>
          </div>

          <div className="flex items-center gap-5">
            <PWAInstallButton variant="footer" />
            <span aria-hidden="true">·</span>
            <span>دفع كاش فقط</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={onOpenAdmin}
              className="text-neutral-500 hover:text-[#D4AF37] transition-colors flex items-center gap-1.5"
              title="لوحة التحكم الخاصة بصاحب المتجر"
            >
              <Lock className="w-3 h-3 text-[#D4AF37]" />
              <span>لوحة تحكم المتجر (الإدارة)</span>
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
