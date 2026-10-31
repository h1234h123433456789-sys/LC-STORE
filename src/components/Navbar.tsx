import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  User as UserIcon, 
  LogOut, 
  Bell, 
  ChevronDown, 
  Package, 
  Smartphone, 
  Sparkles
} from 'lucide-react';
import { User } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface NavbarProps {
  user: User | null;
  cartCount: number;
  currency?: 'IQD' | 'USD';
  onToggleCurrency?: () => void;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onOpenMyOrders: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onLogout: () => void;
  onToast?: (msg: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  cartCount,
  onOpenCart,
  onOpenAuth,
  onOpenMyOrders,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onLogout,
  onToast
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { isInstalled, install } = usePWAInstall();

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleInstallClick = async () => {
    try {
      setIsUserMenuOpen(false);
      const installed = await install();
      if (installed && onToast) {
        onToast('تم بدء تثبيت تطبيق LC على هاتفك بنجاح!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/95 border-b border-[#D4AF37]/30 shadow-[0_4px_20px_rgba(212,175,55,0.08)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        
        {/* 1. Brand Wordmark (Right in RTL) */}
        <div className="flex items-center gap-6">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-2xl sm:text-3xl font-brand font-bold tracking-widest gold-gradient-text transition-transform hover:scale-105 active:scale-95"
            aria-label="LC Store"
          >
            LC
          </a>
        </div>

        {/* 2. Desktop Navigation Links (Center) */}
        <nav className="hidden md:flex items-center gap-7 text-xs sm:text-sm font-medium">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="relative py-1 text-[#8B6914] font-bold hover:text-neutral-900 transition-colors after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-full after:h-[2px] after:bg-[#D4AF37] after:rounded-full"
          >
            الرئيسية
          </a>
          <a
            href="#catalog"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="relative py-1 text-neutral-600 hover:text-[#8B6914] transition-colors after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-0 hover:after:w-full after:h-[2px] after:bg-[#D4AF37]/70 after:transition-all after:duration-300"
          >
            معروضات المتجر
          </a>
        </nav>

        {/* 3. Primary Actions (Left in RTL): Clean, Spaced, Uncluttered */}
        <div className="flex items-center gap-2">
          
          {/* App Install Button (Visible on tablet/desktop, compact) */}
          <div className="hidden sm:block">
            <PWAInstallButton variant="navbar" onToast={onToast} />
          </div>

          {/* Notification Bell Button */}
          {onOpenNotifications && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              type="button"
              onClick={onOpenNotifications}
              aria-label="التنبيهات والإشعارات"
              className="relative p-2 rounded-xl bg-[#FAF7EF] border border-[#D4AF37]/35 hover:border-[#D4AF37] text-[#8B6914] hover:text-neutral-900 transition-colors cursor-pointer shadow-xs"
              title="مركز الإشعارات والتنبيهات"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold text-black gold-gradient-bg rounded-full shadow-md animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </motion.button>
          )}

          {/* User Account / Profile Dropdown Menu */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-neutral-900 bg-[#FAF7EF] border border-[#D4AF37]/50 hover:border-[#D4AF37] rounded-xl transition-colors shadow-xs cursor-pointer"
                title="الملف الشخصي والخيارات"
              >
                <div className="w-4 h-4 rounded-full bg-[#D4AF37]/25 flex items-center justify-center text-[#9A7217]">
                  <UserIcon className="w-3 h-3" />
                </div>
                <span className="max-w-[65px] sm:max-w-[95px] truncate font-bold text-[11px] sm:text-xs">
                  {user.name ? user.name.split(' ')[0] : 'ملفي'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#B8860B] transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </motion.button>

              {/* Floating Luxury User Menu Dropdown */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    dir="rtl"
                    className="absolute left-0 mt-2 w-56 rounded-2xl bg-white border border-[#D4AF37]/50 shadow-[0_20px_50px_rgba(180,135,28,0.18)] p-2 z-50 text-right space-y-1"
                  >
                    {/* User Info Header */}
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FDF9EE] to-[#FAF4E4] border border-[#D4AF37]/35 mb-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                        <span className="text-xs font-extrabold text-neutral-900 truncate">{user.name}</span>
                      </div>
                      {user.phone && (
                        <p className="text-[10px] text-[#8B6914] font-mono font-bold" dir="ltr">
                          {user.phone}
                        </p>
                      )}
                    </div>

                    {/* Orders Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenMyOrders();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 hover:bg-[#FAF7EF] rounded-xl transition-colors cursor-pointer text-right"
                    >
                      <Package className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>طلباتي السابقة وتتبع الشحن</span>
                    </button>

                    {/* Notifications Center Button */}
                    {onOpenNotifications && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenNotifications();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 hover:bg-[#FAF7EF] rounded-xl transition-colors cursor-pointer text-right"
                      >
                        <div className="flex items-center gap-2">
                          <Bell className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>مركز الإشعارات والتنبيهات</span>
                        </div>
                        {unreadNotificationsCount > 0 && (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-[#D4AF37] text-black font-bold">
                            {unreadNotificationsCount}
                          </span>
                        )}
                      </button>
                    )}

                    {/* Install PWA Option */}
                    {!isInstalled && (
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-[#8B6914] hover:bg-[#FAF4E4] rounded-xl transition-colors cursor-pointer text-right border border-[#D4AF37]/30"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>تثبيت تطبيق المتجر على هاتفك</span>
                      </button>
                    )}

                    <div className="h-[1px] bg-[#E8E2D2] my-1" />

                    {/* Logout Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer text-right"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>تسجيل الخروج من الحساب</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] sm:text-xs font-bold text-neutral-800 bg-[#FAF7EF] border border-[#D4AF37]/45 hover:border-[#D4AF37] rounded-xl hover:text-black transition-colors shadow-xs cursor-pointer"
              title="تسجيل الدخول / فتح الحساب"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#B8860B]" />
              <span className="hidden sm:inline">حسابي / تسجيل الدخول</span>
              <span className="sm:hidden font-bold">دخول</span>
            </motion.button>
          )}

          {/* Shopping Bag Drawer Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            type="button"
            onClick={onOpenCart}
            aria-label="حقيبة التسوق"
            className="relative p-2 rounded-xl bg-[#FAF7EF] border border-[#D4AF37]/50 text-[#8B6914] hover:border-[#D4AF37] transition-colors cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.15)]"
          >
            <ShoppingBag className="w-4 h-4 text-[#B8860B]" />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 16 }}
                  className="absolute -top-1.5 -left-1.5 w-4.5 h-4.5 flex items-center justify-center text-[9.5px] font-extrabold text-black gold-gradient-bg rounded-full shadow-md"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

        </div>

      </div>
    </header>
  );
};
