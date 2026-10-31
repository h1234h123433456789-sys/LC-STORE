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
          className="fixed inset-0 z-[120] w-full h-[100dvh] bg-white flex flex-col overflow-hidden text-right"
        >
          {/* Top Header */}
          <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-[#D4AF37]/30 px-4 sm:px-8 py-3 flex items-center justify-between shrink-0 shadow-sm">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7EF] hover:bg-[#F3ECE0] border border-[#D4AF37]/45 text-[#7A5912] font-bold text-xs transition-all cursor-pointer active:scale-95"
            >
              <ArrowRight className="w-4 h-4 text-[#B8860B]" />
              <span>العودة للمتجر</span>
            </button>
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم استلام الطلب بنجاح</span>
            </span>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center relative z-10">
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white border border-[#D4AF37]/50 rounded-2xl shadow-[0_14px_40px_rgba(212,175,55,0.18)] p-6 sm:p-8 text-right"
            >
              {/* Success Icon Badge */}
              <div className="text-center space-y-3 mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 16 }}
                  className="w-16 h-16 bg-[#FAF7EF] border-2 border-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto text-[#B8860B] shadow-[0_0_25px_rgba(212,175,55,0.28)]"
                >
                  <CheckCircle2 className="w-9 h-9" />
                </motion.div>
                <h3 className="text-xl font-extrabold text-neutral-900">تم تسجيل طلبك بنجاح!</h3>
                <p className="text-xs text-[#8B6914] font-semibold">
                  شكراً لتسوقك من متجر LC. سيتم التواصل معك قريباً لتأكيد وتوصيل الشحنة.
                </p>
              </div>

              {/* Details */}
              <div className="bg-[#FAF8F2] p-4 rounded-2xl border border-[#D4AF37]/30 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
                  <span className="text-neutral-500">رقم الطلب:</span>
                  <span className="font-mono text-[#7A5912] font-bold dir-ltr">#{order.orderNumber}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
                  <span className="text-neutral-500">تاريخ الطلب:</span>
                  <span className="text-neutral-700 font-mono">{formatDateTime(order.createdAt)}</span>
                </div>
                <div className="border-b border-[#D4AF37]/20 pb-2 space-y-1.5">
                  <span className="text-neutral-500 block text-xs">المنتجات المطلوبة:</span>
                  <div className="space-y-1.5">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-neutral-800 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-neutral-900">{it.product.name}</span>
                          {it.selectedOption && (
                            <span className="px-2 py-0.5 rounded-md bg-white border border-[#D4AF37]/45 text-[10px] font-extrabold text-[#7A5912]">
                              {it.selectedOptionLabel || it.product.customOptionLabel || 'الخانة'}: {it.selectedOption}
                            </span>
                          )}
                        </div>
                        <span className="text-[#8B6914] font-bold font-mono shrink-0">×{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
                  <span className="text-neutral-500">المستلم:</span>
                  <span className="text-neutral-900 font-bold">{order.customer.name} ({order.customer.phone})</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
                  <span className="text-neutral-500">عنوان التوصيل:</span>
                  <span className="text-neutral-800 font-medium">{order.customer.city} - {order.customer.address}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
                  <span className="text-neutral-500 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-[#B8860B]" />
                    <span>كلفة التوصيل:</span>
                  </span>
                  {isFreeShipping ? (
                    <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                      مجاني 🎉
                    </span>
                  ) : (
                    <span className="text-[#7A5912] font-mono font-bold">5,000 د.ع</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-neutral-900 font-bold">المجموع الكلي النهائي (كاش):</span>
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
                  className="w-full py-3 px-4 rounded-xl bg-[#FAF7EF] border border-[#D4AF37]/50 hover:border-[#D4AF37] text-[#7A5912] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:bg-[#F3ECE0] active:scale-95"
                >
                  <BellRing className="w-4 h-4 text-[#B8860B]" />
                  <span>تفعيل إشعارات الهاتف لمتابعة حالة هذا الطلب</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-3 px-3 bg-white hover:bg-[#FAF7EF] border border-[#D4AF37]/40 text-neutral-800 font-bold text-xs rounded-xl transition-all cursor-pointer text-center active:scale-95"
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
