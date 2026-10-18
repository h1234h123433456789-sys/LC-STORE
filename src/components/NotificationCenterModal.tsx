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
  ArrowRight,
  Shield,
  Check
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
        return <Package className="w-4 h-4 text-[#D4AF37]" />;
      case 'order_accepted':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'order_shipping':
        return <Truck className="w-4 h-4 text-blue-400" />;
      case 'order_delivered':
        return <Sparkles className="w-4 h-4 text-[#D4AF37]" />;
      case 'order_cancelled':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Bell className="w-4 h-4 text-[#D4AF37]" />;
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
          className="fixed inset-0 z-[100] h-[100dvh] w-full bg-[#08080C] text-[#EDEDED] flex flex-col overflow-y-auto selection:bg-[#D4AF37]/30 selection:text-[#F3E5AB]"
        >
      {/* Dynamic Gold Ambient Lighting for Notification Center */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-32 -right-24 w-[580px] h-[580px] rounded-full animate-gold-flow-1"
          style={{
            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.08) 40%, transparent 72%)'
          }}
        />
        <div
          className="absolute bottom-0 -left-24 w-[560px] h-[560px] rounded-full animate-gold-flow-2"
          style={{
            background: 'radial-gradient(circle, rgba(243, 229, 171, 0.16) 0%, rgba(212, 175, 55, 0.05) 40%, transparent 72%)'
          }}
        />
      </div>

      {/* 1. Luxury Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-[#0F0F15] border-b border-[#D4AF37]/20 px-4 sm:px-8 py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181822] hover:bg-[#222230] border border-[#D4AF37]/40 text-[#F3E5AB] font-bold text-xs transition-colors cursor-pointer active:scale-95"
          >
            <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
            <span>{isAdmin ? 'العودة للوحة الإدارة' : 'العودة للمتجر'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
            <span className="text-[#D4AF37]">●</span>
            <span>{isAdmin ? 'إشعارات الطلبات الفورية' : 'إشعارات متابعة الطلبات'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="gold-gradient-text tracking-widest font-brand font-extrabold text-base">LC BOUTIQUE</span>
            {isAdmin && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#D4AF37]/20 text-[#F3E5AB] border border-[#D4AF37]/40 font-bold">
                لوحة الإدارة
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Body Content - Aligned Directly in the Face (بالوجه مباشرة) */}
      <motion.main 
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative z-10 flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-start space-y-6"
      >
        
        {/* Prominent Hero Card for Activating Notifications */}
        <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#181824] via-[#111117] to-[#0A0A0E] border border-[#D4AF37]/40 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-6 sm:p-8 text-center space-y-6 overflow-hidden">
          
          {/* Top Gold Corner Accents */}
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#D4AF37]/50" />
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37]/50" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37]/50" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#D4AF37]/50" />

          {/* Luxury Emblem */}
          <div className="space-y-4 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#181812] border border-[#D4AF37]/35 text-[#D4AF37] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{isAdmin ? 'تنبيهات صاحب المتجر المباشرة' : 'مركز إشعارات متجر LC الرسمي'}</span>
            </div>

            <div className="relative inline-block mx-auto">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#1A1A28] border-2 border-[#D4AF37] flex items-center justify-center shadow-[0_0_35px_rgba(212,175,55,0.3)] mx-auto">
                <BellRing className="w-10 h-10 sm:w-12 sm:h-12 text-[#D4AF37] animate-pulse" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#0A0A0E] border-2 border-[#D4AF37] flex items-center justify-center shadow-lg">
                <Smartphone className="w-4 h-4 text-[#F3E5AB]" />
              </div>
            </div>
          </div>

          {/* Heading and Description */}
          <div className="space-y-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isAdmin ? 'إشعارات الطلبات الفورية للهاتف' : 'إشعارات تتبع وتحديث حالة طلبك'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-lg mx-auto">
              {isAdmin
                ? 'فعل الإشعارات لتصلك تنبيهات حية برنة ملكية على شاشة هاتفك فور قيام أي زبون بطلب جديد من أي محافظة، حتى لو كان المتصفح أو التطبيق مغلقاً.'
                : 'فعل الإشعارات لتصلك تنبيهات حية ومباشرة على شاشة هاتفك فور قبول طلبك وتجهيزه وانطلاقه مع مندوب التوصيل، حتى لو كان التطبيق مغلقاً.'}
            </p>
          </div>

          {/* Current Status Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold mx-auto bg-[#13131D]">
            <span className="text-neutral-400">حالة الإشعارات على هذا الجهاز:</span>
            <span className={`px-2.5 py-0.5 rounded-full border text-[11px] ${
              permission === 'granted'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                : permission === 'denied'
                ? 'bg-red-950/60 border-red-500/50 text-red-400'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-400'
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
                className="w-full py-4 px-6 rounded-2xl gold-gradient-bg text-[#09090B] font-extrabold text-sm sm:text-base hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <BellRing className="w-5 h-5" />
                <span>{isRequesting ? 'جاري طلب الإذن...' : 'تفعيل إشعارات الهاتف الآن'}</span>
              </button>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleSendTest}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#1C1C28] border-2 border-[#D4AF37] text-[#F3E5AB] font-extrabold text-sm hover:bg-[#252535] active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg"
                >
                  <Volume2 className="w-4 h-4 text-[#D4AF37]" />
                  <span>{testSent ? 'تم إرسال إشعار تجريبي للجهاز بنجاح ✓' : 'إرسال إشعار تجريبي لاختبار هاتفك'}</span>
                </button>
                <p className="text-[11px] text-emerald-400 font-medium">
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
          <div className="bg-[#12121A] p-3.5 rounded-2xl border border-neutral-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-[#F3E5AB] text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
              <span>قبول وتجهيز الطلب</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              إشعار فوري فور قيام الإدارة بمراجعة طلبك وبدء تجهيزه بعناية.
            </p>
          </div>

          <div className="bg-[#12121A] p-3.5 rounded-2xl border border-neutral-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-[#F3E5AB] text-xs font-bold">
              <Truck className="w-4 h-4 text-[#D4AF37]" />
              <span>انطلاق المندوب للتوصيل</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              تنبيه مباشر لحظة خروج الشحنة مع المندوب للاستعداد للمعاينة والدفع كاش.
            </p>
          </div>

          <div className="bg-[#12121A] p-3.5 rounded-2xl border border-neutral-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-[#F3E5AB] text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>خصوصية وأمان 100%</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              لا نرسل أي رسائل إعلانية مزعجة، فقط التحديثات المباشرة لطلباتك.
            </p>
          </div>
        </div>

        {/* Recent Notification Log */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>سجل التنبيهات الأخير:</span>
            </span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-[#F3E5AB] hover:underline cursor-pointer"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-8 bg-[#111118] rounded-2xl border border-neutral-800/80 text-center space-y-2">
              <BellOff className="w-7 h-7 text-neutral-600 mx-auto" />
              <p className="text-xs text-neutral-400">لا توجد إشعارات سابقة حتى الآن</p>
              <p className="text-[11px] text-neutral-600">ستظهر هنا التنبيهات فور وصولها لجهازك</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                    n.read 
                      ? 'bg-[#101016] border-neutral-800/80 text-neutral-300'
                      : 'bg-[#171724] border-[#D4AF37]/50 text-white shadow-md'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#1D1D2B] border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                    {getIconForType(n.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">{n.title}</span>
                      <span className="text-[10px] text-neutral-500 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.timestamp).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed break-words">{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </motion.main>

      {/* 3. Luxury Bottom Footer */}
      <footer className="relative z-10 w-full bg-[#060608]/90 border-t border-[#D4AF37]/15 py-4 px-6 text-center text-[11px] text-neutral-500 shrink-0 mt-auto">
        جميع الحقوق محفوظة © {new Date().getFullYear()} لمتجر <span className="text-[#F3E5AB] font-semibold">LC Store</span>
      </footer>

        </motion.div>
      )}
    </AnimatePresence>
  );
};
