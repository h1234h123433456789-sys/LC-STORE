import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
  }, [initialIndex, isOpen]);

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

  if (!isOpen || !images || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handleNext = () => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col w-full h-[100dvh] bg-black/95 select-none animate-fade-in"
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
          {images.length > 1 && (
            <span 
              className="text-xs font-mono font-bold text-white bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-700 shadow-sm"
              dir="ltr"
            >
              {currentIndex + 1} / {images.length}
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

      {/* Main Image Stage - Front & Center ("بالوجه") */}
      <div 
        className="flex-1 min-h-0 w-full relative flex items-center justify-center p-3 sm:p-6 bg-[#06060A] overflow-hidden"
        onClick={() => setIsZoomed(!isZoomed)}
      >
        {/* Visual subtle container with light accent so dark/black clothing stands out clearly */}
        <div className="relative max-w-full max-h-full flex items-center justify-center">
          <img
            key={currentImage}
            src={currentImage}
            alt={title || "عرض الصورة بالحجم الكامل"}
            referrerPolicy="no-referrer"
            className={`max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-300 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.9)] border border-neutral-800/80 bg-[#121218] p-2 sm:p-4 select-none ${
              isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in hover:scale-[1.01]'
            }`}
          />
        </div>

        {/* Previous Image Arrow (Right side in RTL) */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-full bg-black/80 hover:bg-[#D4AF37] text-white hover:text-black border border-neutral-700 transition-all active:scale-90 shadow-2xl cursor-pointer z-20"
            title="الصورة السابقة"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Next Image Arrow (Left side in RTL) */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-full bg-black/80 hover:bg-[#D4AF37] text-white hover:text-black border border-neutral-700 transition-all active:scale-90 shadow-2xl cursor-pointer z-20"
            title="الصورة التالية"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Gallery Thumbnails Strip */}
      {images.length > 1 && (
        <footer className="shrink-0 py-3 px-4 bg-[#0E0E14] border-t border-neutral-800 z-30 flex items-center justify-center gap-3 overflow-x-auto scrollbar-thin">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setIsZoomed(false);
                setCurrentIndex(idx);
              }}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all bg-black/70 p-1 cursor-pointer ${
                currentIndex === idx
                  ? 'border-[#D4AF37] scale-105 shadow-[0_0_15px_rgba(212,175,55,0.6)] ring-2 ring-[#D4AF37]/50'
                  : 'border-neutral-700 opacity-60 hover:opacity-100 hover:border-neutral-500'
              }`}
            >
              <img src={img} alt={`مصغرة ${idx + 1}`} className="w-full h-full object-contain" />
            </button>
          ))}
        </footer>
      )}
    </div>
  );
};
