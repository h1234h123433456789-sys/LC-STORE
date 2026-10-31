import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, Lock, User as UserIcon, CheckCircle2, AlertCircle, Shield, Eye, EyeOff, Sparkles, UserPlus, LogIn, ArrowRight } from 'lucide-react';
import { User } from '../types';
import { registerUserInFirestore, loginUserFromFirestore } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  reason?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  reason
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validateEmail = (val: string) => {
    return String(val)
      .toLowerCase()
      .match(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);
  };

  const validatePhone = (val: string) => {
    const cleaned = val.replace(/[\s\-\(\)]/g, '');
    return cleaned.length >= 8;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanName = regName.trim();
    const cleanPhone = regPhone.trim();
    const cleanEmail = regEmail.trim();

    if (!cleanName) {
      setError('يرجى كتابة الاسم الكامل بشكل واضح');
      return;
    }
    if (!cleanPhone || !validatePhone(cleanPhone)) {
      setError('يرجى إدخال رقم هاتف صحيح يتكون من 8 أرقام على الأقل');
      return;
    }
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setError('يرجى إدخال بريد إلكتروني صحيح وموثق');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setError('رمز المرور السري يجب أن يتكون من 4 خانات على الأقل');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('رمز المرور وتأكيده غير متطابقين، يرجى إعادة التحقق');
      return;
    }

    setIsSubmitting(true);
    try {
      const newUser = await registerUserInFirestore({
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        password: regPassword
      });

      setSuccessMsg('تم إنشاء حسابك وتأكيده بنجاح!');
      setTimeout(() => {
        onLoginSuccess(newUser);
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanId = loginIdentifier.trim();
    if (!cleanId) {
      setError('يرجى كتابة البريد الإلكتروني أو رقم الهاتف');
      return;
    }
    if (!loginPassword) {
      setError('يرجى كتابة رمز المرور السري لحسابك');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await loginUserFromFirestore({ emailOrPhone: cleanId, password: loginPassword });
      setSuccessMsg('تم تسجيل دخولك بنجاح! مرحباً بك');
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول، يرجى التأكد من البيانات');
    } finally {
      setIsSubmitting(false);
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
          className="fixed inset-0 z-[125] w-full h-[100dvh] bg-white flex flex-col overflow-hidden text-right"
        >
          {/* Top Sticky Header Bar */}
          <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-[#D4AF37]/30 px-4 sm:px-8 py-3 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7EF] hover:bg-[#F3ECE0] border border-[#D4AF37]/45 text-[#7A5912] font-bold text-xs transition-all cursor-pointer active:scale-95"
              >
                <ArrowRight className="w-4 h-4 text-[#B8860B]" />
                <span>العودة للمتجر</span>
              </button>
            </div>

            <div className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <span className="gold-gradient-text tracking-widest font-brand font-extrabold text-base">LC BOUTIQUE</span>
            </div>
          </header>

          {/* Body Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="relative w-full max-w-md bg-white border border-[#D4AF37]/45 rounded-2xl shadow-[0_12px_40px_rgba(212,175,55,0.16)] p-5 sm:p-7 my-auto"
            >
              
              {/* Header */}
              <div className="text-center space-y-1.5 mb-5">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                  {activeTab === 'register' ? 'إنشاء حساب جديد محمي برمز سري' : 'تسجيل الدخول إلى حسابك'}
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {reason ? (
                    <span className="text-[#8B6914] font-semibold block">{reason}</span>
                  ) : (
                    'سجل حسابك لحفظ طلبيتك ومتابعة حالة التوصيل فوراً'
                  )}
                </p>
              </div>

              {/* Toggle Tabs */}
              <div className="flex rounded-xl bg-[#FAF7EF] p-1 border border-[#D4AF37]/30 mb-5 relative">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`relative flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'register'
                      ? 'text-black'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {activeTab === 'register' && (
                    <motion.div
                      layoutId="authModalActiveTab"
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className="absolute inset-0 rounded-lg gold-gradient-bg shadow-sm"
                    />
                  )}
                  <UserPlus className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">حساب جديد</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`relative flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'login'
                      ? 'text-black'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {activeTab === 'login' && (
                    <motion.div
                      layoutId="authModalActiveTab"
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className="absolute inset-0 rounded-lg gold-gradient-bg shadow-sm"
                    />
                  )}
                  <LogIn className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">تسجيل دخول</span>
                </button>
              </div>

              {/* Messages */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              {/* Form with smooth tab transition */}
              {activeTab === 'register' ? (
                <motion.form
                  key="register-form"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  onSubmit={handleRegister}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs text-neutral-700 font-semibold mb-1">الاسم الكامل *</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="مثال: علي الحسين"
                        className="w-full pr-9 pl-3 py-2.5 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-700 font-semibold mb-1">رقم الهاتف (للتواصل عند التسليم) *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0770XXXXXXX"
                        className="w-full pr-9 pl-3 py-2.5 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none transition-colors text-right"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-700 font-semibold mb-1">البريد الإلكتروني *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full pr-9 pl-3 py-2.5 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none transition-colors text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-700 font-semibold mb-1">رمز المرور *</label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••"
                        className="w-full px-3 py-2.5 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none transition-colors text-center font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-700 font-semibold mb-1">تأكيد الرمز *</label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="••••"
                        className="w-full px-3 py-2.5 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none transition-colors text-center font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 gold-gradient-bg text-black font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.3)] mt-2 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>جاري إنشاء الحساب...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-black" />
                        <span>إنشاء حساب موثق فوري</span>
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs text-neutral-700 font-semibold mb-1">البريد الإلكتروني أو رقم الهاتف</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="بريدك أو رقم هاتفك"
                        className="w-full pr-9 pl-3 py-2.5 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none transition-colors text-right"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-700 font-semibold mb-1">رمز المرور السري</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••"
                        className="w-full pr-9 pl-9 py-2.5 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-xs text-neutral-900 outline-none transition-colors text-center font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 gold-gradient-bg text-black font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.3)] mt-2 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>جاري تسجيل الدخول...</span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>تسجيل الدخول للحساب</span>
                      </>
                    )}
                  </button>
                </motion.form>
              )}

              <div className="mt-5 pt-4 border-t border-[#D4AF37]/20 text-center text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#B8860B]" />
                <span>بياناتك محمية ومحفوظة بأمان بمتجر LC</span>
              </div>
            </motion.div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
