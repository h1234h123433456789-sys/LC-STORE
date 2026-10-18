import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  title,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
  }, [initialIndex, isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || isZoomed) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    setTouchStartX(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images, currentIndex]);

  const validImages = images && images.length > 0 ? images : [];
  const currentImage = validImages[currentIndex] || validImages[0] || '';

  const handleNext = () => {
    if (validImages.length === 0) return;
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  };

  const handlePrev = () => {
    if (validImages.length === 0) return;
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  return (
    <AnimatePresence>
      {isOpen && validImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-[300] flex flex-col w-full h-[100dvh] bg-black/95 select-none"
          dir="rtl"
        >
          {/* Top Header Bar */}
          <header className="shrink-0 h-16 w-full flex items-center justify-between px-4 sm:px-6 bg-[#0E0E14] border-b border-neutral-800 z-30 shadow-lg">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="p-2 sm:p-2.5 rounded-full bg-neutral-800 text-white hover:bg-[#D4AF37] hover:text-black transition-all border border-neutral-700 active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
                title="إغلاق الصورة (Esc)"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              
              {title && (
                <span className="text-xs sm:text-sm font-bold text-[#F3E5AB] truncate max-w-[200px] sm:max-w-md">
                  {title}
                </span>
              )}
            </div>

            {/* Counter & Zoom actions */}
            <div className="flex items-center gap-3">
              {validImages.length > 1 && (
                <span 
                  className="text-xs font-mono font-bold text-white bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-700 shadow-sm"
                  dir="ltr"
                >
                  {currentIndex + 1} / {validImages.length}
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsZoomed(!isZoomed)}
                className="p-2 sm:p-2.5 rounded-full bg-neutral-800 text-white hover:bg-[#D4AF37] hover:text-black transition-all border border-neutral-700 active:scale-95 shadow-md flex items-center justify-center cursor-pointer"
                title={isZoomed ? "تصغير الصورة" : "تكبير الصورة"}
              >
                {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5 text-[#D4AF37]" />}
              </button>
            </div>
          </header>

          {/* Main Image Stage */}
          <div 
            className="flex-1 min-h-0 w-full relative flex items-center justify-center p-3 sm:p-6 bg-[#06060A] overflow-hidden select-none"
            onClick={() => setIsZoomed(!isZoomed)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Ambient Frosted Luxury Glow */}
            <div 
              className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-125 pointer-events-none transition-all duration-500"
              style={{ backgroundImage: `url(${currentImage})` }}
            />

            {/* Visual container */}
            <div className="relative max-w-full max-h-full flex items-center justify-center z-10">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImage}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: isZoomed ? 1.5 : 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  src={currentImage}
                  alt={title || "عرض الصورة بالحجم الكامل"}
                  referrerPolicy="no-referrer"
                  className={`max-w-full max-h-full w-auto h-auto object-contain rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.95)] border border-[#D4AF37]/30 bg-[#0C0C12] p-2 sm:p-4 select-none ${
                    isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                />
              </AnimatePresence>
            </div>

            {/* Previous Image Arrow */}
            {validImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-full bg-black/85 hover:bg-[#D4AF37] text-white hover:text-black border border-[#D4AF37]/50 transition-all active:scale-90 shadow-2xl cursor-pointer z-20"
                title="الصورة السابقة"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Next Image Arrow */}
            {validImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-full bg-black/85 hover:bg-[#D4AF37] text-white hover:text-black border border-[#D4AF37]/50 transition-all active:scale-90 shadow-2xl cursor-pointer z-20"
                title="الصورة التالية"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Gallery Thumbnails Strip */}
          {validImages.length > 1 && (
            <footer className="shrink-0 py-3 px-4 bg-[#0E0E14] border-t border-neutral-800 z-30 flex items-center justify-center gap-2.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {validImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsZoomed(false);
                    setCurrentIndex(idx);
                  }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all bg-black/80 p-1 cursor-pointer ${
                    currentIndex === idx
                      ? 'border-[#D4AF37] scale-105 shadow-[0_0_15px_rgba(212,175,55,0.6)] ring-2 ring-[#D4AF37]/50'
                      : 'border-neutral-700 opacity-70 hover:opacity-100 hover:border-[#D4AF37]/40'
                  }`}
                >
                  <img src={img} alt={`مصغرة ${idx + 1}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </footer>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
