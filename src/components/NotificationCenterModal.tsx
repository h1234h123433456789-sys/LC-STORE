import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  CheckCircle2, 
  Truck, 
  Package, 
  Clock, 
  AlertCircle, 
  X, 
  Sparkles, 
  Volume2, 
  ShieldCheck,
  Smartphone,
  ArrowRight
} from 'lucide-react';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendDeviceNotification,
  getNotificationHistory,
  markAllNotificationsAsRead,
  LCNotification
} from '../lib/notifications';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [notifications, setNotifications] = useState<LCNotification[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setNotifications(getNotificationHistory());
    }
  }, [isOpen]);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    const granted = await requestNotificationPermission();
    setPermission(getNotificationPermission());
    setIsRequesting(false);

    if (granted) {
      setTestSent(true);
      await sendDeviceNotification('✨ متجر LC - تم تفعيل الإشعارات بنجاح', {
        body: isAdmin 
          ? 'ستصلك الآن إشعارات فورية على هاتفك عند ورود أي طلب جديد للمتجر.' 
          : 'ستصلك الآن إشعارات فورية على جهازك عند قبول طلبك وتحديث حالة التوصيل.',
        type: 'system'
      });
      setNotifications(getNotificationHistory());
      setTimeout(() => setTestSent(false), 4500);
    }
  };

  const handleSendTest = async () => {
    setTestSent(true);
    await sendDeviceNotification(
      isAdmin ? '🛍️ طلب جديد تجريبي لمتجر LC' : '🚚 تم شحن طلبك التجريبي بنجاح!',
      {
        body: isAdmin 
          ? 'طلب جديد بقيمة 85,000 د.ع من الزبون (أحمد علي) - بغداد، المنصور.'
          : 'خرج طلبك رقم #LC-9820 مع مندوب التوصيل، يرجى الاستعداد للمعاينة والدفع كاش عند الاستلام.',
        type: isAdmin ? 'order_new' : 'order_shipping'
      }
    );
    setNotifications(getNotificationHistory());
    setTimeout(() => setTestSent(false), 4500);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    setNotifications(getNotificationHistory());
  };

  const getIconForType = (type: LCNotification['type']) => {
    switch (type) {
      case 'order_new':
        return <Package className="w-4 h-4 text-[#B8860B]" />;
      case 'order_accepted':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'order_shipping':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'order_delivered':
        return <Sparkles className="w-4 h-4 text-[#B8860B]" />;
      case 'order_cancelled':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#B8860B]" />;
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
          dir="rtl"
          className="fixed inset-0 z-[100] h-[100dvh] w-full bg-white text-neutral-900 flex flex-col overflow-y-auto selection:bg-[#D4AF37]/30 selection:text-[#1A1814]"
        >
          {/* 1. Luxury Sticky Top Header */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#D4AF37]/30 px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7EF] hover:bg-[#F3ECE0] border border-[#D4AF37]/45 text-[#7A5912] font-bold text-xs transition-colors cursor-pointer active:scale-95"
              >
                <ArrowRight className="w-4 h-4 text-[#B8860B]" />
                <span>{isAdmin ? 'العودة للوحة الإدارة' : 'العودة للمتجر'}</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500">
                <span className="text-[#D4AF37]">●</span>
                <span>{isAdmin ? 'إشعارات الطلبات الفورية' : 'إشعارات متابعة الطلبات'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="gold-gradient-text tracking-widest font-brand font-extrabold text-base">LC BOUTIQUE</span>
                {isAdmin && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF4E1] text-[#7A5912] border border-[#D4AF37]/40 font-bold">
                    لوحة الإدارة
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#FAF7EF] border border-[#D4AF37]/35 hover:border-[#D4AF37] text-neutral-600 hover:text-neutral-900 flex items-center justify-center cursor-pointer transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* 2. Main Body Content */}
          <motion.main 
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative z-10 flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-start space-y-6"
          >
            {/* Prominent Hero Card for Activating Notifications */}
            <div className="relative w-full rounded-3xl bg-white border border-[#D4AF37]/45 shadow-[0_14px_40px_rgba(212,175,55,0.14)] p-6 sm:p-8 text-center space-y-6 overflow-hidden">
              {/* Top Gold Corner Accents */}
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#D4AF37]/60" />
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37]/60" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37]/60" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#D4AF37]/60" />

              {/* Luxury Emblem */}
              <div className="space-y-4 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF7EF] border border-[#D4AF37]/40 text-[#8B6914] text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>{isAdmin ? 'تنبيهات صاحب المتجر المباشرة' : 'مركز إشعارات متجر LC الرسمي'}</span>
                </div>

                <div className="relative inline-block mx-auto">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#FAF7EF] border-2 border-[#D4AF37] flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.25)] mx-auto">
                    <BellRing className="w-10 h-10 sm:w-12 sm:h-12 text-[#B8860B] animate-pulse" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white border-2 border-[#D4AF37] flex items-center justify-center shadow-sm">
                    <Smartphone className="w-4 h-4 text-[#7A5912]" />
                  </div>
                </div>
              </div>

              {/* Heading and Description */}
              <div className="space-y-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  {isAdmin ? 'إشعارات الطلبات الفورية للهاتف' : 'إشعارات تتبع وتحديث حالة طلبك'}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-lg mx-auto">
                  {isAdmin
                    ? 'فعل الإشعارات لتصلك تنبيهات حية برنة ملكية على شاشة هاتفك فور قيام أي زبون بطلب جديد من أي محافظة، حتى لو كان المتصفح أو التطبيق مغلقاً.'
                    : 'فعل الإشعارات لتصلك تنبيهات حية ومباشرة على شاشة هاتفك فور قبول طلبك وتجهيزه وانطلاقه مع مندوب التوصيل، حتى لو كان التطبيق مغلقاً.'}
                </p>
              </div>

              {/* Current Status Pill */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D4AF37]/30 text-xs font-bold mx-auto bg-[#FAF8F2]">
                <span className="text-neutral-600">حالة الإشعارات على هذا الجهاز:</span>
                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] ${
                  permission === 'granted'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : permission === 'denied'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-amber-50 border-amber-300 text-amber-700'
                }`}>
                  {permission === 'granted' ? 'مفعلة وتعمل بنجاح ✓' : permission === 'denied' ? 'محظورة من المتصفح' : 'غير مفعلة بعد'}
                </span>
              </div>

              {/* Action Trigger Buttons */}
              <div className="space-y-3 pt-2">
                {permission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    disabled={isRequesting || permission === 'unsupported'}
                    className="w-full py-4 px-6 rounded-2xl gold-gradient-bg text-black font-extrabold text-sm sm:text-base hover:brightness-110 active:scale-95 transition-all shadow-[0_6px_25px_rgba(212,175,55,0.35)] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <BellRing className="w-5 h-5" />
                    <span>{isRequesting ? 'جاري طلب الإذن...' : 'تفعيل إشعارات الهاتف الآن'}</span>
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={handleSendTest}
                      className="w-full py-3.5 px-6 rounded-2xl bg-[#FAF7EF] border-2 border-[#D4AF37] text-[#7A5912] font-extrabold text-sm hover:bg-[#F3ECE0] active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
                    >
                      <Volume2 className="w-4 h-4 text-[#B8860B]" />
                      <span>{testSent ? 'تم إرسال إشعار تجريبي للجهاز بنجاح ✓' : 'إرسال إشعار تجريبي لاختبار هاتفك'}</span>
                    </button>
                    <p className="text-[11px] text-emerald-700 font-semibold">
                      ✓ جهازك مهيأ لاستقبال الإشعارات الفورية بالصوت والاهتزاز.
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-neutral-500">
                  يمكنك إيقاف أو تعديل الإشعارات بأي وقت من إعدادات المتصفح أو التطبيق.
                </p>
              </div>
            </div>

            {/* Benefits Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
              <div className="bg-white p-3.5 rounded-2xl border border-[#D4AF37]/30 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-[#7A5912] text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#B8860B]" />
                  <span>قبول وتجهيز الطلب</span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  إشعار فوري فور قيام الإدارة بمراجعة طلبك وبدء تجهيزه بعناية.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#D4AF37]/30 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-[#7A5912] text-xs font-bold">
                  <Truck className="w-4 h-4 text-[#B8860B]" />
                  <span>انطلاق المندوب للتوصيل</span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  تنبيه مباشر لحظة خروج الشحنة مع المندوب للاستعداد للمعاينة والدفع كاش.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#D4AF37]/30 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-[#7A5912] text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-[#B8860B]" />
                  <span>خصوصية وأمان 100%</span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  لا نرسل أي رسائل إعلانية مزعجة، فقط التحديثات المباشرة لطلباتك.
                </p>
              </div>
            </div>

            {/* Recent Notification Log */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-neutral-600 px-1">
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>سجل التنبيهات الأخير:</span>
                </span>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[#8B6914] font-semibold hover:underline cursor-pointer"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-8 bg-white rounded-2xl border border-[#D4AF37]/30 text-center space-y-2 shadow-xs">
                  <BellOff className="w-7 h-7 text-neutral-400 mx-auto" />
                  <p className="text-xs text-neutral-600 font-medium">لا توجد إشعارات سابقة حتى الآن</p>
                  <p className="text-[11px] text-neutral-400">ستظهر هنا التنبيهات فور وصولها لجهازك</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                        n.read 
                          ? 'bg-white border-[#D4AF37]/25 text-neutral-700'
                          : 'bg-[#FAF4E4] border-[#D4AF37]/60 text-neutral-900 shadow-xs'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#FAF7EF] border border-[#D4AF37]/35 flex items-center justify-center shrink-0 mt-0.5">
                        {getIconForType(n.type)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-neutral-900 truncate">{n.title}</span>
                          <span className="text-[10px] text-neutral-500 shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(n.timestamp).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed break-words">{n.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.main>

          {/* 3. Luxury Bottom Footer */}
          <footer className="relative z-10 w-full bg-white/90 border-t border-[#D4AF37]/25 py-4 px-6 text-center text-[11px] text-neutral-500 shrink-0 mt-auto">
            جميع الحقوق محفوظة © {new Date().getFullYear()} لمتجر <span className="text-[#8B6914] font-bold">LC Store</span>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
