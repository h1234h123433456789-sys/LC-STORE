import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShieldCheck, 
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
  ArrowRight
} from 'lucide-react';
import { Product } from '../types';
import { formatPrice } from '../utils/formatters';
import { ImageLightboxModal } from './ImageLightboxModal';

interface ProductDetailModalProps {
  product: Product | null;
  currency: 'USD' | 'IQD';
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, selectedSize?: string) => void;
  onBuyNow: (product: Product, quantity: number, selectedSize?: string) => void;
  onOpenZoom?: (images: string[], initialIndex: number, title: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  currency,
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

  // Reset index when product changes
  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    setSelectedSize(product?.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
    setIsZoomed(false);
  }, [product?.id]);

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

  return (
    <AnimatePresence>
      {product && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] w-full h-full bg-[#0A0A0E] flex flex-col overflow-hidden text-right"
          style={{ height: '100dvh', maxHeight: '-webkit-fill-available' }}
        >
        {/* Smooth, luxury gold ambient background (Zero GPU overhead) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#060609] select-none">
          <div 
            className="absolute inset-0" 
            style={{
              background: `
                radial-gradient(ellipse 70% 50% at 70% 10%, rgba(212,175,55,0.2) 0%, transparent 70%),
                radial-gradient(ellipse 60% 50% at 20% 90%, rgba(170,119,28,0.18) 0%, transparent 70%)
              `
            }}
          />
        </div>

        {/* Top Sticky Header Bar (Full Width Screen View) */}
        <header className="sticky top-0 z-30 w-full bg-[#111116]/95 backdrop-blur-md border-b border-neutral-800/90 px-4 sm:px-8 py-3.5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C26] hover:bg-[#252533] border border-[#D4AF37]/40 text-[#F3E5AB] font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
              <span>العودة للمتجر</span>
            </button>
            <span className="text-xs font-semibold text-neutral-400 hidden sm:inline-block">
              تفاصيل ورؤية المنتج
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#F3E5AB] bg-[#1C1C24] px-3 py-1 rounded-full border border-[#D4AF37]/30">
              {product.categoryLabel || 'معروضات LC'}
            </span>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Full Screen Body Content Area */}
        <main 
          className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl mx-auto w-full scrollbar-thin space-y-6 relative z-10"
          style={{ WebkitOverflowScrolling: 'touch', transform: 'translateZ(0)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
            
            {/* Left Column: Image Viewer Stage */}
            <div className="bg-[#0E0E14] border border-neutral-800/90 rounded-3xl p-3 sm:p-6 space-y-3 sm:space-y-4 shadow-[0_0_50px_rgba(212,175,55,0.12)] relative">
              
              {/* Main Image Stage (Clean, fixed 1:1 ratio container with pure background and centered image) */}
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
                className="relative w-full aspect-square max-h-[380px] sm:max-h-[420px] bg-[#07070B] rounded-2xl overflow-hidden flex items-center justify-center border border-[#D4AF37]/30 group cursor-zoom-in shadow-2xl select-none"
                title="اضغط لتكبير وعرض الصورة بالحجم الكامل (أو اسحب للتنقل بين الصور)"
              >
                {/* Main Product Image Centered Inside Strict Aspect Ratio */}
                <div className="absolute inset-2 sm:inset-3 flex items-center justify-center z-10">
                  <img
                    key={currentImage}
                    src={currentImage}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    decoding="async"
                    // @ts-ignore
                    fetchPriority="high"
                    className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_15px_35px_rgba(0,0,0,0.95)] select-none"
                  />
                </div>

                {/* Top-Right Badge: Photo Counter (e.g. 1 / 7) */}
                {imagesList.length > 1 && (
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 border border-[#D4AF37]/60 text-[#F3E5AB] text-xs font-mono font-bold shadow-xl backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
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
                  className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/85 text-white hover:text-[#D4AF37] border border-[#D4AF37]/60 transition-all cursor-pointer shadow-2xl flex items-center gap-1.5 active:scale-95 z-20 backdrop-blur-md"
                  title="تكبير وعرض الصورة بالحجم الكامل"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="text-xs font-bold">تكبير الصورة</span>
                </button>

                {/* Swipe hint on mobile */}
                {imagesList.length > 1 && (
                  <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/80 text-neutral-300 text-[10px] font-medium backdrop-blur-md pointer-events-none border border-neutral-800">
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
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-black/85 text-white hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/50 transition-all cursor-pointer shadow-2xl z-20 active:scale-90"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextImage}
                      aria-label="الصورة التالية"
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-black/85 text-white hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/50 transition-all cursor-pointer shadow-2xl z-20 active:scale-90"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails Row (Clean, high-contrast, zero grey scrollbar bug) */}
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
                          className={`relative w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-xl overflow-hidden border-2 shrink-0 transition-all p-1 flex items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'border-[#D4AF37] bg-[#221F14] ring-2 ring-[#D4AF37]/60 shadow-[0_0_18px_rgba(212,175,55,0.5)] scale-105'
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

            </div>

            {/* Right Column: Full Product Information */}
            <div className="bg-[#0E0E14] border border-neutral-800/90 rounded-3xl p-5 sm:p-7 space-y-5 shadow-[0_0_50px_rgba(212,175,55,0.12)]">
              
              {/* Category & Availability */}
              <div className="flex items-center justify-between text-xs pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-1.5 text-[#F3E5AB]">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs font-semibold bg-[#1C1C24] px-3 py-1 rounded-lg border border-[#D4AF37]/30">
                    {product.categoryLabel}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-400 font-semibold text-xs bg-emerald-950/50 px-3 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>متاح للطلب والتسليم الفوري</span>
                  </span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-snug">
                {product.name}
              </h1>

              {/* Price Banner with Delivery Fee notice above */}
              <div className="bg-[#15151F] p-4 sm:p-5 rounded-2xl border border-[#D4AF37]/35 shadow-inner space-y-2">
                {/* Fine subtle font for delivery fee as requested */}
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#D4AF37] font-medium pb-2 border-b border-neutral-800/80">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>سعر التوصيل 5,000 دينار عراقي</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">لكافة محافظات العراق</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-neutral-300 font-semibold">سعر المنتج:</span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl font-black gold-gradient-text tabular-nums font-mono">
                      {formatPrice(product.priceUSD, currency)}
                    </span>
                    {product.originalPriceUSD && (
                      <span className="text-sm text-neutral-500 line-through tabular-nums font-mono">
                        {formatPrice(product.originalPriceUSD, currency)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Description */}
              <div className="bg-[#13131A] p-4 rounded-2xl border border-neutral-800/90 space-y-2">
                <h3 className="text-xs font-bold text-[#D4AF37] flex items-center gap-1.5">
                  <span>تفاصيل ومواصفات المنتج:</span>
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-line">
                  {product.description || product.shortDesc || 'منتج فاخر معروض بمتجر LC الرسمي مع خدمة التوصيل السريع والدفع كاش عند التسليم.'}
                </p>
              </div>

              {/* Specs Matrix */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#14141E] p-3.5 rounded-2xl border border-neutral-800/80">
                  <span className="text-neutral-500 block text-[11px] mb-0.5">الجودة والخامة</span>
                  <span className="font-bold text-xs text-white">
                    {product.specs?.material || 'خامات أصلية فاخرة'}
                  </span>
                </div>
                <div className="bg-[#14141E] p-3.5 rounded-2xl border border-neutral-800/80">
                  <span className="text-neutral-500 block text-[11px] mb-0.5">حالة المنتج والتغليف</span>
                  <span className="font-bold text-xs text-white">
                    {product.specs?.warranty && !product.specs.warranty.includes('فحص') && !product.specs.warranty.includes('معاينة') && !product.specs.warranty.includes('ضمان')
                      ? product.specs.warranty
                      : 'جديد أصلي 100% بتغليف المصنع'}
                  </span>
                </div>
              </div>

              {/* Sizes Selection (Only renders if product has sizes configured) */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="bg-[#13131D] p-4 rounded-2xl border border-[#D4AF37]/35 space-y-2.5">
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
                          className={`min-w-11 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-[#D4AF37] text-black shadow-[0_0_18px_rgba(212,175,55,0.45)] scale-105 ring-2 ring-[#F3E5AB]'
                              : 'bg-[#1C1C26] hover:bg-[#252535] text-neutral-200 border border-neutral-700/80 hover:border-[#D4AF37]/50'
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

              {/* Action Buttons */}
              <div className="pt-4 border-t border-neutral-800/80 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleAdd}
                    className="w-full flex items-center justify-center gap-2 py-4 px-4 text-xs font-bold text-[#F3E5AB] bg-[#1A1A24] border border-[#D4AF37]/50 hover:border-[#D4AF37] rounded-2xl transition-all cursor-pointer active:scale-95 shadow-md"
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
                  </button>

                  <button
                    onClick={handleBuy}
                    className="w-full flex items-center justify-center gap-2 py-4 px-4 text-xs font-black text-black gold-gradient-bg hover:brightness-110 rounded-2xl transition-all cursor-pointer active:scale-95 shadow-[0_0_25px_rgba(212,175,55,0.35)]"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>طلب فوري كاش</span>
                  </button>
                </div>

                <p className="text-center text-[11px] text-neutral-400">
                  تدفع المبلغ نقداً للمندوب عند استلام الطلب في محافظتك
                </p>

                {/* Guarantees Matrix */}
                <div className="pt-3 border-t border-neutral-800/80 grid grid-cols-3 gap-2 text-center text-xs text-neutral-300">
                  <div className="bg-[#12121A] p-2.5 rounded-xl border border-neutral-800/80 flex flex-col items-center gap-1">
                    <Banknote className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[11px] font-medium">الدفع نقداً كاش</span>
                  </div>
                  <div className="bg-[#12121A] p-2.5 rounded-xl border border-neutral-800/80 flex flex-col items-center gap-1">
                    <Truck className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[11px] font-medium">توصيل سريع</span>
                  </div>
                  <div className="bg-[#12121A] p-2.5 rounded-xl border border-neutral-800/80 flex flex-col items-center gap-1">
                    <PackageCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[11px] font-medium">تغليف محكم وأصلي</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </main>

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
