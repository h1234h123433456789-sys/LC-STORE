import React, { useState, useEffect } from 'react';
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
  Minus
} from 'lucide-react';
import { Product, FreeShippingConfig } from '../types';
import { formatPrice, toIQD } from '../utils/formatters';
import { ImageLightboxModal } from './ImageLightboxModal';

interface ProductDetailModalProps {
  product: Product | null;
  currency: 'USD' | 'IQD';
  freeShippingConfig?: FreeShippingConfig;
  isCovered?: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, selectedSize?: string) => void;
  onBuyNow: (product: Product, quantity: number, selectedSize?: string) => void;
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
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [addedNotice, setAddedNotice] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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

  // Synchronously reset state when product changes to avoid post-paint re-render blink
  const [prevProductId, setPrevProductId] = useState<string | undefined>(product?.id);
  if (product?.id !== prevProductId) {
    setPrevProductId(product?.id);
    setSelectedImageIndex(0);
    setQuantity(1);
    setSelectedSize(product?.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
    setAddedNotice(false);
    setIsZoomed(false);
  }

  // Build complete list of images for this product safely
  const imagesList: string[] = [];
  if (product?.images && product.images.length > 0) {
    product.images.forEach((img) => {
      if (img && typeof img === 'string' && img.trim()) {
        imagesList.push(img.trim());
      }
    });
  }
  if (imagesList.length === 0 && product?.image) {
    imagesList.push(product.image);
  }
  if (imagesList.length === 0) {
    imagesList.push('https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop');
  }

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
    if (product) {
      const finalSize = selectedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
      onAddToCart(product, quantity, finalSize);
      setAddedNotice(true);
      setTimeout(() => setAddedNotice(false), 2200);
    }
  };

  const handleBuy = () => {
    if (product) {
      const finalSize = selectedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
      onBuyNow(product, quantity, finalSize);
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
          className={`fixed inset-0 z-[100] w-full h-[100dvh] bg-[#07070A] overflow-hidden text-right ${isCovered ? 'hidden' : ''}`}
        >
          {/* Dynamic High-Visibility Luxury Gold Ambient Lighting */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
            <div 
              className="absolute inset-0" 
              style={{
                background: `
                  radial-gradient(ellipse 85% 50% at 50% 0%, rgba(212,175,55,0.22) 0%, transparent 70%),
                  radial-gradient(ellipse 75% 50% at 50% 100%, rgba(185,135,28,0.18) 0%, transparent 72%)
                `
              }}
            />
            <div 
              className="absolute -top-32 -right-24 w-[480px] sm:w-[700px] h-[480px] sm:h-[700px] rounded-full animate-gold-flow-1" 
              style={{ 
                background: 'radial-gradient(circle, rgba(255,215,65,0.28) 0%, rgba(212,175,55,0.14) 35%, rgba(212,175,55,0.04) 58%, transparent 75%)'
              }} 
            />
            <div 
              className="absolute -bottom-32 -left-24 w-[480px] sm:w-[700px] h-[480px] sm:h-[700px] rounded-full animate-gold-flow-2" 
              style={{ 
                background: 'radial-gradient(circle, rgba(245,195,45,0.24) 0%, rgba(212,175,55,0.11) 38%, rgba(212,175,55,0.03) 60%, transparent 75%)'
              }} 
            />
            <div 
              className="absolute top-1/4 left-1/5 w-[400px] sm:w-[580px] h-[400px] sm:h-[580px] rounded-full animate-gold-breath" 
              style={{ 
                background: 'radial-gradient(circle, rgba(255,220,90,0.18) 0%, rgba(212,175,55,0.08) 40%, transparent 72%)'
              }} 
            />
          </div>

          {/* Animated Full-Screen Modal Content Container */}
          <motion.div
            initial={{ scale: 0.96, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full h-full flex flex-col overflow-hidden"
          >
            {/* Top Sticky Header Bar */}
            <header className="sticky top-0 z-30 w-full bg-[#0F0F15] border-b border-[#D4AF37]/20 px-4 sm:px-8 py-3 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181822] hover:bg-[#222230] border border-[#D4AF37]/40 text-[#F3E5AB] font-bold text-xs transition-all cursor-pointer active:scale-95"
                >
                  <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                  <span>العودة للمتجر</span>
                </button>
                <span className="text-xs font-semibold text-neutral-400 hidden sm:inline-block">
                  تفاصيل ومعاينة المنتج
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#F3E5AB] bg-[#181822] px-3 py-1 rounded-full border border-[#D4AF37]/30">
                  {product.categoryLabel || 'معروضات LC'}
                </span>
                <button
                  onClick={onClose}
                  aria-label="إغلاق"
                  className="p-1.5 rounded-full bg-[#161620] text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer active:scale-90"
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
                  className="bg-[#0E0E14] border border-[#D4AF37]/25 rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 shadow-xl relative"
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
                    className="relative w-full aspect-square max-h-[360px] sm:max-h-[400px] bg-[#0B0B10] rounded-xl overflow-hidden flex items-center justify-center border border-[#D4AF37]/25 group cursor-zoom-in shadow-inner select-none"
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
                      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 border border-[#D4AF37]/50 text-[#F3E5AB] text-xs font-mono font-bold shadow-md">
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
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
                      className="absolute bottom-2.5 left-2.5 px-2.5 py-1.5 rounded-xl bg-black/85 text-white hover:text-[#D4AF37] border border-[#D4AF37]/50 transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 z-20"
                      title="تكبير وعرض الصورة بالحجم الكامل"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span className="text-xs font-bold">تكبير الصورة</span>
                    </button>

                    {/* Swipe hint on mobile */}
                    {imagesList.length > 1 && (
                      <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/75 text-neutral-300 text-[10px] font-medium pointer-events-none border border-neutral-800">
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
                          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/80 text-white hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/40 transition-all cursor-pointer shadow-md z-20 active:scale-90"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextImage}
                          aria-label="الصورة التالية"
                          className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/80 text-white hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/40 transition-all cursor-pointer shadow-md z-20 active:scale-90"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnails Row */}
                  {imagesList.length > 1 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs text-neutral-300 font-medium px-1">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>معرض الصور ({imagesList.length} صور متوفرة)</span>
                        </span>
                        <span className="text-[11px] text-[#D4AF37]">اضغط للمعاينة</span>
                      </div>
                      
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {imagesList.map((imgUrl, index) => {
                          const isSelected = selectedImageIndex === index;
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setSelectedImageIndex(index)}
                              className={`relative w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-xl overflow-hidden border-2 shrink-0 transition-all p-1 flex items-center justify-center cursor-pointer ${
                                isSelected
                                  ? 'border-[#D4AF37] bg-[#221F14] ring-1 ring-[#D4AF37]/50 scale-105'
                                  : 'border-neutral-700/80 bg-[#14141E] opacity-75 hover:opacity-100 hover:border-[#D4AF37]/60'
                              }`}
                            >
                              <img
                                src={imgUrl}
                                alt={`${product.name} - ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                              <span className={`absolute bottom-0.5 right-0.5 text-[9px] font-mono px-1 rounded-sm leading-none ${
                                isSelected ? 'bg-[#D4AF37] text-black font-bold' : 'bg-black/85 text-white'
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
                  className="bg-[#0E0E14] border border-[#D4AF37]/25 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl"
                >
                  {/* Category & Availability */}
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-1.5 text-[#F3E5AB]">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-xs font-semibold bg-[#181822] px-3 py-1 rounded-lg border border-[#D4AF37]/30">
                        {product.categoryLabel}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-semibold text-xs bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>متاح للطلب والتسليم الفوري</span>
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-lg sm:text-2xl font-extrabold text-white leading-snug">
                    {product.name}
                  </h1>

                  {/* Price Banner with Delivery Fee & Free Shipping Promo */}
                  <div className="bg-[#14141E] p-3.5 sm:p-4 rounded-xl border border-[#D4AF37]/35 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-[#D4AF37] font-medium pb-2 border-b border-neutral-800/80">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                        {qualifiesForFreeShippingAlone ? (
                          <span className="text-emerald-300 font-bold">
                            🎉 هذا الطلب مؤهل للتوصيل المجاني الفوري!
                          </span>
                        ) : (
                          <span>سعر التوصيل 5,000 دينار عراقي</span>
                        )}
                      </div>
                      {isPromoEnabled && !qualifiesForFreeShippingAlone ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 font-bold">
                          توصيل مجاني للطلبات فوق {formatPrice(minAmountIQD, 'IQD')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400">لكافة محافظات العراق</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-neutral-300 font-semibold">سعر القطعة الواحدة:</span>
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-xl sm:text-2xl font-black gold-gradient-text tabular-nums font-mono">
                          {formatPrice(product.priceUSD, currency)}
                        </span>
                        {product.originalPriceUSD && (
                          <span className="text-xs sm:text-sm text-neutral-500 line-through tabular-nums font-mono">
                            {formatPrice(product.originalPriceUSD, currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Description */}
                  <div className="bg-[#12121A] p-3.5 rounded-xl border border-neutral-800/90 space-y-1.5">
                    <h3 className="text-xs font-bold text-[#D4AF37] flex items-center gap-1.5">
                      <span>تفاصيل ومواصفات المنتج:</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-line">
                      {product.description || product.shortDesc || 'منتج فاخر معروض بمتجر LC الرسمي مع خدمة التوصيل السريع والدفع كاش عند التسليم.'}
                    </p>
                  </div>

                  {/* Specs Matrix */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-[#13131C] p-3 rounded-xl border border-neutral-800/80">
                      <span className="text-neutral-500 block text-[10px] mb-0.5">الجودة والخامة</span>
                      <span className="font-bold text-xs text-white">
                        {product.specs?.material || 'خامات أصلية فاخرة'}
                      </span>
                    </div>
                    <div className="bg-[#13131C] p-3 rounded-xl border border-neutral-800/80">
                      <span className="text-neutral-500 block text-[10px] mb-0.5">حالة المنتج والتغليف</span>
                      <span className="font-bold text-xs text-white">
                        {product.specs?.warranty && !product.specs.warranty.includes('فحص') && !product.specs.warranty.includes('معاينة') && !product.specs.warranty.includes('ضمان')
                          ? product.specs.warranty
                          : 'جديد أصلي 100% بتغليف المصنع'}
                      </span>
                    </div>
                  </div>

                  {/* Sizes Selection */}
                  {product.sizes && product.sizes.length > 0 && (
                    <div className="bg-[#13131C] p-3.5 rounded-xl border border-[#D4AF37]/35 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>القياس المطلوب:</span>
                          {selectedSize && (
                            <span className="text-[#F3E5AB] font-bold">({selectedSize})</span>
                          )}
                        </span>
                        <span className="text-[11px] text-[#D4AF37] font-medium">اختر قياسك</span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {product.sizes.map((sz) => {
                          const isSelected = selectedSize === sz;
                          return (
                            <button
                              type="button"
                              key={sz}
                              onClick={() => setSelectedSize(sz)}
                              className={`min-w-10 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                                isSelected
                                  ? 'bg-[#D4AF37] text-black shadow-md scale-105 ring-1 ring-[#F3E5AB]'
                                  : 'bg-[#1A1A25] hover:bg-[#232332] text-neutral-200 border border-neutral-700/80 hover:border-[#D4AF37]/50'
                              }`}
                            >
                              {isSelected && <span>✓</span>}
                              <span>{sz}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity Selector Box */}
                  <div className="bg-[#13131C] p-3 rounded-xl border border-neutral-800/90 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-bold text-white block">الكمية المطلوبة:</span>
                      {quantity > 1 && (
                        <span className="text-[11px] text-[#F3E5AB] font-mono">
                          المجموع: {formatPrice(currentTotalIQD, 'IQD')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-[#1A1A26] border border-[#D4AF37]/30 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3.5 text-sm font-extrabold text-[#F3E5AB] font-mono">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2.5 border-t border-neutral-800/80 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleAdd}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-bold text-[#F3E5AB] bg-[#181822] border border-[#D4AF37]/50 hover:border-[#D4AF37] rounded-xl transition-colors cursor-pointer"
                      >
                        {addedNotice ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 font-extrabold">تمت الإضافة للسلة!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                            <span>إضافة إلى السلة</span>
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleBuy}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-xs sm:text-sm font-black text-black gold-gradient-bg hover:brightness-110 rounded-xl transition-[filter] cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.28)]"
                      >
                        <Zap className="w-4 h-4 fill-black" />
                        <span>طلب فوري كاش</span>
                      </motion.button>
                    </div>

                    <p className="text-center text-[11px] text-neutral-400">
                      تدفع المبلغ نقداً للمندوب عند استلام الطلب في محافظتك
                    </p>

                    {/* Guarantees Matrix */}
                    <div className="pt-2.5 border-t border-neutral-800/80 grid grid-cols-3 gap-2 text-center text-xs text-neutral-300">
                      <div className="bg-[#12121A] p-2 rounded-xl border border-neutral-800/80 flex flex-col items-center gap-1">
                        <Banknote className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span className="text-[10.5px] font-medium">الدفع نقداً كاش</span>
                      </div>
                      <div className="bg-[#12121A] p-2 rounded-xl border border-neutral-800/80 flex flex-col items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span className="text-[10.5px] font-medium">توصيل سريع</span>
                      </div>
                      <div className="bg-[#12121A] p-2 rounded-xl border border-neutral-800/80 flex flex-col items-center gap-1">
                        <PackageCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span className="text-[10.5px] font-medium">تغليف محكم وأصلي</span>
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
