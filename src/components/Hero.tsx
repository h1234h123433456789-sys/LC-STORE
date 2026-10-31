import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Truck, Banknote, ArrowLeft } from 'lucide-react';
import { FreeShippingConfig } from '../types';
import { formatPrice } from '../utils/formatters';

interface HeroProps {
  onExploreClick: () => void;
  hasProducts: boolean;
  freeShippingConfig?: FreeShippingConfig;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick, hasProducts, freeShippingConfig }) => {
  const isPromoActive = Boolean(freeShippingConfig?.enabled && (freeShippingConfig?.minOrderAmountIQD || 0) > 0);
  const minAmount = freeShippingConfig?.minOrderAmountIQD || 50000;

  return (
    <section className="relative z-10 w-full border-b border-[#D4AF37]/25 bg-transparent shrink-0 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-5 items-center">
          
          {/* Text & Brand Statement (7 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="lg:col-span-7 space-y-2.5 sm:space-y-3 text-right"
          >
            {/* Top Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#8B6914] px-2.5 py-1 rounded-full bg-white border border-[#D4AF37]/50 shadow-xs">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                <span>المتجر الرسمي المعتمد - LC STORE</span>
              </div>

              {isPromoActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 22 }}
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-400/70 shadow-xs"
                >
                  <Truck className="w-3 h-3 text-emerald-600" />
                  <span>توصيل مجاني للطلبات فوق <strong className="text-emerald-950 font-mono">{formatPrice(minAmount, 'IQD')}</strong></span>
                </motion.div>
              )}
            </div>

            {/* Dominant Headline & CTA Row */}
            <div className="space-y-1.5">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold leading-snug text-neutral-900 tracking-tight">
                أهلاً بكم في متجر <span className="gold-gradient-text font-brand">LC</span>
              </h1>

              <p className="text-[11px] sm:text-xs text-neutral-600 leading-relaxed max-w-xl">
                منصتك الموثوقة لتسوق أرقى المنتجات المختارة بعناية، مع الشحن السريع لكافة محافظات العراق والدفع نقداً عند الاستلام.
              </p>
            </div>

            {/* CTA Button */}
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={onExploreClick}
                className="px-4 py-2 text-xs font-extrabold text-[#09090B] gold-gradient-bg rounded-xl hover:brightness-110 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>{hasProducts ? 'تصفح المعروضات الآن' : 'استعراض المتجر'}</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            {/* Compact 3-Column Trust Feature Boxes ("خانات المميزات") */}
            <div className="pt-1 grid grid-cols-3 gap-1.5 sm:gap-2 text-xs">
              <motion.div
                whileHover={{ y: -2, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#D4AF37]/35 hover:border-[#D4AF37] transition-colors flex flex-col sm:flex-row items-center text-center sm:text-right gap-1.5 sm:gap-2 shadow-xs"
              >
                <div className="p-1.5 rounded-lg bg-neutral-50 border border-[#D4AF37]/40 text-[#B8860B] shrink-0">
                  <Banknote className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-neutral-900 text-[10px] sm:text-[11px] leading-tight truncate">الدفع عند الاستلام</div>
                  <div className="text-[8.5px] sm:text-[9.5px] text-neutral-500 leading-tight truncate mt-0.5">نقداً كاش للمندوب</div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -2, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#D4AF37]/35 hover:border-[#D4AF37] transition-colors flex flex-col sm:flex-row items-center text-center sm:text-right gap-1.5 sm:gap-2 shadow-xs"
              >
                <div className="p-1.5 rounded-lg bg-neutral-50 border border-[#D4AF37]/40 text-[#B8860B] shrink-0">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-neutral-900 text-[10px] sm:text-[11px] leading-tight truncate">شحن لكافة المحافظات</div>
                  <div className="text-[8.5px] sm:text-[9.5px] text-neutral-500 leading-tight truncate mt-0.5">توصيل سريع لباب بيتك</div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -2, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#D4AF37]/35 hover:border-[#D4AF37] transition-colors flex flex-col sm:flex-row items-center text-center sm:text-right gap-1.5 sm:gap-2 shadow-xs"
              >
                <div className="p-1.5 rounded-lg bg-neutral-50 border border-[#D4AF37]/40 text-[#B8860B] shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-neutral-900 text-[10px] sm:text-[11px] leading-tight truncate">ضمان الجودة والأصالة</div>
                  <div className="text-[8.5px] sm:text-[9.5px] text-neutral-500 leading-tight truncate mt-0.5">منتجات مختارة بعناية</div>
                </div>
              </motion.div>
            </div>

          </motion.div>

          {/* Compact Luxury Brand Emblem Box (5 cols) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 24, delay: 0.06 }}
            className="lg:col-span-5 relative flex items-center justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[340px] lg:max-w-[320px] rounded-2xl bg-white border border-[#D4AF37]/55 shadow-sm p-3.5 sm:p-4 flex flex-col items-center justify-between space-y-2.5 overflow-hidden group">
              
              {/* Corner Accents */}
              <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-[#D4AF37] rounded-tr-xs" />
              <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-[#D4AF37] rounded-tl-xs" />
              <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-[#D4AF37] rounded-br-xs" />
              <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-[#D4AF37] rounded-bl-xs" />

              {/* Top Tag */}
              <div className="text-[9px] font-bold text-[#8B6914] tracking-[0.24em] uppercase bg-neutral-50 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/45">
                OFFICIAL STORE
              </div>

              {/* Center Iconic LC Emblem (Compact Horizontal/Centered Stage) */}
              <div className="flex items-center gap-3.5 py-0.5">
                <div className="relative shrink-0 animate-luxury-float">
                  <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-white border-2 border-[#D4AF37] flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <span className="text-2xl sm:text-3xl font-brand font-extrabold gold-gradient-text tracking-wider">
                      LC
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-[#D4AF37] flex items-center justify-center shadow-xs">
                    <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="text-xs sm:text-sm font-extrabold text-neutral-900 tracking-wide">متجر LC الرسمي</div>
                  <div className="text-[10px] text-neutral-500 leading-snug">الأصالة والجودة والالتزام في كل تفصيلة</div>
                </div>
              </div>

              {/* Bottom Badge */}
              <div className="w-full pt-2 border-t border-[#D4AF37]/25 flex items-center justify-between text-[10px] text-neutral-500">
                <span className="flex items-center gap-1 text-[#8B6914] font-bold">
                  <Banknote className="w-3 h-3 text-[#D4AF37]" />
                  <span>دفع كاش عند الاستلام</span>
                </span>
                <span className="text-[10px] text-neutral-500">العراق - كافة المحافظات</span>
              </div>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
