import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check, 
  Truck, 
  ShoppingBag, 
  Zap, 
  Banknote,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  PackageCheck,
  Sparkles,
  ArrowRight,
  Plus,
  Minus,
  Package
} from 'lucide-react';
import { Product, FreeShippingConfig, getProductVariants } from '../types';
import { formatPrice, toIQD } from '../utils/formatters';
import { ImageLightboxModal } from './ImageLightboxModal';

interface ProductDetailModalProps {
  product: Product | null;
  currency: 'USD' | 'IQD';
  freeShippingConfig?: FreeShippingConfig;
  isCovered?: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, selectedOption?: string) => void;
  onBuyNow: (product: Product, quantity: number, selectedOption?: string) => void;
  onOpenZoom?: (images: string[], initialIndex: number, title: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  currency,
  freeShippingConfig,
  isCovered = false,
  onClose,
  onAddToCart,
  onBuyNow,
  onOpenZoom
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const variants = getProductVariants(product);
  const firstAvailableVariant = variants.find((v) => v.stockCount > 0) || variants[0];

  const [selectedOption, setSelectedOption] = useState<string>(() => firstAvailableVariant?.name || '');

  // Build complete list of images for this product safely (including any variant-linked images)
  const imagesList: string[] = [];
  if (product?.images && product.images.length > 0) {
    product.images.forEach((img) => {
      if (img && typeof img === 'string' && img.trim() && !imagesList.includes(img.trim())) {
        imagesList.push(img.trim());
      }
    });
  }
  if (imagesList.length === 0 && product?.image) {
    imagesList.push(product.image);
  }
  variants.forEach((v) => {
    if (v.image && v.image.trim() && !imagesList.includes(v.image.trim())) {
      imagesList.push(v.image.trim());
    }
  });
  if (imagesList.length === 0) {
    imagesList.push('https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop');
  }

  // Synchronously reset state when product changes to avoid post-paint re-render blink
  const [prevProductId, setPrevProductId] = useState<string | undefined>(product?.id);
  if (product?.id !== prevProductId) {
    setPrevProductId(product?.id);
    const defaultVar = variants.find((v) => v.stockCount > 0) || variants[0];
    setSelectedOption(defaultVar?.name || '');
    const defaultImgIdx = defaultVar?.image ? Math.max(0, imagesList.indexOf(defaultVar.image)) : 0;
    setSelectedImageIndex(defaultImgIdx);
    setQuantity(1);
    setAddedNotice(false);
    setIsZoomed(false);
  }

  const activeVariant =
    variants.length > 0
      ? variants.find((v) => v.name === selectedOption) || firstAvailableVariant
      : undefined;

  const effectiveSelectedOption = activeVariant?.name;

  const totalProductStock = product
    ? variants.length > 0
      ? variants.reduce((sum, v) => sum + Math.max(0, v.stockCount), 0)
      : product.inStock === false
      ? 0
      : typeof product.stockCount === 'number'
      ? Math.max(0, product.stockCount)
      : 10
    : 0;

  const stockCount = activeVariant ? Math.max(0, activeVariant.stockCount) : totalProductStock;
  const isOutOfStock = stockCount <= 0;

  const handleSelectVariant = (varName: string) => {
    setSelectedOption(varName);
    const targetVar = variants.find((v) => v.name === varName);
    if (targetVar) {
      if (targetVar.image) {
        const idx = imagesList.indexOf(targetVar.image);
        if (idx >= 0) {
          setSelectedImageIndex(idx);
        }
      }
      if (targetVar.stockCount > 0 && quantity > targetVar.stockCount) {
        setQuantity(targetVar.stockCount);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 40) {
      handleNextImage();
    } else if (diff < -40) {
      handlePrevImage();
    }
    setTouchStartX(null);
  };

  const currentImage = imagesList[selectedImageIndex] || imagesList[0];

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedImageIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedImageIndex((prev) => (prev === imagesList.length - 1 ? 0 : prev + 1));
  };

  const handleAdd = () => {
    if (product && !isOutOfStock) {
      const safeQty = Math.min(quantity, stockCount);
      onAddToCart(product, safeQty, effectiveSelectedOption);
      setAddedNotice(true);
      setTimeout(() => setAddedNotice(false), 2200);
    }
  };

  const handleBuy = () => {
    if (product && !isOutOfStock) {
      const safeQty = Math.min(quantity, stockCount);
      onBuyNow(product, safeQty, effectiveSelectedOption);
    }
  };

  const unitPriceIQD = toIQD(product?.priceUSD || 0);
  const currentTotalIQD = unitPriceIQD * quantity;
  const isPromoEnabled = Boolean(freeShippingConfig?.enabled && (freeShippingConfig?.minOrderAmountIQD || 0) > 0);
  const minAmountIQD = freeShippingConfig?.minOrderAmountIQD || 50000;
  const qualifiesForFreeShippingAlone = isPromoEnabled && currentTotalIQD >= minAmountIQD;

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`fixed inset-0 z-[100] w-full h-[100dvh] bg-white overflow-hidden text-right ${isCovered ? 'hidden' : ''}`}
        >
          {/* Animated Full-Screen Modal Content Container */}
          <motion.div
            initial={{ scale: 0.96, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full h-full flex flex-col overflow-hidden"
          >
            {/* Top Sticky Header Bar */}
            <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-[#D4AF37]/30 px-4 sm:px-8 py-3 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF7EF] hover:bg-[#F3ECE0] border border-[#D4AF37]/45 text-[#7A5912] font-bold text-xs transition-all cursor-pointer active:scale-95"
                >
                  <ArrowRight className="w-4 h-4 text-[#B8860B]" />
                  <span>العودة للمتجر</span>
                </button>
                <span className="text-xs font-semibold text-neutral-500 hidden sm:inline-block">
                  تفاصيل ومعاينة المنتج
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#7A5912] bg-[#FAF7EF] px-3 py-1 rounded-full border border-[#D4AF37]/40">
                  {product.categoryLabel || 'معروضات LC'}
                </span>
                <button
                  onClick={onClose}
                  aria-label="إغلاق"
                  className="p-1.5 rounded-full bg-[#FAF7EF] text-neutral-600 hover:text-neutral-900 border border-[#D4AF37]/30 transition-colors cursor-pointer active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Full Screen Body Content Area */}
            <main 
              className="flex-1 overflow-y-auto p-4 sm:p-7 max-w-5xl mx-auto w-full scrollbar-thin relative z-10"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7 items-start">
                
                {/* Left Column: Image Viewer Stage */}
                <motion.div
                  initial={{ x: 20 }}
                  animate={{ x: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="bg-white border border-[#D4AF37]/35 rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 shadow-[0_8px_30px_rgba(212,175,55,0.12)] relative"
                >
                  {/* Main Image Stage */}
                  <div 
                    onClick={() => {
                      if (onOpenZoom && product) {
                        onOpenZoom(imagesList, selectedImageIndex, product.name);
                      } else {
                        setIsZoomed(true);
                      }
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="relative w-full aspect-square max-h-[360px] sm:max-h-[400px] bg-white rounded-xl overflow-hidden flex items-center justify-center border border-[#D4AF37]/30 group cursor-zoom-in select-none"
                    title="اضغط لتكبير وعرض الصورة بالحجم الكامل (أو اسحب للتنقل بين الصور)"
                  >
                    {/* Main Product Image with Smooth Crossfade */}
                    <AnimatePresence initial={false}>
                      <motion.div
                        key={currentImage}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute inset-2 sm:inset-3 flex items-center justify-center z-10"
                      >
                        <img
                          src={currentImage}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="max-w-full max-h-full w-auto h-auto object-contain select-none transition-transform duration-500 group-hover:scale-105"
                        />
                      </motion.div>
                    </AnimatePresence>

                    {/* Top-Right Badge: Photo Counter */}
                    {imagesList.length > 1 && (
                      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-[#D4AF37]/50 text-[#7A5912] text-xs font-mono font-bold shadow-sm">
                        <Sparkles className="w-3 h-3 text-[#B8860B]" />
                        <span>{selectedImageIndex + 1} / {imagesList.length}</span>
                      </div>
                    )}

                    {/* Fullscreen Magnify button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenZoom && product) {
                          onOpenZoom(imagesList, selectedImageIndex, product.name);
                        } else {
                          setIsZoomed(true);
                        }
                      }}
                      className="absolute bottom-2.5 left-2.5 px-2.5 py-1.5 rounded-xl bg-white/95 text-neutral-800 hover:text-[#8B6914] border border-[#D4AF37]/50 transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95 z-20"
                      title="تكبير وعرض الصورة بالحجم الكامل"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-[#B8860B]" />
                      <span className="text-xs font-bold">تكبير الصورة</span>
                    </button>

                    {/* Swipe hint on mobile */}
                    {imagesList.length > 1 && (
                      <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 text-neutral-600 text-[10px] font-medium pointer-events-none border border-[#D4AF37]/30">
                        <span>اسحب للتنقل ↔</span>
                      </div>
                    )}

                    {/* Navigation Arrows for multi-images */}
                    {imagesList.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={handlePrevImage}
                          aria-label="الصورة السابقة"
                          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-neutral-800 hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/45 transition-all cursor-pointer shadow-md z-20 active:scale-90"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextImage}
                          aria-label="الصورة التالية"
                          className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-neutral-800 hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/45 transition-all cursor-pointer shadow-md z-20 active:scale-90"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnails Row */}
                  {imagesList.length > 1 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs text-neutral-600 font-medium px-1">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
                          <span>معرض الصور ({imagesList.length} صور متوفرة)</span>
                        </span>
                        <span className="text-[11px] text-[#8B6914] font-semibold">اضغط للمعاينة</span>
                      </div>
                      
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {imagesList.map((imgUrl, index) => {
                          const isSelected = selectedImageIndex === index;
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setSelectedImageIndex(index)}
                              className={`relative w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-xl overflow-hidden border-2 shrink-0 transition-all p-1 flex items-center justify-center cursor-pointer bg-white ${
                                isSelected
                                  ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50 scale-105'
                                  : 'border-[#D4AF37]/25 opacity-75 hover:opacity-100 hover:border-[#D4AF37]/60'
                              }`}
                            >
                              <img
                                src={imgUrl}
                                alt={`${product.name} - ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                              <span className={`absolute bottom-0.5 right-0.5 text-[9px] font-mono px-1 rounded-sm leading-none ${
                                isSelected ? 'bg-[#D4AF37] text-black font-bold' : 'bg-neutral-800 text-white'
                              }`}>
                                {index + 1}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Right Column: Full Product Information */}
                <motion.div
                  initial={{ x: -20 }}
                  animate={{ x: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="bg-white border border-[#D4AF37]/35 rounded-2xl p-4 sm:p-6 space-y-4 shadow-[0_8px_30px_rgba(212,175,55,0.12)]"
                >
                  {/* Category & Stock Availability */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-3 border-b border-[#D4AF37]/20">
                    <div className="flex items-center gap-1.5 text-[#7A5912]">
                      <Sparkles className="w-4 h-4 text-[#B8860B]" />
                      <span className="text-xs font-bold bg-[#FAF7EF] px-3 py-1 rounded-lg border border-[#D4AF37]/35">
                        {product.categoryLabel}
                      </span>
                    </div>
                    <div>
                      {isOutOfStock ? (
                        <span className="text-red-700 font-bold text-xs bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 flex items-center gap-1">
                          <span>{activeVariant ? `نفذ مخزون (${activeVariant.name})` : 'نفذت الكمية من المخزون'}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {activeVariant
                              ? `المخزون المتوفر (${activeVariant.name}): ${stockCount} قطعة`
                              : `المخزون المتوفر: ${stockCount} قطعة`}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-lg sm:text-2xl font-extrabold text-neutral-900 leading-snug">
                    {product.name}
                  </h1>

                  {/* Price Banner with Delivery Fee & Free Shipping Promo */}
                  <div className="bg-[#FAF7EF] p-3.5 sm:p-4 rounded-xl border border-[#D4AF37]/40 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-[#8B6914] font-semibold pb-2 border-b border-[#D4AF37]/20">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#B8860B]" />
                        {qualifiesForFreeShippingAlone ? (
                          <span className="text-emerald-700 font-bold">
                            🎉 هذا الطلب مؤهل للتوصيل المجاني الفوري!
                          </span>
                        ) : (
                          <span>سعر التوصيل 5,000 دينار عراقي</span>
                        )}
                      </div>
                      {isPromoEnabled && !qualifiesForFreeShippingAlone ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                          توصيل مجاني للطلبات فوق {formatPrice(minAmountIQD, 'IQD')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-500">لكافة محافظات العراق</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-neutral-700 font-bold">سعر القطعة الواحدة:</span>
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-xl sm:text-2xl font-black gold-gradient-text tabular-nums font-mono">
                          {formatPrice(product.priceUSD, currency)}
                        </span>
                        {product.originalPriceUSD && (
                          <span className="text-xs sm:text-sm text-neutral-400 line-through tabular-nums font-mono">
                            {formatPrice(product.originalPriceUSD, currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Description */}
                  <div className="bg-[#FAF8F2] p-3.5 rounded-xl border border-[#D4AF37]/25 space-y-1.5">
                    <h3 className="text-xs font-bold text-[#8B6914] flex items-center gap-1.5">
                      <span>تفاصيل ومواصفات المنتج:</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                      {product.description || product.shortDesc || 'منتج فاخر معروض بمتجر LC الرسمي مع خدمة التوصيل السريع والدفع كاش عند التسليم.'}
                    </p>
                  </div>

                  {/* Specs Matrix */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-[#FAF8F2] p-3 rounded-xl border border-[#D4AF37]/25">
                      <span className="text-neutral-500 block text-[10px] mb-0.5">الجودة والخامة</span>
                      <span className="font-bold text-xs text-neutral-900">
                        {product.specs?.material || 'خامات أصلية فاخرة'}
                      </span>
                    </div>
                    <div className="bg-[#FAF8F2] p-3 rounded-xl border border-[#D4AF37]/25">
                      <span className="text-neutral-500 block text-[10px] mb-0.5">حالة المنتج والتغليف</span>
                      <span className="font-bold text-xs text-neutral-900">
                        {product.specs?.warranty && !product.specs.warranty.includes('فحص') && !product.specs.warranty.includes('معاينة') && !product.specs.warranty.includes('ضمان')
                          ? product.specs.warranty
                          : 'جديد أصلي 100% بتغليف المصنع'}
                      </span>
                    </div>
                  </div>

                  {/* Custom Product Options / Variants Selector (Shown ONLY if admin added options) */}
                  {variants.length > 0 && (
                    <div className="bg-[#FAF7EF] p-3.5 rounded-xl border border-[#D4AF37]/40 space-y-2.5">
                      <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                        <span className="font-extrabold text-neutral-900">
                          {product.customOptionLabel?.trim() || 'اختر اللون / النوع المطلوب'}:
                        </span>
                        {activeVariant && (
                          <span className="text-[11px] font-bold text-[#7A5912] bg-white px-2.5 py-0.5 rounded-lg border border-[#D4AF37]/40">
                            المحدد: {activeVariant.name} ({activeVariant.stockCount > 0 ? `متوفر ${activeVariant.stockCount} قطعة` : 'نفذ من المخزون'})
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {variants.map((v) => {
                          const isSelected = effectiveSelectedOption === v.name;
                          const isVarOut = v.stockCount <= 0;
                          return (
                            <button
                              key={v.name}
                              type="button"
                              onClick={() => handleSelectVariant(v.name)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
                                isSelected
                                  ? 'gold-gradient-bg text-black border-[#D4AF37] font-extrabold shadow-xs ring-2 ring-[#D4AF37]/40'
                                  : isVarOut
                                  ? 'bg-neutral-100 text-neutral-400 border-neutral-200 opacity-75'
                                  : 'bg-white text-neutral-800 border-[#D4AF37]/35 hover:border-[#D4AF37]'
                              }`}
                            >
                              {v.image && (
                                <img
                                  src={v.image}
                                  alt={v.name}
                                  className="w-6 h-6 rounded-md object-contain bg-white border border-black/15 p-0.5 shrink-0"
                                />
                              )}
                              <div className="text-right">
                                <span className="block leading-tight">{v.name}</span>
                                <span
                                  className={`block text-[10px] font-mono leading-tight mt-0.5 ${
                                    isSelected ? 'text-black/80 font-extrabold' : isVarOut ? 'text-red-600' : 'text-[#8B6914]'
                                  }`}
                                >
                                  {isVarOut ? 'نفذ من المخزون' : `المتوفر: ${v.stockCount}`}
                                </span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-black shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity Selector Box (Capped at stockCount) */}
                  <div className="bg-[#FAF7EF] p-3 rounded-xl border border-[#D4AF37]/30 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-bold text-neutral-900 block">
                        الكمية المطلوبة {stockCount > 0 ? `(المتوفر${activeVariant ? ` لـ ${activeVariant.name}` : ''}: ${stockCount})` : '(نفذ المخزون)'}:
                      </span>
                      {quantity > 1 && (
                        <span className="text-[11px] text-[#8B6914] font-bold font-mono">
                          المجموع: {formatPrice(currentTotalIQD, 'IQD')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-[#D4AF37]/40 rounded-xl p-1 shadow-xs">
                      <button
                        type="button"
                        disabled={isOutOfStock || quantity <= 1}
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="p-1.5 rounded-lg hover:bg-[#FAF7EF] text-neutral-700 hover:text-neutral-900 disabled:opacity-40 transition-colors cursor-pointer active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3.5 text-sm font-extrabold text-[#7A5912] font-mono">
                        {isOutOfStock ? 0 : quantity}
                      </span>
                      <button
                        type="button"
                        disabled={isOutOfStock || quantity >= stockCount}
                        onClick={() => setQuantity((q) => Math.min(stockCount, q + 1))}
                        className="p-1.5 rounded-lg hover:bg-[#FAF7EF] text-neutral-700 hover:text-neutral-900 disabled:opacity-40 transition-colors cursor-pointer active:scale-90"
                        title={quantity >= stockCount ? 'وصلت للحد الأقصى المتوفر في المخزون' : 'زيادة الكمية'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2.5 border-t border-[#D4AF37]/20 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <motion.button
                        whileHover={isOutOfStock ? undefined : { scale: 1.02 }}
                        whileTap={isOutOfStock ? undefined : { scale: 0.96 }}
                        disabled={isOutOfStock}
                        onClick={handleAdd}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-bold rounded-xl transition-colors ${
                          isOutOfStock
                            ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                            : 'text-[#7A5912] bg-[#FAF7EF] border border-[#D4AF37]/55 hover:border-[#D4AF37] hover:bg-[#F3ECE0] cursor-pointer'
                        }`}
                      >
                        {addedNotice ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-700 font-extrabold">تمت الإضافة للسلة!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className={`w-4 h-4 ${isOutOfStock ? 'text-neutral-400' : 'text-[#B8860B]'}`} />
                            <span>{isOutOfStock ? 'نفذت الكمية' : 'إضافة إلى السلة'}</span>
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={isOutOfStock ? undefined : { scale: 1.02 }}
                        whileTap={isOutOfStock ? undefined : { scale: 0.96 }}
                        disabled={isOutOfStock}
                        onClick={handleBuy}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-black rounded-xl transition-[filter] ${
                          isOutOfStock
                            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                            : 'text-black gold-gradient-bg hover:brightness-110 cursor-pointer shadow-[0_4px_20px_rgba(212,175,55,0.32)]'
                        }`}
                      >
                        <Zap className={`w-4 h-4 ${isOutOfStock ? 'text-neutral-400' : 'fill-black'}`} />
                        <span>{isOutOfStock ? 'غير متوفر حالياً' : 'طلب فوري كاش'}</span>
                      </motion.button>
                    </div>

                    <p className="text-center text-[11px] text-neutral-500">
                      تدفع المبلغ نقداً للمندوب عند استلام الطلب في محافظتك
                    </p>

                    {/* Guarantees Matrix */}
                    <div className="pt-2.5 border-t border-[#D4AF37]/20 grid grid-cols-3 gap-2 text-center text-xs text-neutral-700">
                      <div className="bg-[#FAF8F2] p-2 rounded-xl border border-[#D4AF37]/25 flex flex-col items-center gap-1">
                        <Banknote className="w-3.5 h-3.5 text-[#B8860B]" />
                        <span className="text-[10.5px] font-semibold">الدفع نقداً كاش</span>
                      </div>
                      <div className="bg-[#FAF8F2] p-2 rounded-xl border border-[#D4AF37]/25 flex flex-col items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-[#B8860B]" />
                        <span className="text-[10.5px] font-semibold">توصيل سريع</span>
                      </div>
                      <div className="bg-[#FAF8F2] p-2 rounded-xl border border-[#D4AF37]/25 flex flex-col items-center gap-1">
                        <PackageCheck className="w-3.5 h-3.5 text-[#B8860B]" />
                        <span className="text-[10.5px] font-semibold">تغليف محكم وأصلي</span>
                      </div>
                    </div>
                  </div>

                </motion.div>

              </div>
            </main>
          </motion.div>

          {/* Lightbox / Fullscreen Image View */}
          <ImageLightboxModal
            isOpen={isZoomed}
            images={imagesList}
            initialIndex={selectedImageIndex}
            title={product.name}
            onClose={() => setIsZoomed(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
