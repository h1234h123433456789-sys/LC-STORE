import React from 'react';
import { Sparkles, ShieldCheck, Truck, Banknote, ShieldAlert } from 'lucide-react';

interface HeroProps {
  onExploreClick: () => void;
  hasProducts: boolean;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick, hasProducts }) => {
  return (
    <section className="relative w-full border-b border-[#D4AF37]/15 bg-transparent shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Text & Brand Statement (7 cols) */}
          <div className="lg:col-span-7 space-y-4 text-right">
            
            {/* Editorial Kicker */}
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#D4AF37] px-3 py-1 rounded-full bg-[#181812] border border-[#D4AF37]/30">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>المتجر الرسمي المعتمد - LC STORE</span>
            </div>

            {/* Dominant Headline - Refined & Balanced Size */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-snug text-white">
              أهلاً بكم في متجر <span className="gold-gradient-text font-brand">LC</span>
            </h1>

            {/* Body Description - Compact & Clean */}
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-xl">
              منصتك الموثوقة لتسوق أفضل المنتجات الفاخرة مع خدمة الشحن والتوصيل السريع لكافة المحافظات والدفع نقداً عند الاستلام.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={onExploreClick}
                className="px-5 py-2.5 text-xs font-bold text-[#09090B] gold-gradient-bg rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(212,175,55,0.25)] flex items-center gap-2 cursor-pointer"
              >
                <span>{hasProducts ? 'تصفح المنتجات الآن' : 'استعراض المتجر'}</span>
                <span aria-hidden="true">←</span>
              </button>
            </div>

            {/* Trust Markers */}
            <div className="pt-4 border-t border-neutral-800/80 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-neutral-300 text-[11px]">الدفع كاش عند الاستلام</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-neutral-300 text-[11px]">توصيل سريع لكافة المحافظات</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-neutral-300 text-[11px]">ضمان الجودة والأصالة</span>
              </div>
            </div>

          </div>

          {/* Luxury Brand Emblem Stage (5 cols - No Fake Product Photos) */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full aspect-square max-w-[380px] rounded-3xl bg-[#121217] bg-gradient-to-br from-[#181822] via-[#121217] to-[#0A0A0C] border border-[#D4AF37]/35 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-8 flex flex-col items-center justify-between overflow-hidden group [transform:translateZ(0)] [backface-visibility:hidden]">
              
              {/* Gold Grid Texture lines */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
              
              {/* Corner Accents */}
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#D4AF37]/50" />
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37]/50" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37]/50" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#D4AF37]/50" />

              {/* Top Tag */}
              <div className="text-[11px] font-bold text-[#D4AF37] tracking-[0.25em] uppercase">
                OFFICIAL STORE
              </div>

              {/* Center Iconic LC Emblem */}
              <div className="my-auto text-center space-y-3">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-2xl bg-[#14141B] border-2 border-[#D4AF37]/60 flex items-center justify-center shadow-[0_0_35px_rgba(212,175,55,0.25)] mx-auto transform transition-transform duration-500 group-hover:scale-105">
                    <span className="text-4xl font-brand font-extrabold gold-gradient-text tracking-wider">
                      LC
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0A0A0C] border border-[#D4AF37] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-base font-bold text-white tracking-wide">متجر LC</div>
                  <div className="text-xs text-neutral-400">الجودة والالتزام في كل تفصيلة</div>
                </div>
              </div>

              {/* Bottom Badge */}
              <div className="w-full pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1.5 text-[#F3E5AB]">
                  <Banknote className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>دفع كاش</span>
                </span>
                <span className="text-[11px] text-neutral-400">العراق - كافة المحافظات</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
