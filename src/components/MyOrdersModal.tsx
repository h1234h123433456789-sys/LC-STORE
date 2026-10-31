import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  CheckCircle2, 
  Phone, 
  MapPin, 
  Banknote, 
  Clock, 
  Edit3, 
  Save, 
  XCircle, 
  Truck, 
  ShoppingBag, 
  Calendar,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Order, User } from '../types';
import { formatPrice, formatDateTime } from '../utils/formatters';
import { updateUserProfileInFirestore } from '../lib/firebase';
import { sanitizeInput } from '../utils/security';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  user: User | null;
  onUpdateUser?: (updatedUser: User) => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  user,
  onUpdateUser
}) => {
  // Tabs for orders
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'delivered' | 'rejected'>('all');

  // Customer Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter orders safely for the logged-in user
  const userOrders = (orders || []).filter((ord) => {
    if (!ord || !ord.customer) return false;
    if (!user) return false;

    if (ord.userId && user.id && ord.userId === user.id) {
      return true;
    }

    const userCleanEmail = String(user.email || '').trim().toLowerCase();
    const orderCleanEmail = String(ord.customer.contact || '').trim().toLowerCase();
    if (userCleanEmail && orderCleanEmail && userCleanEmail === orderCleanEmail) {
      return true;
    }

    const userCleanPhone = String(user.phone || '').replace(/\D/g, '');
    const orderCleanPhone = String(ord.customer.phone || '').replace(/\D/g, '');
    if (userCleanPhone && orderCleanPhone && userCleanPhone.length >= 7) {
      if (userCleanPhone === orderCleanPhone || userCleanPhone.endsWith(orderCleanPhone) || orderCleanPhone.endsWith(userCleanPhone)) {
        return true;
      }
    }

    return false;
  });

  const pendingCount = userOrders.filter((o) => o.status === 'pending').length;
  const approvedCount = userOrders.filter((o) => o.status === 'approved').length;
  const deliveredCount = userOrders.filter((o) => o.status === 'delivered').length;
  const rejectedCount = userOrders.filter((o) => o.status === 'rejected').length;

  const filteredOrders = userOrders.filter((ord) => {
    if (filterTab === 'all') return true;
    return ord.status === filterTab;
  });

  const handleStartEdit = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setProfileMsg(null);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    const cleanName = sanitizeInput(editName.trim(), 80);
    const cleanPhone = sanitizeInput(editPhone.trim(), 30);

    if (!cleanName || cleanName.length < 2) {
      setProfileMsg({ type: 'error', text: 'يرجى إدخال اسمك الكامل بشكل صحيح' });
      return;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      setProfileMsg({ type: 'error', text: 'يرجى إدخال رقم هاتف صحيح للتواصل والتوصيل' });
      return;
    }

    setIsSavingProfile(true);

    try {
      if (user?.id) {
        await updateUserProfileInFirestore(user.id, {
          name: cleanName,
          phone: cleanPhone
        });
      }

      const updated: User = {
        ...(user as User),
        name: cleanName,
        phone: cleanPhone,
        contactValue: user?.email || cleanPhone
      };

      if (onUpdateUser) {
        onUpdateUser(updated);
      }

      setProfileMsg({ type: 'success', text: 'تم حفظ وتحديث بيانات حسابك بنجاح!' });
      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileMsg(null);
      }, 1400);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'حدث خطأ أثناء حفظ البيانات' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] w-full h-[100dvh] bg-white overflow-hidden text-right"
        >
          {/* Animated Full-Screen Modal Content Container */}
          <motion.div
            initial={{ scale: 0.96, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full h-full flex flex-col overflow-hidden"
          >
            {/* Top Sticky Header Bar */}
            <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-[#D4AF37]/30 px-4 sm:px-8 py-3 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7EF] hover:bg-[#F3ECE0] border border-[#D4AF37]/45 text-[#7A5912] font-bold text-xs transition-all cursor-pointer active:scale-95"
                >
                  <ArrowRight className="w-4 h-4 text-[#B8860B]" />
                  <span>إغلاق والعودة للمتجر</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#FAF7EF] border border-[#D4AF37]/40 text-[#B8860B]">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 flex items-center gap-2">
                  <span>طلباتي ومتابعة الشحن</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#FAF4E1] text-[#7A5912] font-mono border border-[#D4AF37]/40">
                    {userOrders.length} طلب
                  </span>
                </h3>
              </div>
            </header>

            {/* Main Content Area */}
            <main 
              className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full scrollbar-thin space-y-5 relative z-10"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {/* ================= CUSTOMER PROFILE CARD ================= */}
              {user && (
                <div className="bg-white border border-[#D4AF37]/35 rounded-2xl p-4 shrink-0 transition-all shadow-sm">
                  {!isEditingProfile ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#FAF7EF] border border-[#D4AF37]/45 flex items-center justify-center font-bold text-sm text-[#7A5912]">
                          {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LC'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                            <span>{user?.name || 'الزبون'}</span>
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                            <span className="font-mono dir-ltr">{user?.phone || 'بدون هاتف'}</span>
                            <span className="text-neutral-300">·</span>
                            <span className="font-mono dir-ltr truncate max-w-[180px]">{user?.email || user?.contactValue}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#7A5912] bg-[#FAF7EF] border border-[#D4AF37]/45 hover:border-[#D4AF37] hover:bg-[#F3ECE0] transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#B8860B]" />
                        <span>تعديل الاسم والهاتف</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveProfile} className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#D4AF37]/20 text-xs font-bold text-[#7A5912]">
                        <div className="flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4 text-[#B8860B]" />
                          <span>تعديل اسم الزبون ورقم الهاتف</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="text-neutral-500 hover:text-neutral-900"
                        >
                          إلغاء
                        </button>
                      </div>

                      {profileMsg && (
                        <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                          profileMsg.type === 'success'
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                          {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          <span>{profileMsg.text}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-neutral-700 font-semibold mb-1">
                            الاسم الكامل:
                          </label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="مثال: علي محمد"
                            className="w-full px-3 py-2 text-xs bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-lg text-neutral-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-700 font-semibold mb-1">
                            رقم الهاتف (للتوصيل):
                          </label>
                          <input
                            type="tel"
                            required
                            dir="ltr"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="0770 123 4567"
                            className="w-full px-3 py-2 text-xs bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-lg text-neutral-900 outline-none text-right"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingProfile}
                          className="px-4 py-1.5 text-xs font-bold text-black gold-gradient-bg rounded-lg hover:brightness-110 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSavingProfile ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ================= STATUS FILTER TABS ================= */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-[#FAF4E1] text-[#7A5912] border border-[#D4AF37] shadow-xs'
                      : 'bg-white text-neutral-600 hover:text-neutral-900 border border-[#D4AF37]/30'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>كافة الطلبات ({userOrders.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTab === 'pending'
                      ? 'bg-amber-50 text-amber-800 border border-amber-400 shadow-xs'
                      : 'bg-white text-neutral-600 hover:text-neutral-900 border border-[#D4AF37]/30'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>بانتظار الموافقة ({pendingCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTab === 'approved'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-400 shadow-xs'
                      : 'bg-white text-neutral-600 hover:text-neutral-900 border border-[#D4AF37]/30'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تمت الموافقة / جاري الشحن ({approvedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab('delivered')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTab === 'delivered'
                      ? 'bg-sky-50 text-sky-800 border border-sky-400 shadow-xs'
                      : 'bg-white text-neutral-600 hover:text-neutral-900 border border-[#D4AF37]/30'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>تم الاستلام بنجاح ({deliveredCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab('rejected')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterTab === 'rejected'
                      ? 'bg-red-50 text-red-800 border border-red-400 shadow-xs'
                      : 'bg-white text-neutral-600 hover:text-neutral-900 border border-[#D4AF37]/30'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>مرفوضة / ملغية ({rejectedCount})</span>
                </button>
              </div>

              {/* ================= ORDERS LIST CONTENT ================= */}
              <motion.div
                key={filterTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
                className="py-2 space-y-3.5"
              >
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12 space-y-3 bg-white rounded-2xl border border-[#D4AF37]/30 shadow-sm">
                    <Package className="w-12 h-12 text-[#B8860B]/70 mx-auto" />
                    <div className="text-sm font-bold text-neutral-900">
                      {filterTab === 'all' ? 'لا توجد طلبات سابقة حتى الآن' : 'لا توجد طلبات في هذه الخانة حالياً'}
                    </div>
                    <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed px-4">
                      {filterTab === 'all'
                        ? 'أي طلب تقوم بإتمامه سيظهر هنا مع التحديث المباشر لحالة الشحن والتوصيل'
                        : 'تتحدث حالة طلباتك تلقائياً عند موافقة الإدارة وشحن المنتج أو تسليمه'}
                    </p>
                  </div>
                ) : (
                  filteredOrders.map((ord, idx) => (
                    <motion.div 
                      key={ord.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.15) }}
                      style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
                      className="bg-white border border-[#D4AF37]/35 hover:border-[#D4AF37] rounded-2xl p-4 sm:p-5 space-y-3.5 transition-colors shadow-sm"
                    >
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D4AF37]/20">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#7A5912] text-sm dir-ltr">
                            {ord.orderNumber}
                          </span>
                          <span className="text-neutral-300">·</span>
                          <span className="text-xs text-neutral-500 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-neutral-400" />
                            <span>{formatDateTime(ord.createdAt)}</span>
                          </span>
                        </div>

                        {/* Status Badge */}
                        {ord.status === 'pending' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span>بانتظار موافقة المتجر</span>
                          </div>
                        )}
                        {ord.status === 'approved' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                            <Truck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تمت الموافقة - قيد التجهيز والشحن</span>
                          </div>
                        )}
                        {ord.status === 'delivered' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 bg-sky-50 px-3 py-1 rounded-full border border-sky-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                            <span>تم استلام الطلب والتسليم كاش بنجاح</span>
                          </div>
                        )}
                        {ord.status === 'rejected' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 bg-red-50 px-3 py-1 rounded-full border border-red-300">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>تم رفض / إلغاء الطلب</span>
                          </div>
                        )}
                      </div>

                      {/* Items List */}
                      <div className="space-y-2.5 bg-[#FAF8F2] p-3 rounded-xl border border-[#D4AF37]/25">
                        {(ord.items || []).map((item, idx) => (
                          <div key={`${item?.product?.id || idx}-${item?.selectedOption || ''}`} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={item?.selectedOptionImage || item?.product?.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop'}
                                alt={item?.product?.name || 'منتج'}
                                className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-[#D4AF37]/30 shrink-0"
                              />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-neutral-900 font-bold line-clamp-1 max-w-[260px]">
                                    {item?.product?.name || 'منتج'}
                                  </span>
                                  {item?.selectedOption && (
                                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#D4AF37]/50 text-[10px] font-extrabold text-[#7A5912]">
                                      {item.selectedOptionLabel || item.product?.customOptionLabel || 'الخانة'}: {item.selectedOption}
                                    </span>
                                  )}
                                </div>
                                <span className="text-neutral-500 font-mono text-[11px] block mt-0.5">
                                  الكمية: × {item?.quantity || 1}
                                </span>
                              </div>
                            </div>
                            <span className="text-[#7A5912] font-bold tabular-nums font-mono text-sm">
                              {formatPrice((item?.product?.priceUSD || 0) * (item?.quantity || 1), ord.currency)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Customer Address & Shipping Info */}
                      <div className="pt-2 border-t border-[#D4AF37]/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-600">
                        {ord.customer?.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
                            <span>هاتف المستلم: <span className="font-mono dir-ltr text-neutral-900 font-bold">{ord.customer.phone}</span></span>
                          </div>
                        )}
                        {ord.customer?.address && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
                            <span className="truncate" title={ord.customer.address}>العنوان: {ord.customer.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Admin notes if any */}
                      {ord.adminNotes && (
                        <div className="p-2.5 rounded-lg bg-[#FAF7EF] border border-[#D4AF37]/35 text-xs text-neutral-700">
                          <span className="text-[#8B6914] font-bold block text-[11px] mb-0.5">ملاحظات المتجر:</span>
                          <span>{ord.adminNotes}</span>
                        </div>
                      )}

                      {/* Total & Payment Method */}
                      <div className="pt-2.5 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs">
                        <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                          <Banknote className="w-3.5 h-3.5" />
                          <span>الدفع كاش عند الاستلام بالدينار العراقي</span>
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                          <span>المبلغ الكلي:</span>
                          <span className="gold-gradient-text tabular-nums font-bold text-base font-mono">
                            {formatPrice(ord.totalUSD, ord.currency)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[#D4AF37]/20 flex items-center justify-between shrink-0">
                <div className="text-xs text-neutral-500">
                  تحديث البيانات لحظي وسحابي عبر Firebase
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-[#7A5912] hover:text-neutral-900 bg-white border border-[#D4AF37]/40 hover:border-[#D4AF37] rounded-xl transition-colors cursor-pointer active:scale-95"
                >
                  إغلاق
                </button>
              </div>
            </main>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
