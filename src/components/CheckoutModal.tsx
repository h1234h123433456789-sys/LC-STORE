import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Phone, 
  User as UserIcon, 
  CheckCircle2, 
  Truck, 
  Banknote, 
  ShieldCheck, 
  Sparkles,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { CartItem, User, Order, FreeShippingConfig } from '../types';
import { formatPrice, toIQD } from '../utils/formatters';

const IRAQ_GOVERNORATES = [
  'بغداد', 'أربيل', 'البصرة', 'النجف الأشرف', 'كربلاء المقدسة', 
  'السليمانية', 'دهوك', 'نينوى', 'بابل', 'الانبار', 
  'ذي قار', 'ديالى', 'كركوك', 'صلاح الدين', 'واسط', 
  'المثنى', 'ميسان', 'القادسية'
];

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  user: User | null;
  currency: 'USD' | 'IQD';
  freeShippingConfig?: FreeShippingConfig;
  onOrderPlaced: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  user,
  currency,
  freeShippingConfig,
  onOrderPlaced
}) => {
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [governorate, setGovernorate] = useState('بغداد');
  const [addressDetails, setAddressDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validItems = (items || []).filter((item) => item && item.product && item.product.id);
  const totalPieces = validItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const subtotalIQD = validItems.reduce((sum, item) => {
    return sum + toIQD(item.product?.priceUSD || 0) * (item.quantity || 1);
  }, 0);

  const minAmountIQD = freeShippingConfig?.minOrderAmountIQD || 50000;
  const isFreeShippingUnlocked = Boolean(
    freeShippingConfig?.enabled &&
    minAmountIQD > 0 &&
    subtotalIQD >= minAmountIQD
  );

  const shippingFeeIQD = isFreeShippingUnlocked ? 0 : 5000;
  const grandTotalIQD = subtotalIQD + shippingFeeIQD;

  const [prevUserId, setPrevUserId] = useState<string | undefined>(user?.id);
  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    if (user?.name) setFullName(user.name);
    if (user?.phone) setPhone(user.phone);
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('يرجى كتابة الاسم الكامل');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setError('يرجى كتابة رقم هاتف صحيح للتواصل واستلام الشحنة');
      return;
    }
    if (!governorate) {
      setError('يرجى اختيار المحافظة');
      return;
    }
    if (!addressDetails.trim()) {
      setError('يرجى التوضيح بشكل عام (المنطقة / الشارع / القرب من معلم)');
      return;
    }

    setIsProcessing(true);
    try {
      const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const orderNumber = `LC-${Math.floor(100000 + Math.random() * 900000)}`;

      const newOrder: Order = {
        id: orderId,
        orderNumber: orderNumber,
        userId: user?.id || 'guest',
        customer: {
          name: fullName.trim(),
          phone: phone.trim(),
          contact: user?.email || fullName.trim(),
          city: governorate,
          address: addressDetails.trim(),
          notes: notes.trim()
        },
        items: validItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          ...(item.selectedOption ? { selectedOption: item.selectedOption } : {}),
          ...(item.selectedOption && (item.selectedOptionLabel || item.product.customOptionLabel)
            ? { selectedOptionLabel: item.selectedOptionLabel || item.product.customOptionLabel }
            : {}),
          ...(item.selectedOptionImage ? { selectedOptionImage: item.selectedOptionImage } : {})
        })),
        subtotalUSD: subtotalIQD,
        shippingUSD: shippingFeeIQD,
        totalUSD: subtotalIQD,
        isFreeShipping: isFreeShippingUnlocked,
        currency: currency,
        currencyRate: 1320,
        status: 'pending',
        paymentMethod: 'cod',
        createdAt: new Date().toISOString()
      };

      onOrderPlaced(newOrder);
    } catch (err: any) {
      setError(err.message || 'فشل إرسال الطلب، يرجى إعادة المحاولة');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-[120] w-full h-[100dvh] bg-white overflow-hidden text-right"
        >
          {/* Animated Full-Screen Modal Content Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
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
                  <span>إلغاء والعودة</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#FAF7EF] border border-[#D4AF37]/40 text-[#B8860B]">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-neutral-900">تأكيد الشحن والدفع كاش</h3>
              </div>
            </header>

            {/* Body Content Area */}
            <main 
              className="flex-1 overflow-y-auto p-4 sm:p-7 max-w-2xl mx-auto w-full scrollbar-thin space-y-4 relative z-10"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-center gap-2 shadow-sm"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Items Summary Snippet */}
              <motion.div
                initial={{ y: 12 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-[#D4AF37]/40 space-y-2.5 shadow-sm"
              >
                <div className="text-xs font-bold text-[#7A5912] flex items-center justify-between">
                  <span>المنتجات المطلوب شحنها ({totalPieces} قطع):</span>
                  <span className="font-mono text-sm text-neutral-900">{formatPrice(subtotalIQD, 'IQD')}</span>
                </div>
                <div className="text-xs flex items-center justify-between border-t border-[#D4AF37]/20 pt-2.5">
                  <span className="text-neutral-600">كلفة التوصيل:</span>
                  {isFreeShippingUnlocked ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-neutral-400 line-through font-mono">5,000 د.ع</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مجاني 🎉 (الطلب فوق {formatPrice(minAmountIQD, 'IQD')})</span>
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono font-bold text-[#7A5912]">5,000 د.ع</span>
                  )}
                </div>
                <div className="text-xs font-bold flex items-center justify-between border-t border-[#D4AF37]/20 pt-2.5">
                  <span className="text-neutral-900 text-sm">المجموع الكلي النهائي (مع التوصيل):</span>
                  <span className="font-mono text-lg font-extrabold gold-gradient-text">{formatPrice(grandTotalIQD, 'IQD')}</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1.5 scrollbar-thin">
                  {validItems.map((it, idx) => (
                    <div key={`${it.product.id}-${it.selectedOption || idx}`} className="flex items-center gap-2 bg-[#FAF8F2] px-3 py-1.5 rounded-xl border border-[#D4AF37]/30 shrink-0 text-xs">
                      <img src={it.selectedOptionImage || it.product.image} alt={it.product.name} referrerPolicy="no-referrer" className="w-7 h-7 object-contain rounded-md bg-white p-0.5 border border-[#D4AF37]/20" />
                      <span className="text-neutral-900 font-semibold truncate max-w-[140px]">{it.product.name}</span>
                      {it.selectedOption && (
                        <span className="px-1.5 py-0.5 rounded bg-white border border-[#D4AF37]/45 text-[10px] font-extrabold text-[#7A5912]">
                          {it.selectedOption}
                        </span>
                      )}
                      <span className="text-[#8B6914] font-mono font-bold">×{it.quantity}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.form
                initial={{ y: 16 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                id="checkout-form"
                onSubmit={handleSubmitOrder}
                className="bg-white border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm"
              >
                <h4 className="text-xs sm:text-sm font-bold text-[#8B6914] border-b border-[#D4AF37]/20 pb-2.5 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#B8860B]" />
                  <span>بيانات مستلم الشحنة والعنوان التفصيلي:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs text-neutral-700 font-semibold mb-1.5">الاسم الكامل *</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="اسمك الثلاثي"
                        className="w-full pr-10 pl-3 py-3 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-700 font-semibold mb-1.5">رقم هاتف الاستلام *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0770XXXXXXX"
                        className="w-full pr-10 pl-3 py-3 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none text-right font-mono transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-700 font-semibold mb-1.5">المحافظة *</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="w-full pr-10 pl-3 py-3 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none appearance-none cursor-pointer transition-colors"
                    >
                      {IRAQ_GOVERNORATES.map((gov) => (
                        <option key={gov} value={gov} className="bg-white text-neutral-900">
                          {gov}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-700 font-semibold mb-1.5">تفاصيل العنوان (المنطقة / الشارع / القرب من معلم) *</label>
                  <input
                    type="text"
                    required
                    value={addressDetails}
                    onChange={(e) => setAddressDetails(e.target.value)}
                    placeholder="مثال: الكرادة / قرب ساحة الحرية"
                    className="w-full px-3.5 py-3 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-700 font-semibold mb-1.5">ملاحظات إضافية للمندوب (اختياري)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي وقت تفضله للاتصال أو التسليم"
                    className="w-full px-3.5 py-3 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none transition-colors"
                  />
                </div>

                <div className="p-3 bg-[#FAF7EF] border border-[#D4AF37]/35 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-700">
                  <div className="flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-[#B8860B]" />
                    <span>طريقة الدفع: <strong className="text-neutral-900">نقداً كاش عند التسليم</strong></span>
                  </div>
                  <div className="flex items-center gap-1 text-[#7A5912] font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#B8860B]" />
                    <span>ضمان الجودة والأصالة</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 gold-gradient-bg text-black font-extrabold text-xs sm:text-sm rounded-xl hover:brightness-110 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <span>جاري تأكيد وتسجيل الشحنة...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-black" />
                      <span>تأكيد وشحن الطلب الآن</span>
                    </>
                  )}
                </motion.button>
              </motion.form>
            </main>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
