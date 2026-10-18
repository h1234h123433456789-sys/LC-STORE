import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, PackageCheck, ArrowRight, BellRing, Truck } from 'lucide-react';
import { Order } from '../types';
import { formatPrice, formatDateTime, toIQD } from '../utils/formatters';
import { requestNotificationPermission, sendDeviceNotification } from '../lib/notifications';

interface OrderSuccessModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onViewOrders: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  order,
  onClose,
  onViewOrders
}) => {
  if (!order) return null;

  const subtotalIQD = (order.items || []).reduce((sum, it) => {
    return sum + toIQD(it.product?.priceUSD || 0) * (it.quantity || 1);
  }, 0);
  const isFreeShipping = Boolean(order.isFreeShipping || order.shippingUSD === 0);
  const shippingFeeIQD = isFreeShipping ? 0 : 5000;
  const grandTotalIQD = subtotalIQD + shippingFeeIQD;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-[120] w-full h-[100dvh] bg-[#07070A] flex flex-col overflow-hidden text-right"
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
          </div>

          {/* Top Header */}
          <header className="sticky top-0 z-30 w-full bg-[#0F0F15] border-b border-[#D4AF37]/20 px-4 sm:px-8 py-3 flex items-center justify-between shrink-0 shadow-md">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181822] hover:bg-[#222230] border border-[#D4AF37]/40 text-[#F3E5AB] font-bold text-xs transition-all cursor-pointer active:scale-95"
            >
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
              <span>العودة للمتجر</span>
            </button>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم استلام الطلب بنجاح</span>
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center relative z-10">
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative w-full max-w-lg bg-[#101017] border border-[#D4AF37]/50 rounded-2xl shadow-2xl p-6 sm:p-8 text-right"
            >
              {/* Success Icon Badge */}
              <div className="text-center space-y-3 mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 16 }}
                  className="w-16 h-16 bg-[#181824] border-2 border-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto text-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                >
                  <CheckCircle2 className="w-9 h-9" />
                </motion.div>
                <h3 className="text-xl font-extrabold text-white">تم تسجيل طلبك بنجاح!</h3>
                <p className="text-xs text-[#F3E5AB]">
                  شكراً لتسوقك من متجر LC. سيتم التواصل معك قريباً لتأكيد وتوصيل الشحنة.
                </p>
              </div>

              {/* Details */}
              <div className="bg-[#15151E] p-4 rounded-2xl border border-neutral-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400">رقم الطلب:</span>
                  <span className="font-mono text-[#F3E5AB] font-bold dir-ltr">#{order.orderNumber}</span>
                </div>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400">تاريخ الطلب:</span>
                  <span className="text-neutral-300 font-mono">{formatDateTime(order.createdAt)}</span>
                </div>
                <div className="border-b border-neutral-800 pb-2 space-y-1.5">
                  <span className="text-neutral-400 block text-xs">المنتجات والقياسات:</span>
                  <div className="space-y-1">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-neutral-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white">{it.product.name}</span>
                          {(it.selectedSize || (it as any).size) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#252535] text-[#F3E5AB] border border-[#D4AF37]/50 font-bold">
                              القياس: {it.selectedSize || (it as any).size}
                            </span>
                          )}
                        </div>
                        <span className="text-neutral-400 font-mono">×{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400">المستلم:</span>
                  <span className="text-white font-semibold">{order.customer.name} ({order.customer.phone})</span>
                </div>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400">عنوان التوصيل:</span>
                  <span className="text-neutral-300">{order.customer.city} - {order.customer.address}</span>
                </div>
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>كلفة التوصيل:</span>
                  </span>
                  {isFreeShipping ? (
                    <span className="text-emerald-300 font-bold bg-emerald-950/90 border border-emerald-500/50 px-2 py-0.5 rounded-md text-[11px]">
                      مجاني 🎉
                    </span>
                  ) : (
                    <span className="text-[#F3E5AB] font-mono font-bold">5,000 د.ع</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-neutral-300 font-bold">المجموع الكلي النهائي (كاش):</span>
                  <span className="text-lg font-extrabold gold-gradient-text font-mono">
                    {formatPrice(grandTotalIQD, 'IQD')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={async () => {
                    const granted = await requestNotificationPermission();
                    if (granted) {
                      await sendDeviceNotification('✨ تم تفعيل إشعارات هاتفك بنجاح!', {
                        body: `سنرسل لك إشعاراً فورياً على شاشة جهازك فور قبول وتجهيز طلبك وانطلاقه مع المندوب.`,
                        type: 'order_accepted',
                        orderId: order.id
                      });
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#1D1711] border border-[#D4AF37]/60 hover:border-[#D4AF37] text-[#F3E5AB] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:bg-[#282015] active:scale-95"
                >
                  <BellRing className="w-4 h-4 text-[#D4AF37]" />
                  <span>تفعيل إشعارات الهاتف لمتابعة حالة هذا الطلب</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-3 px-3 bg-[#181824] hover:bg-[#222232] border border-neutral-700 text-neutral-200 font-bold text-xs rounded-xl transition-all cursor-pointer text-center active:scale-95"
                  >
                    متابعة التسوق
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewOrders();
                    }}
                    className="py-3 px-3 gold-gradient-bg text-black font-extrabold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PackageCheck className="w-4 h-4 fill-black" />
                    <span>متابعة طلباتي</span>
                  </button>
                </div>
              </div>

            </motion.div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
