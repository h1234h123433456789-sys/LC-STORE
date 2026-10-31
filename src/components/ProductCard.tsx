import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, ShoppingBag, Zap, Maximize2, Images, Package } from 'lucide-react';
import { Product, FreeShippingConfig, getProductVariants } from '../types';
import { formatPrice } from '../utils/formatters';
import { ImageLightboxModal } from './ImageLightboxModal';

interface ProductCardProps {
  product: Product;
  currency: 'USD' | 'IQD';
  freeShippingConfig?: FreeShippingConfig;
  index?: number;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, selectedOption?: string) => void;
  onBuyNow: (product: Product, selectedOption?: string) => void;
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

  const variants = getProductVariants(product);
  const firstAvailableVariant = variants.find((v) => v.stockCount > 0) || variants[0];

  const [selectedOption, setSelectedOption] = useState<string>(() => firstAvailableVariant?.name || '');

  // Keep selectedOption valid if product options change
  const activeVariant =
    variants.length > 0
      ? variants.find((v) => v.name === selectedOption) || firstAvailableVariant
      : undefined;

  const effectiveSelectedOption = activeVariant?.name;

  // Build complete image list including variant images
  const baseImages = product.images && product.images.length > 0 ? product.images : [product.image];
  const imagesList = Array.from(
    new Set([
      ...baseImages,
      ...variants.map((v) => v.image).filter((img): img is string => Boolean(img && img.trim()))
    ])
  );

  // Switch displayed card image immediately if the selected variant has a linked image
  const displayedImage = activeVariant?.image || product.image;

  const isFreeShippingPromoActive = Boolean(freeShippingConfig?.enabled && (freeShippingConfig?.minOrderAmountIQD || 0) > 0);

  const totalProductStock =
    variants.length > 0
      ? variants.reduce((sum, v) => sum + Math.max(0, v.stockCount), 0)
      : product.inStock === false
      ? 0
      : typeof product.stockCount === 'number'
      ? Math.max(0, product.stockCount)
      : 10;

  const stockCount = activeVariant ? Math.max(0, activeVariant.stockCount) : totalProductStock;
  const isEntireProductOutOfStock = totalProductStock <= 0;
  const isSelectedOptionOutOfStock = stockCount <= 0;

  const handleOpenLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    const initialIdx = Math.max(0, imagesList.indexOf(displayedImage));
    if (onOpenZoom) {
      onOpenZoom(imagesList, initialIdx, product.name);
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
        className="group relative flex flex-col bg-white rounded-2xl border border-[#D4AF37]/35 hover:border-[#D4AF37] transition-colors duration-300 overflow-hidden cursor-pointer shadow-xs hover:shadow-sm"
      >
        {/* Product Image Stage (Compact & Proportional) */}
        <div className="relative w-full aspect-[4/3] max-h-[185px] sm:max-h-[200px] bg-white overflow-hidden flex items-center justify-center p-2.5 border-b border-[#D4AF37]/20">
          <img
            src={displayedImage}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-contain object-center transition-transform duration-500 ease-out group-hover:scale-106 ${isEntireProductOutOfStock ? 'opacity-60 grayscale-[35%]' : ''}`}
          />

          {/* Top-Right Category Label */}
          <div className="absolute top-2.5 right-2.5 text-[10px] font-bold tracking-wide text-[#8B6914] bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#D4AF37]/45 shadow-xs">
            {product.categoryLabel}
          </div>

          {/* Out of stock overlay badge */}
          {isEntireProductOutOfStock && (
            <div className="absolute inset-0 bg-white/45 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
              <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-extrabold shadow-md border border-red-400">
                نفذت الكمية من المخزون
              </span>
            </div>
          )}

          {/* Multi-image badge if product has multiple photos */}
          {imagesList.length > 1 && (
            <div className="absolute bottom-2 right-2.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/90 backdrop-blur-md border border-[#D4AF37]/40 text-[9.5px] font-mono text-[#7A5912] font-bold shadow-xs">
              <Images className="w-2.5 h-2.5 text-[#B8860B]" />
              <span>{imagesList.length} صور</span>
            </div>
          )}

          {/* Fullscreen image icon button */}
          <button
            type="button"
            onClick={handleOpenLightbox}
            className="absolute top-2.5 left-2.5 z-10 p-1.5 rounded-lg bg-white/90 hover:bg-[#D4AF37] text-neutral-800 hover:text-black border border-[#D4AF37]/40 hover:border-[#D4AF37] transition-all backdrop-blur-md shadow-xs active:scale-90 cursor-pointer"
            title="توسيع ومعاينة الصورة كاملة"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Quick View Overlay on Desktop Hover */}
          <div className="absolute inset-0 hidden md:flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/60 backdrop-blur-[1.5px] z-20">
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
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-neutral-900 bg-white/95 border border-[#D4AF37] rounded-lg hover:bg-[#D4AF37] hover:text-black transition-all shadow-sm cursor-pointer"
              title="توسيع الصورة"
            >
              <Maximize2 className="w-3 h-3 text-[#B8860B]" />
              <span>تكبير</span>
            </motion.button>
          </div>
        </div>

        {/* Product Details Section (Compact & Sleek) */}
        <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
          
          <div className="space-y-1.5 text-right min-w-0 w-full">
            {/* Metadata Row: Category & Live Stock Availability */}
            <div className="flex items-center justify-between text-[10px] text-neutral-500 gap-2 min-w-0">
              <span className="truncate font-medium">
                {product.categoryLabel}
              </span>
              {isSelectedOptionOutOfStock ? (
                <span className="text-[9.5px] text-red-600 font-bold shrink-0 flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  <span>{activeVariant ? `نفذ (${activeVariant.name})` : 'نفذ من المخزون'}</span>
                </span>
              ) : stockCount <= 3 ? (
                <span className="text-[9.5px] text-amber-700 font-bold shrink-0 flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                  <span>{activeVariant ? `${activeVariant.name}: متبقي ${stockCount}!` : `متبقي ${stockCount} فقط!`}</span>
                </span>
              ) : (
                <span className="text-[9.5px] text-emerald-700 font-bold shrink-0 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  <Package className="w-2.5 h-2.5 text-emerald-600" />
                  <span>{activeVariant ? `مخزون ${activeVariant.name}: ${stockCount}` : `المخزون: ${stockCount}`}</span>
                </span>
              )}
            </div>

            {/* Product Title */}
            <h3 
              className="text-sm sm:text-[15px] font-extrabold text-neutral-900 group-hover:text-[#8B6914] transition-colors line-clamp-1 leading-snug break-words min-w-0"
              title={product.name}
            >
              {product.name}
            </h3>

            {/* Short Description */}
            {product.shortDesc && product.shortDesc.trim() !== product.name.trim() && (
              <p className="text-[11px] text-neutral-600 line-clamp-1 leading-relaxed break-words min-w-0">
                {product.shortDesc}
              </p>
            )}

            {/* Custom Product Options / Variants Selector (Shown ONLY if admin added options) */}
            {variants.length > 0 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="pt-1 space-y-1"
              >
                <span className="text-[10px] font-bold text-[#8B6914] block">
                  {product.customOptionLabel?.trim() || 'اختر اللون / النوع المطلوب'}:
                </span>
                <div className="flex flex-wrap gap-1">
                  {variants.map((v) => {
                    const isSelected = effectiveSelectedOption === v.name;
                    const isVarOut = v.stockCount <= 0;
                    return (
                      <button
                        key={v.name}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOption(v.name);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'gold-gradient-bg text-black border-[#D4AF37] font-extrabold'
                            : isVarOut
                            ? 'bg-neutral-100 text-neutral-400 border-neutral-200 line-through'
                            : 'bg-white text-neutral-700 border-[#D4AF37]/35 hover:border-[#D4AF37]'
                        }`}
                        title={isVarOut ? `${v.name} (نفذ من المخزون)` : `${v.name} (المتوفر: ${v.stockCount})`}
                      >
                        {v.image && (
                          <img
                            src={v.image}
                            alt={v.name}
                            className="w-3.5 h-3.5 rounded-xs object-contain bg-white border border-black/10 shrink-0"
                          />
                        )}
                        <span>{v.name}</span>
                        <span className={`text-[9px] font-mono ${isSelected ? 'text-black/80' : isVarOut ? 'text-red-500' : 'text-[#8B6914]'}`}>
                          ({isVarOut ? 'نفذ' : v.stockCount})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Actions */}
          <div className="pt-2 border-t border-[#D4AF37]/20 space-y-2">
            {/* Compact Delivery notice above price */}
            <div className="text-[9.5px] text-[#8B6914] font-semibold flex items-center justify-between bg-[#FAF7EF] px-2 py-1 rounded-md border border-[#D4AF37]/25">
              <span>التوصيل: 5,000 د.ع</span>
              {isFreeShippingPromoActive ? (
                <span className="text-[9px] text-emerald-700 font-bold">
                  مجاني فوق {formatPrice(freeShippingConfig?.minOrderAmountIQD, 'IQD')}
                </span>
              ) : (
                <span className="text-[9px] text-neutral-500">كافة المحافظات</span>
              )}
            </div>

            {/* Price display */}
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-neutral-600 font-semibold">السعر:</span>
              <div className="flex items-baseline gap-1.5">
                {product.originalPriceUSD && (
                  <span className="text-[11px] text-neutral-400 line-through tabular-nums font-mono">
                    {formatPrice(product.originalPriceUSD, currency)}
                  </span>
                )}
                <span className="text-base sm:text-lg font-extrabold gold-gradient-text tabular-nums font-mono">
                  {formatPrice(product.priceUSD, currency)}
                </span>
              </div>
            </div>

            {/* Action Buttons: Add to Cart & Buy Now */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <motion.button
                whileTap={isSelectedOptionOutOfStock ? undefined : { scale: 0.95 }}
                type="button"
                disabled={isSelectedOptionOutOfStock}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSelectedOptionOutOfStock) {
                    onAddToCart(product, effectiveSelectedOption);
                  }
                }}
                className={`w-full flex items-center justify-center gap-1 py-2 px-2 text-[11px] font-bold rounded-lg transition-colors ${
                  isSelectedOptionOutOfStock
                    ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                    : 'text-[#7A5912] bg-[#FAF7EF] border border-[#D4AF37]/45 hover:border-[#D4AF37] hover:bg-[#F3ECE0] cursor-pointer'
                }`}
                title={isSelectedOptionOutOfStock ? 'نفذت الكمية من المخزون' : 'إضافة إلى حقيبة التسوق'}
              >
                <ShoppingBag className={`w-3 h-3 shrink-0 ${isSelectedOptionOutOfStock ? 'text-neutral-400' : 'text-[#B8860B]'}`} />
                <span className="truncate">{isSelectedOptionOutOfStock ? 'نفذ المخزون' : 'إضافة للسلة'}</span>
              </motion.button>

              <motion.button
                whileTap={isSelectedOptionOutOfStock ? undefined : { scale: 0.95 }}
                type="button"
                disabled={isSelectedOptionOutOfStock}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSelectedOptionOutOfStock) {
                    onBuyNow(product, effectiveSelectedOption);
                  }
                }}
                className={`w-full flex items-center justify-center gap-1 py-2 px-2 text-[11px] font-extrabold rounded-lg transition-all ${
                  isSelectedOptionOutOfStock
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    : 'text-black gold-gradient-bg hover:brightness-110 cursor-pointer'
                }`}
                title={isSelectedOptionOutOfStock ? 'نفذت الكمية من المخزون' : 'طلب فوري كاش'}
              >
                <Zap className={`w-3 h-3 shrink-0 ${isSelectedOptionOutOfStock ? 'text-neutral-400' : 'fill-black'}`} />
                <span className="truncate">{isSelectedOptionOutOfStock ? 'غير متوفر' : 'شراء الآن'}</span>
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
