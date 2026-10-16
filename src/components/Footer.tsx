import React from 'react';
import { ShieldCheck, Clock, Banknote, Lock } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface FooterProps {
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="w-full bg-[#060608]/40 border-t border-[#D4AF37]/15 text-neutral-400 text-xs mt-20">
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

          {/* Core Guarantees (No customer service references) */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:justify-end text-neutral-300">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-[#D4AF37]" />
              <span>دفع كاش عند الاستلام</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>معاينة الطلب قبل الدفع</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#D4AF37]" />
              <span>توصيل لكافة المحافظات</span>
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
