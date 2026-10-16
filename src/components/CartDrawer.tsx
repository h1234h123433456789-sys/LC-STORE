import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingBag, Banknote, Sparkles } from 'lucide-react';
import { CartItem, User } from '../types';
import { formatPrice } from '../utils/formatters';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  user: User | null;
  currency: 'USD' | 'IQD';
  onUpdateQuantity: (productId: string, quantity: number, selectedSize?: string) => void;
  onRemoveItem: (productId: string, selectedSize?: string) => void;
  onProceedToCheckout: () => void;
  onOpenAuthForCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  user,
  currency,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onOpenAuthForCheckout
}) => {
  const validItems = (items || []).filter((item) => item && item.product && item.product.id);
  const subtotalUSD = validItems.reduce((sum, item) => sum + (item.product?.priceUSD || 0) * (item.quantity || 1), 0);

  const handleCheckoutClick = () => {
    if (!user) {
      onOpenAuthForCheckout();
    } else {
      onProceedToCheckout();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden flex justify-end">
          {/* Backdrop (Locks interaction behind) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Premium Right-to-Left Sliding Panel with Spring Animation */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-md bg-[#0D0D10] border-l border-neutral-800/80 shadow-2xl shadow-black flex flex-col justify-between h-[100dvh] max-h-[100dvh] z-10 text-right overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex items-center justify-between shrink-0 bg-[#121217]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#1A1A22] border border-[#D4AF37]/30 text-[#D4AF37]">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>حقيبة التسوق</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#F3E5AB] font-mono border border-[#D4AF37]/30">
                      {validItems.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">راجع سلتك وأكمل طلبك بضغطة زر</p>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="إغلاق السلة"
                className="p-1.5 rounded-full text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 transition-colors cursor-pointer active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items List (Scrolls inside drawer) */}
            <div 
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scrollbar-thin"
              style={{ WebkitOverflowScrolling: 'touch', transform: 'translateZ(0)' }}
            >
              {validItems.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#14141C] border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                    <ShoppingBag className="w-8 h-8 text-[#D4AF37]/50" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">حقيبة التسوق فارغة حالياً</p>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                      استعرض معروضات المتجر وأضف ما يعجبك للسلة لتأكيد طلبك
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="mt-2 px-5 py-2.5 bg-[#181822] hover:bg-[#222230] border border-[#D4AF37]/40 text-[#F3E5AB] font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    تصفح معروضات المتجر
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {validItems.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-3 bg-[#121218] border border-neutral-800/80 rounded-2xl flex gap-3 items-center group hover:border-[#D4AF37]/40 transition-colors"
                    >
                      <div className="w-14 h-14 bg-[#0A0A0E] rounded-xl overflow-hidden shrink-0 border border-neutral-800 flex items-center justify-center p-1">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-white line-clamp-1">{item.product.name}</h4>
                          {item.selectedSize && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#252535] text-[#F3E5AB] border border-[#D4AF37]/50 font-bold shrink-0">
                              القياس: {item.selectedSize}
                            </span>
                          )}
                        </div>
                        <p className="text-xs gold-gradient-text font-bold font-mono">
                          {formatPrice(item.product.priceUSD, currency)}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center border border-neutral-800 rounded-lg overflow-hidden bg-[#181822]">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1), item.selectedSize)}
                              className="p-1 hover:bg-neutral-800 text-neutral-300"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 text-xs font-bold text-[#F3E5AB] font-mono">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.selectedSize)}
                              className="p-1 hover:bg-neutral-800 text-neutral-300"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.product.id, item.selectedSize)}
                            className="text-neutral-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                            title="حذف من السلة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky Compact Footer Summary & Checkout */}
            {validItems.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-neutral-800/80 bg-[#121218] space-y-3 shrink-0 shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">المبلغ الإجمالي كاش:</span>
                  <span className="text-xl font-bold gold-gradient-text font-mono">
                    {formatPrice(subtotalUSD, currency)}
                  </span>
                </div>

                <div className="p-2 bg-[#171722] border border-[#D4AF37]/25 rounded-xl flex items-center gap-2 text-[11px] text-neutral-300">
                  <Banknote className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span>التوصيل لكافة المحافظات والدفع نقداً عند الاستلام</span>
                </div>

                <button
                  onClick={handleCheckoutClick}
                  className="w-full py-3.5 bg-[#D4AF37] text-black font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>تأكيد طلب الشراء والدفع كاش</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
