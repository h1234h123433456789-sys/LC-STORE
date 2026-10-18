import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingBag, Banknote, Sparkles, Truck, CheckCircle2 } from 'lucide-react';
import { CartItem, User, FreeShippingConfig } from '../types';
import { formatPrice, toIQD } from '../utils/formatters';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  user: User | null;
  currency: 'USD' | 'IQD';
  freeShippingConfig?: FreeShippingConfig;
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
  freeShippingConfig,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onOpenAuthForCheckout
}) => {
  const validItems = (items || []).filter((item) => item && item.product && item.product.id);
  const totalPieces = validItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Convert subtotal to IQD accurately to compute grand total & free shipping threshold
  const subtotalIQD = validItems.reduce((sum, item) => {
    return sum + toIQD(item.product?.priceUSD || 0) * (item.quantity || 1);
  }, 0);

  const minAmountIQD = freeShippingConfig?.minOrderAmountIQD || 50000;
  const isPromoEnabled = Boolean(freeShippingConfig?.enabled && minAmountIQD > 0);
  const isFreeShippingUnlocked = isPromoEnabled && subtotalIQD >= minAmountIQD;
  const remainingAmountIQD = Math.max(0, minAmountIQD - subtotalIQD);
  const progressPercent = isPromoEnabled ? Math.min(100, Math.round((subtotalIQD / minAmountIQD) * 100)) : 0;

  const shippingFeeIQD = isFreeShippingUnlocked ? 0 : 5000;
  const grandTotalIQD = subtotalIQD + shippingFeeIQD;

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Premium Right-to-Left Sliding Panel with Spring Animation */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.85 }}
            className="relative w-full max-w-md bg-[#0C0C11] border-l border-[#D4AF37]/25 shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col justify-between h-[100dvh] max-h-[100dvh] z-10 text-right overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800/90 flex items-center justify-between shrink-0 bg-gradient-to-b from-[#15151E] to-[#101016]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#1A1A26] border border-[#D4AF37]/40 text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.18)]">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>حقيبة التسوق</span>
                    <motion.span
                      key={totalPieces}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="text-xs px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#F3E5AB] font-mono border border-[#D4AF37]/35"
                    >
                      {totalPieces} قطع
                    </motion.span>
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">راجع سلتك وأكمل طلبك بضغطة زر</p>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="إغلاق السلة"
                className="p-2 rounded-full text-neutral-400 hover:text-white bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Shipping Dynamic Progress Bar Banner (By Final Price Threshold) */}
            {isPromoEnabled && (
              <div
                className={`px-4 py-3 border-b shrink-0 transition-colors duration-300 ${
                  isFreeShippingUnlocked
                    ? 'bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-emerald-950/60 border-emerald-500/40'
                    : 'bg-gradient-to-r from-[#1A1710] via-[#141310] to-[#1A1710] border-[#D4AF37]/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs mb-2">
                  <div className="flex items-center gap-2 font-bold leading-relaxed">
                    {isFreeShippingUnlocked ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
                        <span className="text-emerald-300">
                          🎉 مبروك! وصل طلبك إلى الحد المطلوب وحصلت على <strong className="text-white underline">توصيل مجاني!</strong>
                        </span>
                      </>
                    ) : subtotalIQD === 0 ? (
                      <>
                        <Truck className="w-4 h-4 text-[#D4AF37] shrink-0" />
                        <span className="text-[#F3E5AB]">
                          عرض خاص: تسوق بقيمة <strong className="text-white underline font-mono">{formatPrice(minAmountIQD, 'IQD')}</strong> أو أكثر واحصل على <strong className="text-emerald-400">توصيل مجاني!</strong>
                        </span>
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4 text-[#D4AF37] shrink-0" />
                        <span className="text-[#F3E5AB]">
                          أضف منتجات بقيمة{' '}
                          <strong className="text-white underline font-mono">
                            {formatPrice(remainingAmountIQD, 'IQD')}
                          </strong>{' '}
                          إضافية لتحصل على <strong className="text-emerald-400">توصيل مجاني!</strong>
                        </span>
                      </>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                      isFreeShippingUnlocked
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-black/60 text-[#D4AF37] border border-[#D4AF37]/30'
                    }`}
                  >
                    {progressPercent}%
                  </span>
                </div>

                {/* Progress Track */}
                <div className="w-full h-2.5 bg-black/80 rounded-full overflow-hidden border border-neutral-800/90 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    className={`h-full rounded-full ${
                      isFreeShippingUnlocked
                        ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                        : 'bg-gradient-to-r from-[#AA771C] via-[#D4AF37] to-[#F3E5AB] shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1.5 font-mono">
                  <span>المجموع الحالي: <strong className="text-[#F3E5AB]">{formatPrice(subtotalIQD, 'IQD')}</strong></span>
                  <span>الحد المطلوب: <strong className="text-white">{formatPrice(minAmountIQD, 'IQD')}</strong></span>
                </div>
              </div>
            )}

            {/* Items List (Scrolls inside drawer) */}
            <div
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scrollbar-thin"
              style={{ WebkitOverflowScrolling: 'touch', transform: 'translateZ(0)' }}
            >
              {validItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-16 space-y-4"
                >
                  <div className="w-20 h-20 rounded-3xl bg-[#14141E] border border-[#D4AF37]/25 flex items-center justify-center mx-auto text-neutral-500 shadow-[0_0_30px_rgba(212,175,55,0.1)] animate-luxury-float">
                    <ShoppingBag className="w-9 h-9 text-[#D4AF37]/70" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">حقيبة التسوق فارغة حالياً</p>
                    <p className="text-xs text-neutral-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                      استعرض معروضات المتجر الفاخرة وأضف ما يعجبك للسلة لإتمام طلبك بكل سهولة
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="mt-2 px-6 py-2.5 bg-[#181824] hover:bg-[#222232] border border-[#D4AF37]/45 text-[#F3E5AB] font-bold text-xs rounded-xl transition-colors cursor-pointer active:scale-95 shadow-md"
                  >
                    تصفح معروضات المتجر
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {validItems.map((item, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -24, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        key={`${item.product.id}-${item.selectedSize || idx}`}
                        className="p-3.5 bg-[#13131B] border border-neutral-800/90 rounded-2xl flex gap-3.5 items-center group hover:border-[#D4AF37]/50 transition-colors shadow-md"
                      >
                        <div className="w-16 h-16 bg-[#09090D] rounded-xl overflow-hidden shrink-0 border border-neutral-800 group-hover:border-[#D4AF37]/30 flex items-center justify-center p-1.5 transition-colors">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{item.product.name}</h4>
                            {item.selectedSize && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#252535] text-[#F3E5AB] border border-[#D4AF37]/50 font-bold shrink-0">
                                القياس: {item.selectedSize}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm gold-gradient-text font-extrabold font-mono">
                            {formatPrice(toIQD(item.product.priceUSD) * item.quantity, currency)}
                          </p>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center border border-neutral-700/80 rounded-xl overflow-hidden bg-[#191924]">
                              <button
                                onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1), item.selectedSize)}
                                className="px-2.5 py-1 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer active:scale-90"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 text-xs font-bold text-[#F3E5AB] font-mono">{item.quantity}</span>
                              <button
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.selectedSize)}
                                className="px-2.5 py-1 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer active:scale-90"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => onRemoveItem(item.product.id, item.selectedSize)}
                              className="text-neutral-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/30 transition-all cursor-pointer active:scale-90"
                              title="حذف من السلة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Sticky Compact Footer Summary & Checkout */}
            {validItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 sm:p-5 border-t border-neutral-800/90 bg-gradient-to-t from-[#0E0E14] to-[#14141D] space-y-3 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]"
              >
                <div className="space-y-2 text-xs pb-2.5 border-b border-neutral-800/80">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span>مجموع المنتجات ({totalPieces} قطع):</span>
                    <span className="font-mono font-bold text-white">{formatPrice(subtotalIQD, 'IQD')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300">كلفة التوصيل:</span>
                    {isFreeShippingUnlocked ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-500 line-through font-mono">5,000 د.ع</span>
                        <span className="text-emerald-300 font-bold bg-emerald-950/90 border border-emerald-500/50 px-2.5 py-0.5 rounded-lg text-[11px] shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                          مجاني 🎉
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono font-bold text-[#F3E5AB]">5,000 د.ع</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-white font-bold text-sm">المجموع الكلي النهائي:</span>
                  <span className="text-xl font-extrabold gold-gradient-text font-mono">
                    {formatPrice(grandTotalIQD, 'IQD')}
                  </span>
                </div>

                <div className="p-2.5 bg-[#181824] border border-[#D4AF37]/25 rounded-xl flex items-center gap-2 text-[11px] text-neutral-300">
                  <Banknote className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span>التوصيل سريع لكافة المحافظات والدفع نقداً عند الاستلام</span>
                </div>

                <button
                  onClick={handleCheckoutClick}
                  className="w-full py-3.5 gold-gradient-bg text-black font-extrabold text-xs sm:text-sm rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_0_25px_rgba(212,175,55,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>تأكيد طلب الشراء والدفع كاش</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
