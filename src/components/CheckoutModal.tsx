import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Phone, 
  User as UserIcon, 
  FileText, 
  CheckCircle2, 
  Truck, 
  Banknote, 
  ShieldCheck, 
  Sparkles,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { CartItem, User, Order } from '../types';
import { formatPrice } from '../utils/formatters';

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
  onOrderPlaced: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  user,
  currency,
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
  const subtotalUSD = validItems.reduce((sum, item) => sum + (item.product?.priceUSD || 0) * (item.quantity || 1), 0);

  useEffect(() => {
    if (user) {
      if (user.name) setFullName(user.name);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

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
          selectedSize: item.selectedSize
        })),
        subtotalUSD: subtotalUSD,
        shippingUSD: 0,
        totalUSD: subtotalUSD,
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] w-full h-[100dvh] bg-[#0A0A0E] flex flex-col overflow-hidden text-right"
        >
          {/* Top Sticky Header Bar */}
          <header className="sticky top-0 z-30 w-full bg-[#111116]/95 backdrop-blur-md border-b border-neutral-800/90 px-4 sm:px-8 py-3.5 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C26] hover:bg-[#252533] border border-[#D4AF37]/40 text-[#F3E5AB] font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                <span>إلغاء والعودة</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#181824] border border-[#D4AF37]/30 text-[#D4AF37]">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">تأكيد الشحن والدفع كاش</h3>
            </div>
          </header>

          {/* Body Content Area */}
          <main 
            className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-2xl mx-auto w-full scrollbar-thin space-y-5"
            style={{ WebkitOverflowScrolling: 'touch', transform: 'translateZ(0)' }}
          >
            {error && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Items Summary Snippet */}
            <div className="bg-[#15151C] p-4 rounded-2xl border border-neutral-800 space-y-2.5">
              <div className="text-xs font-bold text-[#F3E5AB] flex items-center justify-between">
                <span>المنتجات المطلوب شحنها ({validItems.length}):</span>
                <span className="font-mono text-base gold-gradient-text">{formatPrice(subtotalUSD, currency)}</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {validItems.map((it) => (
                  <div key={it.product.id} className="flex items-center gap-2 bg-[#0D0D12] px-3 py-1.5 rounded-xl border border-neutral-800 shrink-0 text-xs">
                    <img src={it.product.image} alt={it.product.name} className="w-6 h-6 object-contain" />
                    <span className="text-white font-medium truncate max-w-[120px]">{it.product.name}</span>
                    {it.selectedSize && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#252535] text-[#F3E5AB] border border-[#D4AF37]/50 font-bold shrink-0">
                        {it.selectedSize}
                      </span>
                    )}
                    <span className="text-[#D4AF37] font-mono">x{it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <form id="checkout-form" onSubmit={handleSubmitOrder} className="bg-[#111116] border border-neutral-800 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl">
              <h4 className="text-xs font-bold text-[#D4AF37] border-b border-neutral-800 pb-2">بيانات مستلم الشحنة والعنوان:</h4>

              <div>
                <label className="block text-xs text-neutral-300 font-medium mb-1">الاسم الكامل *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="اسمك الثلاثي"
                    className="w-full pr-9 pl-3 py-3 bg-[#16161F] border border-neutral-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 font-medium mb-1">رقم الهاتف الاستلام *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0770XXXXXXX"
                    className="w-full pr-9 pl-3 py-3 bg-[#16161F] border border-neutral-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 font-medium mb-1">المحافظة *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="w-full pr-9 pl-3 py-3 bg-[#16161F] border border-neutral-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none appearance-none cursor-pointer"
                  >
                    {IRAQ_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov} className="bg-[#16161F] text-white">
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 font-medium mb-1">تفاصيل العنوان (المنطقة / القرب من معلم) *</label>
                <input
                  type="text"
                  required
                  value={addressDetails}
                  onChange={(e) => setAddressDetails(e.target.value)}
                  placeholder="مثال: الكرادة / قرب ساحة الحرية"
                  className="w-full px-3 py-3 bg-[#16161F] border border-neutral-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 font-medium mb-1">ملاحظات إضافية للمندوب (اختياري)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي وقت يفضل للاتصال به"
                  className="w-full px-3 py-3 bg-[#16161F] border border-neutral-800 focus:border-[#D4AF37] rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div className="p-3 bg-[#171722] border border-[#D4AF37]/25 rounded-2xl flex items-center justify-between text-xs text-neutral-300">
                <div className="flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-[#D4AF37]" />
                  <span>طريقة الدفع: <strong className="text-white">نقداً كاش عند التسليم</strong></span>
                </div>
                <div className="flex items-center gap-1 text-[#F3E5AB]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ضمان الجودة والأصالة</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 bg-[#D4AF37] text-black font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <span>جاري تأكيد وتسجيل الشحنة...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-black" />
                    <span>تأكيد وشحن الطلب الآن</span>
                  </>
                )}
              </button>
            </form>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
