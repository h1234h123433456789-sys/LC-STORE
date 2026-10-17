/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Package, X, Clock, ShieldCheck, Lock, Layers, Database, Tag } from 'lucide-react';
import { Product, CartItem, User, Order, ProductList } from './types';
import { INITIAL_PRODUCTS } from './data/initialProducts';
import { 
  testConnection, 
  subscribeToProducts, 
  subscribeToProductLists, 
  subscribeToOrders,
  subscribeToAdminPin,
  getAdminPinFromFirestore,
  saveAdminPinToFirestore,
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveProductListToFirestore,
  deleteProductListFromFirestore,
  saveOrderToFirestore,
  updateOrderStatusInFirestore,
  deleteOrderFromFirestore,
  subscribeToStoreCategories,
  saveStoreCategoriesToFirestore
} from './lib/firebase';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { MyOrdersModal } from './components/MyOrdersModal';
import { AdminPortal } from './components/AdminPortal';
import { AmbientGoldAura } from './components/AmbientGoldAura';
import { FeaturedMarqueeStrip } from './components/FeaturedMarqueeStrip';
import { Footer } from './components/Footer';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useOnlineStatus, FullOfflineScreen } from './components/OfflineIndicator';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { SplashScreen } from './components/SplashScreen';
import { sendDeviceNotification } from './lib/notifications';
import { formatPrice } from './utils/formatters';

export default function App() {
  const isOnline = useOnlineStatus();
  // Navigation View: Retain view on browser refresh via hash / sessionStorage
  const [currentView, setCurrentView] = useState<'store' | 'admin'>(() => {
    try {
      if (typeof window !== 'undefined') {
        if (window.location.hash === '#admin') return 'admin';
        const savedView = sessionStorage.getItem('lc_current_view');
        if (savedView === 'admin') return 'admin';
      }
    } catch {
      // ignore
    }
    return 'store';
  });

  const [hasPlayedIntro, setHasPlayedIntro] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem('lc_has_played_intro') === 'true';
      }
    } catch {
      // ignore
    }
    return false;
  });

  const handleSplashFinish = () => {
    setHasPlayedIntro(true);
    try {
      sessionStorage.setItem('lc_has_played_intro', 'true');
    } catch {
      // ignore
    }
  };
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);

  // Store Products (Real products added by the owner only)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('lc_real_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => p && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string');
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PRODUCTS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('lc_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => item && item.product && typeof item.product.id === 'string');
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('lc_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('lc_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((o) => o && typeof o === 'object' && typeof o.id === 'string');
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Custom Product Lists managed by the Admin
  const [productLists, setProductLists] = useState<ProductList[]>(() => {
    try {
      const saved = localStorage.getItem('lc_product_lists');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((l) => l && typeof l === 'object' && typeof l.id === 'string' && typeof l.name === 'string');
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Master Store Categories Pool (Unlimited & Persistent)
  const [storeCategories, setStoreCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lc_master_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((c) => typeof c === 'string' && c.trim());
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const handleAddStoreCategories = (newCats: string[]) => {
    setStoreCategories((prev) => {
      const set = new Set(prev);
      newCats.forEach((c) => {
        const trimmed = c.trim();
        if (trimmed) set.add(trimmed);
      });
      const updated = Array.from(set);
      localStorage.setItem('lc_master_categories', JSON.stringify(updated));
      saveStoreCategoriesToFirestore(updated).catch(console.warn);
      return updated;
    });
    showToast(`تمت إضافة الأقسام بنجاح`);
  };

  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: string[];
    initialIndex: number;
    title: string;
  }>({ isOpen: false, images: [], initialIndex: 0, title: '' });

  const handleDeleteStoreCategory = (catToDelete: string) => {
    setStoreCategories((prev) => {
      const updated = prev.filter((c) => c !== catToDelete);
      localStorage.setItem('lc_master_categories', JSON.stringify(updated));
      saveStoreCategoriesToFirestore(updated).catch(console.warn);
      return updated;
    });
    // Also remove from any product lists
    setProductLists((prev) =>
      prev.map((l) => {
        if (l.categories?.includes(catToDelete)) {
          const updatedList = { ...l, categories: l.categories.filter((c) => c !== catToDelete) };
          saveProductListToFirestore(updatedList).catch(console.warn);
          return updatedList;
        }
        return l;
      })
    );
    showToast(`تم حذف قسم "${catToDelete}"`);
  };

  // Extract all categories in existence (from products, lists, and master pool)
  const allMasterCategories = useMemo(() => {
    const set = new Set<string>();
    storeCategories.forEach((c) => { if (c?.trim()) set.add(c.trim()); });
    products.forEach((p) => { if (p?.categoryLabel?.trim()) set.add(p.categoryLabel.trim()); });
    productLists.forEach((l) => {
      (l.categories || []).forEach((c) => { if (c?.trim()) set.add(c.trim()); });
    });
    return Array.from(set);
  }, [storeCategories, products, productLists]);

  const [activeListId, setActiveListId] = useState<string>('all');
  const [currency] = useState<'IQD' | 'USD'>('IQD');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  // Customer Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | undefined>();
  const [pendingCheckoutAfterAuth, setPendingCheckoutAfterAuth] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [isOrderSuccessOpen, setIsOrderSuccessOpen] = useState(false);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  // Keep View & URL Hash in sync across page reloads
  useEffect(() => {
    try {
      if (currentView === 'admin') {
        if (window.location.hash !== '#admin') {
          window.location.hash = 'admin';
        }
        sessionStorage.setItem('lc_current_view', 'admin');
      } else {
        if (window.location.hash === '#admin') {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        sessionStorage.setItem('lc_current_view', 'store');
      }
    } catch {
      // Ignore
    }
  }, [currentView]);

  useEffect(() => {
    const handleHashChange = () => {
      try {
        if (window.location.hash === '#admin') {
          setCurrentView('admin');
        } else {
          setCurrentView('store');
        }
      } catch {
        // Fallback
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync with Firestore Cloud Database in Realtime (Bidirectional between Website & App)
  useEffect(() => {
    testConnection().then((ok) => {
      setIsFirebaseConnected(ok);
    });

    const unsubProducts = subscribeToProducts((remoteProducts) => {
      if (Array.isArray(remoteProducts)) {
        let deletedIds = new Set<string>();
        try {
          const savedDeleted = localStorage.getItem('lc_deleted_product_ids');
          if (savedDeleted) {
            deletedIds = new Set(JSON.parse(savedDeleted));
          }
        } catch {}

        setProducts((prevLocalProducts) => {
          // Keep any locally created products that aren't marked as deleted and haven't synced to remote yet
          const localOnly = (prevLocalProducts || []).filter(
            (lp) => lp && lp.id && !deletedIds.has(lp.id) && !remoteProducts.some((rp) => rp && rp.id === lp.id)
          );
          const validRemote = remoteProducts.filter((rp) => rp && rp.id && !deletedIds.has(rp.id));
          const merged = [...validRemote, ...localOnly];
          try {
            localStorage.setItem('lc_real_products', JSON.stringify(merged));
          } catch (e) {
            console.warn(e);
          }
          return merged;
        });
      }
    });

    const unsubLists = subscribeToProductLists((remoteLists) => {
      if (Array.isArray(remoteLists)) {
        setProductLists(remoteLists);
        try {
          localStorage.setItem('lc_product_lists', JSON.stringify(remoteLists));
        } catch (e) {
          console.warn(e);
        }
      }
    });

    const unsubOrders = subscribeToOrders((remoteOrders, changes, isInitial) => {
      if (remoteOrders && Array.isArray(remoteOrders)) {
        setOrders(remoteOrders);
        try {
          localStorage.setItem('lc_orders', JSON.stringify(remoteOrders));
        } catch (e) {
          console.warn(e);
        }

        // Real-time Order Notification Dispatch
        try {
          const isAdminDevice = !!localStorage.getItem('lc_admin_active_session');
          const notifiedIds = new Set<string>(
            JSON.parse(localStorage.getItem('lc_notified_orders_set') || '[]')
          );

          // Helper: verify if an order belongs to the currently logged in customer
          const isMyCustomerOrder = (o: Order) => {
            if (!user) return false;
            const phoneMatch = user.phone && o.customer?.phone && user.phone.trim() === o.customer.phone.trim();
            const emailMatch = user.email && o.customer?.contact && user.email.trim().toLowerCase() === o.customer.contact.trim().toLowerCase();
            const idMatch = o.userId && o.userId === user.id;
            return !!(phoneMatch || emailMatch || idMatch);
          };

          // 1. Initial snapshot check (STRICTLY FOR ADMIN DEVICES ONLY)
          if (isInitial && isAdminDevice) {
            remoteOrders.forEach((o) => {
              if (o && o.status === 'pending') {
                const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                const isRecent = Date.now() - orderTime < 30 * 60 * 1000;
                if (isRecent && !notifiedIds.has(o.id)) {
                  notifiedIds.add(o.id);
                  sendDeviceNotification('🛍️ طلب جديد وارد لمتجر LC!', {
                    body: `طلب جديد بقيمة ${formatPrice(o.totalUSD, o.currency)} من الزبون (${o.customer?.name || 'زبون جديد'}) في ${o.customer?.city || 'العراق'}.`,
                    type: 'order_new',
                    orderId: o.id
                  }).catch(() => {});
                }
              }
            });
          }

          // 2. Real-time changes from Firestore docChanges
          if (!isInitial && changes && changes.length > 0) {
            changes.forEach((ch) => {
              const o = ch.order;
              // A. New Order: ONLY sent to Admin Devices! NEVER to customers!
              if (ch.type === 'added' && o.status === 'pending') {
                if (isAdminDevice && !notifiedIds.has(o.id)) {
                  notifiedIds.add(o.id);
                  sendDeviceNotification('🛍️ طلب جديد وارد لمتجر LC!', {
                    body: `طلب جديد بقيمة ${formatPrice(o.totalUSD, o.currency)} من الزبون (${o.customer?.name || 'زبون جديد'}) في ${o.customer?.city || 'العراق'}.`,
                    type: 'order_new',
                    orderId: o.id
                  }).catch(() => {});
                }
              } else if (ch.type === 'modified') {
                // B. Order Status Updates: ONLY sent to the customer who placed this order!
                if (isMyCustomerOrder(o)) {
                  const refNum = o.orderNumber || o.id.slice(0, 8).toUpperCase();
                  if (o.status === 'approved') {
                    sendDeviceNotification('✨ تم قبول وتجهيز طلبك!', {
                      body: `طلبك رقم #${refNum} قيد التجهيز بعناية في متجر LC وسيتم تسليمه لشركة الشحن قريباً.`,
                      type: 'order_accepted',
                      orderId: o.id
                    }).catch(() => {});
                  } else if (o.status === 'delivered') {
                    sendDeviceNotification('🎉 تم تسليم طلبك بنجاح!', {
                      body: `شكراً لتسوقك من متجر LC، تم تسليم طلبك رقم #${refNum} بنجاح. نسعد بخدمتك دائماً.`,
                      type: 'order_delivered',
                      orderId: o.id
                    }).catch(() => {});
                  } else if (o.status === 'rejected') {
                    sendDeviceNotification('⚠️ تحديث بخصوص طلبك', {
                      body: `تم إلغاء الطلب رقم #${refNum}. يرجى مراجعة قائمة طلباتي لمزيد من التفاصيل.`,
                      type: 'order_cancelled',
                      orderId: o.id
                    }).catch(() => {});
                  }
                }
              }
            });
          }

          localStorage.setItem('lc_notified_orders_set', JSON.stringify(Array.from(notifiedIds).slice(-100)));
        } catch {
          // Ignore cache errors
        }
      }
    });


    const unsubCategories = subscribeToStoreCategories((remoteCats) => {
      if (remoteCats && remoteCats.length > 0) {
        setStoreCategories(remoteCats);
        try {
          localStorage.setItem('lc_master_categories', JSON.stringify(remoteCats));
        } catch (e) {
          console.warn(e);
        }
      }
    });

    const unsubPin = subscribeToAdminPin((cloudPin) => {
      if (cloudPin && cloudPin.trim()) {
        localStorage.setItem('lc_admin_pin', cloudPin.trim());
      }
    });

    // Auto-seed cloud PIN from localStorage if the cloud document doesn't exist yet
    const localPin = localStorage.getItem('lc_admin_pin');
    getAdminPinFromFirestore().then((cloudPin) => {
      if (!cloudPin && localPin && localPin.trim()) {
        saveAdminPinToFirestore(localPin.trim()).catch(console.warn);
      } else if (cloudPin) {
        localStorage.setItem('lc_admin_pin', cloudPin.trim());
      }
    });

    const handleQuotaExceededEvent = () => {
      console.warn('Quota exceeded event caught! Immediately unsubscribing all Firestore snapshot listeners to prevent SDK retries.');
      try {
        unsubProducts();
        unsubLists();
        unsubOrders();
        unsubCategories();
        unsubPin();
      } catch (e) {
        console.warn('Error unsubscribing on quota exceeded:', e);
      }
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceededEvent);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const activeAdmin = localStorage.getItem('lc_admin_active_session');
        if (activeAdmin && orders && orders.length > 0) {
          try {
            const notifiedIds = new Set<string>(
              JSON.parse(localStorage.getItem('lc_notified_orders_set') || '[]')
            );
            orders.forEach((o) => {
              if (o && o.status === 'pending') {
                const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                const isRecent = Date.now() - orderTime < 30 * 60 * 1000;
                if (isRecent && !notifiedIds.has(o.id)) {
                  notifiedIds.add(o.id);
                  sendDeviceNotification('🛍️ طلب جديد وارد لمتجر LC!', {
                    body: `طلب جديد بقيمة ${formatPrice(o.totalUSD, o.currency)} من الزبون (${o.customer?.name || 'زبون جديد'}) في ${o.customer?.city || 'العراق'}.`,
                    type: 'order_new',
                    orderId: o.id
                  }).catch(() => {});
                }
              }
            });
            localStorage.setItem('lc_notified_orders_set', JSON.stringify(Array.from(notifiedIds).slice(-100)));
          } catch {
            // ignore
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubProducts();
      unsubLists();
      unsubOrders();
      unsubCategories();
      unsubPin();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceededEvent);
    };
  }, []);

  // Sync to LocalStorage safely as fallback cache
  useEffect(() => {
    try {
      localStorage.setItem('lc_real_products', JSON.stringify(products));
    } catch (e) {
      console.warn('Could not persist products to localStorage:', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('lc_product_lists', JSON.stringify(productLists));
    } catch (e) {
      console.warn('Could not persist product lists to localStorage:', e);
    }
  }, [productLists]);

  useEffect(() => {
    try {
      localStorage.setItem('lc_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Could not persist cart to localStorage:', e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('lc_orders', JSON.stringify(orders));
    } catch (e) {
      console.warn('Could not persist orders to localStorage:', e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('lc_user_session', JSON.stringify(user));
      } else {
        localStorage.removeItem('lc_user_session');
      }
    } catch (e) {
      console.warn('Could not persist user session to localStorage:', e);
    }
  }, [user]);

  // Global handler for Firestore Quota Exceeded events
  useEffect(() => {
    const handleQuotaExceeded = () => {
      showToast('⚠️ المتجر يعمل بنظام النسخ الاحتياطي المحلي حالياً بسبب الضغط العالي على الخادم. مشترياتك وطلباتك محفوظة بأمان على جهازك!');
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  // Centralized robust body scroll lock to fix touch hang ("تعلك لمس الموقع") when modals are open
  useEffect(() => {
    const isAnyModalOpen = 
      !!selectedProduct || 
      isCartOpen || 
      isAuthOpen || 
      isMyOrdersOpen || 
      isCheckoutOpen || 
      isOrderSuccessOpen;
    
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100dvh';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
    };
  }, [selectedProduct, isCartOpen, isAuthOpen, isMyOrdersOpen, isCheckoutOpen, isOrderSuccessOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('lc_orders', JSON.stringify(orders));
    } catch (e) {
      console.warn('Could not persist orders to localStorage:', e);
    }
  }, [orders]);

  // Dynamic Categories filtered by the active List (Hierarchical 2-tier structure)
  const dynamicCategories = useMemo(() => {
    if (activeListId !== 'all') {
      const activeList = productLists.find((l) => l.id === activeListId);
      if (activeList) {
        const unique = new Map<string, string>();
        
        // Include categories assigned directly to this list
        (activeList.categories || []).forEach((c) => {
          if (c && c.trim()) {
            unique.set(c.trim(), c.trim());
          }
        });

        // Also include categories of products that belong to this list
        const listCats = (activeList.categories || []).map((c) => c.trim().toLowerCase());
        const listProducts = products.filter((p) => {
          const pLabel = (p.categoryLabel || '').trim().toLowerCase();
          const pCat = (p.category || '').trim().toLowerCase();
          return listCats.includes(pLabel) || listCats.includes(pCat) || activeList.productIds?.includes(p.id);
        });

        listProducts.forEach((p) => {
          if (p.categoryLabel && p.categoryLabel.trim()) {
            unique.set(p.categoryLabel.trim(), p.categoryLabel.trim());
          }
        });

        const list = [{ id: 'all', label: `كافة أقسام (${activeList.name})` }];
        unique.forEach((label, id) => {
          list.push({ id, label });
        });
        return list;
      }
    }

    // Default: all categories across the entire store
    const list = [{ id: 'all', label: 'كافة الأقسام' }];
    const unique = new Map<string, string>();
    products.forEach((p) => {
      if (p && p.categoryLabel && p.categoryLabel.trim()) {
        unique.set(p.categoryLabel.trim(), p.categoryLabel.trim());
      }
    });
    productLists.forEach((l) => {
      (l.categories || []).forEach((c) => {
        if (c && c.trim()) {
          unique.set(c.trim(), c.trim());
        }
      });
    });

    unique.forEach((label, id) => {
      list.push({ id, label });
    });
    return list;
  }, [products, activeListId, productLists]);

  // Cart operations
  const handleAddToCart = (product: Product, quantity = 1, selectedSize?: string) => {
    if (!product || !product.id) return;
    setCart((prev) => {
      const existing = prev.find(
        (item) => item?.product?.id === product.id && item?.selectedSize === selectedSize
      );
      if (existing) {
        return prev.map((item) =>
          item?.product?.id === product.id && item?.selectedSize === selectedSize
            ? { ...item, quantity: (item.quantity || 1) + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, selectedSize }];
    });
    const sizeNote = selectedSize ? ` (قياس: ${selectedSize})` : '';
    showToast(`تمت إضافة "${product.name || 'المنتج'}"${sizeNote} إلى السلة`);
  };

  const handleUpdateQuantity = (productId: string, quantity: number, selectedSize?: string) => {
    if (quantity <= 0) {
      handleRemoveItem(productId, selectedSize);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item?.product?.id === productId && item?.selectedSize === selectedSize
          ? { ...item, quantity }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: string, selectedSize?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item?.product?.id === productId && item?.selectedSize === selectedSize)
      )
    );
  };

  // Buy Now flow
  const handleBuyNow = (product: Product, quantity = 1, selectedSize?: string) => {
    if (!product || !product.id) return;
    setCart((prev) => {
      const existing = prev.find(
        (item) => item?.product?.id === product.id && item?.selectedSize === selectedSize
      );
      if (existing) return prev;
      return [...prev, { product, quantity, selectedSize }];
    });

    if (!user) {
      setAuthReason('لتأكيد عملية الشراء والتوصيل لموقعك، يرجى تسجيل الدخول برقم هاتفك أولاً');
      setPendingCheckoutAfterAuth(true);
      setIsAuthOpen(true);
    } else {
      setIsCheckoutOpen(true);
    }
  };

  // User auth
  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    showToast(`أهلاً بك يا ${loggedInUser.name}`);
    if (pendingCheckoutAfterAuth) {
      setPendingCheckoutAfterAuth(false);
      setIsCheckoutOpen(true);
    }
  };

  const handleLogout = () => {
    setUser(null);
    showToast('تم تسجيل الخروج');
  };

  const handleProceedToCheckoutFromCart = () => {
    setIsCartOpen(false);
    if (!user) {
      setAuthReason('يرجى تسجيل الدخول برقم هاتفك لتحديد موقع التوصيل واستلام الطلب كاش');
      setPendingCheckoutAfterAuth(true);
      setIsAuthOpen(true);
    } else {
      setIsCheckoutOpen(true);
    }
  };

  const handleOrderPlaced = async (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    setLatestOrder(newOrder);
    setIsCheckoutOpen(false); // Close checkout modal
    setIsCartOpen(false);     // Close cart drawer
    setSelectedProduct(null); // Close any active product modal
    setIsOrderSuccessOpen(true);
    showToast(`تم استلام طلبك بنجاح! رقم الطلب: ${newOrder.orderNumber}`);

    // If an admin or staff member is logged in on this device, immediately fire the admin notification!
    const activeAdmin = localStorage.getItem('lc_admin_active_session');
    if (activeAdmin) {
      try {
        const notifiedIds = new Set<string>(
          JSON.parse(localStorage.getItem('lc_notified_orders_set') || '[]')
        );
        if (!notifiedIds.has(newOrder.id)) {
          notifiedIds.add(newOrder.id);
          localStorage.setItem('lc_notified_orders_set', JSON.stringify(Array.from(notifiedIds).slice(-100)));
          const sizesDetail = newOrder.items
            .filter((it) => it.selectedSize)
            .map((it) => `${it.product.name} (قياس: ${it.selectedSize})`)
            .join('، ');
          const sizesSnippet = sizesDetail ? ` | القياسات: ${sizesDetail}` : '';

          sendDeviceNotification('🛍️ طلب جديد وارد لمتجر LC!', {
            body: `طلب جديد بقيمة ${formatPrice(newOrder.totalUSD, newOrder.currency)} من الزبون (${newOrder.customer?.name || 'زبون جديد'}) في ${newOrder.customer?.city || 'العراق'}${sizesSnippet}.`,
            type: 'order_new',
            orderId: newOrder.id
          }).catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    // Persist to Firebase Cloud Firestore
    try {
      await saveOrderToFirestore(newOrder);
    } catch (e) {
      console.warn('Firebase order sync error:', e);
    }
  };

  // Admin Portal Actions
  const handleAddProduct = async (newProduct: Product, targetListIds?: string[]) => {
    // 1. Instantly update products state and persist to localStorage
    setProducts((prev) => {
      const updated = [newProduct, ...prev.filter((p) => p && p.id !== newProduct.id)];
      try {
        localStorage.setItem('lc_real_products', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not persist products to localStorage:', e);
      }
      return updated;
    });

    // 2. Remove from deleted blacklist if it was ever there
    try {
      const savedDeleted = localStorage.getItem('lc_deleted_product_ids');
      if (savedDeleted) {
        const deletedList = JSON.parse(savedDeleted);
        if (Array.isArray(deletedList)) {
          localStorage.setItem(
            'lc_deleted_product_ids',
            JSON.stringify(deletedList.filter((id) => id !== newProduct.id))
          );
        }
      }
    } catch {}

    if (targetListIds && targetListIds.length > 0) {
      setProductLists((prev) => {
        const updatedLists = prev.map((list) => {
          if (targetListIds.includes(list.id)) {
            const listCats = list.categories || [];
            const hasCat = newProduct.categoryLabel && listCats.includes(newProduct.categoryLabel);
            const updatedCats = newProduct.categoryLabel && !hasCat ? [...listCats, newProduct.categoryLabel] : listCats;
            const updatedIds = !list.productIds.includes(newProduct.id)
              ? [...list.productIds, newProduct.id]
              : list.productIds;
            const updated = { ...list, categories: updatedCats, productIds: updatedIds };
            saveProductListToFirestore(updated).catch(console.warn);
            return updated;
          }
          return list;
        });
        try {
          localStorage.setItem('lc_product_lists', JSON.stringify(updatedLists));
        } catch {}
        return updatedLists;
      });
    }
    showToast(`تم نشر "${newProduct.name}" في المتجر بنجاح`);

    // 3. Sync to Firestore
    try {
      await saveProductToFirestore(newProduct);
    } catch (e) {
      console.warn('Firebase product save error:', e);
    }
  };

  const handleUpdateProduct = async (updated: Product, targetListIds?: string[]) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (targetListIds) {
      setProductLists((prev) =>
        prev.map((list) => {
          const shouldInclude = targetListIds.includes(list.id);
          const listCats = list.categories || [];
          const hasCat = updated.categoryLabel && listCats.includes(updated.categoryLabel);
          
          if (shouldInclude) {
            const updatedCats = updated.categoryLabel && !hasCat ? [...listCats, updated.categoryLabel] : listCats;
            const updatedIds = !list.productIds.includes(updated.id) ? [...list.productIds, updated.id] : list.productIds;
            const updatedList = { ...list, categories: updatedCats, productIds: updatedIds };
            saveProductListToFirestore(updatedList).catch(console.warn);
            return updatedList;
          } else {
            const isCurrentlyIncluded = list.productIds.includes(updated.id);
            if (isCurrentlyIncluded) {
              const updatedList = { ...list, productIds: list.productIds.filter((id) => id !== updated.id) };
              saveProductListToFirestore(updatedList).catch(console.warn);
              return updatedList;
            }
          }
          return list;
        })
      );
    }
    showToast(`تم حفظ تعديلات "${updated.name}"`);

    // Sync to Firestore
    try {
      await saveProductToFirestore(updated);
    } catch (e) {
      console.warn('Firebase product update error:', e);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    // Save to locally deleted product IDs list
    try {
      const saved = localStorage.getItem('lc_deleted_product_ids');
      const list = saved ? JSON.parse(saved) : [];
      if (!list.includes(productId)) {
        list.push(productId);
        localStorage.setItem('lc_deleted_product_ids', JSON.stringify(list));
      }
    } catch (e) {
      console.warn(e);
    }

    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCart((prev) => prev.filter((c) => c?.product?.id !== productId));
    setProductLists((prev) =>
      prev.map((list) => {
        if (list.productIds.includes(productId)) {
          const updated = {
            ...list,
            productIds: list.productIds.filter((id) => id !== productId)
          };
          saveProductListToFirestore(updated).catch(console.warn);
          return updated;
        }
        return list;
      })
    );
    showToast('تم حذف المنتج من المتجر');

    // Delete from Firestore
    try {
      await deleteProductFromFirestore(productId);
    } catch (e) {
      console.warn('Firebase product delete error:', e);
    }
  };

  const handleAddList = async (newList: ProductList) => {
    setProductLists((prev) => [...prev, newList]);
    showToast(`تم إنشاء قائمة "${newList.name}" بنجاح`);

    try {
      await saveProductListToFirestore(newList);
    } catch (e) {
      console.warn('Firebase list save error:', e);
    }
  };

  const handleUpdateList = async (updatedList: ProductList) => {
    setProductLists((prev) =>
      prev.map((l) => (l.id === updatedList.id ? updatedList : l))
    );
    showToast(`تم حفظ تعديلات قائمة "${updatedList.name}"`);

    try {
      await saveProductListToFirestore(updatedList);
    } catch (e) {
      console.warn('Firebase list update error:', e);
    }
  };

  const handleDeleteList = async (listId: string) => {
    // Save to locally deleted list IDs list
    try {
      const saved = localStorage.getItem('lc_deleted_list_ids');
      const list = saved ? JSON.parse(saved) : [];
      if (!list.includes(listId)) {
        list.push(listId);
        localStorage.setItem('lc_deleted_list_ids', JSON.stringify(list));
      }
    } catch (e) {
      console.warn(e);
    }

    setProductLists((prev) => prev.filter((l) => l.id !== listId));
    if (activeListId === listId) {
      setActiveListId('all');
    }
    showToast('تم حذف القائمة');

    try {
      await deleteProductListFromFirestore(listId);
    } catch (e) {
      console.warn('Firebase list delete error:', e);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: 'pending' | 'approved' | 'rejected' | 'delivered'
  ) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (newStatus === 'approved') showToast('تمت الموافقة على الطلب وجاهز للشحن والتوصيل');
    if (newStatus === 'rejected') showToast('تم رفض الطلب');
    if (newStatus === 'delivered') showToast('تم تأكيد تسليم الطلب واستلام المبلغ كاش');

    try {
      await updateOrderStatusInFirestore(orderId, newStatus);
    } catch (e) {
      console.warn('Firebase order status update error:', e);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    // Save to locally deleted order IDs list
    try {
      const saved = localStorage.getItem('lc_deleted_order_ids');
      const list = saved ? JSON.parse(saved) : [];
      if (!list.includes(orderId)) {
        list.push(orderId);
        localStorage.setItem('lc_deleted_order_ids', JSON.stringify(list));
      }
    } catch (e) {
      console.warn(e);
    }

    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    showToast('تم حذف سجل الطلب');

    try {
      await deleteOrderFromFirestore(orderId);
    } catch (e) {
      console.warn('Firebase order delete error:', e);
    }
  };

  // Filtered products for customer storefront
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (!p) return false;

        // Custom List Filter (Hierarchical: by categories in list OR direct productIds)
        if (activeListId !== 'all') {
          const currentList = productLists.find((l) => l.id === activeListId);
          if (currentList) {
            const listCats = (currentList.categories || []).map((c) => c.trim().toLowerCase());
            const pLabel = (p.categoryLabel || '').trim().toLowerCase();
            const pCat = (p.category || '').trim().toLowerCase();
            const matchesCat = listCats.includes(pLabel) || listCats.includes(pCat);
            const matchesId = currentList.productIds?.includes(p.id);
            if (!matchesCat && !matchesId) {
              return false;
            }
          }
        }

        // Category filter
        if (activeCategory !== 'all') {
          const catLower = activeCategory.trim().toLowerCase();
          const pLabel = (p.categoryLabel || '').trim().toLowerCase();
          const pCat = (p.category || '').trim().toLowerCase();
          if (pCat !== catLower && pLabel !== catLower && pCat.replace(/\s+/g, '-') !== catLower) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (p.name || '').toLowerCase().includes(q);
          const matchDesc = ((p.shortDesc || '') + ' ' + (p.description || '')).toLowerCase().includes(q);
          return matchName || matchDesc;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = a?.priceUSD || 0;
        const priceB = b?.priceUSD || 0;
        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        return 0;
      });
  }, [products, activeListId, productLists, activeCategory, searchQuery, sortBy]);

  const totalCartCount = cart.reduce((sum, item) => sum + (item?.quantity || 0), 0);

  // Dedicated Full-Screen Blocking Gateway if Internet is Disconnected
  if (!isOnline) {
    return <FullOfflineScreen onRetry={() => window.location.reload()} />;
  }

  // If in dedicated Admin Portal view
  if (currentView === 'admin') {
    return (
      <AdminPortal
        products={products}
        orders={orders}
        productLists={productLists}
        allCategories={allMasterCategories}
        currency={currency}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onAddList={handleAddList}
        onUpdateList={handleUpdateList}
        onDeleteList={handleDeleteList}
        onAddCategories={handleAddStoreCategories}
        onDeleteCategory={handleDeleteStoreCategory}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onDeleteOrder={handleDeleteOrder}
        onExitAdmin={() => {
          try {
            sessionStorage.setItem('lc_has_played_intro', 'true');
            sessionStorage.setItem('lc_splash_shown', 'true');
          } catch {
            // ignore
          }
          setHasPlayedIntro(true);
          window.location.hash = '';
          setCurrentView('store');
        }}
      />
    );
  }

  // Live Customer Storefront view
  return (
    <div key="storefront-view" className="relative min-h-[100dvh] bg-[#080809] text-[#EDEDED] flex flex-col font-sans selection:bg-[#D4AF37]/30 selection:text-[#F3E5AB] overflow-x-hidden animate-mac-page">
      
      {/* High-End Brand Luxury Splash Screen Animation */}
      {!hasPlayedIntro && <SplashScreen onFinish={handleSplashFinish} />}

      {/* Interactive Ambient Gold Lighting System */}
      <AmbientGoldAura />
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-[#14141A] border border-[#D4AF37]/80 text-[#F3E5AB] text-xs font-semibold shadow-[0_15px_40px_rgba(0,0,0,0.9)] flex items-center gap-3 animate-ios-toast">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Customer Navigation Bar */}
      <Navbar
        user={user}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => {
          setAuthReason(undefined);
          setPendingCheckoutAfterAuth(false);
          setIsAuthOpen(true);
        }}
        onOpenMyOrders={() => setIsMyOrdersOpen(true)}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onLogout={handleLogout}
        onToast={showToast}
      />

      {/* Brand Hero Showcase */}
      <Hero 
        onExploreClick={() => {
          const el = document.getElementById('catalog');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        hasProducts={products.length > 0}
      />

      {/* Featured Products Interactive Marquee Strip */}
      {products.length > 0 && (
        <FeaturedMarqueeStrip
          products={products}
          onSelectProduct={(product) => setSelectedProduct(product)}
        />
      )}

      {/* Main Catalog Section */}
      <main id="catalog" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-7">
        
        {/* Admin-Created Custom Lists & Collections (Visible when lists exist) */}
        {productLists.length > 0 && products.length > 0 && (
          <div className="space-y-3 bg-[#111116] p-4 rounded-2xl border border-neutral-800/90 text-right">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#D4AF37] flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>قوائم ومجموعات المنتجات:</span>
              </span>
              {activeListId !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveListId('all');
                    setActiveCategory('all');
                  }}
                  className="text-[11px] text-[#F3E5AB] hover:underline cursor-pointer"
                >
                  إلغاء الفلترة وعرض كافة المعروضات
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => {
                  setActiveListId('all');
                  setActiveCategory('all');
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeListId === 'all'
                    ? 'bg-[#D4AF37] text-black shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                    : 'bg-[#181822] text-neutral-300 hover:text-white border border-neutral-800'
                }`}
              >
                <span>كافة المعروضات</span>
                <span className="mr-1.5 text-[10px] opacity-80">({products.length})</span>
              </button>

              {productLists.map((list) => {
                const listCats = (list.categories || []).map((c) => c.trim().toLowerCase());
                const count = products.filter((p) => {
                  const pLabel = (p.categoryLabel || '').trim().toLowerCase();
                  const pCat = (p.category || '').trim().toLowerCase();
                  return listCats.includes(pLabel) || listCats.includes(pCat) || list.productIds?.includes(p.id);
                }).length;
                const isSelected = activeListId === list.id;
                return (
                  <button
                    type="button"
                    key={list.id}
                    onClick={() => {
                      setActiveListId(list.id);
                      setActiveCategory('all');
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#2A261A] text-[#F3E5AB] border border-[#D4AF37] shadow-sm'
                        : 'bg-[#181822] text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <span>{list.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-[#D4AF37] text-black font-bold' : 'bg-black/60 text-neutral-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active List description card */}
            {activeListId !== 'all' && (() => {
              const activeList = productLists.find((l) => l.id === activeListId);
              if (!activeList) return null;
              return (
                <div className="p-3 rounded-xl bg-gradient-to-r from-[#1E1B12] via-[#161510] to-[#121218] border border-[#D4AF37]/35 flex items-center justify-between text-xs">
                  <div>
                    <h3 className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>قائمة: {activeList.name}</span>
                    </h3>
                    {activeList.description && (
                      <p className="text-neutral-400 text-xs mt-0.5">{activeList.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveListId('all');
                      setActiveCategory('all');
                    }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-black/40 cursor-pointer"
                    title="الرجوع لكافة المعروضات"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Dynamic Category Filter Controls & Search (Visible if products exist) */}
        {products.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Category Filter Tabs */}
              {dynamicCategories.length > 1 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-bold px-1">
                    <Tag className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>
                      {activeListId !== 'all' ? 'الأقسام التابعة لهذه القائمة:' : 'تصفح حسب القسم:'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 bg-[#121217] rounded-xl border border-neutral-800/80 overflow-x-auto scrollbar-thin">
                    {dynamicCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                          activeCategory === cat.id
                            ? 'bg-[#22222B] text-[#F3E5AB] border border-[#D4AF37]/50 shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search and Sort */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    placeholder="ابحث في معروضات المتجر..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-9 pl-4 py-2 text-xs bg-[#121217] border border-neutral-800 focus:border-[#D4AF37] rounded-lg text-white placeholder-neutral-500 outline-none transition-colors text-right"
                  />
                  <Search className="w-4 h-4 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-2.5 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 text-xs bg-[#121217] border border-neutral-800 focus:border-[#D4AF37] rounded-lg text-neutral-300 outline-none"
                >
                  <option value="featured">الترتيب الافتراضي</option>
                  <option value="price-asc">السعر: من الأقل للأعلى</option>
                  <option value="price-desc">السعر: من الأعلى للأقل</option>
                </select>
              </div>

            </div>
          </div>
        )}

        {/* Product Grid / Clean Store Waiting State */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 px-6 text-center space-y-4 bg-[#111116] rounded-2xl border border-neutral-800">
            <div className="w-16 h-16 rounded-full bg-[#181822] border border-[#D4AF37]/30 flex items-center justify-center mx-auto text-[#D4AF37]">
              <Package className="w-8 h-8" />
            </div>
            
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-white">
                {products.length === 0 ? 'المتجر قيد التجهيز والتحديث' : 'لا توجد منتجات مطابقة لهذا البحث'}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {products.length === 0
                  ? 'أهلاً بكم في متجر LC! يتم حالياً تجهيز وإدراج الدفعة الجديدة من المنتجات والبضائع المميزة. ترقبوا الإطلاق الرسمي قريباً.'
                  : 'يمكنك مسح البحث أو اختيار تصنيف آخر لعرض باقي المعروضات.'}
              </p>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-3 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16161F] border border-neutral-800">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>إطلاق دفعات جديدة قريباً</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16161F] border border-neutral-800">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>توصيل ودفع كاش عند الاستلام</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={currency}
                onQuickView={(p) => setSelectedProduct(p)}
                onAddToCart={(p) => handleAddToCart(p, 1)}
                onBuyNow={(p) => handleBuyNow(p, 1)}
              />
            ))}
          </div>
        )}

        {/* PWA App Installation Feature Banner */}
        <PWAInstallButton variant="banner" onToast={showToast} />

      </main>

      {/* Customer Footer */}
      <Footer 
        onOpenAdmin={() => {
          window.location.hash = '#admin';
          setCurrentView('admin');
        }} 
      />

      {/* Modals & Overlays */}
      <ProductDetailModal
        product={selectedProduct}
        currency={currency}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p, qty, size) => handleAddToCart(p, qty, size)}
        onBuyNow={(p, qty, size) => {
          setSelectedProduct(null);
          handleBuyNow(p, qty, size);
        }}
        onOpenZoom={(images, initialIndex, title) => {
          setLightboxState({
            isOpen: true,
            images,
            initialIndex,
            title
          });
        }}
      />

      <ImageLightboxModal
        isOpen={lightboxState.isOpen}
        images={lightboxState.images}
        initialIndex={lightboxState.initialIndex}
        title={lightboxState.title}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        reason={authReason}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        user={user}
        currency={currency}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={handleProceedToCheckoutFromCart}
        onOpenAuthForCheckout={() => {
          setIsCartOpen(false);
          setAuthReason('يرجى تسجيل الدخول برقم هاتفك لتأكيد الشحن والتوصيل لموقعك');
          setPendingCheckoutAfterAuth(true);
          setIsAuthOpen(true);
        }}
      />

      {user && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          items={cart}
          user={user}
          currency={currency}
          onOrderPlaced={handleOrderPlaced}
        />
      )}

      <OrderSuccessModal
        isOpen={isOrderSuccessOpen}
        order={latestOrder}
        onClose={() => {
          setIsOrderSuccessOpen(false);
          setLatestOrder(null);
          setCurrentView('store');  // Go to store/products view
          setIsCheckoutOpen(false); // Close checkout
          setIsCartOpen(false);     // Close cart drawer
          setSelectedProduct(null); // Close active product details
        }}
        onViewOrders={() => {
          setIsOrderSuccessOpen(false);
          setLatestOrder(null);
          setIsMyOrdersOpen(true);
        }}
      />

      <MyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => setIsMyOrdersOpen(false)}
        orders={orders}
        user={user}
        onUpdateUser={(updated) => {
          setUser(updated);
          try {
            localStorage.setItem('lc_user_session', JSON.stringify(updated));
          } catch (e) {
            console.warn(e);
          }
          showToast(`تم حفظ وتعديل بيانات حسابك بنجاح`);
        }}
      />

      {/* Notification Center Modal for Customer */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        isAdmin={false}
      />

    </div>
  );
}
