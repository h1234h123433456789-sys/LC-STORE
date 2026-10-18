import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, ShoppingBag, Zap, Maximize2, Images } from 'lucide-react';
import { Product, FreeShippingConfig } from '../types';
import { formatPrice } from '../utils/formatters';
import { ImageLightboxModal } from './ImageLightboxModal';

interface ProductCardProps {
  product: Product;
  currency: 'USD' | 'IQD';
  freeShippingConfig?: FreeShippingConfig;
  index?: number;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onOpenZoom?: (images: string[], initialIndex: number, title: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  currency,
  freeShippingConfig,
  index = 0,
  onQuickView,
  onAddToCart,
  onBuyNow,
  onOpenZoom
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const imagesList = product.images && product.images.length > 0 
    ? product.images 
    : [product.image];

  const isFreeShippingPromoActive = Boolean(freeShippingConfig?.enabled && (freeShippingConfig?.minOrderAmountIQD || 0) > 0);

  const handleOpenLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenZoom) {
      onOpenZoom(imagesList, 0, product.name);
    } else {
      setIsLightboxOpen(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 24 } }}
        transition={{
          type: 'spring',
          stiffness: 280,
          damping: 24,
          delay: Math.min(index * 0.015, 0.08)
        }}
        onClick={() => onQuickView(product)}
        className="group relative flex flex-col bg-[#111117] rounded-2xl border border-[#D4AF37]/25 hover:border-[#D4AF37] transition-colors duration-300 overflow-hidden cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.65)] hover:shadow-[0_14px_30px_rgba(212,175,55,0.20)]"
      >
        {/* Product Image Stage (Compact & Proportional) */}
        <div className="relative w-full aspect-[4/3] max-h-[185px] sm:max-h-[200px] bg-gradient-to-b from-[#0C0C11] to-[#08080B] overflow-hidden flex items-center justify-center p-2.5">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain object-center transition-transform duration-700 ease-out group-hover:scale-106 drop-shadow-[0_6px_16px_rgba(0,0,0,0.85)]"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#111117]/55 via-transparent to-black/15 pointer-events-none" />

          {/* Top-Right Category Label */}
          <div className="absolute top-2.5 right-2.5 text-[10px] font-bold tracking-wide text-[#F3E5AB] bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#D4AF37]/35 shadow-xs">
            {product.categoryLabel}
          </div>

          {/* Multi-image badge if product has multiple photos */}
          {imagesList.length > 1 && (
            <div className="absolute bottom-2 right-2.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-neutral-700/80 text-[9.5px] font-mono text-[#F3E5AB]">
              <Images className="w-2.5 h-2.5 text-[#D4AF37]" />
              <span>{imagesList.length} صور</span>
            </div>
          )}

          {/* Fullscreen image icon button */}
          <button
            type="button"
            onClick={handleOpenLightbox}
            className="absolute top-2.5 left-2.5 z-10 p-1.5 rounded-lg bg-black/75 hover:bg-[#D4AF37] text-white hover:text-black border border-neutral-700/80 hover:border-[#D4AF37] transition-all backdrop-blur-md shadow-sm active:scale-90 cursor-pointer"
            title="توسيع ومعاينة الصورة كاملة"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Quick View Overlay on Desktop Hover */}
          <div className="absolute inset-0 hidden md:flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-[1.5px]">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold text-black gold-gradient-bg rounded-lg hover:brightness-110 transition-all shadow-md cursor-pointer"
            >
              <Eye className="w-3 h-3 fill-black" />
              <span>تفاصيل المنتج</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleOpenLightbox}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white bg-black/85 border border-[#D4AF37] rounded-lg hover:bg-[#D4AF37] hover:text-black transition-all cursor-pointer"
              title="توسيع الصورة"
            >
              <Maximize2 className="w-3 h-3 text-[#D4AF37]" />
              <span>تكبير</span>
            </motion.button>
          </div>
        </div>

        {/* Product Details Section (Compact & Sleek) */}
        <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
          
          <div className="space-y-1 text-right min-w-0 w-full">
            {/* Metadata Row: Category & Availability */}
            <div className="flex items-center justify-between text-[10px] text-neutral-400 gap-2 min-w-0">
              <span className="truncate">
                {product.categoryLabel}
              </span>
              <span className="text-[9.5px] text-emerald-400 font-semibold shrink-0 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>متوفر</span>
              </span>
            </div>

            {/* Product Title */}
            <h3 
              className="text-sm sm:text-[15px] font-extrabold text-white group-hover:text-[#F3E5AB] transition-colors line-clamp-1 leading-snug break-words min-w-0"
              title={product.name}
            >
              {product.name}
            </h3>

            {/* Short Description */}
            {product.shortDesc && product.shortDesc.trim() !== product.name.trim() && (
              <p className="text-[11px] text-neutral-400 line-clamp-1 leading-relaxed break-words min-w-0">
                {product.shortDesc}
              </p>
            )}
          </div>

          {/* Pricing & Actions */}
          <div className="pt-2 border-t border-neutral-800/80 space-y-2">
            {/* Compact Delivery notice above price */}
            <div className="text-[9.5px] text-[#D4AF37]/95 font-medium flex items-center justify-between bg-[#161620] px-2 py-1 rounded-md border border-neutral-800/90">
              <span>التوصيل: 5,000 د.ع</span>
              {isFreeShippingPromoActive ? (
                <span className="text-[9px] text-emerald-400 font-bold">
                  مجاني فوق {formatPrice(freeShippingConfig?.minOrderAmountIQD, 'IQD')}
                </span>
              ) : (
                <span className="text-[9px] text-neutral-400">كافة المحافظات</span>
              )}
            </div>

            {/* Price display */}
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-neutral-400 font-semibold">السعر:</span>
              <div className="flex items-baseline gap-1.5">
                {product.originalPriceUSD && (
                  <span className="text-[11px] text-neutral-500 line-through tabular-nums font-mono">
                    {formatPrice(product.originalPriceUSD, currency)}
                  </span>
                )}
                <span className="text-base sm:text-lg font-extrabold text-[#F3E5AB] gold-gradient-text tabular-nums font-mono">
                  {formatPrice(product.priceUSD, currency)}
                </span>
              </div>
            </div>

            {/* Sizes badges preview if product has sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[9.5px] text-neutral-400">القياسات:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {product.sizes.slice(0, 5).map((s) => (
                    <span key={s} className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#181824] text-[#F3E5AB] border border-[#D4AF37]/30 font-bold">
                      {s}
                    </span>
                  ))}
                  {product.sizes.length > 5 && (
                    <span className="text-[9.5px] text-[#D4AF37] font-bold">+{product.sizes.length - 5}</span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons: Add to Cart & Buy Now */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (product.sizes && product.sizes.length > 0) {
                    onQuickView(product);
                  } else {
                    onAddToCart(product);
                  }
                }}
                className="w-full flex items-center justify-center gap-1 py-2 px-2 text-[11px] font-bold text-[#F3E5AB] bg-[#171722] border border-[#D4AF37]/35 hover:border-[#D4AF37] hover:bg-[#1E1E2C] rounded-lg transition-colors cursor-pointer"
                title="إضافة إلى حقيبة التسوق"
              >
                <ShoppingBag className="w-3 h-3 text-[#D4AF37] shrink-0" />
                <span className="truncate">{product.sizes && product.sizes.length > 0 ? 'اختر القياس' : 'إضافة للسلة'}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (product.sizes && product.sizes.length > 0) {
                    onQuickView(product);
                  } else {
                    onBuyNow(product);
                  }
                }}
                className="w-full flex items-center justify-center gap-1 py-2 px-2 text-[11px] font-extrabold text-black gold-gradient-bg hover:brightness-110 rounded-lg transition-all shadow-[0_0_12px_rgba(212,175,55,0.22)] cursor-pointer"
                title="طلب فوري كاش"
              >
                <Zap className="w-3 h-3 fill-black shrink-0" />
                <span className="truncate">{product.sizes && product.sizes.length > 0 ? 'اختر واطلب' : 'شراء الآن'}</span>
              </motion.button>
            </div>
          </div>

        </div>
      </motion.div>

      {!onOpenZoom && (
        <ImageLightboxModal
          isOpen={isLightboxOpen}
          images={imagesList}
          title={product.name}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </>
  );
};
