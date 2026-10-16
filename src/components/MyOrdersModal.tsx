import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Package, 
  CheckCircle2, 
  Phone, 
  MapPin, 
  Banknote, 
  Clock, 
  User as UserIcon, 
  Edit3, 
  Save, 
  XCircle, 
  Truck, 
  ShoppingBag, 
  Calendar,
  AlertCircle,
  Sparkles
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

  // Filter orders strictly for the logged-in user only
  const userOrders = (orders || []).filter((ord) => {
    if (!ord || !ord.customer) return false;
    if (!user) return false; // Never show orders if not logged in

    // 1. Match by unique User ID
    if (ord.userId && user.id && ord.userId === user.id) {
      return true;
    }

    // 2. Match by email (case-insensitive)
    const userCleanEmail = user.email?.trim().toLowerCase();
    const orderCleanEmail = ord.customer.contact?.trim().toLowerCase();
    if (userCleanEmail && orderCleanEmail && userCleanEmail === orderCleanEmail) {
      return true;
    }

    // 3. Match by phone number digits
    const userCleanPhone = (user.phone || '').replace(/\D/g, '');
    const orderCleanPhone = (ord.customer.phone || '').replace(/\D/g, '');
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
                <X className="w-4 h-4 text-[#D4AF37]" />
                <span>إغلاق والعودة للمتجر</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#181824] border border-[#D4AF37]/40 text-[#D4AF37]">
                <Package className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#F3E5AB] font-mono border border-[#D4AF37]/30">
                  {userOrders.length} طلب
                </span>
              </h3>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full scrollbar-thin space-y-5">

        {/* ================= CUSTOMER PROFILE CARD ================= */}
        <div className="mt-4 bg-[#161622] border border-neutral-800 rounded-2xl p-4 shrink-0 transition-all">
          {!isEditingProfile ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#1F1F2E] border border-[#D4AF37]/40 flex items-center justify-center font-bold text-sm text-[#F3E5AB]">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'LC'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{user?.name || 'الزبون'}</span>
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 mt-0.5">
                    <span className="font-mono dir-ltr">{user?.phone || 'بدون هاتف'}</span>
                    <span className="text-neutral-600">·</span>
                    <span className="font-mono dir-ltr truncate max-w-[180px]">{user?.email || user?.contactValue}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartEdit}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#F3E5AB] bg-[#222230] border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#2A2A3C] transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل الاسم والهاتف</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs font-bold text-[#F3E5AB]">
                <div className="flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-[#D4AF37]" />
                  <span>تعديل اسم الزبون ورقم الهاتف</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  إلغاء
                </button>
              </div>

              {profileMsg && (
                <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-600 text-emerald-200'
                    : 'bg-red-950/70 border border-red-600 text-red-200'
                }`}>
                  {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                    الاسم الكامل:
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="مثال: علي محمد"
                    className="w-full px-3 py-2 text-xs bg-[#121218] border border-neutral-700 focus:border-[#D4AF37] rounded-lg text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                    رقم الهاتف (للتوصيل):
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="0770 123 4567"
                    className="w-full px-3 py-2 text-xs bg-[#121218] border border-neutral-700 focus:border-[#D4AF37] rounded-lg text-white outline-none text-right"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
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

        {/* ================= STATUS FILTER TABS ================= */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'all'
                ? 'bg-[#252535] text-[#F3E5AB] border border-[#D4AF37]/50 shadow-sm'
                : 'bg-[#15151D] text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>كافة الطلبات ({userOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'pending'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-600 shadow-sm'
                : 'bg-[#15151D] text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>بانتظار الموافقة ({pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'approved'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600 shadow-sm'
                : 'bg-[#15151D] text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            <span>تمت الموافقة / جاري الشحن ({approvedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('delivered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'delivered'
                ? 'bg-sky-950/80 text-sky-300 border border-sky-600 shadow-sm'
                : 'bg-[#15151D] text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            <span>تم الاستلام بنجاح ({deliveredCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'rejected'
                ? 'bg-red-950/80 text-red-300 border border-red-600 shadow-sm'
                : 'bg-[#15151D] text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span>مرفوضة / ملغية ({rejectedCount})</span>
          </button>
        </div>

        {/* ================= ORDERS LIST CONTENT ================= */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 space-y-3 bg-[#13131A] rounded-2xl border border-neutral-800">
              <Package className="w-12 h-12 text-neutral-600 mx-auto" />
              <div className="text-sm font-semibold text-white">
                {filterTab === 'all' ? 'لا توجد طلبات سابقة حتى الآن' : 'لا توجد طلبات في هذه الخانة حالياً'}
              </div>
              <p className="text-xs text-neutral-400">
                {filterTab === 'all'
                  ? 'أي طلب تقوم بإتمامه سيظهر هنا مع التحديث المباشر لحالة الشحن والتوصيل'
                  : 'تتحدث حالة طلباتك تلقائياً عند موافقة الإدارة وشحن المنتج أو تسليمه'}
              </p>
            </div>
          ) : (
            filteredOrders.map((ord) => (
              <div 
                key={ord.id}
                className="bg-[#14141E] border border-neutral-800 hover:border-[#D4AF37]/50 rounded-2xl p-4 sm:p-5 space-y-3.5 transition-all shadow-md"
              >
                {/* Order Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#F3E5AB] text-sm dir-ltr">
                      {ord.orderNumber}
                    </span>
                    <span className="text-neutral-500">·</span>
                    <span className="text-xs text-neutral-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-neutral-500" />
                      <span>{formatDateTime(ord.createdAt)}</span>
                    </span>
                  </div>

                  {/* Status Badge */}
                  {ord.status === 'pending' && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/70 px-3 py-1 rounded-full border border-amber-600/60 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>بانتظار موافقة المتجر</span>
                    </div>
                  )}
                  {ord.status === 'approved' && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-600/60 shadow-sm">
                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تمت الموافقة - قيد التجهيز والشحن</span>
                    </div>
                  )}
                  {ord.status === 'delivered' && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 bg-sky-950/70 px-3 py-1 rounded-full border border-sky-600/60 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>تم استلام الطلب والتسليم كاش بنجاح</span>
                    </div>
                  )}
                  {ord.status === 'rejected' && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-300 bg-red-950/70 px-3 py-1 rounded-full border border-red-600/60 shadow-sm">
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span>تم رفض / إلغاء الطلب</span>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-2.5 bg-[#101016] p-3 rounded-xl border border-neutral-800/80">
                  {(ord.items || []).map((item, idx) => (
                    <div key={item?.product?.id || idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item?.product?.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop'}
                          alt={item?.product?.name || 'منتج'}
                          className="w-10 h-10 rounded-lg object-cover border border-neutral-700 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-neutral-200 font-semibold line-clamp-1 max-w-[280px]">
                              {item?.product?.name || 'منتج'}
                            </span>
                            {(item?.selectedSize || (item as any)?.size) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#252535] text-[#F3E5AB] border border-[#D4AF37]/50 font-bold shrink-0">
                                القياس: {item?.selectedSize || (item as any)?.size}
                              </span>
                            )}
                          </div>
                          <span className="text-neutral-400 font-mono text-[11px] block mt-0.5">
                            الكمية: × {item?.quantity || 1}
                          </span>
                        </div>
                      </div>
                      <span className="text-[#F3E5AB] font-bold tabular-nums font-mono text-sm">
                        {formatPrice((item?.product?.priceUSD || 0) * (item?.quantity || 1), ord.currency)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Customer Address & Shipping Info */}
                <div className="pt-2 border-t border-neutral-800/70 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300">
                  {ord.customer?.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      <span>هاتف المستلم: <span className="font-mono dir-ltr text-white font-bold">{ord.customer.phone}</span></span>
                    </div>
                  )}
                  {ord.customer?.address && (
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      <span className="truncate" title={ord.customer.address}>العنوان: {ord.customer.address}</span>
                    </div>
                  )}
                </div>

                {/* Admin notes if any */}
                {ord.adminNotes && (
                  <div className="p-2.5 rounded-lg bg-[#1D1D28] border border-neutral-700 text-xs text-neutral-300">
                    <span className="text-[#D4AF37] font-bold block text-[11px] mb-0.5">ملاحظات المتجر:</span>
                    <span>{ord.adminNotes}</span>
                  </div>
                )}

                {/* Total & Payment Method */}
                <div className="pt-2.5 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <Banknote className="w-3.5 h-3.5" />
                    <span>الدفع كاش عند الاستلام بالدينار العراقي</span>
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span>المبلغ الكلي:</span>
                    <span className="gold-gradient-text tabular-nums font-bold text-base font-mono">
                      {formatPrice(ord.totalUSD, ord.currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-400">
            تحديث البيانات لحظي وسحابي عبر Firebase
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-neutral-200 hover:text-white bg-[#181824] border border-neutral-700 hover:border-neutral-500 rounded-xl transition-colors cursor-pointer active:scale-95"
          >
            إغلاق
          </button>
        </div>

          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
