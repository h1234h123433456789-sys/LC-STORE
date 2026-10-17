import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Product } from '../types';

interface FeaturedMarqueeStripProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const FeaturedMarqueeStrip: React.FC<FeaturedMarqueeStripProps> = ({
  products,
  onSelectProduct
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const group1Ref = useRef<HTMLDivElement>(null);
  
  const offsetRef = useRef(0);
  const halfWidthRef = useRef(0);
  const isDraggingRef = useRef(false);
  const startPointerXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);

  // 1. Prioritize explicitly selected products (capped at 10), fallback to first products
  const selectedProducts = useMemo(() => {
    const featured = products.filter((p) => Boolean(p && p.isFeaturedInStrip));
    if (featured.length > 0) return featured.slice(0, 10);
    return products.slice(0, 10);
  }, [products]);

  // If no products exist, hide strip
  if (selectedProducts.length === 0) {
    return null;
  }

  // 2. Build a compact solid block containing all products in sequence (minimum 10 items)
  const singleHalfBlock = useMemo(() => {
    const list = [...selectedProducts];
    const targetMin = 10;
    const repeats = Math.max(1, Math.ceil(targetMin / list.length));
    const block: Product[] = [];
    for (let r = 0; r < repeats; r++) {
      block.push(...list);
    }
    return block;
  }, [selectedProducts]);

  // Measure single half width reliably
  const updateMeasurement = useCallback(() => {
    if (group1Ref.current) {
      const rect = group1Ref.current.getBoundingClientRect();
      if (rect.width > 0) {
        halfWidthRef.current = rect.width + 12; // width + gap
      }
    }
  }, []);

  // 3. Lightweight 60fps/120fps GPU Glide Loop (Auto-pauses when tab is hidden to save battery)
  useEffect(() => {
    updateMeasurement();
    const handleResize = () => updateMeasurement();
    window.addEventListener('resize', handleResize, { passive: true });

    let speed = 0.85; // Continuous smooth glide speed (pixels per frame)

    const loop = () => {
      const halfW = halfWidthRef.current;

      if (!document.hidden && !isDraggingRef.current && trackRef.current && halfW > 0) {
        offsetRef.current += speed;

        // Continuous wrap-around
        if (offsetRef.current >= halfW) {
          offsetRef.current -= halfW;
        } else if (offsetRef.current < 0) {
          offsetRef.current += halfW;
        }

        trackRef.current.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [updateMeasurement, singleHalfBlock.length]);

  // 4. Interactive Drag & Swipe Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startPointerXRef.current = e.clientX;
    startOffsetRef.current = offsetRef.current;

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !trackRef.current) return;
    const deltaX = e.clientX - startPointerXRef.current;

    if (Math.abs(deltaX) > 4) {
      hasDraggedRef.current = true;
    }

    const halfW = halfWidthRef.current || 1200;
    let newOffset = startOffsetRef.current - deltaX;

    // Normalize offset smoothly within halfW
    while (newOffset < 0) newOffset += halfW;
    while (newOffset >= halfW) newOffset -= halfW;

    offsetRef.current = newOffset;
    trackRef.current.style.transform = `translate3d(-${newOffset}px, 0, 0)`;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    const target = e.currentTarget;
    try {
      if (target && target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  };

  const handleCardClick = (product: Product) => {
    if (!hasDraggedRef.current) {
      onSelectProduct(product);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      {/* Outer Strip Frame with Luxury Gold Outline */}
      <div 
        dir="ltr"
        className="relative w-full rounded-2xl bg-[#0B0B0F]/95 backdrop-blur-md border border-[#D4AF37]/35 shadow-[0_4px_25px_rgba(0,0,0,0.65)] overflow-hidden cursor-grab active:cursor-grabbing select-none p-2 sm:p-2.5 shrink-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ 
          direction: 'ltr',
          touchAction: 'none',
          contain: 'content',
          transform: 'translateZ(0)'
        }}
      >
        {/* Soft edge gradient masks */}
        <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#0B0B0F] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#0B0B0F] to-transparent z-10 pointer-events-none" />

        {/* 
          Continuous Twin-Half Conveyor:
          Ultra-lightweight DOM footprint, GPU accelerated 60fps/120fps.
        */}
        <div 
          ref={trackRef}
          className="flex items-center gap-3"
          style={{ 
            width: 'max-content',
            willChange: 'transform',
            transform: 'translateZ(0)'
          }}
        >
          {/* Half 1 */}
          <div ref={group1Ref} className="flex items-center gap-3 shrink-0">
            {singleHalfBlock.map((product, idx) => (
              <div
                key={`h1-${product.id}-${idx}`}
                onClick={() => handleCardClick(product)}
                className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[#14141B] border border-neutral-700/80 hover:border-[#D4AF37] p-1.5 transition-transform duration-200 transform hover:scale-105 shadow-md flex items-center justify-center cursor-pointer group"
                title={product.name}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  onLoad={updateMeasurement}
                  className="w-full h-full object-contain object-center rounded-lg pointer-events-none transition-transform duration-200 group-hover:scale-110"
                />
              </div>
            ))}
          </div>

          {/* Half 2 */}
          <div className="flex items-center gap-3 shrink-0">
            {singleHalfBlock.map((product, idx) => (
              <div
                key={`h2-${product.id}-${idx}`}
                onClick={() => handleCardClick(product)}
                className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[#14141B] border border-neutral-700/80 hover:border-[#D4AF37] p-1.5 transition-transform duration-200 transform hover:scale-105 shadow-md flex items-center justify-center cursor-pointer group"
                title={product.name}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain object-center rounded-lg pointer-events-none transition-transform duration-200 group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
