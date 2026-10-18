import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Banknote, Lock, Headphones, Truck } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface FooterProps {
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="relative z-10 w-full bg-transparent border-t border-[#D4AF37]/20 text-neutral-400 text-xs mt-8 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch text-right">
          
          {/* 1. Brand Info Box (4 cols - Compact) */}
          <div className="lg:col-span-4 bg-[#101016] border border-neutral-800/80 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-2 shadow-sm">
            <div className="space-y-1">
              <span className="text-2xl font-brand font-bold gold-gradient-text tracking-widest block">
                LC
              </span>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                متجر LC الرسمي — وجهتك الأولى للتسوق الراقي والموثوق مع خدمة التوصيل السريع لكافة محافظات العراق والدفع نقداً عند الاستلام.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-800/70 flex items-center justify-between text-[10px] text-neutral-400">
              <span>العراق — كافة المحافظات</span>
              <span className="text-[#D4AF37] font-semibold">أصالة وجودة مضمونة</span>
            </div>
          </div>

          {/* 2. Customer Service & Direct Contact Box ("خانة خدمة العملاء") (4 cols - Compact) */}
          <div className="lg:col-span-4 bg-gradient-to-br from-[#14141D] to-[#0E0E15] border border-[#D4AF37]/35 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between space-y-2.5 shadow-[0_0_20px_rgba(212,175,55,0.06)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-white">خدمة العملاء والدعم الفني</h4>
                <p className="text-[10px] text-neutral-400">تواصل معنا مباشرة لأي استفسار أو مساعدة</p>
              </div>
            </div>

            <div className="bg-[#0B0B10] border border-neutral-800 rounded-lg p-2.5 flex items-center justify-between gap-2">
              <div>
                <span className="text-[9.5px] text-neutral-400 block">الرقم الرسمي المعتمد:</span>
                <a
                  href="tel:07707387227"
                  className="font-mono text-sm font-extrabold text-[#F3E5AB] hover:underline tracking-wider block"
                  dir="ltr"
                >
                  07707387227
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <motion.a
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  href="https://wa.me/9647707387227"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors shadow-xs"
                >
                  واتساب
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  href="tel:07707387227"
                  className="px-2.5 py-1.5 rounded-lg bg-[#1D1D2B] hover:bg-[#262638] text-[#F3E5AB] border border-[#D4AF37]/40 text-[11px] font-bold transition-colors"
                >
                  اتصال
                </motion.a>
              </div>
            </div>
          </div>

          {/* 3. Store Guarantees Box (4 cols - Compact) */}
          <div className="lg:col-span-4 bg-[#101016] border border-neutral-800/80 rounded-xl p-3.5 sm:p-4 flex flex-col justify-center space-y-2 shadow-sm">
            <h4 className="text-[11px] font-bold text-[#D4AF37] border-b border-neutral-800 pb-1.5">مزايا التسوق من متجر LC</h4>
            <div className="space-y-1.5 text-[11px] text-neutral-300">
              <div className="flex items-center gap-2">
                <Banknote className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span>الدفع نقداً (كاش) عند استلام الطلب</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span>توصيل سريع وآمن لكافة محافظات العراق</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span>ضمان الجودة والأصالة وتغليف فاخر</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar with discrete Admin Portal link */}
        <div className="mt-5 pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] text-neutral-500">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} لمتجر <span className="text-[#F3E5AB] font-semibold">LC Store</span>
          </div>

          <div className="flex items-center gap-4">
            <PWAInstallButton variant="footer" />
            <span aria-hidden="true">·</span>
            <span>دفع كاش عند الاستلام</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={onOpenAdmin}
              className="text-neutral-500 hover:text-[#D4AF37] transition-colors flex items-center gap-1.5 cursor-pointer"
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
