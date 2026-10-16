import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingBag, 
  User as UserIcon, 
  LogOut, 
  Bell, 
  ChevronDown, 
  Package, 
  Smartphone, 
  Sparkles,
  ShieldCheck,
  CheckCircle2
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
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#080809]/92 border-b border-[#D4AF37]/15 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
        
        {/* 1. Brand Wordmark (Right in RTL) */}
        <div className="flex items-center gap-6">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-2xl sm:text-3xl md:text-4xl font-brand font-bold tracking-widest gold-gradient-text transition-transform hover:scale-105 active:scale-95"
            aria-label="LC Store"
          >
            LC
          </a>
        </div>

        {/* 2. Desktop Navigation Links (Center) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-[#F3E5AB] font-semibold hover:text-white transition-colors"
          >
            الرئيسية
          </a>
          <a
            href="#catalog"
            className="text-neutral-400 hover:text-[#F3E5AB] transition-colors"
          >
            معروضات المتجر
          </a>
        </nav>

        {/* 3. Primary Actions (Left in RTL): Clean, Spaced, Uncluttered */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* App Install Button (Visible on tablet/desktop, compact) */}
          <div className="hidden sm:block">
            <PWAInstallButton variant="navbar" onToast={onToast} />
          </div>

          {/* Notification Bell Button */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label="التنبيهات والإشعارات"
              className="relative p-2.5 rounded-xl bg-[#13131A] border border-neutral-800 hover:border-[#D4AF37]/60 text-neutral-300 hover:text-[#F3E5AB] active:scale-95 transition-all cursor-pointer shadow-sm"
              title="مركز الإشعارات والتنبيهات"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold text-black gold-gradient-bg rounded-full shadow-md animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* User Account / Profile Dropdown Menu */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#F3E5AB] bg-[#14141C] border border-[#D4AF37]/50 hover:border-[#D4AF37] rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                title="الملف الشخصي والخيارات"
              >
                <div className="w-4 h-4 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                  <UserIcon className="w-3 h-3" />
                </div>
                <span className="max-w-[70px] sm:max-w-[100px] truncate font-bold">
                  {user.name ? user.name.split(' ')[0] : 'ملفي'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#D4AF37] transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Floating Luxury User Menu Dropdown */}
              {isUserMenuOpen && (
                <div 
                  dir="rtl"
                  className="absolute left-0 mt-2 w-56 rounded-2xl bg-[#111117] border border-[#D4AF37]/40 shadow-[0_15px_50px_rgba(0,0,0,0.95)] p-2 z-50 animate-ios-slide-up text-right space-y-1 backdrop-blur-xl"
                >
                  {/* User Info Header */}
                  <div className="p-2.5 rounded-xl bg-[#181824] border border-neutral-800/80 mb-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      <span className="text-xs font-bold text-white truncate">{user.name}</span>
                    </div>
                    {user.phone && (
                      <p className="text-[11px] text-neutral-400 font-mono" dir="ltr">
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
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-neutral-200 hover:text-white hover:bg-[#1A1A26] rounded-xl transition-colors cursor-pointer text-right"
                  >
                    <Package className="w-4 h-4 text-[#D4AF37]" />
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
                      className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-neutral-200 hover:text-white hover:bg-[#1A1A26] rounded-xl transition-colors cursor-pointer text-right"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-[#D4AF37]" />
                        <span>مركز الإشعارات والتنبيهات</span>
                      </div>
                      {unreadNotificationsCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D4AF37] text-black font-bold">
                          {unreadNotificationsCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Install PWA Option (if on mobile or not installed) */}
                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#F3E5AB] hover:bg-[#1E1B13] rounded-xl transition-colors cursor-pointer text-right border border-[#D4AF37]/20"
                    >
                      <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                      <span>تثبيت تطبيق المتجر على هاتفك</span>
                    </button>
                  )}

                  <div className="h-[1px] bg-neutral-800/80 my-1" />

                  {/* Logout Button (Safely and cleanly nested inside menu!) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer text-right"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>تسجيل الخروج من الحساب</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-200 bg-[#14141C] border border-neutral-700 hover:border-[#D4AF37] rounded-xl hover:text-[#F3E5AB] transition-all active:scale-95 shadow-sm cursor-pointer"
              title="تسجيل الدخول / فتح الحساب"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">حسابي / تسجيل الدخول</span>
              <span className="sm:hidden font-bold">دخول</span>
            </button>
          )}

          {/* Shopping Bag Drawer Button */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="حقيبة التسوق"
            className="relative p-2.5 rounded-xl bg-[#14141C] border border-[#D4AF37]/40 text-[#F3E5AB] hover:border-[#D4AF37] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-black gold-gradient-bg rounded-full shadow-md animate-ios-badge">
                {cartCount}
              </span>
            )}
          </button>

        </div>

      </div>
    </header>
  );
};
