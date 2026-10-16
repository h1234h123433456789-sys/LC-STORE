import React, { useState } from 'react';
import { Eye, ShoppingBag, Zap, Banknote, Maximize2 } from 'lucide-react';
import { Product } from '../types';
import { formatPrice } from '../utils/formatters';
import { ImageLightboxModal } from './ImageLightboxModal';

interface ProductCardProps {
  product: Product;
  currency: 'USD' | 'IQD';
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  currency,
  onQuickView,
  onAddToCart,
  onBuyNow
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const imagesList = product.images && product.images.length > 0 
    ? product.images 
    : [product.image];

  return (
    <>
      <div 
        onClick={() => onQuickView(product)}
        className="group relative flex flex-col bg-[#111114]/90 backdrop-blur-[2px] rounded-xl border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all duration-300 ios-card-hover overflow-hidden cursor-pointer product-card-contain shadow-lg hover:shadow-[0_0_25px_rgba(212,175,55,0.2)]"
      >
        
        {/* Product Image Stage */}
        <div className="relative w-full aspect-[4/3] bg-[#0A0A0C] overflow-hidden flex items-center justify-center p-2">
          <img
            src={product.image}
            alt={product.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-105"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#111114]/40 via-transparent to-black/20 pointer-events-none" />

          {/* Quiet Top Kicker */}
          <div className="absolute top-3 right-3 text-[11px] font-medium tracking-wide text-[#F3E5AB] bg-black/75 backdrop-blur-md px-2.5 py-1 rounded border border-[#D4AF37]/30">
            {product.categoryLabel}
          </div>

          {/* Fullscreen image icon button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            className="absolute top-3 left-3 z-10 p-1.5 rounded-lg bg-black/80 hover:bg-[#D4AF37] text-white hover:text-black border border-neutral-700 transition-all shadow-md active:scale-90"
            title="توسيع ومعاينة الصورة كاملة"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Quick View Button on Hover (Only on Desktop md: screens to prevent touch delay/lag on mobile) */}
          <div className="absolute inset-0 hidden md:flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-black gold-gradient-bg rounded-md hover:brightness-110 transition-all shadow-lg"
            >
              <Eye className="w-3.5 h-3.5 fill-black" />
              <span>تفاصيل المنتج والوصف</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-black/80 border border-[#D4AF37] rounded-md hover:bg-[#D4AF37] hover:text-black transition-all"
              title="توسيع الصورة"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>الصورة كاملة</span>
            </button>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          
          <div className="space-y-2 text-right min-w-0 w-full">
            {/* Metadata Row: Category */}
            <div className="flex items-center justify-between text-xs text-neutral-400 gap-2 min-w-0">
              <span className="text-[11px] text-[#F3E5AB] font-medium bg-[#1A1A22] px-2 py-0.5 rounded border border-[#D4AF37]/25 truncate shrink-0">
                {product.categoryLabel}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium shrink-0">
                متاح للتسليم
              </span>
            </div>

            {/* Product Title */}
            <h3 
              className="text-base font-bold text-white group-hover:text-[#F3E5AB] transition-colors line-clamp-2 leading-snug break-words min-w-0"
              title={product.name}
            >
              {product.name}
            </h3>

            {/* Short Description (Only render if not identical to name) */}
            {product.shortDesc && product.shortDesc.trim() !== product.name.trim() && (
              <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed break-words min-w-0">
                {product.shortDesc}
              </p>
            )}
          </div>

          {/* Pricing & Actions */}
          <div className="pt-3 border-t border-neutral-800/80 space-y-2.5">
            {/* Delivery notice above price in fine font */}
            <div className="text-[10px] text-[#D4AF37]/90 font-medium flex items-center justify-between">
              <span>سعر التوصيل 5,000 د.ع</span>
              <span className="text-[9px] text-neutral-400">كافة المحافظات</span>
            </div>

            {/* Price display */}
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-neutral-400 font-medium">السعر:</span>
              <div className="flex items-baseline gap-2">
                {product.originalPriceUSD && (
                  <span className="text-xs text-neutral-500 line-through tabular-nums">
                    {formatPrice(product.originalPriceUSD, currency)}
                  </span>
                )}
                <span className="text-lg font-bold text-[#F3E5AB] gold-gradient-text tabular-nums">
                  {formatPrice(product.priceUSD, currency)}
                </span>
              </div>
            </div>

            {/* Sizes badges preview if product has sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-neutral-400">القياسات:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {product.sizes.slice(0, 5).map((s) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[#181824] text-[#F3E5AB] border border-[#D4AF37]/30 font-medium">
                      {s}
                    </span>
                  ))}
                  {product.sizes.length > 5 && (
                    <span className="text-[10px] text-[#D4AF37] font-bold">+{product.sizes.length - 5}</span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons: Add to Cart & Buy Now */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (product.sizes && product.sizes.length > 0) {
                    onQuickView(product);
                  } else {
                    onAddToCart(product);
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-[#F3E5AB] bg-[#16161B] border border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#1C1C22] rounded-lg transition-all active:scale-95"
                title="إضافة إلى حقيبة التسوق"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{product.sizes && product.sizes.length > 0 ? 'اختر القياس' : 'إضافة للسلة'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (product.sizes && product.sizes.length > 0) {
                    onQuickView(product);
                  } else {
                    onBuyNow(product);
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold text-black gold-gradient-bg hover:brightness-110 rounded-lg transition-all active:scale-95 shadow-[0_0_12px_rgba(212,175,55,0.2)]"
                title="طلب فوري كاش"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>{product.sizes && product.sizes.length > 0 ? 'اختر القياس واطلب' : 'شراء الآن (كاش)'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      <ImageLightboxModal
        isOpen={isLightboxOpen}
        images={imagesList}
        title={product.name}
        onClose={() => setIsLightboxOpen(false)}
      />
    </>
  );
};
