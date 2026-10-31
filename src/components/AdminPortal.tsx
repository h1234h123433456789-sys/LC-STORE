import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Package, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Phone, 
  MapPin, 
  Banknote, 
  ArrowRight, 
  Lock, 
  KeyRound, 
  Sparkles, 
  AlertCircle, 
  Printer, 
  Check, 
  Sliders, 
  Eye, 
  EyeOff,
  Upload,
  Image as ImageIcon,
  Loader2,
  X,
  FileText,
  Layers,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Ban,
  Search,
  ShieldAlert,
  RotateCcw,
  AlertTriangle,
  Mail,
  Tag,
  Settings,
  FolderPlus,
  Bell,
  BellRing,
  UserPlus,
  UserMinus,
  Key,
  Smartphone,
  MessageCircle,
  Truck
} from 'lucide-react';
import { Product, Order, ProductList, AdminStaffMember, FreeShippingConfig, ProductVariantOption, getProductVariants } from '../types';
import { formatPrice, formatDateTime, toIQD } from '../utils/formatters';
import { compressImageFile } from '../utils/imageCompressor';
import { ProductListsManager } from './ProductListsManager';
import { NotificationCenterModal } from './NotificationCenterModal';
import { 
  subscribeToUsers, 
  setUserBlockedStatus, 
  deleteUserAccountFromFirestore,
  UserAccountData,
  subscribeToAdminPin,
  saveAdminPinToFirestore,
  getAdminPinFromFirestore,
  subscribeToAdminStaff,
  saveAdminStaffToFirestore,
  getAdminStaffFromFirestore
} from '../lib/firebase';
import { requestNotificationPermission, sendDeviceNotification, registerAdminDeviceForBackgroundPush } from '../lib/notifications';
import { checkAdminLockout, recordFailedAdminPinAttempt, resetAdminLockout, LockoutStatus } from '../utils/security';

interface AdminPortalProps {
  products: Product[];
  orders: Order[];
  productLists: ProductList[];
  allCategories?: string[];
  currency?: 'USD' | 'IQD';
  onAddProduct: (product: Product, targetListIds?: string[]) => void;
  onUpdateProduct: (product: Product, targetListIds?: string[]) => void;
  onDeleteProduct: (productId: string) => void;
  onAddList: (list: ProductList) => void;
  onUpdateList: (list: ProductList) => void;
  onDeleteList: (listId: string) => void;
  onAddCategories?: (cats: string[]) => void;
  onDeleteCategory?: (cat: string) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: 'pending' | 'approved' | 'rejected' | 'delivered') => void;
  onDeleteOrder: (orderId: string) => void;
  freeShippingConfig?: FreeShippingConfig;
  onUpdateFreeShippingConfig?: (config: FreeShippingConfig) => void;
  onExitAdmin: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  products,
  orders,
  productLists,
  allCategories = [],
  currency = 'IQD',
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddList,
  onUpdateList,
  onDeleteList,
  onAddCategories,
  onDeleteCategory,
  onUpdateOrderStatus,
  onDeleteOrder,
  freeShippingConfig = { enabled: true, minItemsCount: 2 },
  onUpdateFreeShippingConfig,
  onExitAdmin
}) => {
  // Multi-Staff and Admin Authentication State
  const [adminPin, setAdminPin] = useState(() => {
    return localStorage.getItem('lc_admin_pin') || '1234';
  });

  const [staffMembers, setStaffMembers] = useState<AdminStaffMember[]>(() => {
    try {
      const saved = localStorage.getItem('lc_admin_staff');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    const savedPin = localStorage.getItem('lc_admin_pin') || '1234';
    return [
      {
        id: 'admin-master',
        name: 'المدير العام',
        pin: savedPin,
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [currentStaffSession, setCurrentStaffSession] = useState<{ id: string; name: string; role?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('lc_admin_active_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.name === 'string') return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check persistent active session first
    const savedSession = localStorage.getItem('lc_admin_active_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.name) {
          return true;
        }
      } catch {
        // ignore
      }
    }
    return sessionStorage.getItem('lc_admin_auth') === 'true';
  });

  // Login form state (Name + PIN)
  const [adminNameInput, setAdminNameInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Staff Management Modals State
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffConfirmPin, setNewStaffConfirmPin] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'manager'>('manager');
  const [staffToDelete, setStaffToDelete] = useState<AdminStaffMember | null>(null);
  const [isStaffActionLoading, setIsStaffActionLoading] = useState(false);

  // Self PIN change modal state (Requires Old PIN -> New PIN)
  const [isSelfChangePinOpen, setIsSelfChangePinOpen] = useState(false);
  const [selfOldPin, setSelfOldPin] = useState('');
  const [selfNewPin, setSelfNewPin] = useState('');
  const [selfConfirmPin, setSelfConfirmPin] = useState('');
  const [selfPinError, setSelfPinError] = useState<string | null>(null);
  const [showSelfPins, setShowSelfPins] = useState(false);

  // Admin Direct PIN Reset modal state (For Main Admin to reset other staff members' PINs)
  const [adminResetMember, setAdminResetMember] = useState<AdminStaffMember | null>(null);
  const [adminNewPinInput, setAdminNewPinInput] = useState('');
  const [adminConfirmPinInput, setAdminConfirmPinInput] = useState('');
  const [adminResetPinError, setAdminResetPinError] = useState<string | null>(null);

  // Active View Tab (orders | delivered | products | add | lists | accounts | staff)
  const [activeTab, setActiveTab] = useState<'orders' | 'delivered' | 'products' | 'add' | 'lists' | 'accounts' | 'staff'>('orders');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'delivered'>('all');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [deliveredSearchTerm, setDeliveredSearchTerm] = useState('');
  const [deliveredSortOrder, setDeliveredSortOrder] = useState<'newest' | 'oldest' | 'highest-price'>('newest');

  // Registered Customer Accounts State
  const [registeredUsers, setRegisteredUsers] = useState<UserAccountData[]>(() => {
    try {
      const saved = localStorage.getItem('lc_registered_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return [];
  });
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterTab, setUserFilterTab] = useState<'all' | 'active' | 'blocked'>('all');
  const [blockingUser, setBlockingUser] = useState<UserAccountData | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [isBlockingAction, setIsBlockingAction] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserAccountData | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Sync registered users to localStorage as fallback
  useEffect(() => {
    try {
      localStorage.setItem('lc_registered_users', JSON.stringify(registeredUsers));
    } catch (e) {
      console.warn('Could not persist registered users to localStorage:', e);
    }
  }, [registeredUsers]);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleManualRefresh = () => {
    setIsManualRefreshing(true);
    setTimeout(() => {
      setIsManualRefreshing(false);
      showToast('تم تحديث البيانات وجلب أحدث الطلبات بنجاح 🔄');
    }, 600);
  };

  // Real-time subscribe to registered users & Admin PIN across all devices
  useEffect(() => {
    const unsubUsers = subscribeToUsers((users) => {
      setRegisteredUsers(users);
    });

    const unsubPin = subscribeToAdminPin((cloudPin) => {
      if (cloudPin && cloudPin.trim()) {
        setAdminPin(cloudPin.trim());
        localStorage.setItem('lc_admin_pin', cloudPin.trim());
      }
    });

    const unsubStaff = subscribeToAdminStaff((remoteStaff) => {
      if (Array.isArray(remoteStaff) && remoteStaff.length > 0) {
        setStaffMembers(remoteStaff);
        localStorage.setItem('lc_admin_staff', JSON.stringify(remoteStaff));

        // If currently logged in, check if our account was deleted
        const savedSession = localStorage.getItem('lc_admin_active_session');
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            const exists = remoteStaff.some(
              (s) => s.id === parsed.id || s.name.trim().toLowerCase() === parsed.name.trim().toLowerCase()
            );
            if (!exists) {
              // Deleted by another manager! Invalidate session immediately!
              localStorage.removeItem('lc_admin_active_session');
              sessionStorage.removeItem('lc_admin_auth');
              setIsAuthenticated(false);
              setCurrentStaffSession(null);
            }
          } catch {
            // ignore
          }
        }
      }
    });

    const handleQuotaExceededEvent = () => {
      console.warn('Admin Quota exceeded event caught! Immediately unsubscribing all Firestore snapshot listeners in AdminPortal.');
      try {
        unsubUsers();
        unsubPin();
        unsubStaff();
      } catch (e) {
        console.warn('Error unsubscribing AdminPortal on quota exceeded:', e);
      }
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceededEvent);

    return () => {
      unsubUsers();
      unsubPin();
      unsubStaff();
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceededEvent);
    };
  }, []);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editImageUrlInput, setEditImageUrlInput] = useState('');
  const [isEditCompressing, setIsEditCompressing] = useState(false);

  // New Product Form State (Price in Iraqi Dinars IQD)
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPriceIQD, setNewPriceIQD] = useState<number>(25000);
  const [newDesc, setNewDesc] = useState('');
  const [newIsFeaturedInStrip, setNewIsFeaturedInStrip] = useState(false);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [selectedListIdsForNewProd, setSelectedListIdsForNewProd] = useState<string[]>([]);
  const [quickListNameInput, setQuickListNameInput] = useState('');
  const [isAddingQuickList, setIsAddingQuickList] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Product Inventory / Stock Count State
  const [newStockCount, setNewStockCount] = useState<number>(10);

  // Custom Product Options / Variants State (e.g., Colors, Models, Types with per-option stock & image)
  const [newCustomOptionLabel, setNewCustomOptionLabel] = useState<string>('اللون / النوع المطلوب');
  const [newVariantOptions, setNewVariantOptions] = useState<ProductVariantOption[]>([]);
  const [newOptionInput, setNewOptionInput] = useState<string>('');
  const [newOptionStockInput, setNewOptionStockInput] = useState<number>(10);
  const [editOptionInput, setEditOptionInput] = useState<string>('');
  const [editOptionStockInput, setEditOptionStockInput] = useState<number>(10);

  const handleAddNewOptionItems = (rawInput: string) => {
    const parts = rawInput
      .split(/[,،\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const defaultStock = Math.max(0, Math.floor(Number(newOptionStockInput) || 0));
    setNewVariantOptions((prev) => {
      const next = [...prev];
      parts.forEach((p) => {
        if (!next.some((item) => item.name === p)) {
          next.push({
            name: p,
            stockCount: defaultStock,
            image: newImages[0] || undefined
          });
        }
      });
      return next;
    });
    setNewOptionInput('');
  };

  const handleUploadNewVariantImage = async (optName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImageFile(file);
      setNewImages((prev) => (prev.includes(compressed) ? prev : [...prev, compressed]));
      setNewVariantOptions((prev) =>
        prev.map((v) => (v.name === optName ? { ...v, image: compressed } : v))
      );
    } catch {
      setImageError('تعذر معالجة صورة الخيار، يرجى المحاولة بصورة أخرى.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleAddEditOptionItems = (rawInput: string) => {
    if (!editingProduct) return;
    const parts = rawInput
      .split(/[,،\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const defaultStock = Math.max(0, Math.floor(Number(editOptionStockInput) || 0));
    const currentVariants = getProductVariants(editingProduct);
    const nextVariants = [...currentVariants];
    const currentImages =
      editingProduct.images && editingProduct.images.length > 0
        ? editingProduct.images
        : [editingProduct.image].filter(Boolean);

    parts.forEach((p) => {
      if (!nextVariants.some((v) => v.name === p)) {
        nextVariants.push({
          name: p,
          stockCount: defaultStock,
          image: currentImages[0] || undefined
        });
      }
    });
    const totalVariantStock = nextVariants.reduce((sum, v) => sum + Math.max(0, v.stockCount), 0);
    setEditingProduct({
      ...editingProduct,
      variantOptions: nextVariants,
      customOptions: nextVariants.map((v) => v.name),
      customOptionLabel: editingProduct.customOptionLabel?.trim() || 'اللون / النوع المطلوب',
      stockCount: totalVariantStock,
      inStock: totalVariantStock > 0
    });
    setEditOptionInput('');
  };

  const handleUploadEditVariantImage = async (optName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingProduct) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setIsEditCompressing(true);
    try {
      const compressed = await compressImageFile(file);
      const existingImgs =
        editingProduct.images && editingProduct.images.length > 0
          ? editingProduct.images
          : [editingProduct.image].filter(Boolean);
      const updatedImgs = existingImgs.includes(compressed) ? existingImgs : [...existingImgs, compressed];
      const currentVariants = getProductVariants(editingProduct).map((v) =>
        v.name === optName ? { ...v, image: compressed } : v
      );
      setEditingProduct({
        ...editingProduct,
        image: updatedImgs[0] || editingProduct.image,
        images: updatedImgs,
        variantOptions: currentVariants,
        customOptions: currentVariants.map((v) => v.name)
      });
    } catch {
      alert('تعذر رفع صورة الخيار');
    } finally {
      setIsEditCompressing(false);
      e.target.value = '';
    }
  };

  const handleCreateQuickList = () => {
    const trimmed = quickListNameInput.trim();
    if (!trimmed) return;
    const newList: ProductList = {
      id: `list-${Date.now()}`,
      name: trimmed,
      productIds: [],
      createdAt: new Date().toISOString()
    };
    onAddList(newList);
    setSelectedListIdsForNewProd((prev) => [...prev, newList.id]);
    setQuickListNameInput('');
    setIsAddingQuickList(false);
    showToast(`تم إنشاء قائمة "${newList.name}" وتحديدها للمنتج بنجاح`);
  };

  // Waybill / Invoice Print Modal State
  const [waybillOrder, setWaybillOrder] = useState<Order | null>(null);

  // Order Rejection Confirmation Modal State
  const [orderToReject, setOrderToReject] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('الزبون لم يستلم الطلب عند وصول المندوب');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [isRejectingOrder, setIsRejectingOrder] = useState(false);

  // PIN Change State & Visual Toggles
  const [newPinCode, setNewPinCode] = useState('');
  const [confirmPinCode, setConfirmPinCode] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [pinErrorMsg, setPinErrorMsg] = useState<string | null>(null);
  const [testPinInput, setTestPinInput] = useState('');
  const [testPinResult, setTestPinResult] = useState<'success' | 'fail' | null>(null);

  // Handle Login with Brute-Force Shield
  const [lockoutStatus, setLockoutStatus] = useState<LockoutStatus>(() => checkAdminLockout());

  useEffect(() => {
    const timer = setInterval(() => {
      setLockoutStatus(checkAdminLockout());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    const enteredName = adminNameInput.trim();
    const enteredPin = pinInput.trim();

    if (!enteredName) {
      setPinError('يرجى إدخال اسمك المسجل كمدير أو موظف');
      return;
    }
    if (!enteredPin) {
      setPinError('يرجى إدخال الرمز السري للدخول');
      return;
    }

    setIsLoggingIn(true);

    // 1. Fetch latest staff from Firestore if available
    let latestStaff = staffMembers;
    try {
      const cloudStaff = await getAdminStaffFromFirestore();
      if (Array.isArray(cloudStaff) && cloudStaff.length > 0) {
        latestStaff = cloudStaff;
        setStaffMembers(cloudStaff);
        localStorage.setItem('lc_admin_staff', JSON.stringify(cloudStaff));
      }
    } catch (err) {
      console.warn('Failed checking cloud staff:', err);
    }

    // Also get master PIN for fallback
    let cloudPin: string | null = null;
    try {
      cloudPin = await getAdminPinFromFirestore();
    } catch (err) {
      // ignore
    }
    const currentValidPin = cloudPin || adminPin || '1234';

    // 2. Find matching staff member by Name + PIN
    let matchedMember = latestStaff.find(
      (m) =>
        m.name.trim().toLowerCase() === enteredName.toLowerCase() &&
        m.pin.trim() === enteredPin
    );

    // Fallback: If logging in with master general manager credentials or first time
    if (!matchedMember) {
      const isMasterName =
        enteredName === 'المدير' ||
        enteredName === 'المدير العام' ||
        enteredName.toLowerCase() === 'admin';
      const isMasterPin = enteredPin === currentValidPin || enteredPin === '1234';

      if (isMasterName && isMasterPin) {
        matchedMember = {
          id: 'admin-master',
          name: enteredName,
          pin: enteredPin,
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        // Add to staff list if empty
        if (!latestStaff.some((s) => s.id === 'admin-master')) {
          const updated = [...latestStaff, matchedMember];
          setStaffMembers(updated);
          localStorage.setItem('lc_admin_staff', JSON.stringify(updated));
          saveAdminStaffToFirestore(updated).catch(console.warn);
        }
      }
    }

    if (matchedMember) {
      resetAdminLockout();
      setLockoutStatus({ isLocked: false, remainingMinutes: 0, remainingSeconds: 0, attemptsLeft: 5 });

      // Save persistent session in localStorage so it never asks again on exit/reopen!
      const sessionData = {
        id: matchedMember.id,
        name: matchedMember.name,
        role: matchedMember.role || 'manager',
        loginTime: new Date().toISOString()
      };
      setCurrentStaffSession(sessionData);
      localStorage.setItem('lc_admin_active_session', JSON.stringify(sessionData));
      sessionStorage.setItem('lc_admin_auth', 'true');

      // Request device notification permission for this manager
      requestNotificationPermission().catch(console.warn);

      // Update last login in staff list
      const updatedStaff = latestStaff.map((m) =>
        m.id === matchedMember!.id ? { ...m, lastLoginAt: new Date().toISOString() } : m
      );
      setStaffMembers(updatedStaff);
      saveAdminStaffToFirestore(updatedStaff).catch(console.warn);

      setIsAuthenticated(true);
      setIsLoggingIn(false);
      showToast(`أهلاً بك يا ${matchedMember.name}! تم حفظ الجلسة بنجاح.`);
      return;
    }

    setIsLoggingIn(false);
    const lockRes = recordFailedAdminPinAttempt();
    setLockoutStatus(lockRes);
    setPinError('اسم الموظف أو الرمز السري غير مطابق! يرجى التأكد من كتابة الاسم والرمز بالمثل.');
  };

  const handleLogoutAdmin = () => {
    setIsAuthenticated(false);
    setCurrentStaffSession(null);
    localStorage.removeItem('lc_admin_active_session');
    sessionStorage.removeItem('lc_admin_auth');
    onExitAdmin();
  };

  // Add New Staff Member
  const handleAddNewStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      alert('يرجى إدخال اسم الموظف');
      return;
    }
    if (newStaffPin.length < 4) {
      alert('الرمز السري يجب أن يتكون من 4 أرقام أو حروف على الأقل');
      return;
    }
    if (newStaffPin !== newStaffConfirmPin) {
      alert('الرمز السري وتأكيده غير متطابقين');
      return;
    }

    const trimmedName = newStaffName.trim();
    if (staffMembers.some((s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      alert('يوجد موظف مسجل بهذا الاسم مسبقاً! يرجى اختيار اسم مختلف.');
      return;
    }

    setIsStaffActionLoading(true);
    const newMember: AdminStaffMember = {
      id: `staff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      pin: newStaffPin.trim(),
      role: newStaffRole,
      createdAt: new Date().toISOString()
    };

    const updated = [...staffMembers, newMember];
    setStaffMembers(updated);
    localStorage.setItem('lc_admin_staff', JSON.stringify(updated));

    try {
      await saveAdminStaffToFirestore(updated);
      showToast(`تمت إضافة الموظف (${trimmedName}) بنجاح! يمكنه الآن تسجيل الدخول باسمه ورمزه.`);
      setIsAddStaffModalOpen(false);
      setNewStaffName('');
      setNewStaffPin('');
      setNewStaffConfirmPin('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ بيانات الموظف سحابياً');
    } finally {
      setIsStaffActionLoading(false);
    }
  };

  // Helper: Is the current logged in account the Main Admin
  const isMainAdmin = Boolean(
    currentStaffSession &&
    (currentStaffSession.role === 'admin' ||
     currentStaffSession.id === 'admin-master' ||
     currentStaffSession.name.trim().toLowerCase() === 'المدير العام')
  );

  // Employee Self PIN Change (Requires Old PIN)
  const handleSelfChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfPinError(null);

    if (!currentStaffSession) {
      setSelfPinError('الجلسة الحالية غير متوفرة، يرجى إعادة الدخول');
      return;
    }

    // Find current member in staffMembers
    const currentMember = staffMembers.find(
      (s) => s.id === currentStaffSession.id || s.name.trim().toLowerCase() === currentStaffSession.name.trim().toLowerCase()
    );

    const actualOldPin = currentMember ? currentMember.pin : (adminPin || '1234');

    if (selfOldPin.trim() !== actualOldPin.trim()) {
      setSelfPinError('الرمز السري القديم الذي أدخلته غير صحيح!');
      return;
    }

    if (selfNewPin.trim().length < 4) {
      setSelfPinError('الرمز السري الجديد يجب أن يتكون من 4 أرقام على الأقل');
      return;
    }

    if (selfNewPin.trim() !== selfConfirmPin.trim()) {
      setSelfPinError('الرمز السري الجديد وتأكيده غير متطابقين!');
      return;
    }

    setIsStaffActionLoading(true);
    try {
      const updated = staffMembers.map((s) => {
        if (s.id === currentStaffSession.id || s.name.trim().toLowerCase() === currentStaffSession.name.trim().toLowerCase()) {
          return { ...s, pin: selfNewPin.trim() };
        }
        return s;
      });

      setStaffMembers(updated);
      localStorage.setItem('lc_admin_staff', JSON.stringify(updated));

      if (isMainAdmin) {
        setAdminPin(selfNewPin.trim());
        localStorage.setItem('lc_admin_pin', selfNewPin.trim());
        await saveAdminPinToFirestore(selfNewPin.trim());
      }

      await saveAdminStaffToFirestore(updated);
      showToast('تم تغيير وتحديث الرمز السري لحسابك بنجاح 🔑');
      setIsSelfChangePinOpen(false);
      setSelfOldPin('');
      setSelfNewPin('');
      setSelfConfirmPin('');
    } catch (err) {
      console.error(err);
      setSelfPinError('حدث خطأ أثناء حفظ الرمز سحابياً');
    } finally {
      setIsStaffActionLoading(false);
    }
  };

  // Main Admin Direct PIN Reset for other staff
  const handleAdminResetStaffPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminResetPinError(null);

    if (!isMainAdmin) {
      alert('هذه الصلاحية محصورة بالمدير العام فقط!');
      return;
    }

    if (!adminResetMember) return;

    if (adminNewPinInput.trim().length < 4) {
      setAdminResetPinError('الرمز السري الجديد يجب أن يتكون من 4 أرقام على الأقل');
      return;
    }

    if (adminNewPinInput.trim() !== adminConfirmPinInput.trim()) {
      setAdminResetPinError('الرمز السري الجديد وتأكيده غير متطابقين!');
      return;
    }

    setIsStaffActionLoading(true);
    try {
      const targetId = adminResetMember.id;
      const targetName = adminResetMember.name;

      const updated = staffMembers.map((s) => {
        if (s.id === targetId) {
          return { ...s, pin: adminNewPinInput.trim() };
        }
        return s;
      });

      setStaffMembers(updated);
      localStorage.setItem('lc_admin_staff', JSON.stringify(updated));

      if (targetId === 'admin-master' || targetName.trim().toLowerCase() === 'المدير العام') {
        setAdminPin(adminNewPinInput.trim());
        localStorage.setItem('lc_admin_pin', adminNewPinInput.trim());
        await saveAdminPinToFirestore(adminNewPinInput.trim());
      }

      await saveAdminStaffToFirestore(updated);
      showToast(`تم تغيير الرمز السري للموظف (${targetName}) بنجاح 🔑`);
      setAdminResetMember(null);
      setAdminNewPinInput('');
      setAdminConfirmPinInput('');
    } catch (err) {
      console.error(err);
      setAdminResetPinError('حدث خطأ أثناء تعديل الرمز سحابياً');
    } finally {
      setIsStaffActionLoading(false);
    }
  };

  // Delete Staff Member with Confirmation (Only Main Admin can delete)
  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    if (!isMainAdmin) {
      alert('صلاحية حذف حسابات الموظفين محصورة بالمدير العام فقط!');
      setStaffToDelete(null);
      return;
    }
    if (staffMembers.length <= 1) {
      alert('لا يمكن حذف الموظف الأخير في المتجر! يجب أن يبقى حساب إدارة واحد على الأقل.');
      setStaffToDelete(null);
      return;
    }

    setIsStaffActionLoading(true);
    const deletedId = staffToDelete.id;
    const deletedName = staffToDelete.name;

    const updated = staffMembers.filter((s) => s.id !== deletedId);
    setStaffMembers(updated);
    localStorage.setItem('lc_admin_staff', JSON.stringify(updated));

    try {
      await saveAdminStaffToFirestore(updated);
      showToast(`تم حذف حساب الموظف (${deletedName}) بنجاح.`);

      // If the deleted member was the currently active account, terminate session immediately!
      if (
        currentStaffSession &&
        (currentStaffSession.id === deletedId ||
          currentStaffSession.name.trim().toLowerCase() === deletedName.trim().toLowerCase())
      ) {
        localStorage.removeItem('lc_admin_active_session');
        sessionStorage.removeItem('lc_admin_auth');
        setIsAuthenticated(false);
        setCurrentStaffSession(null);
      }
      setStaffToDelete(null);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حذف الموظف سحابياً');
    } finally {
      setIsStaffActionLoading(false);
    }
  };

  // Multi-image upload with compression
  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsCompressing(true);
    setImageError(null);
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImageFile(files[i]);
        compressedList.push(compressed);
      }
      setNewImages((prev) => [...prev, ...compressedList]);
    } catch {
      setImageError('حدث خطأ أثناء معالجة الصور، يرجى المحاولة بصورة أصغر أو بصيغة JPG/PNG.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setNewImages((prev) => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSendOrderWhatsApp = (ord: Order) => {
    const phone = ord.customer?.phone || '';
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '964' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('964')) {
      cleanPhone = '964' + cleanPhone;
    }

    const itemsSummary = (ord.items || [])
      .map((it) => {
        const optText = it.selectedOption
          ? ` (${it.selectedOptionLabel || it.product?.customOptionLabel || 'الخانة'}: ${it.selectedOption})`
          : '';
        return `• ${it.product?.name || 'منتج'}${optText} × ${it.quantity} — ${formatPrice((it.product?.priceUSD || 0) * (it.quantity || 1), ord.currency)}`;
      })
      .join('\n');

    const subtotalNum = (ord.items || []).reduce((sum, it) => {
      const p = (it.product?.priceUSD || 0) * (it.quantity || 1);
      return sum + (p > 0 && p <= 500 ? Math.round(p * 1320) : Math.round(p));
    }, 0);

    const minAmount = freeShippingConfig?.minOrderAmountIQD || 50000;
    const qualifiesForFreeShipping =
      ord.isFreeShipping === true ||
      ord.shippingUSD === 0 ||
      (ord.isFreeShipping === undefined &&
        Boolean(freeShippingConfig?.enabled && subtotalNum >= minAmount));

    const deliveryFee = qualifiesForFreeShipping ? 0 : 5000;
    const grandTotal = subtotalNum + deliveryFee;
    const deliveryLine = qualifiesForFreeShipping
      ? `🚚 سعر التوصيل: مجاني 🎉 (عرض التوصيل المجاني)`
      : `🚚 سعر التوصيل: ${deliveryFee.toLocaleString('ar-IQ')} د.ع`;

    const message = `مرحباً بك يا ${ord.customer?.name || 'عزيزنا الزبون'} 👋\nشكرًا لتسوقك في متجر LC Store 🛍️✨\n\nهل تريد تأكيد طلبك رقم: #${ord.orderNumber}؟\n\n📍 عنوان التوصيل: ${ord.customer?.city || 'العراق'} - ${ord.customer?.address || ''}\n\nالمنتجات المطلوبة:\n${itemsSummary}\n\n────────────────\n🔹 سعر المنتجات: ${subtotalNum.toLocaleString('ar-IQ')} د.ع\n${deliveryLine}\n💰 المجموع الكلي (مع التوصيل): ${grandTotal.toLocaleString('ar-IQ')} د.ع\n────────────────\n\nالدفع كاش عند الاستلام.\nيرجى تأكيد الطلب للبدء بالتجهيز وإرساله إليك! شكراً لاختيارك LC ⚜️`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Add Product Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const categoryText = newCategory.trim() || 'معروضات عامة';
    const finalPriceIQD = Math.max(250, Number(newPriceIQD) || 25000);

    // Include any pending text typed in newOptionInput if admin didn't press '+'
    const pendingParts = newOptionInput
      .split(/[,،\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const defaultOptStock = Math.max(0, Math.floor(Number(newOptionStockInput) || 0));
    const mergedVariants: ProductVariantOption[] = [...newVariantOptions];
    pendingParts.forEach((part) => {
      if (!mergedVariants.some((v) => v.name === part)) {
        mergedVariants.push({
          name: part,
          stockCount: defaultOptStock,
          image: newImages[0] || undefined
        });
      }
    });

    // Ensure all variant images are included in the product gallery
    const galleryImages = [...newImages];
    mergedVariants.forEach((v) => {
      if (v.image && !galleryImages.includes(v.image)) {
        galleryImages.push(v.image);
      }
    });

    const primaryImage =
      galleryImages[0] ||
      mergedVariants.find((v) => v.image)?.image ||
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop';

    const effectiveStockCount =
      mergedVariants.length > 0
        ? mergedVariants.reduce((sum, v) => sum + Math.max(0, Math.floor(Number(v.stockCount) || 0)), 0)
        : Math.max(0, Math.floor(Number(newStockCount) || 0));

    const prod: Product = {
      id: `lc-prod-${Date.now()}`,
      name: newName.trim(),
      category: categoryText.toLowerCase().replace(/\s+/g, '-'),
      categoryLabel: categoryText,
      priceUSD: finalPriceIQD,
      priceIQD: finalPriceIQD,
      image: primaryImage,
      images: galleryImages.length > 0 ? galleryImages : [primaryImage],
      shortDesc: newDesc.trim() || newName.trim(),
      description: newDesc.trim() || 'منتج أصلي معروض في متجر LC متاح للتسليم الفوري مع الدفع كاش عند الاستلام.',
      specs: {
        material: 'خامات أصلية فاخرة',
        warranty: 'جديد أصلي 100% بتغليف المصنع'
      },
      variantOptions: mergedVariants.map((v) => ({
        name: v.name,
        stockCount: Math.max(0, Math.floor(Number(v.stockCount) || 0)),
        ...(v.image ? { image: v.image } : {})
      })),
      customOptions: mergedVariants.map((v) => v.name),
      customOptionLabel: mergedVariants.length > 0 ? (newCustomOptionLabel.trim() || 'اللون / النوع المطلوب') : '',
      inStock: effectiveStockCount > 0,
      stockCount: effectiveStockCount,
      rating: 5.0,
      reviewsCount: 1,
      isFeatured: true,
      isFeaturedInStrip: newIsFeaturedInStrip
    };

    onAddProduct(prod, selectedListIdsForNewProd);
    if (onAddCategories && categoryText && categoryText !== 'معروضات عامة') {
      onAddCategories([categoryText]);
    }
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 2000);

    // Reset Form
    setNewName('');
    setNewCategory('');
    setNewPriceIQD(25000);
    setNewStockCount(10);
    setNewCustomOptionLabel('اللون / النوع المطلوب');
    setNewVariantOptions([]);
    setNewOptionInput('');
    setNewOptionStockInput(10);
    setNewDesc('');
    setNewIsFeaturedInStrip(false);
    setNewImages([]);
    setImageUrlInput('');
    setSelectedListIdsForNewProd([]);
    setActiveTab('products');
  };

  // Save Edit Product
  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const baseImages = editingProduct.images && editingProduct.images.length > 0
      ? [...editingProduct.images]
      : [editingProduct.image].filter(Boolean);

    const pendingEditParts = editOptionInput
      .split(/[,،\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const defaultEditOptStock = Math.max(0, Math.floor(Number(editOptionStockInput) || 0));
    const currentVariants = [...getProductVariants(editingProduct)];
    pendingEditParts.forEach((part) => {
      if (!currentVariants.some((v) => v.name === part)) {
        currentVariants.push({
          name: part,
          stockCount: defaultEditOptStock,
          image: baseImages[0] || undefined
        });
      }
    });

    currentVariants.forEach((v) => {
      if (v.image && !baseImages.includes(v.image)) {
        baseImages.push(v.image);
      }
    });

    const effectiveEditStock =
      currentVariants.length > 0
        ? currentVariants.reduce((sum, v) => sum + Math.max(0, Math.floor(Number(v.stockCount) || 0)), 0)
        : Math.max(0, Math.floor(Number(editingProduct.stockCount !== undefined ? editingProduct.stockCount : 10)));

    const updatedProd: Product = {
      ...editingProduct,
      image: baseImages[0] || editingProduct.image,
      images: baseImages,
      variantOptions: currentVariants.map((v) => ({
        name: v.name,
        stockCount: Math.max(0, Math.floor(Number(v.stockCount) || 0)),
        ...(v.image ? { image: v.image } : {})
      })),
      customOptions: currentVariants.map((v) => v.name),
      customOptionLabel: currentVariants.length > 0
        ? (editingProduct.customOptionLabel?.trim() || 'اللون / النوع المطلوب')
        : '',
      stockCount: effectiveEditStock,
      inStock: effectiveEditStock > 0
    };
    delete updatedProd.sizes;

    onUpdateProduct(updatedProd);
    setEditOptionInput('');
    setEditingProduct(null);
  };

  // Edit Product: add files
  const handleEditFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingProduct) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsEditCompressing(true);
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImageFile(files[i]);
        compressedList.push(compressed);
      }
      const existing = editingProduct.images && editingProduct.images.length > 0 
        ? editingProduct.images 
        : [editingProduct.image];
      const combined = [...existing, ...compressedList];
      setEditingProduct({
        ...editingProduct,
        image: combined[0] || editingProduct.image,
        images: combined
      });
    } catch {
      alert('حدث خطأ أثناء معالجة الصور');
    } finally {
      setIsEditCompressing(false);
      e.target.value = '';
    }
  };

  const handleAddEditImageUrl = () => {
    if (!editingProduct || !editImageUrlInput.trim()) return;
    const existing = editingProduct.images && editingProduct.images.length > 0 
      ? editingProduct.images 
      : [editingProduct.image];
    const combined = [...existing, editImageUrlInput.trim()];
    setEditingProduct({
      ...editingProduct,
      image: combined[0] || editingProduct.image,
      images: combined
    });
    setEditImageUrlInput('');
  };

  const handleRemoveEditImage = (indexToRemove: number) => {
    if (!editingProduct) return;
    const existing = editingProduct.images && editingProduct.images.length > 0 
      ? editingProduct.images 
      : [editingProduct.image];
    const filtered = existing.filter((_, i) => i !== indexToRemove);
    const fallbackImage = filtered[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop';
    setEditingProduct({
      ...editingProduct,
      image: fallbackImage,
      images: filtered
    });
  };

  // Change PIN with confirmation and cloud sync
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinErrorMsg(null);
    if (newPinCode.length < 4) {
      setPinErrorMsg('يجب أن يتكون رمز المرور من 4 أرقام أو حروف على الأقل');
      return;
    }
    if (newPinCode !== confirmPinCode) {
      setPinErrorMsg('رمز المرور الجديد وتأكيده غير متطابقين! يرجى التأكد من كتابتهما بالمثل.');
      return;
    }

    const updatedPin = newPinCode.trim();
    setAdminPin(updatedPin);
    localStorage.setItem('lc_admin_pin', updatedPin);

    setIsSavingPin(true);
    try {
      await saveAdminPinToFirestore(updatedPin);
      showToast('تم حفظ رمز المرور الجديد ومزامنته سحابياً على جميع أجهزتك بنجاح!');
    } catch (err) {
      console.error('Failed to sync PIN to Firestore:', err);
    } finally {
      setIsSavingPin(false);
    }

    setPinChangeSuccess(true);
    setNewPinCode('');
    setConfirmPinCode('');
    setTimeout(() => setPinChangeSuccess(false), 3500);
  };

  const handleTestPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (testPinInput === adminPin) {
      setTestPinResult('success');
    } else {
      setTestPinResult('fail');
    }
  };

  // Metrics
  const pendingOrders = (orders || []).filter((o) => o && o.status === 'pending');
  const approvedOrders = (orders || []).filter((o) => o && o.status === 'approved');
  const deliveredOrders = (orders || []).filter((o) => o && o.status === 'delivered');
  const rejectedOrders = (orders || []).filter((o) => o && o.status === 'rejected');
  const pendingCashUSD = (orders || [])
    .filter((o) => o && (o.status === 'pending' || o.status === 'approved'))
    .reduce((sum, o) => sum + (o?.totalUSD || 0), 0);

  // Delivered Orders & Profit Metrics
  const deliveredOrdersList = (orders || []).filter((o) => o && o.status === 'delivered');
  const totalDeliveredProfitIQD = deliveredOrdersList.reduce((sum, o) => sum + (o?.totalUSD || 0), 0);
  const totalDeliveredItemsCount = deliveredOrdersList.reduce(
    (sum, o) => sum + (o.items?.reduce((s, it) => s + (it?.quantity || 1), 0) || 0),
    0
  );
  const avgDeliveredOrderIQD = deliveredOrdersList.length > 0 
    ? Math.round(totalDeliveredProfitIQD / deliveredOrdersList.length) 
    : 0;

  // Filtered delivered orders
  const filteredDeliveredOrders = deliveredOrdersList
    .filter((o) => {
      if (!deliveredSearchTerm.trim()) return true;
      const q = deliveredSearchTerm.trim().toLowerCase();
      const matchNum = o.orderNumber?.toLowerCase().includes(q);
      const matchName = o.customer?.name?.toLowerCase().includes(q);
      const matchPhone = o.customer?.phone?.includes(q);
      const matchCity = o.customer?.city?.toLowerCase().includes(q);
      const matchAddress = o.customer?.address?.toLowerCase().includes(q);
      const matchProduct = (o.items || []).some((it) => it?.product?.name?.toLowerCase().includes(q));
      return matchNum || matchName || matchPhone || matchCity || matchAddress || matchProduct;
    })
    .sort((a, b) => {
      if (deliveredSortOrder === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (deliveredSortOrder === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (deliveredSortOrder === 'highest-price') {
        return (b.totalUSD || 0) - (a.totalUSD || 0);
      }
      return 0;
    });

  // User Accounts Metrics
  const blockedUsersList = registeredUsers.filter((u) => u.isBlocked);
  const activeUsersList = registeredUsers.filter((u) => !u.isBlocked);

  // Filtered orders with search
  const filteredOrders = (orders || []).filter((o) => {
    if (!o) return false;
    if (orderFilter !== 'all' && o.status !== orderFilter) return false;
    
    if (orderSearchTerm.trim()) {
      const q = orderSearchTerm.trim().toLowerCase();
      const matchNum = o.orderNumber?.toLowerCase().includes(q);
      const matchName = o.customer?.name?.toLowerCase().includes(q);
      const matchPhone = o.customer?.phone?.includes(q);
      const matchCity = o.customer?.city?.toLowerCase().includes(q);
      const matchAddress = o.customer?.address?.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchPhone && !matchCity && !matchAddress) {
        return false;
      }
    }
    return true;
  });

  // Filtered customer accounts
  const filteredUsers = registeredUsers.filter((u) => {
    if (userFilterTab === 'active' && u.isBlocked) return false;
    if (userFilterTab === 'blocked' && !u.isBlocked) return false;

    if (userSearchTerm.trim()) {
      const q = userSearchTerm.trim().toLowerCase();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchPhone = u.phone?.includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  // Handle block/unblock actions
  const handleConfirmBlock = async () => {
    if (!blockingUser) return;
    setIsBlockingAction(true);
    try {
      await setUserBlockedStatus(
        blockingUser.id, 
        true, 
        blockReasonInput.trim() || 'تم الحظر بواسطة إدارة المتجر'
      );
      showToast(`تم حظر حساب (${blockingUser.name}) بنجاح.`);
      setBlockingUser(null);
      setBlockReasonInput('');
    } catch (e) {
      alert('حدث خطأ أثناء حظر الحساب');
    } finally {
      setIsBlockingAction(false);
    }
  };

  const handleUnblockUser = async (user: UserAccountData) => {
    try {
      await setUserBlockedStatus(user.id, false);
      showToast(`تم إلغاء حظر حساب (${user.name}) بنجاح.`);
    } catch (e) {
      alert('حدث خطأ أثناء فك الحظر');
    }
  };

  // If not logged in, render the login screen with Name + PIN & persistent session
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] text-[#1A1814] flex flex-col items-center justify-center p-4 selection:bg-[#D4AF37]/30 selection:text-[#1A1814]">
        <div className="w-full max-w-md bg-white border border-[#D4AF37]/45 rounded-3xl shadow-[0_20px_50px_rgba(212,175,55,0.18)] p-6 sm:p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF7EF] border-2 border-[#D4AF37] flex items-center justify-center mx-auto text-[#B38728] shadow-[0_0_30px_rgba(212,175,55,0.25)]">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF6EA] border border-[#D4AF37]/50 text-[#8B6914] text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>نظام إدارة متجر LC المعتمد</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">تسجيل دخول فريق الإدارة</h2>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
              أدخل اسمك المسجل كمدير أو موظف والرمز السري للوصول للوحة التحكم وإدارة المنتجات والطلبات.
            </p>
          </div>

          {lockoutStatus.isLocked ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-xs text-red-900 text-right space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>تم إغلاق لوحة التحكم أمنياً!</span>
              </div>
              <p className="text-[11px] text-red-800">
                تم رصد عدة محاولات خاطئة متتالية. لحماية المتجر وقاعدة البيانات، تم حظر الدخول مؤقتاً.
              </p>
              <div className="bg-white p-2 rounded-lg text-center font-mono font-bold text-[#7A5912] border border-red-200">
                الوقت المتبقي لفتح القفل: {lockoutStatus.remainingMinutes} دقيقة ({lockoutStatus.remainingSeconds} ثانية)
              </div>
            </div>
          ) : (
            pinError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-xs text-red-700 font-bold text-right animate-ios-slide-up">
                {pinError}
              </div>
            )
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-right">
            {/* Staff Name Input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                اسم المدير أو الموظف المسجل <span className="text-[#B38728]">*</span>
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  disabled={lockoutStatus.isLocked}
                  placeholder="مثال: المدير العام أو اسمك"
                  value={adminNameInput}
                  onChange={(e) => setAdminNameInput(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-3 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-neutral-900 text-xs outline-none transition-colors"
                />
              </div>
            </div>

            {/* PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs text-neutral-500">
                <span className="text-[10px] text-neutral-500 font-mono">
                  المحاولات المتبقية: <strong className="text-[#8B6914]">{lockoutStatus.attemptsLeft}</strong>
                </span>
                <label className="font-semibold text-neutral-700">
                  الرمز السري الخاص بك <span className="text-[#B38728]">*</span>
                </label>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showLoginPin ? 'text' : 'password'}
                  required
                  disabled={lockoutStatus.isLocked}
                  placeholder="••••••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full pr-10 pl-10 py-3 bg-[#FAF8F2] border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-neutral-900 text-xs outline-none font-mono transition-colors text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPin(!showLoginPin)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 p-1"
                >
                  {showLoginPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FAF6EA] border border-[#D4AF37]/30 text-[11px] text-neutral-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>يتم حفظ الجلسة على هذا الجهاز تلقائياً ولن يُطلب منك الرمز مجدداً إلا عند تسجيل الخروج.</span>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 text-xs font-bold text-black gold-gradient-bg rounded-xl hover:brightness-110 shadow-lg transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin text-black" />}
              <span>{isLoggingIn ? 'جاري التحقق وحفظ الجلسة...' : 'تسجيل الدخول وحفظ الجلسة'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-[#D4AF37]/20">
            <button
              onClick={onExitAdmin}
              className="text-xs text-neutral-600 hover:text-neutral-900 transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer font-semibold"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة لمتجر الزبائن المباشر</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1A1814] flex flex-col font-sans">
      
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-white/95 border-b border-[#D4AF37]/35 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-brand font-extrabold gold-gradient-text">LC</span>
            <div className="h-4 w-[1px] bg-[#D4AF37]/30 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-900">لوحة التحكم الكاملة</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FAF6EA] border border-[#D4AF37]/50 text-[#7A5912] font-bold flex items-center gap-1">
                <span>👤</span>
                <span>{currentStaffSession?.name || 'المدير العام'}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7EF] hover:bg-[#F3ECD8] border border-[#D4AF37]/45 hover:border-[#D4AF37] text-[#7A5912] rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="تحديث البيانات والطلبات"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-[#B38728] ${isManualRefreshing ? 'animate-spin' : ''}`} />
            <span>{isManualRefreshing ? 'جاري التحديث...' : 'تحديث الطلبات'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsNotificationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7A5912] bg-[#FAF7EF] border border-[#D4AF37]/45 hover:border-[#D4AF37] rounded-lg transition-all cursor-pointer active:scale-95"
            title="إعدادات وتنبيهات إشعارات الطلبات"
          >
            <Bell className="w-3.5 h-3.5 text-[#B38728]" />
            <span className="hidden sm:inline">إشعارات الطلبات</span>
          </button>

          <button
            type="button"
            onClick={onExitAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7A5912] bg-[#FAF7EF] border border-[#D4AF37]/45 hover:border-[#D4AF37] rounded-lg transition-all cursor-pointer active:scale-95"
            title="معاينة المتجر كما يراه الزبون"
          >
            <Eye className="w-3.5 h-3.5 text-[#B38728]" />
            <span className="hidden sm:inline">معاينة متجر الزبائن</span>
          </button>

          <button
            type="button"
            onClick={handleLogoutAdmin}
            className="px-3 py-1.5 text-xs text-neutral-500 hover:text-red-600 font-semibold transition-colors cursor-pointer active:scale-95"
          >
            قفل اللوحة
          </button>
        </div>
      </header>

      {/* Main Admin Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-right">
        
        {/* KPI Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-[#D4AF37]/30 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold block mb-1">طلبات بانتظار موافقتك</span>
              <span className="text-2xl font-bold text-amber-600 font-mono">{pendingOrders.length}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-[#D4AF37]/30 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold block mb-1">طلبات تمت الموافقة عليها</span>
              <span className="text-2xl font-bold text-emerald-600 font-mono">{approvedOrders.length}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-[#D4AF37]/30 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold block mb-1">كاش مطلوب استلامه من الزبائن</span>
              <span className="text-base sm:text-lg font-bold text-[#7A5912] font-mono tabular-nums">
                {formatPrice(pendingCashUSD, 'IQD')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#FAF6EA] border border-[#D4AF37]/40 flex items-center justify-center text-[#B38728]">
              <Banknote className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-[#D4AF37]/30 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] text-neutral-500 font-semibold block mb-1">المنتجات المعروضة بالمتجر</span>
              <span className="text-2xl font-bold text-neutral-900 font-mono">{products.length}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#FAF7EF] border border-[#D4AF37]/35 flex items-center justify-center text-[#7A5912]">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab Switcher Bar - Fully Scrollable and accessible on ALL screens */}
        <div className="border-b border-[#D4AF37]/25 pb-3">
          <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-[#D4AF37]/30 overflow-x-auto scrollbar-thin shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'gold-gradient-bg text-black border border-[#D4AF37] shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EF]'
              }`}
            >
              <ShoppingBag className={`w-3.5 h-3.5 ${activeTab === 'orders' ? 'text-black' : 'text-[#B38728]'}`} />
              <span>إدارة طلبات الزبائن</span>
              {pendingOrders.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[10px] font-bold rounded-full">
                  {pendingOrders.length}
                </span>
              )}
            </button>

            {/* Dedicated Delivered Orders & Profit Analytics Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('delivered')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'delivered'
                  ? 'bg-emerald-600 text-white border border-emerald-700 shadow-sm'
                  : 'text-neutral-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === 'delivered' ? 'text-white' : 'text-emerald-600'}`} />
              <span>الطلبات المستلمة والأرباح</span>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                activeTab === 'delivered'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {deliveredOrdersList.length} طلب ({formatPrice(totalDeliveredProfitIQD, 'IQD')})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'gold-gradient-bg text-black border border-[#D4AF37] shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EF]'
              }`}
            >
              <Package className={`w-3.5 h-3.5 ${activeTab === 'products' ? 'text-black' : 'text-[#B38728]'}`} />
              <span>معروضات ومخزون المتجر ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'add'
                  ? 'gold-gradient-bg text-black border border-[#D4AF37] shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EF]'
              }`}
            >
              <Plus className={`w-3.5 h-3.5 ${activeTab === 'add' ? 'text-black' : 'text-[#B38728]'}`} />
              <span>إضافة منتج جديد</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lists')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'lists'
                  ? 'gold-gradient-bg text-black border border-[#D4AF37] shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EF]'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeTab === 'lists' ? 'text-black' : 'text-[#B38728]'}`} />
              <span>قوائم ومجموعات المنتجات ({productLists.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'accounts'
                  ? 'gold-gradient-bg text-black border border-[#D4AF37] shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EF]'
              }`}
            >
              <Users className={`w-3.5 h-3.5 ${activeTab === 'accounts' ? 'text-black' : 'text-[#B38728]'}`} />
              <span>حسابات الزبائن والمحظورين ({registeredUsers.length})</span>
              {blockedUsersList.length > 0 && (
                <span className="px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full">
                  {blockedUsersList.length} محظور
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'staff'
                  ? 'gold-gradient-bg text-black border border-[#D4AF37] shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#FAF7EF]'
              }`}
            >
              <Users className={`w-3.5 h-3.5 ${activeTab === 'staff' ? 'text-black' : 'text-[#B38728]'}`} />
              <span>فريق الإدارة والموظفين ({staffMembers.length})</span>
            </button>
          </div>
        </div>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-white border-2 border-[#D4AF37] text-neutral-900 shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ================= TAB 1: ORDERS MANAGEMENT ================= */}
        {activeTab === 'orders' && (
          <div key="tab-orders" className="space-y-4 animate-mac-tab">

            {/* Free Shipping Threshold Control Panel (By Order Price in IQD) */}
            <div className="bg-white border border-[#D4AF37]/45 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#D4AF37]/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#FAF6EA] border border-[#D4AF37]/40 text-[#B38728]">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-neutral-900 flex items-center gap-2 flex-wrap">
                      <span>نظام التوصيل المجاني التلقائي حسب السعر النهائي للطلب</span>
                      {freeShippingConfig?.enabled ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold">
                          مفعل حالياً 🟢 ({formatPrice(freeShippingConfig?.minOrderAmountIQD || 50000, 'IQD')})
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-300 font-bold">
                          متوقف 🔴
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                      حدد المبلغ (بالدينار العراقي) الذي إذا وصل إليه مجموع سلة الزبون أو تجاوزه يصبح التوصيل مجانياً تلقائياً ويظهر شريط التقدم بالسلة
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!onUpdateFreeShippingConfig) return;
                    const nextEnabled = !freeShippingConfig?.enabled;
                    const currentAmount = freeShippingConfig?.minOrderAmountIQD || 50000;
                    onUpdateFreeShippingConfig({
                      enabled: nextEnabled,
                      minOrderAmountIQD: currentAmount
                    });
                    showToast(
                      nextEnabled
                        ? `تم تفعيل التوصيل المجاني للطلبات بقيمة ${formatPrice(currentAmount, 'IQD')} فأكثر`
                        : 'تم إيقاف عرض التوصيل المجاني في السلة'
                    );
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                    freeShippingConfig?.enabled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-400 hover:bg-emerald-100'
                      : 'bg-[#FAF7EF] text-[#7A5912] border-[#D4AF37]/40 hover:border-[#D4AF37]'
                  }`}
                >
                  {freeShippingConfig?.enabled ? 'إيقاف العرض المؤقت' : 'تفعيل عرض التوصيل المجاني'}
                </button>
              </div>

              {freeShippingConfig?.enabled && (
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-neutral-700 font-semibold">
                    حدد السعر المطلوب (د.ع) لتفعيل التوصيل المجاني تلقائياً:
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {[25000, 35000, 50000, 75000, 100000].map((amount) => {
                      const isSelected = (freeShippingConfig?.minOrderAmountIQD || 50000) === amount;
                      return (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => {
                            if (!onUpdateFreeShippingConfig) return;
                            onUpdateFreeShippingConfig({
                              enabled: true,
                              minOrderAmountIQD: amount
                            });
                            showToast(`تم تحديد التوصيل المجاني للطلبات بقيمة ${formatPrice(amount, 'IQD')} أو أكثر!`);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 font-mono ${
                            isSelected
                              ? 'gold-gradient-bg text-black border-[#D4AF37] shadow-sm'
                              : 'bg-[#FAF7EF] text-neutral-700 border-[#D4AF37]/30 hover:border-[#D4AF37]'
                          }`}
                        >
                          {formatPrice(amount, 'IQD')}
                        </button>
                      );
                    })}

                    {/* Custom Price Input in IQD */}
                    <div className="flex items-center gap-1.5 bg-[#FAF7EF] border border-[#D4AF37]/40 rounded-xl px-3 py-1.5">
                      <span className="text-[11px] text-[#7A5912] font-semibold">سعر مخصص:</span>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={freeShippingConfig?.minOrderAmountIQD || 50000}
                        onChange={(e) => {
                          const val = Math.max(1000, Number(e.target.value) || 1000);
                          if (onUpdateFreeShippingConfig) {
                            onUpdateFreeShippingConfig({
                              enabled: true,
                              minOrderAmountIQD: val
                            });
                          }
                        }}
                        className="w-24 text-center bg-white border border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-lg py-1 px-1.5 text-xs font-mono font-bold text-neutral-900 outline-none"
                      />
                      <span className="text-[11px] text-neutral-600 font-bold">د.ع</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Redesigned Responsive Orders Filter & Search Bar */}
            <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search in orders */}
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="ابحث برقم الطلب #LC... أو اسم الزبون أو رقم هاتفه..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    className="w-full pr-9 pl-4 py-2 bg-[#FAF8F2] border border-[#D4AF37]/35 rounded-xl text-xs text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#D4AF37] transition-colors"
                  />
                  <Search className="w-4 h-4 text-[#B38728] absolute right-3 top-2.5 pointer-events-none" />
                  {orderSearchTerm && (
                    <button
                      onClick={() => setOrderSearchTerm('')}
                      className="absolute left-3 top-2.5 text-neutral-400 hover:text-neutral-900"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-neutral-600 flex items-center justify-between md:justify-end gap-3">
                  <span>الطلبات المطابقة: <strong className="text-[#7A5912] font-mono text-sm">{filteredOrders.length}</strong> من <span className="font-mono">{orders.length}</span></span>
                </div>
              </div>

              {/* Status Filter Buttons - Wrapping & Horizontal Scroll */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#D4AF37]/20">
                <span className="text-xs font-semibold text-neutral-600 ml-2 hidden sm:inline">الحالة:</span>
                
                <button
                  type="button"
                  onClick={() => setOrderFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    orderFilter === 'all'
                      ? 'gold-gradient-bg text-black border border-[#D4AF37] shadow-sm'
                      : 'bg-[#FAF7EF] text-neutral-600 hover:text-neutral-900 border border-[#D4AF37]/25'
                  }`}
                >
                  <ShoppingBag className="w-3 h-3 text-[#B38728]" />
                  <span>كافة الطلبات</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-white/80 text-neutral-800 font-mono">
                    {orders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    orderFilter === 'pending'
                      ? 'bg-amber-100 text-amber-900 border border-amber-400 shadow-sm'
                      : 'bg-[#FAF7EF] text-neutral-600 hover:text-neutral-900 border border-[#D4AF37]/25'
                  }`}
                >
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>بانتظار الموافقة</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-200/70 text-amber-900 font-mono">
                    {pendingOrders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    orderFilter === 'approved'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-400 shadow-sm'
                      : 'bg-[#FAF7EF] text-neutral-600 hover:text-neutral-900 border border-[#D4AF37]/25'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>تمت الموافقة</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-200/70 text-emerald-900 font-mono">
                    {approvedOrders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilter('delivered')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    orderFilter === 'delivered'
                      ? 'bg-sky-100 text-sky-900 border border-sky-400 shadow-sm'
                      : 'bg-[#FAF7EF] text-neutral-600 hover:text-neutral-900 border border-[#D4AF37]/25'
                  }`}
                >
                  <Check className="w-3 h-3 text-sky-600" />
                  <span>تم التسليم كاش</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-sky-200/70 text-sky-900 font-mono">
                    {deliveredOrders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    orderFilter === 'rejected'
                      ? 'bg-red-100 text-red-900 border border-red-400 shadow-sm'
                      : 'bg-[#FAF7EF] text-neutral-600 hover:text-neutral-900 border border-[#D4AF37]/25'
                  }`}
                >
                  <XCircle className="w-3 h-3 text-red-600" />
                  <span>مرفوضة</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-red-200/70 text-red-900 font-mono">
                    {rejectedOrders.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-white border border-[#D4AF37]/30 rounded-2xl shadow-sm">
                <ShoppingBag className="w-12 h-12 text-[#B38728] mx-auto" />
                <h4 className="text-base font-bold text-neutral-900">لا توجد طلبات في هذا القسم</h4>
                <p className="text-xs text-neutral-500">
                  فور قيام أي زبون بالشراء والدفع كاش، سيظهر طلبه فوراً هنا بكل تفاصيل هاتفه وعنوانه لتتخذ قرار الموافقة عليه أو رفضه.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className={`bg-white rounded-2xl border p-5 sm:p-6 space-y-4 transition-all shadow-sm ${
                      ord.status === 'pending'
                        ? 'border-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.12)]'
                        : ord.status === 'approved'
                        ? 'border-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.12)]'
                        : ord.status === 'delivered'
                        ? 'border-sky-400'
                        : 'border-neutral-300 opacity-80'
                    }`}
                  >
                    {/* Top Row: Order ID, Date, and Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D4AF37]/20">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-bold text-[#7A5912] dir-ltr">
                          {ord.orderNumber}
                        </span>
                        <span className="text-neutral-400">·</span>
                        <span className="text-xs text-neutral-500">{formatDateTime(ord.createdAt)}</span>
                      </div>

                      {/* Status Badges */}
                      <div>
                        {ord.status === 'pending' && (
                          <span className="px-3 py-1 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-full flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>بانتظار موافقتك</span>
                          </span>
                        )}
                        {ord.status === 'approved' && (
                          <span className="px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-full flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تمت الموافقة - جاهز للتوصيل (تم خصم المخزون)</span>
                          </span>
                        )}
                        {ord.status === 'delivered' && (
                          <span className="px-3 py-1 text-xs font-bold text-sky-800 bg-sky-50 border border-sky-300 rounded-full flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                            <span>تم التوصيل واستلام الكاش</span>
                          </span>
                        )}
                        {ord.status === 'rejected' && (
                          <span className="px-3 py-1 text-xs font-bold text-red-800 bg-red-50 border border-red-300 rounded-full flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            <span>طلب مرفوض (الكمية مسترجعة للمخزون)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer & Delivery Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      
                      {/* Customer contact */}
                      <div className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#D4AF37]/25 space-y-2">
                        <div className="font-bold text-neutral-900 text-sm">{ord.customer?.name || 'الزبون'}</div>
                        {ord.customer?.phone && (
                          <div className="flex items-center gap-2 text-neutral-700">
                            <Phone className="w-4 h-4 text-[#B38728]" />
                            <span>رقم هاتف الزبون:</span>
                            <a
                              href={`tel:${ord.customer.phone}`}
                              dir="ltr"
                              className="text-[#7A5912] font-mono font-bold hover:underline"
                            >
                              {ord.customer.phone}
                            </a>
                          </div>
                        )}
                        <div className="text-[11px] text-neutral-500">
                          حساب الزبون: {ord.customer?.contact || ord.customer?.phone || 'غير محدد'}
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#D4AF37]/25 space-y-2">
                        <div className="flex items-center gap-2 text-neutral-900 font-semibold">
                          <MapPin className="w-4 h-4 text-[#B38728]" />
                          <span>موقع وعنوان التوصيل:</span>
                        </div>
                        <p className="text-neutral-700 text-xs leading-relaxed">
                          {ord.customer?.address || 'العنوان غير محدد'}
                        </p>
                        {ord.customer?.notes && (
                          <div className="text-[11px] text-amber-800 font-medium pt-1">
                            ملاحظة إضافية من الزبون: {ord.customer.notes}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Items Purchased List */}
                    <div className="space-y-2 text-xs">
                      <div className="font-bold text-neutral-700">المنتجات في الطلب:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(ord.items || []).map((item, idx) => (
                          <div
                            key={`${item?.product?.id || idx}-${item?.selectedOption || ''}`}
                            className="p-2.5 rounded-lg bg-[#FAF8F2] border border-[#D4AF37]/25 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <img
                                src={item?.selectedOptionImage || item?.product?.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop'}
                                alt={item?.product?.name || 'منتج'}
                                className="w-10 h-10 object-contain rounded-md border border-[#D4AF37]/30 bg-white shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-neutral-900 text-xs sm:text-sm">{item?.product?.name || 'منتج'}</span>
                                </div>
                                {item?.selectedOption && (
                                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#D4AF37] text-[11px] font-extrabold text-[#7A5912] shadow-2xs">
                                    <span>{item.selectedOptionLabel || item.product?.customOptionLabel || 'الخانة المحددة'}:</span>
                                    <span className="text-neutral-950 underline">{item.selectedOption}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-[11px] text-neutral-600 mt-1">
                                  <span>الكمية المطلوبة: <strong className="text-neutral-900 font-mono">{item?.quantity || 1}</strong></span>
                                </div>
                              </div>
                            </div>
                            <span className="font-bold text-[#7A5912] tabular-nums shrink-0">
                              {formatPrice((item?.product?.priceUSD || 0) * (item?.quantity || 1), ord.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Row: Total Cash to Collect & Action Buttons (Approve / Reject) */}
                    <div className="pt-3 border-t border-[#D4AF37]/25 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs text-neutral-600 font-semibold">سعر المنتجات:</span>
                        <span className="text-lg font-bold gold-gradient-text tabular-nums font-mono">
                          {formatPrice(ord.totalUSD, ord.currency)}
                        </span>
                        {(ord.isFreeShipping || ord.shippingUSD === 0) ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300">
                            + توصيل مجاني 🎉
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-neutral-50 text-[#7A5912] border border-[#D4AF37]/40 font-mono">
                            + 5,000 د.ع توصيل
                          </span>
                        )}
                      </div>

                      {/* Primary Owner Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {ord.status === 'pending' && (
                          <>
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, 'approved')}
                              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>موافقة على الطلب</span>
                            </button>

                            <button
                              onClick={() => {
                                setOrderToReject(ord);
                                setRejectReason('الزبون ألغى الطلب أو تعذر التواصل معه');
                                setCustomRejectReason('');
                              }}
                              className="px-3.5 py-2 text-xs font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border border-red-300 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>رفض الطلب</span>
                            </button>
                          </>
                        )}

                        {ord.status === 'approved' && (
                          <>
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, 'delivered')}
                              className="px-4 py-2 text-xs font-bold text-black gold-gradient-bg hover:brightness-110 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                            >
                              <Banknote className="w-4 h-4 fill-black" />
                              <span>تم التوصيل واستلام الكاش من الزبون</span>
                            </button>

                            {/* Rejection button in approved state in case customer didn't receive */}
                            <button
                              onClick={() => {
                                setOrderToReject(ord);
                                setRejectReason('الزبون لم يستلم الطلب عند وصول المندوب');
                                setCustomRejectReason('');
                              }}
                              className="px-3.5 py-2 text-xs font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border border-red-300 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="رفض الطلب إذا تعذر التسليم أو رفض الزبون الاستلام"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>رفض الطلب (لم يستلم الزبون)</span>
                            </button>
                          </>
                        )}

                        {ord.status === 'rejected' && (
                          <button
                            onClick={() => {
                              onUpdateOrderStatus(ord.id, 'approved');
                              showToast(`تم إعادة تفعيل الطلب #${ord.orderNumber} والموافقة عليه`);
                            }}
                            className="px-3 py-2 text-xs font-bold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-300 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>إعادة فتح والموافقة على الطلب</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleSendOrderWhatsApp(ord)}
                          className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          title="إرسال رسالة تفاصيل الطلب وتأكيده للزبون عبر الواتساب"
                        >
                          <MessageCircle className="w-4 h-4 text-white" />
                          <span>إرسال واتساب للزبون</span>
                        </button>

                        <button
                          onClick={() => setWaybillOrder(ord)}
                          className="px-3 py-2 text-xs font-bold text-[#7A5912] bg-neutral-50 hover:bg-[#FAF4E1] border border-[#D4AF37]/45 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="عرض وطباعة بوليصة التوصيل للمندوب"
                        >
                          <Printer className="w-4 h-4 text-[#B38728]" />
                          <span>طباعة بوليصة للمندوب</span>
                        </button>

                        <button
                          onClick={() => onDeleteOrder(ord.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="حذف سجل الطلب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ================= TAB: DELIVERED ORDERS & PROFIT ANALYTICS ================= */}
        {activeTab === 'delivered' && (
          <div key="tab-delivered" className="space-y-6 animate-mac-tab text-right">
            
            {/* Hero Profit Summary Banner (Clean White & Emerald/Gold Accents) */}
            <div className="relative overflow-hidden rounded-3xl bg-white border-2 border-emerald-400 p-5 sm:p-7 shadow-md">
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div className="space-y-2 text-right">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>خزينة أرباح الطلبات المستلمة (كاش فعلي)</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-neutral-900">
                    إجمالي أرباح ومبالغ الطلبات المستلمة
                  </h2>
                  <p className="text-xs text-neutral-600 max-w-xl leading-relaxed">
                    المبالغ المحصلة من الطلبات التي تم تسليمها للزبائن واستلام ثمنها نقداً بنجاح.
                  </p>
                </div>

                {/* Big Profit Counter Display */}
                <div className="w-full lg:w-auto p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-300 text-center space-y-1 shrink-0 shadow-xs">
                  <span className="text-xs text-emerald-800 font-bold block">مجموع الكاش المستلم:</span>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono tracking-tight tabular-nums">
                    {formatPrice(totalDeliveredProfitIQD, 'IQD')}
                  </div>
                  <div className="text-[11px] text-neutral-600 font-medium">
                    من إجمالي <strong className="text-neutral-900 font-mono">{deliveredOrdersList.length}</strong> طلب مكتمل
                  </div>
                </div>
              </div>

              {/* KPI Mini Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5 pt-5 border-t border-[#D4AF37]/25">
                <div className="p-4 rounded-xl bg-neutral-50 border border-[#D4AF37]/30 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-500 block font-semibold">عدد الطلبات المستلمة</span>
                    <div className="text-xl font-black text-neutral-900 font-mono">{deliveredOrdersList.length} طلب</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600 shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 border border-[#D4AF37]/30 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-500 block font-semibold">إجمالي القطع المباعة</span>
                    <div className="text-xl font-black text-[#7A5912] font-mono">{totalDeliveredItemsCount} قطعة</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-white border border-[#D4AF37]/45 flex items-center justify-center text-[#B38728] shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 border border-[#D4AF37]/30 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-500 block font-semibold">متوسط قيمة الطلب</span>
                    <div className="text-xl font-black text-emerald-700 font-mono">{formatPrice(avgDeliveredOrderIQD, 'IQD')}</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600 shrink-0">
                    <Banknote className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar for Delivered Orders */}
            <div className="bg-white border border-[#D4AF37]/35 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search input */}
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="ابحث برقم الطلب المستلم، اسم الزبون، هاتفه، أو المدينة..."
                    value={deliveredSearchTerm}
                    onChange={(e) => setDeliveredSearchTerm(e.target.value)}
                    className="w-full pr-9 pl-4 py-2 bg-neutral-50 border border-[#D4AF37]/35 rounded-xl text-xs text-neutral-900 placeholder-neutral-400 outline-none focus:border-emerald-500 transition-colors"
                  />
                  <Search className="w-4 h-4 text-[#B38728] absolute right-3 top-2.5 pointer-events-none" />
                  {deliveredSearchTerm && (
                    <button
                      onClick={() => setDeliveredSearchTerm('')}
                      className="absolute left-3 top-2.5 text-neutral-400 hover:text-neutral-900"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort Order Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-600 font-semibold">ترتيب حسب:</span>
                  <select
                    value={deliveredSortOrder}
                    onChange={(e) => setDeliveredSortOrder(e.target.value as any)}
                    className="bg-neutral-50 border border-[#D4AF37]/35 rounded-xl px-3 py-2 text-xs text-neutral-900 font-semibold outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="newest">الأحدث استلاماً</option>
                    <option value="oldest">الأقدم استلاماً</option>
                    <option value="highest-price">الأعلى ربحاً وسعراً</option>
                  </select>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-50 hover:bg-emerald-50 border border-[#D4AF37]/40 text-xs font-bold text-neutral-800 hover:text-emerald-800 transition-all cursor-pointer shadow-xs"
                    title="طباعة تقرير المبيعات والأرباح"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">طباعة التقرير</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Delivered Orders List Cards */}
            {filteredDeliveredOrders.length === 0 ? (
              <div className="py-16 text-center space-y-4 bg-white border border-[#D4AF37]/35 rounded-3xl p-6 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-neutral-900">لا توجد طلبات مستلمة بعد</h4>
                <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
                  عند وصول طلب جديد وتوصيله للزبون واستلام ثمنه، قم بتحويل حالة الطلب في قسم "إدارة طلبات الزبائن" إلى <strong className="text-emerald-700">"تم التوصيل واستلام الكاش"</strong> لتظهر جميع أرباحه وتفاصيله هنا تلقائياً.
                </p>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-bold text-xs hover:brightness-110 transition shadow-md cursor-pointer"
                >
                  الانتقال لإدارة الطلبات
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDeliveredOrders.map((ord) => {
                  const itemsCount = (ord.items || []).reduce((s, it) => s + (it?.quantity || 1), 0);
                  return (
                    <div
                      key={ord.id}
                      className="bg-white rounded-2xl border border-emerald-400 p-5 sm:p-6 space-y-4 shadow-sm hover:border-emerald-500 transition-all"
                    >
                      {/* Top Bar: Order ID, Delivered Badge & Cash Amount */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D4AF37]/20">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-base font-bold text-[#7A5912] dir-ltr">
                            {ord.orderNumber}
                          </span>
                          <span className="text-neutral-400">·</span>
                          <span className="text-xs text-neutral-500">{formatDateTime(ord.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-full flex items-center gap-1.5 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تم الاستلام وتحصيل الكاش بنجاح</span>
                          </span>
                        </div>
                      </div>

                      {/* Customer Info & Financial Cash Box */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        
                        {/* Customer contact card */}
                        <div className="p-3.5 rounded-xl bg-neutral-50 border border-[#D4AF37]/25 space-y-2">
                          <span className="text-neutral-500 block font-semibold text-[11px]">بيانات المشتري:</span>
                          <div className="font-bold text-neutral-900 text-sm">{ord.customer?.name || 'الزبون'}</div>
                          {ord.customer?.phone && (
                            <div className="flex items-center gap-2 text-neutral-700">
                              <Phone className="w-4 h-4 text-[#B38728]" />
                              <span>الهاتف:</span>
                              <a
                                href={`tel:${ord.customer.phone}`}
                                dir="ltr"
                                className="text-[#7A5912] font-mono font-bold hover:underline"
                              >
                                {ord.customer.phone}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Delivery address */}
                        <div className="p-3.5 rounded-xl bg-neutral-50 border border-[#D4AF37]/25 space-y-1.5">
                          <span className="text-neutral-500 block font-semibold text-[11px]">عنوان الاستلام والتوصيل:</span>
                          <div className="flex items-center gap-1.5 text-neutral-900 font-semibold">
                            <MapPin className="w-4 h-4 text-[#B38728] shrink-0" />
                            <span>المحافظة: {ord.customer?.city || 'غير محدد'}</span>
                          </div>
                          <div className="text-neutral-600 text-[11px] leading-relaxed">
                            العنوان التفصيلي: {ord.customer?.address || 'غير محدد'}
                          </div>
                        </div>

                        {/* Financial profit box */}
                        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-300 flex flex-col justify-between">
                          <span className="text-emerald-800 text-[11px] font-bold block">المبلغ المستلم كاش:</span>
                          <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight my-1">
                            {formatPrice(ord.totalUSD, 'IQD')}
                          </div>
                          <div className="text-[11px] text-neutral-600">
                            الدفع كاش عند الاستلام ({itemsCount} قطع)
                          </div>
                        </div>

                      </div>

                      {/* Items Purchased in this delivered order */}
                      <div className="p-3.5 rounded-xl bg-neutral-50 border border-[#D4AF37]/25 space-y-2">
                        <span className="text-neutral-600 text-xs font-semibold block">
                          المنتجات المستلمة في هذا الطلب:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {(ord.items || []).map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-white rounded-lg border border-[#D4AF37]/25 flex items-center gap-2.5"
                            >
                              <img
                                src={item?.selectedOptionImage || item.product?.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop'}
                                alt={item.product?.name}
                                className="w-10 h-10 object-contain rounded bg-neutral-50 p-0.5 border border-[#D4AF37]/30 shrink-0"
                              />
                              <div className="min-w-0 flex-1 text-right">
                                <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5 flex-wrap">
                                  <span className="truncate">{item.product?.name}</span>
                                </div>
                                {item?.selectedOption && (
                                  <div className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FAF7EF] border border-[#D4AF37]/50 text-[10px] font-extrabold text-[#7A5912]">
                                    <span>{item.selectedOptionLabel || item.product?.customOptionLabel || 'الخانة'}:</span>
                                    <span className="text-neutral-950">{item.selectedOption}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-[11px] mt-1">
                                  <span className="text-[#7A5912] font-mono font-bold">
                                    {item.quantity} × {formatPrice(item.product?.priceUSD, 'IQD')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs">
                        <span className="text-neutral-500 text-[11px]">
                          طريقة الدفع: الدفع نقداً عند استلام الشحنة
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSendOrderWhatsApp(ord)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer text-[11px] flex items-center gap-1.5 shadow-sm"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-white" />
                            <span>مراسلة واتساب</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateOrderStatus(ord.id, 'approved');
                              showToast(`تم إعادة الطلب #${ord.orderNumber} إلى قائمة الطلبات المعتمدة`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-300 transition cursor-pointer text-[11px]"
                            title="إعادة تعيين الحالة إذا حدثأ"
                          >
                            إلغاء وضع الاستلام
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ================= TAB 2: PRODUCTS LIST & INVENTORY EDIT ================= */}
        {activeTab === 'products' && (
          <div key="tab-products" className="space-y-4 animate-mac-tab">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">المنتجات والمخزون المتوفر في متجرك</h3>
                <p className="text-xs text-neutral-600">يمكنك تعديل الأسعار، زيادة أو تقليل كمية المخزون المتوفرة، أو حذف أي منتج فوراً</p>
              </div>

              <button
                onClick={() => setActiveTab('add')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-black gold-gradient-bg rounded-lg hover:brightness-110 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4 fill-black" />
                <span>إضافة منتج جديد</span>
              </button>
            </div>

            {/* Dedicated Marquee Strip Management Box */}
            {products.length > 0 && (
              <div className="bg-white border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#D4AF37]/20">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#FAF6EA] text-[#B38728] border border-[#D4AF37]/30">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-900">
                        إدارة شريط صور المنتجات المتحرك (بالصفحة الرئيسية)
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        حدد المنتجات التي تريد ظهور صورها في المستطيل المتحرك أسفل قسم الترحيب
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(() => {
                      const count = products.filter((p) => p.isFeaturedInStrip).length;
                      if (count < 6) {
                        return (
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 px-3 py-1 rounded-lg">
                            🟡 غير نشط بالرئيسية (المحدد: {count}/6 - يلزم {6 - count} إضافية)
                          </span>
                        );
                      }
                      return (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-lg">
                          🟢 نشط ويعمل بالرئيسية ({count}/10 منتجات)
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Horizontal checklist of products */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1 max-h-48 overflow-y-auto">
                  {products.map((p) => {
                    const isSelected = Boolean(p.isFeaturedInStrip);
                    const currentCount = products.filter((item) => item.isFeaturedInStrip).length;

                    return (
                      <div
                        key={`strip-manage-${p.id}`}
                        onClick={() => {
                          if (!isSelected && currentCount >= 10) {
                            showToast('الحد الأقصى للشريط المتحرك هو 10 منتجات فقط. يرجى إلغاء منتج قبل إضافة غيره.');
                            return;
                          }

                          const nextSelected = !isSelected;
                          onUpdateProduct({
                            ...p,
                            isFeaturedInStrip: nextSelected
                          });

                          const nextCount = nextSelected ? currentCount + 1 : currentCount - 1;
                          if (nextSelected) {
                            if (nextCount < 6) {
                              showToast(`تمت الإضافة! (المحدد: ${nextCount}/6 - يلزم ${6 - nextCount} لتفعيل الشريط بالرئيسية)`);
                            } else {
                              showToast(`🎉 الشريط نشط الآن في الصفحة الرئيسية (${nextCount}/10 منتجات)`);
                            }
                          } else {
                            if (nextCount < 6) {
                              showToast(`تمت الإزالة. الشريط متوقف حالياً لأن المحدد (${nextCount}/6) أقل من 6.`);
                            } else {
                              showToast(`تمت إزالة "${p.name}" من الشريط المتحرك`);
                            }
                          }
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center text-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#FAF6EA] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                            : 'bg-[#FAF8F2] border-[#D4AF37]/20 opacity-70 hover:opacity-100 hover:border-[#D4AF37]/50'
                        }`}
                      >
                        <div className="relative w-12 h-12 bg-white rounded-lg overflow-hidden border border-[#D4AF37]/30 p-1 flex items-center justify-center">
                          <img src={p.image} alt="" className="w-full h-full object-contain" />
                          <span className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isSelected ? 'bg-[#D4AF37] text-black' : 'bg-neutral-200 text-neutral-600'
                          }`}>
                            {isSelected ? '✓' : ''}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-neutral-900 truncate w-full">
                          {p.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {products.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-white border border-[#D4AF37]/30 rounded-2xl shadow-sm">
                <Package className="w-12 h-12 text-[#B38728] mx-auto" />
                <h4 className="text-base font-bold text-neutral-900">لا توجد أي منتجات معروضة بعد</h4>
                <p className="text-xs text-neutral-500">
                  انقر على زر "إضافة منتج جديد" لعرض أول سلعة تبيعها في متجر LC مع تحديد الكمية المتوفرة بالمخزون
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => {
                  const imageCount = p.images?.length || 1;
                  const currentStock = typeof p.stockCount === 'number' ? Math.max(0, p.stockCount) : (p.inStock === false ? 0 : 10);
                  const isOut = currentStock <= 0;

                  return (
                    <div
                      key={p.id}
                      className="p-4 bg-white border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-xl space-y-3 transition-all shadow-sm"
                    >
                      <div className="flex gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-16 h-16 object-contain rounded-lg border border-[#D4AF37]/35 bg-[#FAF8F2] p-1"
                          />
                          {imageCount > 1 && (
                            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-[#D4AF37] text-black text-[9px] font-bold rounded-full">
                              {imageCount} صور
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-[#8B6914] font-semibold">{p.categoryLabel}</span>
                          <h4 className="text-xs font-bold text-neutral-900 truncate">{p.name}</h4>
                          <div className="text-sm font-bold text-[#7A5912] font-mono mt-1">
                            {formatPrice(p.priceUSD, currency)}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-600 line-clamp-2">
                        {p.shortDesc}
                      </div>

                      {/* Display Variant Options with Per-Option Stock Controls & Linked Image */}
                      {(() => {
                        const prodVariants = getProductVariants(p);
                        if (prodVariants.length > 0) {
                          return (
                            <div className="p-2.5 rounded-xl bg-[#FAF8F2] border border-[#D4AF37]/35 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#8B6914]">
                                  {p.customOptionLabel?.trim() || 'مخزون وصور الخانات / الألوان'}:
                                </span>
                                <span className="text-[10px] font-mono font-bold text-neutral-600">
                                  الإجمالي: {currentStock} قطعة
                                </span>
                              </div>
                              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                                {prodVariants.map((v, vIdx) => (
                                  <div
                                    key={v.name}
                                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-[#D4AF37]/30"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {v.image ? (
                                        <img
                                          src={v.image}
                                          alt={v.name}
                                          className="w-7 h-7 rounded object-contain bg-[#FAF8F2] border border-[#D4AF37]/30 shrink-0 p-0.5"
                                        />
                                      ) : (
                                        <div className="w-7 h-7 rounded bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[9px] text-neutral-400 shrink-0">
                                          صورة
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <span className="text-[11px] font-bold text-neutral-900 block truncate">
                                          {v.name}
                                        </span>
                                        <span className={`text-[9px] font-mono font-bold ${v.stockCount > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                          {v.stockCount > 0 ? `${v.stockCount} بالخزين` : 'نفذ (0)'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextVariants = prodVariants.map((item, idx) =>
                                            idx === vIdx ? { ...item, stockCount: Math.max(0, item.stockCount - 1) } : item
                                          );
                                          const nextTotal = nextVariants.reduce((s, item) => s + item.stockCount, 0);
                                          onUpdateProduct({
                                            ...p,
                                            variantOptions: nextVariants,
                                            customOptions: nextVariants.map((item) => item.name),
                                            stockCount: nextTotal,
                                            inStock: nextTotal > 0
                                          });
                                        }}
                                        disabled={v.stockCount <= 0}
                                        className="w-6 h-6 rounded bg-[#FAF7EF] hover:bg-neutral-200 border border-[#D4AF37]/40 text-neutral-800 font-bold text-xs flex items-center justify-center cursor-pointer disabled:opacity-40"
                                      >
                                        -
                                      </button>
                                      <span className="w-7 text-center font-mono font-bold text-xs text-neutral-900">
                                        {v.stockCount}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextVariants = prodVariants.map((item, idx) =>
                                            idx === vIdx ? { ...item, stockCount: item.stockCount + 1 } : item
                                          );
                                          const nextTotal = nextVariants.reduce((s, item) => s + item.stockCount, 0);
                                          onUpdateProduct({
                                            ...p,
                                            variantOptions: nextVariants,
                                            customOptions: nextVariants.map((item) => item.name),
                                            stockCount: nextTotal,
                                            inStock: nextTotal > 0
                                          });
                                        }}
                                        className="w-6 h-6 rounded bg-[#FAF7EF] hover:bg-[#FAF4E1] border border-[#D4AF37]/40 text-[#7A5912] font-bold text-xs flex items-center justify-center cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                            isOut
                              ? 'bg-red-50 border-red-300'
                              : currentStock <= 3
                              ? 'bg-amber-50 border-amber-300'
                              : 'bg-[#FAF7EF] border-[#D4AF37]/35'
                          }`}>
                            <div className="text-xs">
                              <span className="text-neutral-600 text-[11px] block">المخزون المتوفر:</span>
                              {isOut ? (
                                <span className="font-bold text-red-700 text-xs">نفذ من المخزون (0 قطعة)</span>
                              ) : (
                                <span className="font-extrabold text-[#7A5912] font-mono text-xs">
                                  {currentStock} قطعة متوفرة
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextStock = Math.max(0, currentStock - 1);
                                  onUpdateProduct({
                                    ...p,
                                    stockCount: nextStock,
                                    inStock: nextStock > 0
                                  });
                                }}
                                disabled={currentStock <= 0}
                                className="w-7 h-7 rounded-lg bg-white hover:bg-neutral-100 border border-[#D4AF37]/40 text-neutral-800 font-bold text-sm flex items-center justify-center cursor-pointer disabled:opacity-40"
                                title="إنقاص قطعة من المخزون"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={currentStock}
                                onChange={(e) => {
                                  const nextStock = Math.max(0, Math.floor(Number(e.target.value) || 0));
                                  onUpdateProduct({
                                    ...p,
                                    stockCount: nextStock,
                                    inStock: nextStock > 0
                                  });
                                }}
                                className="w-12 h-7 text-center bg-white border border-[#D4AF37]/45 rounded-lg text-xs font-mono font-bold text-neutral-900 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextStock = currentStock + 1;
                                  onUpdateProduct({
                                    ...p,
                                    stockCount: nextStock,
                                    inStock: true
                                  });
                                }}
                                className="w-7 h-7 rounded-lg bg-white hover:bg-[#FAF6EA] border border-[#D4AF37]/40 text-[#7A5912] font-bold text-sm flex items-center justify-center cursor-pointer"
                                title="زيادة قطعة للمخزون"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="pt-2 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateProduct({
                              ...p,
                              isFeaturedInStrip: !p.isFeaturedInStrip
                            });
                            showToast(
                              p.isFeaturedInStrip
                                ? `تم إزالة "${p.name}" من الشريط المتحرك`
                                : `تمت إضافة "${p.name}" إلى الشريط المتحرك`
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            p.isFeaturedInStrip
                              ? 'bg-[#FAF6EA] text-[#7A5912] border-[#D4AF37] shadow-sm'
                              : 'bg-[#FAF8F2] text-neutral-600 border-[#D4AF37]/25 hover:text-neutral-900'
                          }`}
                          title="تحديد ظهور هذا المنتج في الشريط المتحرك التفاعلي"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>{p.isFeaturedInStrip ? 'في الشريط المتحرك ✓' : '+ إضافة للشريط'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              setEditingProduct({
                                ...p,
                                variantOptions: getProductVariants(p)
                              })
                            }
                            className="p-1.5 text-neutral-600 hover:text-[#7A5912] bg-[#FAF7EF] border border-[#D4AF37]/30 rounded-md cursor-pointer"
                            title="تعديل تفاصيل وسعر ومخزون المنتج"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(p.id)}
                            className="p-1.5 text-neutral-600 hover:text-red-600 bg-[#FAF7EF] border border-[#D4AF37]/30 rounded-md cursor-pointer"
                            title="حذف المنتج من المتجر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: ADD NEW PRODUCT (ORGANIZED & CLEAN) ================= */}
        {activeTab === 'add' && (
          <div key="tab-add" className="max-w-3xl mx-auto bg-white border border-[#D4AF37]/45 rounded-3xl p-6 sm:p-8 space-y-6 animate-mac-tab shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D4AF37]/25 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#FAF6EA] text-[#B38728] border border-[#D4AF37]/30">
                    <Plus className="w-5 h-5" />
                  </span>
                  <span>إضافة منتج جديد لمعروضات المتجر</span>
                </h3>
                <p className="text-xs text-neutral-600 mt-1">
                  أدخل تفاصيل السلعة، السعر، الصور، والكمية المتوفرة في المخزون لتظهر للزبائن.
                </p>
              </div>
            </div>

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>تم نشر وعرض المنتج في المتجر بنجاح!</span>
              </div>
            )}

            {imageError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-xs text-red-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{imageError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-5 text-xs">
              <div className="bg-[#FAF8F2] p-5 rounded-2xl border border-[#D4AF37]/30 space-y-4">
                <div className="flex items-center gap-2 text-[#8B6914] font-bold text-sm border-b border-[#D4AF37]/20 pb-2">
                  <span>1️⃣ معلومات المنتج الأساسية</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1.5">
                      اسم المنتج <span className="text-[#B38728]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: ساعة، حقيبة، عطر، جهاز، إلخ..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3.5 py-3 bg-white border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-neutral-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1.5">
                      السعر بالدينار العراقي (د.ع) <span className="text-[#B38728]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={250}
                      step={250}
                      placeholder="مثال: 25000"
                      value={newPriceIQD}
                      onChange={(e) => setNewPriceIQD(Number(e.target.value))}
                      className="w-full px-3.5 py-3 bg-white border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-xl text-neutral-900 outline-none font-mono"
                    />
                    <span className="text-[11px] text-[#7A5912] mt-1.5 block font-bold">
                      يظهر للزبون: {formatPrice(newPriceIQD || 0, 'IQD')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 p-4 rounded-xl border border-[#D4AF37]/35 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#B38728]" />
                    <label className="text-neutral-900 font-bold text-xs">
                      القائمة والقسم التابع لهما هذا المنتج:
                    </label>
                  </div>
                  <span className="text-[11px] text-[#7A5912] font-semibold">
                    (تضيف المنتج للقسم ➔ والقسم مربوط بالقائمة)
                  </span>
                </div>

                {/* 1. Pick or Link to a List */}
                <div className="space-y-1.5">
                  <label className="block text-neutral-700 font-semibold text-[11px]">
                    1. حدد القائمة التي ترغب بربط المنتج وقسمه بها:
                  </label>
                  {productLists && productLists.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedListIdsForNewProd([])}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          selectedListIdsForNewProd.length === 0
                            ? 'gold-gradient-bg text-black border-[#D4AF37] font-bold shadow-xs'
                            : 'bg-white text-neutral-600 border-[#D4AF37]/30 hover:text-neutral-900'
                        }`}
                      >
                        بدون قائمة محددة (معروضات عامة)
                      </button>
                      {productLists.map((list) => {
                        const isSelected = selectedListIdsForNewProd.includes(list.id);
                        return (
                          <button
                            type="button"
                            key={list.id}
                            onClick={() => {
                              setSelectedListIdsForNewProd(isSelected ? [] : [list.id]);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'gold-gradient-bg text-black border-[#D4AF37] font-bold shadow-sm'
                                : 'bg-white text-neutral-700 border-[#D4AF37]/30 hover:text-neutral-900 hover:border-[#D4AF37]'
                            }`}
                          >
                            <span>{isSelected ? '✓' : ''}</span>
                            <span>{list.name}</span>
                            <span className="text-[10px] text-neutral-600 font-mono">
                              ({list.categories?.length || 0} أقسام)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-500">
                      لم تقم بإنشاء قوائم بعد. يمكنك كتابة اسم القسم بالأسفل، أو إنشاء قائمة فوراً.
                    </p>
                  )}
                </div>

                {/* 2. Choose Category or Enter New Category */}
                <div className="space-y-1.5 pt-2 border-t border-[#D4AF37]/25">
                  <label className="block text-neutral-700 font-semibold text-[11px]">
                    2. القسم أو التصنيف لهذا المنتج:
                  </label>

                  {/* If a list is selected, show its categories as quick one-click chips */}
                  {selectedListIdsForNewProd.length > 0 && (() => {
                    const selList = productLists.find(l => l.id === selectedListIdsForNewProd[0]);
                    const listCats = selList?.categories || [];
                    if (listCats.length > 0) {
                      return (
                        <div className="space-y-1 pb-1">
                          <span className="text-[10px] text-neutral-500 block">
                            الأقسام المتوفرة في قائمة "{selList?.name}":
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {listCats.map(cat => (
                              <button
                                type="button"
                                key={cat}
                                onClick={() => setNewCategory(cat)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                  newCategory === cat
                                    ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                                    : 'bg-white text-[#7A5912] border-[#D4AF37]/35 hover:border-[#D4AF37]'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Quick Select from All Store Categories */}
                  {allCategories && allCategories.length > 0 && (
                    <div className="space-y-1 pb-1">
                      <span className="text-[10px] text-neutral-500 block">
                        أقسام المتجر المتوفرة (انقر للاختيار المباشر):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white rounded-xl border border-[#D4AF37]/30">
                        {allCategories.map((cat) => (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => setNewCategory(cat)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              newCategory === cat
                                ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                                : 'bg-neutral-50 text-[#7A5912] border-[#D4AF37]/35 hover:border-[#D4AF37]'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="أو اكتب اسم قسم جديد (مثال: ساعات، عطور، ملابس، حقائب...)"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-lg text-neutral-900 outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500 block">
                    إذا كتبت اسماً لقسم جديد، سيتم حفظه وربطه تلقائياً بالقائمة المحددة أعلاه.
                  </span>
                </div>

                {/* Quick Add New List Inline */}
                <div className="pt-2 border-t border-[#D4AF37]/25">
                  {isAddingQuickList ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="اكتب اسم القائمة الجديدة (مثال: أزياء وموضة، عطور وساعات)..."
                        value={quickListNameInput}
                        onChange={(e) => setQuickListNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateQuickList();
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-[#D4AF37]/50 focus:border-[#D4AF37] rounded-lg text-neutral-900 text-xs outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateQuickList}
                          disabled={!quickListNameInput.trim()}
                          className="px-3 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إنشاء وتحديد</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingQuickList(false);
                            setQuickListNameInput('');
                          }}
                          className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingQuickList(true)}
                      className="text-xs text-[#7A5912] hover:text-neutral-900 flex items-center gap-1.5 transition-colors cursor-pointer py-1 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#B38728]" />
                      <span>+ إنشاء قائمة جديدة وربط هذا المنتج وقسمه بها</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Image Upload & Management */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-[#D4AF37]/35 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-900 font-bold block">
                    صور المنتج (يمكنك رفع عدة صور واضحة) <span className="text-[#B38728]">*</span>
                  </label>
                  <span className="text-[11px] text-neutral-600">
                    تمت إضافة: <strong className="text-[#7A5912]">{newImages.length}</strong> صور
                  </span>
                </div>

                {/* Upload inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-neutral-100 border border-dashed border-[#D4AF37]/60 rounded-xl cursor-pointer transition-all">
                    {isCompressing ? (
                      <Loader2 className="w-4 h-4 text-[#B38728] animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#B38728]" />
                    )}
                    <span className="text-xs font-bold text-neutral-900">
                      {isCompressing ? 'جاري معالجة وضغط الصور...' : 'رفع صور من جهازك (اختيار عدة صور)'}
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleMultipleFilesUpload}
                      disabled={isCompressing}
                      className="hidden"
                    />
                  </label>

                  {/* Add via URL */}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="أو الصق رابط صورة https://..."
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-[#D4AF37]/35 rounded-lg text-neutral-900 text-xs outline-none text-left"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-3 py-2 gold-gradient-bg hover:brightness-105 text-black rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      إضافة
                    </button>
                  </div>
                </div>

                {/* Thumbnails Gallery of Added Images */}
                {newImages.length > 0 && (
                  <div className="pt-2 border-t border-[#D4AF37]/25 space-y-2">
                    <span className="text-[11px] text-neutral-600 block">
                      الصور المحددة (الصورة الأولى هي الصورة الرئيسية للغلاف):
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                      {newImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-[#D4AF37]/40 bg-white aspect-square">
                          <img
                            src={imgUrl}
                            alt={`صورة ${idx + 1}`}
                            className="w-full h-full object-contain p-1"
                          />
                          {idx === 0 && (
                            <span className="absolute top-1 right-1 bg-[#D4AF37] text-black text-[9px] font-bold px-1.5 py-0.5 rounded">
                              رئيسية
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute bottom-1 left-1 p-1 bg-red-600/90 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="حذف هذه الصورة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Product Stock / Inventory Quantity Section */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-[#D4AF37]/35 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#B38728]" />
                    <label className="text-neutral-900 font-bold text-xs">
                      الكمية المتوفرة في المخزون (عدد القطع): <span className="text-[#B38728]">*</span>
                    </label>
                  </div>
                  <span className="text-[11px] font-bold text-[#7A5912] bg-white border border-[#D4AF37]/40 px-2.5 py-0.5 rounded-full">
                    {newVariantOptions.length > 0
                      ? `مجموع مخزون الخانات (${newVariantOptions.reduce((s, v) => s + v.stockCount, 0)} قطعة)`
                      : newStockCount > 0
                      ? `متوفر (${newStockCount} قطعة)`
                      : 'نفذ من المخزون (0)'}
                  </span>
                </div>

                {newVariantOptions.length > 0 ? (
                  <div className="p-3 rounded-xl bg-white border border-[#D4AF37]/40 text-xs text-[#7A5912] font-bold flex items-center justify-between">
                    <span>تم تفعيل المخزون المستقل لكل لون/خانة بالأسفل:</span>
                    <span className="font-mono text-sm text-neutral-900">
                      الإجمالي: {newVariantOptions.reduce((s, v) => s + v.stockCount, 0)} قطعة
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                      حدد عدد القطع المتوفرة من هذه البضاعة (أو أضف خانات/ألوان بالأسفل لتحديد مخزون وصورة لكل لون على حدة).
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNewStockCount((prev) => Math.max(0, (Number(prev) || 0) - 1))}
                          className="w-9 h-9 rounded-xl bg-white hover:bg-neutral-100 border border-[#D4AF37]/40 text-neutral-900 font-bold text-base flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          required
                          min={0}
                          step={1}
                          value={newStockCount}
                          onChange={(e) => setNewStockCount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                          className="w-28 px-3 py-2 text-center bg-white border border-[#D4AF37]/45 focus:border-[#D4AF37] rounded-xl text-neutral-900 font-mono font-bold text-sm outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setNewStockCount((prev) => (Number(prev) || 0) + 1)}
                          className="w-9 h-9 rounded-xl bg-white hover:bg-neutral-100 border border-[#D4AF37]/40 text-[#7A5912] font-bold text-base flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Stock Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-neutral-500 ml-1 font-semibold">تحديد سريع:</span>
                        {[1, 3, 5, 10, 20, 50, 100].map((presetQty) => (
                          <button
                            type="button"
                            key={presetQty}
                            onClick={() => setNewStockCount(presetQty)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer font-mono ${
                              newStockCount === presetQty
                                ? 'gold-gradient-bg text-black border-[#D4AF37] shadow-sm'
                                : 'bg-white text-neutral-700 border-[#D4AF37]/30 hover:border-[#D4AF37]'
                            }`}
                          >
                            {presetQty} قطعة
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Custom Product Options / Fields with Per-Option Stock & Linked Image */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-[#D4AF37]/45 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#B38728]" />
                    <label className="text-neutral-900 font-bold text-xs">
                      خانات أو ألوان المنتج مع مخزون وصورة خاصة لكل خانة (اختياري):
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-[#7A5912] bg-white border border-[#D4AF37]/35 px-2.5 py-0.5 rounded-full">
                    {newVariantOptions.length > 0
                      ? `تم تحديد ${newVariantOptions.length} خانات (إجمالي ${newVariantOptions.reduce((s, v) => s + v.stockCount, 0)} قطعة)`
                      : 'اختياري (إذا تركتها فارغة لن تظهر أي خانات للزبون)'}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  أضف الألوان أو الأقسام (مثل: <strong>أسود، بنفسجي، أبيض</strong>)، وحدد <strong>عدد المخزون</strong> و<strong>الصورة المخصصة</strong> لكل لون. عندما يضغط الزبون على اللون ستظهر له صورته ومخزونه فوراً!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] text-neutral-700 font-semibold mb-1">
                      عنوان الخانة (يظهر للزبون):
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: اللون المطلوب / النوع"
                      value={newCustomOptionLabel}
                      onChange={(e) => setNewCustomOptionLabel(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-lg text-neutral-900 text-xs outline-none"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] text-neutral-700 font-semibold mb-1">
                      اسم اللون أو الخانة:
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: أسود، بنفسجي، أزرق..."
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewOptionItems(newOptionInput);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-lg text-neutral-900 text-xs outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3 flex gap-1.5 items-end">
                    <div className="w-20">
                      <label className="block text-[10px] text-neutral-700 font-semibold mb-1">
                        المخزون:
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newOptionStockInput}
                        onChange={(e) => setNewOptionStockInput(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                        className="w-full px-2 py-2 text-center bg-white border border-[#D4AF37]/35 rounded-lg text-neutral-900 font-mono font-bold text-xs outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddNewOptionItems(newOptionInput)}
                      className="flex-1 py-2 px-3 gold-gradient-bg text-black font-bold rounded-lg text-xs hover:brightness-105 cursor-pointer flex items-center justify-center gap-1 h-[34px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة</span>
                    </button>
                  </div>
                </div>

                {newVariantOptions.length > 0 && (
                  <div className="pt-3 border-t border-[#D4AF37]/25 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-neutral-800 font-bold">
                        الخانات المضافة (حدد مخزون وصورة كل خانة):
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewVariantOptions([])}
                        className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                      >
                        مسح جميع الخانات
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {newVariantOptions.map((opt, idx) => (
                        <div
                          key={opt.name}
                          className="p-3 rounded-xl bg-white border border-[#D4AF37]/45 shadow-2xs space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Option Image Preview & Name */}
                            <div className="flex items-center gap-2.5">
                              <div className="w-12 h-12 rounded-lg border border-[#D4AF37]/40 bg-[#FAF8F2] flex items-center justify-center overflow-hidden shrink-0 p-1">
                                {opt.image ? (
                                  <img src={opt.image} alt={opt.name} className="w-full h-full object-contain" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-neutral-400" />
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                                  <span>{opt.name}</span>
                                  {opt.image ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                                      مرتبط بصورة ✓
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                                      بدون صورة مخصصة
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-neutral-500 block mt-0.5">
                                  عند ضغط الزبون على "{opt.name}" ستظهر له الصورة المحددة هنا
                                </span>
                              </div>
                            </div>

                            {/* Stock Controls & Delete for this Option */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-[#FAF7EF] px-2 py-1 rounded-lg border border-[#D4AF37]/35">
                                <span className="text-[10px] font-bold text-[#7A5912] ml-1">المخزون:</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNewVariantOptions((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, stockCount: Math.max(0, item.stockCount - 1) } : item
                                      )
                                    )
                                  }
                                  className="w-6 h-6 rounded bg-white border border-[#D4AF37]/40 text-neutral-800 font-bold text-xs flex items-center justify-center cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={opt.stockCount}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
                                    setNewVariantOptions((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, stockCount: val } : item))
                                    );
                                  }}
                                  className="w-12 h-6 text-center bg-white border border-[#D4AF37]/40 rounded font-mono font-bold text-xs text-neutral-900 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNewVariantOptions((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, stockCount: item.stockCount + 1 } : item
                                      )
                                    )
                                  }
                                  className="w-6 h-6 rounded bg-white border border-[#D4AF37]/40 text-[#7A5912] font-bold text-xs flex items-center justify-center cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setNewVariantOptions((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 transition-colors cursor-pointer"
                                title="حذف هذه الخانة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Link Image Bar: Upload directly OR pick from uploaded product images */}
                          <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <label className="px-2.5 py-1 rounded-lg bg-[#FAF7EF] hover:bg-[#FAF4E1] border border-[#D4AF37]/45 text-[#7A5912] font-bold text-[11px] cursor-pointer flex items-center gap-1.5 transition-colors">
                                <Upload className="w-3 h-3 text-[#B38728]" />
                                <span>رفع صورة خاصة لـ ({opt.name})</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleUploadNewVariantImage(opt.name, e)}
                                  className="hidden"
                                />
                              </label>

                              {newImages.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-neutral-500 font-semibold">
                                    أو اختر من صور المنتج المرفوعة:
                                  </span>
                                  {newImages.map((imgUrl, imgIdx) => {
                                    const isLinked = opt.image === imgUrl;
                                    return (
                                      <button
                                        type="button"
                                        key={imgIdx}
                                        onClick={() =>
                                          setNewVariantOptions((prev) =>
                                            prev.map((item, i) =>
                                              i === idx ? { ...item, image: imgUrl } : item
                                            )
                                          )
                                        }
                                        className={`w-8 h-8 rounded-lg overflow-hidden border-2 transition-all cursor-pointer p-0.5 bg-white ${
                                          isLinked
                                            ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40 scale-105'
                                            : 'border-neutral-200 opacity-70 hover:opacity-100'
                                        }`}
                                        title={`ربط الصورة ${imgIdx + 1} بالخيار ${opt.name}`}
                                      >
                                        <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-neutral-700 font-bold mb-1.5">
                  وصف ومواصفات المنتج للزبائن
                </label>
                <textarea
                  rows={3}
                  placeholder="اكتب مواصفات المنتج، الألوان، أو مميزات الخامة..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-[#D4AF37]/35 focus:border-[#D4AF37] rounded-lg text-neutral-900 outline-none resize-none"
                />
              </div>

              {/* Featured in Marquee Strip Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 border border-[#D4AF37]/35 hover:border-[#D4AF37] cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={newIsFeaturedInStrip}
                  onChange={(e) => setNewIsFeaturedInStrip(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#B38728]" />
                  <span>عرض هذا المنتج في الشريط المتحرك التفاعلي بالصفحة الرئيسية</span>
                </span>
              </label>

              <button
                type="submit"
                disabled={isCompressing}
                className="w-full py-3.5 font-bold text-black gold-gradient-bg rounded-xl hover:brightness-110 shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 fill-black" />
                <span>نشر وعرض المنتج في المتجر الآن</span>
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 4: PRODUCT LISTS & COLLECTIONS ================= */}
        {activeTab === 'lists' && (
          <div key="tab-lists" className="animate-mac-tab">
            <ProductListsManager
              lists={productLists}
              products={products}
              allCategories={allCategories}
              onAddList={onAddList}
              onUpdateList={onUpdateList}
              onDeleteList={onDeleteList}
              onAddCategories={onAddCategories}
              onDeleteCategory={onDeleteCategory}
            />
          </div>
        )}

        {/* ================= TAB: CUSTOMER ACCOUNTS & BLOCKED USERS ================= */}
        {activeTab === 'accounts' && (
          <div key="tab-accounts" className="space-y-5 text-right animate-mac-tab">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-white border border-[#D4AF37]/35 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[11px] text-neutral-500 font-semibold block mb-1">إجمالي الحسابات المسجلة</span>
                  <span className="text-2xl font-bold text-neutral-900 font-mono">{registeredUsers.length}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-neutral-50 border border-[#D4AF37]/35 flex items-center justify-center text-[#B38728]">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-emerald-200 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[11px] text-neutral-500 font-semibold block mb-1">حسابات نشطة ومتاحة للشراء</span>
                  <span className="text-2xl font-bold text-emerald-600 font-mono">{activeUsersList.length}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-red-200 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[11px] text-neutral-500 font-semibold block mb-1">حسابات محظورة من الطلب</span>
                  <span className="text-2xl font-bold text-red-600 font-mono">{blockedUsersList.length}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <Ban className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white border border-[#D4AF37]/35 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search in customers */}
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، أو رقم الهاتف، أو البريد الإلكتروني..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pr-9 pl-4 py-2 bg-neutral-50 border border-[#D4AF37]/35 rounded-xl text-xs text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#D4AF37]"
                  />
                  <Search className="w-4 h-4 text-[#B38728] absolute right-3 top-2.5 pointer-events-none" />
                  {userSearchTerm && (
                    <button
                      onClick={() => setUserSearchTerm('')}
                      className="absolute left-3 top-2.5 text-neutral-400 hover:text-neutral-900"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sub-tabs: All / Active / Blocked */}
                <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-xl border border-[#D4AF37]/25 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setUserFilterTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userFilterTab === 'all'
                        ? 'gold-gradient-bg text-black shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    الكل ({registeredUsers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilterTab('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userFilterTab === 'active'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-emerald-700'
                    }`}
                  >
                    النشطة ({activeUsersList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilterTab('blocked')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userFilterTab === 'blocked'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-red-700'
                    }`}
                  >
                    المحظورين ({blockedUsersList.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Users List */}
            {filteredUsers.length === 0 ? (
              <div className="py-14 text-center space-y-3 bg-white border border-[#D4AF37]/30 rounded-2xl shadow-xs">
                <Users className="w-12 h-12 text-[#B38728] mx-auto" />
                <h4 className="text-base font-bold text-neutral-900">لا توجد حسابات مطابقة للبحث</h4>
                <p className="text-xs text-neutral-500">
                  {userFilterTab === 'blocked' 
                    ? 'لا توجد أي حسابات محظورة حالياً في المتجر. كافة الزبائن لديهم صلاحية الشراء والطلب.' 
                    : 'لم يتم العثور على حسابات مسجلة بهذه البيانات.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredUsers.map((usr) => {
                  const customerOrdersCount = (orders || []).filter(
                    (o) => o?.customer?.phone === usr.phone || o?.customer?.contact === usr.email
                  ).length;

                  return (
                    <div
                      key={usr.id}
                      className={`bg-white rounded-2xl border p-4 sm:p-5 space-y-3.5 transition-all shadow-xs ${
                        usr.isBlocked
                          ? 'border-red-400 bg-red-50/30'
                          : 'border-[#D4AF37]/35 hover:border-[#D4AF37]'
                      }`}
                    >
                      {/* Customer Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                            usr.isBlocked
                              ? 'bg-red-100 border border-red-300 text-red-700'
                              : 'bg-neutral-50 border border-[#D4AF37]/45 text-[#7A5912]'
                          }`}>
                            {usr.name ? usr.name.slice(0, 2).toUpperCase() : 'LC'}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                              <span>{usr.name}</span>
                              {usr.isBlocked && (
                                <span className="px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-100 border border-red-300 rounded-full flex items-center gap-1">
                                  <Ban className="w-3 h-3" />
                                  <span>محظور</span>
                                </span>
                              )}
                            </h4>
                            <span className="text-[11px] text-neutral-500 block font-mono dir-ltr text-right">
                              انضم: {formatDateTime(usr.createdAt)}
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-neutral-50 text-[#7A5912] border border-[#D4AF37]/30 font-mono">
                          {customerOrdersCount} {customerOrdersCount === 1 ? 'طلب' : 'طلبات'}
                        </span>
                      </div>

                      {/* Customer Info Box */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-neutral-50 p-3 rounded-xl border border-[#D4AF37]/25">
                        <div className="flex items-center gap-2 text-neutral-700">
                          <Phone className="w-3.5 h-3.5 text-[#B38728] shrink-0" />
                          <span className="font-mono dir-ltr font-bold text-neutral-900">{usr.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-700 truncate">
                          <Mail className="w-3.5 h-3.5 text-[#B38728] shrink-0" />
                          <span className="font-mono dir-ltr truncate text-neutral-700" title={usr.email}>{usr.email}</span>
                        </div>
                      </div>

                      {/* Block Reason Note if blocked */}
                      {usr.isBlocked && usr.blockReason && (
                        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-[11px] text-red-700">سبب الحظر:</span>
                            <span className="text-xs">{usr.blockReason}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-[#D4AF37]/20 flex items-center justify-between gap-2">
                        {usr.isBlocked ? (
                          <button
                            type="button"
                            onClick={() => handleUnblockUser(usr)}
                            className="flex-1 py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>فك الحظر واستعادة الحساب</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setBlockingUser(usr);
                              setBlockReasonInput('عدم الجدية وتكرار إلغاء الطلبات عند التسليم');
                            }}
                            className="flex-1 py-2 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 hover:border-red-500 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                            <span>حظر هذا الحساب من الطلب</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!usr || !usr.id) return;
                            setUserToDelete(usr);
                          }}
                          className="py-2 px-3 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          title="حذف هذا الحساب نهائياً"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف الحساب</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: STAFF & MANAGERS MANAGEMENT ================= */}
        {activeTab === 'staff' && (
          <div key="tab-staff" className="space-y-6 animate-mac-tab text-right">
            
            {/* Header with Title and Add Button */}
            <div className="bg-white border border-[#D4AF37]/35 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-neutral-900">فريق إدارة وموظفي متجر LC</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-50 text-[#7A5912] border border-[#D4AF37]/40">
                    {staffMembers.length} موظف ومدير
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  يمكنك تغيير الرمز السري لحسابك بشرط إدخال الرمز القديم. كما يمكن للمدير العام إضافة موظفين، وتعديل رموزهم، وحذف حساباتهم.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelfOldPin('');
                    setSelfNewPin('');
                    setSelfConfirmPin('');
                    setSelfPinError(null);
                    setIsSelfChangePinOpen(true);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-[#D4AF37]/60 text-[#7A5912] font-bold text-xs active:scale-95 transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <KeyRound className="w-4 h-4 text-[#B38728]" />
                  <span>تغيير رمز حسابي الحالي 🔑</span>
                </button>

                {isMainAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewStaffName('');
                      setNewStaffPin('');
                      setNewStaffConfirmPin('');
                      setNewStaffRole('manager');
                      setIsAddStaffModalOpen(true);
                    }}
                    className="py-2.5 px-4 rounded-xl gold-gradient-bg text-black font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-4 h-4 text-black" />
                    <span>إضافة مدير أو موظف جديد +</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Session & Device Push Notifications Info Box */}
            <div className="bg-white border border-[#D4AF37]/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1 text-right">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="w-5 h-5 text-[#B38728]" />
                  <span className="text-sm font-bold text-neutral-900">
                    أنت مسجل حالياً باسم: <span className="text-[#7A5912] font-mono">{currentStaffSession?.name || 'المدير العام'}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold">
                    جلسة نشطة ومحفوظة ✓
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  الجلسة محفوظة دائماً على هذا الجهاز. يمكنك تغيير رمز المرور السري الخاص بحسابك في أي وقت بالضغط على الزر بالأعلى.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelfOldPin('');
                    setSelfNewPin('');
                    setSelfConfirmPin('');
                    setSelfPinError(null);
                    setIsSelfChangePinOpen(true);
                  }}
                  className="px-3.5 py-2 bg-neutral-50 border border-[#D4AF37]/60 text-[#7A5912] hover:bg-neutral-100 active:scale-95 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                >
                  <KeyRound className="w-4 h-4 text-[#B38728]" />
                  <span>تغيير رمزي السري</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const granted = await requestNotificationPermission();
                    if (granted) {
                      await sendDeviceNotification('🛍️ طلب جديد تجريبي لمتجر LC!', {
                        body: 'طلب جديد بقيمة 115,000 د.ع من الزبون (علي الكرخي) - بغداد، الكرادة.',
                        type: 'order_new'
                      });
                      showToast('تم إرسال إشعار تجريبي لهاتفك بنجاح 🔔');
                    } else {
                      alert('يرجى السماح بالإشعارات من إعدادات المتصفح');
                    }
                  }}
                  className="px-3.5 py-2 bg-white border border-[#D4AF37]/40 text-neutral-700 hover:text-neutral-900 active:scale-95 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                >
                  <Smartphone className="w-4 h-4 text-[#B38728]" />
                  <span>اختبار رنة الإشعار</span>
                </button>
              </div>
            </div>

            {/* Staff Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffMembers.map((member) => {
                const isCurrent =
                  currentStaffSession &&
                  (currentStaffSession.id === member.id ||
                    currentStaffSession.name.trim().toLowerCase() === member.name.trim().toLowerCase());

                return (
                  <div
                    key={member.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 bg-white ${
                      isCurrent
                        ? 'border-2 border-[#D4AF37] shadow-md'
                        : 'border-[#D4AF37]/35 hover:border-[#D4AF37] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-[#D4AF37]/50 flex items-center justify-center text-lg font-bold text-[#7A5912] shadow-xs shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-neutral-900">{member.name}</h3>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37] text-black font-extrabold shadow-xs">
                                أنت
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#7A5912] font-bold">
                            {member.role === 'admin' ? 'مدير عام (صلاحيات كاملة)' : 'مشرف إدارة ومبيعات'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons based on Role & Current Session */}
                      <div className="flex items-center gap-1.5">
                        {/* If current member, show Change My PIN button */}
                        {isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelfOldPin('');
                              setSelfNewPin('');
                              setSelfConfirmPin('');
                              setSelfPinError(null);
                              setIsSelfChangePinOpen(true);
                            }}
                            title="تغيير الرمز السري لحسابي"
                            className="px-2.5 py-1.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-[#D4AF37]/50 text-[#7A5912] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-[#B38728]" />
                            <span>تغيير رمزي</span>
                          </button>
                        )}

                        {/* If Main Admin and NOT current member, show Admin Reset PIN & Delete buttons */}
                        {isMainAdmin && !isCurrent && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setAdminResetMember(member);
                                setAdminNewPinInput('');
                                setAdminConfirmPinInput('');
                                setAdminResetPinError(null);
                              }}
                              title="تغيير وإعادة تعيين رمز هذا الموظف"
                              className="p-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#7A5912] transition-all cursor-pointer active:scale-95 shadow-xs"
                            >
                              <KeyRound className="w-4 h-4 text-[#B38728]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setStaffToDelete(member)}
                              title="حذف هذا الموظف"
                              className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-all cursor-pointer active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#D4AF37]/20 text-[11px] text-neutral-500 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>تاريخ الإضافة:</span>
                        <span className="text-neutral-800 font-mono font-semibold">
                          {new Date(member.createdAt).toLocaleDateString('ar-IQ')}
                        </span>
                      </div>
                      {member.lastLoginAt && (
                        <div className="flex items-center justify-between">
                          <span>آخر تسجيل دخول:</span>
                          <span className="text-neutral-800 font-mono font-semibold">
                            {new Date(member.lastLoginAt).toLocaleDateString('ar-IQ')} {new Date(member.lastLoginAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>

      {/* Modal: Add New Staff Member */}
      {isAddStaffModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
          onClick={() => setIsAddStaffModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white border border-[#D4AF37]/50 rounded-2xl p-6 text-right space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/25">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#B38728]" />
                <span>إضافة مدير أو موظف جديد للإدارة</span>
              </h3>
              <button
                onClick={() => setIsAddStaffModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewStaff} className="space-y-3.5 text-xs text-right">
              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  اسم الموظف / المدير <span className="text-[#B38728]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد حميد"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-[#D4AF37]/35 rounded-xl text-neutral-900 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  الرمز السري للدخول (PIN) <span className="text-[#B38728]">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="أدخل رمز سري من 4 أرقام أو حروف"
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-[#D4AF37]/35 rounded-xl text-neutral-900 outline-none focus:border-[#D4AF37] font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  تأكيد الرمز السري <span className="text-[#B38728]">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="أعد كتابة الرمز للتأكيد"
                  value={newStaffConfirmPin}
                  onChange={(e) => setNewStaffConfirmPin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-[#D4AF37]/35 rounded-xl text-neutral-900 outline-none focus:border-[#D4AF37] font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  نوع الصلاحية
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as 'admin' | 'manager')}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-[#D4AF37]/35 rounded-xl text-neutral-900 outline-none focus:border-[#D4AF37]"
                >
                  <option value="manager">مشرف مبيعات وتجهيز طلبات</option>
                  <option value="admin">مدير عام (كامل الصلاحيات)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isStaffActionLoading}
                  className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-bold shadow-md hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isStaffActionLoading ? 'جاري الحفظ...' : 'حفظ وإضافة الموظف'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Confirm Delete Staff Member */}
      {staffToDelete && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setStaffToDelete(null)}
        >
          <div 
            className="w-full max-w-md bg-white border border-red-400 rounded-2xl p-6 text-right space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-300 flex items-center justify-center text-red-600 mx-auto">
              <UserMinus className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-neutral-900">
                تأكيد حذف حساب الموظف ({staffToDelete.name})
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا الحساب؟ سيتم إلغاء صلاحياته فوراً وإخراجه من لوحة التحكم، ولن يتمكن من الدخول مجدداً إلا بعد إنشاء حساب جديد له.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-700 hover:text-neutral-900 text-xs font-semibold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={isStaffActionLoading}
                onClick={handleConfirmDeleteStaff}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isStaffActionLoading ? 'جاري الحذف...' : 'تأكيد الحذف نهائياً'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Employee Self Change PIN (Requires Old PIN) */}
      {isSelfChangePinOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
          onClick={() => setIsSelfChangePinOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white border border-[#D4AF37]/50 rounded-2xl p-6 text-right space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/25">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#B38728]" />
                <span>تغيير الرمز السري لحسابي ({currentStaffSession?.name || 'المدير'})</span>
              </h3>
              <button
                onClick={() => setIsSelfChangePinOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              يشترط إدخال الرمز السري القديم المعتمد حالياً، ثم كتابة الرمز السري الجديد وتأكيده بالمثل.
            </p>

            {selfPinError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{selfPinError}</span>
              </div>
            )}

            <form onSubmit={handleSelfChangePin} className="space-y-3.5 text-xs text-right">
              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  الرمز السري القديم / الحالي <span className="text-[#B38728]">*</span>
                </label>
                <input
                  type={showSelfPins ? 'text' : 'password'}
                  required
                  placeholder="أدخل الرمز السري القديم"
                  value={selfOldPin}
                  onChange={(e) => setSelfOldPin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-[#D4AF37]/35 rounded-xl text-neutral-900 outline-none focus:border-[#D4AF37] font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  الرمز السري الجديد (4 أرقام أو أكثر) <span className="text-[#B38728]">*</span>
                </label>
                <input
                  type={showSelfPins ? 'text' : 'password'}
                  required
                  minLength={4}
                  placeholder="أدخل الرمز السري الجديد"
                  value={selfNewPin}
                  onChange={(e) => setSelfNewPin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-[#D4AF37]/35 rounded-xl text-neutral-900 outline-none focus:border-[#D4AF37] font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  تأكيد الرمز السري الجديد <span className="text-[#B38728]">*</span>
                </label>
                <input
                  type={showSelfPins ? 'text' : 'password'}
                  required
                  minLength={4}
                  placeholder="أعد كتابة الرمز الجديد للتأكيد"
                  value={selfConfirmPin}
                  onChange={(e) => setSelfConfirmPin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-[#D4AF37]/35 rounded-xl text-neutral-900 outline-none focus:border-[#D4AF37] font-mono tracking-wider"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="show-self-pins-toggle"
                  checked={showSelfPins}
                  onChange={(e) => setShowSelfPins(e.target.checked)}
                  className="rounded accent-[#D4AF37] cursor-pointer"
                />
                <label htmlFor="show-self-pins-toggle" className="text-neutral-600 text-[11px] cursor-pointer">
                  إظهار الأرقام أثناء الكتابة
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSelfChangePinOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isStaffActionLoading}
                  className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-bold shadow-md hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isStaffActionLoading && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                  <span>{isStaffActionLoading ? 'جاري التحديث...' : 'حفظ وتأكيد الرمز الجديد 🔑'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Main Admin Reset Employee PIN directly */}
      {adminResetMember && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
          onClick={() => setAdminResetMember(null)}
        >
          <div 
            className="w-full max-w-md bg-white border border-[#D4AF37]/50 rounded-2xl p-6 text-right space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/25">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#B38728]" />
                <span>تعديل الرمز السري للموظف ({adminResetMember.name})</span>
              </h3>
              <button
                onClick={() => setAdminResetMember(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-[#D4AF37]/35 text-xs text-[#7A5912]">
              بصفتك المدير العام، يمكنك تعيين رمز سري جديد مباشر لـ <strong>{adminResetMember.name}</strong> ليستخدمه في تسجيل الدخول القادم.
            </div>

            {adminResetPinError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{adminResetPinError}</span>
              </div>
            )}

            <form onSubmit={handleAdminResetStaffPin} className="space-y-3.5 text-xs text-right">
              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  الرمز السري الجديد للموظف <span className="text-[#B38728]">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="أدخل رمز سري جديد للموظف"
                  value={adminNewPinInput}
                  onChange={(e) => setAdminNewPinInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-[#D4AF37]/35 rounded-xl text-neutral-900 outline-none focus:border-[#D4AF37] font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">
                  تأكيد الرمز السري الجديد <span className="text-[#B38728]">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="أعد كتابة الرمز للتأكيد"
                  value={adminConfirmPinInput}
                  onChange={(e) => setAdminConfirmPinInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-[#D4AF37]/35 rounded-xl text-neutral-900 outline-none focus:border-[#D4AF37] font-mono tracking-wider"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdminResetMember(null)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-700 hover:text-neutral-900 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isStaffActionLoading}
                  className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-bold shadow-md hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isStaffActionLoading && <Loader2 className="w-4 h-4 animate-spin text-black" />}
                  <span>{isStaffActionLoading ? 'جاري التحديث...' : 'تحديث رمز الموظف سحابياً 🔑'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Product Modal - Rendered via Portal on document.body so it ALWAYS opens fixed in the center of the user's screen viewport */}
      {editingProduct && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setEditingProduct(null)}
        >
          <div 
            className="w-full max-w-lg bg-white border-2 border-[#D4AF37]/60 rounded-2xl p-5 sm:p-6 text-right space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/25 sticky top-0 bg-white z-10">
              <h3 className="text-sm font-bold text-neutral-900">تعديل بيانات ومخزون وصور المنتج</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">اسم المنتج</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-[#D4AF37]/35 rounded-lg text-neutral-900 outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">السعر بالدينار العراقي (د.ع)</label>
                <input
                  type="number"
                  required
                  min={250}
                  step={250}
                  value={
                    editingProduct.priceUSD > 0 && editingProduct.priceUSD <= 500
                      ? Math.round(editingProduct.priceUSD * 1320)
                      : editingProduct.priceUSD
                  }
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      priceUSD: Number(e.target.value),
                      priceIQD: Number(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 bg-neutral-50 border border-[#D4AF37]/35 rounded-lg text-neutral-900 font-mono outline-none focus:border-[#D4AF37]"
                />
                <span className="text-[10px] text-[#7A5912] font-bold block mt-1">
                  {formatPrice(editingProduct.priceUSD, 'IQD')}
                </span>
              </div>

              {/* Lists checklist in edit modal */}
              {productLists && productLists.length > 0 && (
                <div className="bg-neutral-50 p-3 rounded-xl border border-[#D4AF37]/30 space-y-2">
                  <label className="block text-neutral-700 font-semibold">القوائم والمجموعات لهذا المنتج:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {productLists.map((list) => {
                      const isIncluded = list.productIds.includes(editingProduct.id);
                      return (
                        <button
                          type="button"
                          key={list.id}
                          onClick={() => {
                            if (isIncluded) {
                              onUpdateList({
                                ...list,
                                productIds: list.productIds.filter((id) => id !== editingProduct.id)
                              });
                            } else {
                              onUpdateList({
                                ...list,
                                productIds: [...list.productIds, editingProduct.id]
                              });
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isIncluded
                              ? 'gold-gradient-bg text-black border-[#D4AF37] font-bold'
                              : 'bg-white text-neutral-600 border-[#D4AF37]/30 hover:text-neutral-900'
                          }`}
                        >
                          <span>{isIncluded ? '✓' : '+'}</span>
                          <span>{list.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Edit Images List */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-[#D4AF37]/30 space-y-2.5">
                <label className="block text-neutral-700 font-semibold">صور المنتج:</label>
                
                <div className="flex gap-2">
                  <label className="flex-1 py-1.5 px-3 bg-white hover:bg-neutral-100 rounded-lg text-center cursor-pointer text-xs font-semibold text-neutral-900 border border-[#D4AF37]/40 flex items-center justify-center gap-1.5">
                    {isEditCompressing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#B38728]" />}
                    <span>{isEditCompressing ? 'جاري المعالجة...' : 'رفع صور إضافية'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleEditFilesUpload}
                      disabled={isEditCompressing}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1 flex gap-1">
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="أو رابط صورة https://..."
                      value={editImageUrlInput}
                      onChange={(e) => setEditImageUrlInput(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-[#D4AF37]/35 rounded text-xs text-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddEditImageUrl}
                      className="px-2.5 py-1 gold-gradient-bg text-black rounded text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {(editingProduct.images && editingProduct.images.length > 0 ? editingProduct.images : [editingProduct.image]).map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-[#D4AF37]/35 bg-white aspect-square">
                      <img src={img} alt="" className="w-full h-full object-contain p-1" />
                      <button
                        type="button"
                        onClick={() => handleRemoveEditImage(idx)}
                        className="absolute top-1 left-1 p-1 bg-red-600/90 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="حذف الصورة"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">وصف المنتج</label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value, shortDesc: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-[#D4AF37]/35 rounded-lg text-neutral-900 outline-none resize-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Edit Product Stock / Inventory Section */}
              {(() => {
                const editVariants = getProductVariants(editingProduct);
                const editImages =
                  editingProduct.images && editingProduct.images.length > 0
                    ? editingProduct.images
                    : [editingProduct.image].filter(Boolean);

                return (
                  <>
                    <div className="bg-neutral-50 p-3.5 rounded-xl border border-[#D4AF37]/35 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#B38728]" />
                          <label className="text-neutral-900 font-bold text-xs">
                            الكمية المتوفرة في المخزون (عدد القطع):
                          </label>
                        </div>
                        <span className="text-[11px] font-bold text-[#7A5912]">
                          {editVariants.length > 0
                            ? `مجموع مخزون الخانات (${editVariants.reduce((s, v) => s + v.stockCount, 0)} قطعة)`
                            : (editingProduct.stockCount ?? 10) > 0
                            ? `متوفر (${editingProduct.stockCount ?? 10} قطعة)`
                            : 'نفذ من المخزون (0)'}
                        </span>
                      </div>

                      {editVariants.length > 0 ? (
                        <div className="p-2.5 rounded-lg bg-white border border-[#D4AF37]/35 text-[11px] text-[#7A5912] font-bold flex items-center justify-between">
                          <span>يتم حساب المخزون الكلي تلقائياً من مجموع مخزون الألوان/الخانات بالأسفل</span>
                          <span className="font-mono text-xs text-neutral-900">
                            {editVariants.reduce((s, v) => s + v.stockCount, 0)} قطعة
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = typeof editingProduct.stockCount === 'number' ? editingProduct.stockCount : 10;
                              const next = Math.max(0, cur - 1);
                              setEditingProduct({ ...editingProduct, stockCount: next, inStock: next > 0 });
                            }}
                            className="w-8 h-8 rounded-lg bg-white border border-[#D4AF37]/40 text-neutral-900 font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={typeof editingProduct.stockCount === 'number' ? editingProduct.stockCount : 10}
                            onChange={(e) => {
                              const next = Math.max(0, Math.floor(Number(e.target.value) || 0));
                              setEditingProduct({ ...editingProduct, stockCount: next, inStock: next > 0 });
                            }}
                            className="w-24 px-3 py-1.5 text-center bg-white border border-[#D4AF37]/45 rounded-lg text-neutral-900 font-mono font-bold text-xs outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const cur = typeof editingProduct.stockCount === 'number' ? editingProduct.stockCount : 10;
                              const next = cur + 1;
                              setEditingProduct({ ...editingProduct, stockCount: next, inStock: true });
                            }}
                            className="w-8 h-8 rounded-lg bg-white border border-[#D4AF37]/40 text-[#7A5912] font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>

                          <div className="flex flex-wrap gap-1 mr-auto">
                            {[0, 5, 10, 25, 50].map((qty) => (
                              <button
                                type="button"
                                key={qty}
                                onClick={() => setEditingProduct({ ...editingProduct, stockCount: qty, inStock: qty > 0 })}
                                className="px-2 py-1 rounded bg-white border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[10px] font-mono font-bold text-neutral-700 cursor-pointer"
                              >
                                {qty}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Edit Custom Product Options / Variants with Per-Option Stock & Image */}
                    <div className="bg-neutral-50 p-3.5 rounded-xl border border-[#D4AF37]/45 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-[#B38728]" />
                          <label className="text-neutral-900 font-bold text-xs">
                            خانات / ألوان المنتج مع صورة ومخزون كل لون:
                          </label>
                        </div>
                        <span className="text-[10px] text-[#7A5912] font-bold">
                          {editVariants.length > 0
                            ? `${editVariants.length} خانات مفعلة`
                            : 'لا توجد خانات (لن تظهر للزبون)'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-neutral-700 font-semibold mb-1">
                          عنوان الخانة (مثال: اللون المطلوب / النوع):
                        </label>
                        <input
                          type="text"
                          placeholder="اللون / النوع المطلوب"
                          value={editingProduct.customOptionLabel ?? 'اللون / النوع المطلوب'}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              customOptionLabel: e.target.value
                            })
                          }
                          className="w-full px-3 py-1.5 bg-white border border-[#D4AF37]/35 rounded-lg text-neutral-900 text-xs outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-neutral-700 font-semibold mb-1">
                          إضافة خيار أو لون جديد مع تحديد مخزونه:
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="اسم اللون (مثال: أسود، بنفسجي...)"
                            value={editOptionInput}
                            onChange={(e) => setEditOptionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddEditOptionItems(editOptionInput);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 bg-white border border-[#D4AF37]/35 rounded-lg text-neutral-900 text-xs outline-none focus:border-[#D4AF37]"
                          />
                          <input
                            type="number"
                            min={0}
                            title="مخزون هذا اللون"
                            value={editOptionStockInput}
                            onChange={(e) => setEditOptionStockInput(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                            className="w-16 px-2 py-1.5 text-center bg-white border border-[#D4AF37]/35 rounded-lg text-neutral-900 font-mono font-bold text-xs outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddEditOptionItems(editOptionInput)}
                            className="px-3 py-1.5 gold-gradient-bg text-black font-bold rounded-lg text-xs cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة</span>
                          </button>
                        </div>
                      </div>

                      {editVariants.length > 0 && (
                        <div className="pt-2 border-t border-[#D4AF37]/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-neutral-700 font-bold">
                              الخانات الحالية (اضغط على الصورة لربطها باللون أو عدّل المخزون):
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingProduct({
                                  ...editingProduct,
                                  variantOptions: [],
                                  customOptions: []
                                })
                              }
                              className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                            >
                              حذف جميع الخانات
                            </button>
                          </div>

                          <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                            {editVariants.map((opt, idx) => (
                              <div
                                key={opt.name}
                                className="p-2.5 rounded-xl bg-white border border-[#D4AF37]/40 space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-lg border border-[#D4AF37]/35 bg-[#FAF8F2] flex items-center justify-center overflow-hidden shrink-0 p-0.5">
                                      {opt.image ? (
                                        <img src={opt.image} alt={opt.name} className="w-full h-full object-contain" />
                                      ) : (
                                        <ImageIcon className="w-4 h-4 text-neutral-400" />
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-xs font-extrabold text-neutral-900 block">
                                        {opt.name}
                                      </span>
                                      <span className="text-[10px] text-[#7A5912] font-semibold">
                                        {opt.image ? 'مرتبط بصورة مخصصة ✓' : 'اختر صورة لهذا اللون بالأسفل'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-1 bg-[#FAF7EF] px-1.5 py-0.5 rounded-lg border border-[#D4AF37]/35">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = editVariants.map((v, i) =>
                                            i === idx ? { ...v, stockCount: Math.max(0, v.stockCount - 1) } : v
                                          );
                                          const total = next.reduce((s, v) => s + v.stockCount, 0);
                                          setEditingProduct({
                                            ...editingProduct,
                                            variantOptions: next,
                                            customOptions: next.map((v) => v.name),
                                            stockCount: total,
                                            inStock: total > 0
                                          });
                                        }}
                                        className="w-5 h-5 rounded bg-white border border-[#D4AF37]/40 text-neutral-800 font-bold text-xs flex items-center justify-center cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min={0}
                                        value={opt.stockCount}
                                        onChange={(e) => {
                                          const val = Math.max(0, Math.floor(Number(e.target.value) || 0));
                                          const next = editVariants.map((v, i) =>
                                            i === idx ? { ...v, stockCount: val } : v
                                          );
                                          const total = next.reduce((s, v) => s + v.stockCount, 0);
                                          setEditingProduct({
                                            ...editingProduct,
                                            variantOptions: next,
                                            customOptions: next.map((v) => v.name),
                                            stockCount: total,
                                            inStock: total > 0
                                          });
                                        }}
                                        className="w-10 h-5 text-center bg-white border border-[#D4AF37]/35 rounded font-mono font-bold text-[11px] text-neutral-900 outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = editVariants.map((v, i) =>
                                            i === idx ? { ...v, stockCount: v.stockCount + 1 } : v
                                          );
                                          const total = next.reduce((s, v) => s + v.stockCount, 0);
                                          setEditingProduct({
                                            ...editingProduct,
                                            variantOptions: next,
                                            customOptions: next.map((v) => v.name),
                                            stockCount: total,
                                            inStock: total > 0
                                          });
                                        }}
                                        className="w-5 h-5 rounded bg-white border border-[#D4AF37]/40 text-[#7A5912] font-bold text-xs flex items-center justify-center cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = editVariants.filter((_, i) => i !== idx);
                                        const total = next.reduce((s, v) => s + v.stockCount, 0);
                                        setEditingProduct({
                                          ...editingProduct,
                                          variantOptions: next,
                                          customOptions: next.map((v) => v.name),
                                          stockCount: next.length > 0 ? total : editingProduct.stockCount
                                        });
                                      }}
                                      className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                                      title="حذف هذه الخانة"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Image Picker Row for this option */}
                                <div className="pt-1.5 border-t border-neutral-100 flex items-center gap-2 flex-wrap">
                                  <label className="px-2 py-1 rounded bg-[#FAF7EF] hover:bg-[#FAF4E1] border border-[#D4AF37]/40 text-[#7A5912] font-bold text-[10px] cursor-pointer flex items-center gap-1">
                                    <Upload className="w-3 h-3 text-[#B38728]" />
                                    <span>رفع صورة لـ ({opt.name})</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleUploadEditVariantImage(opt.name, e)}
                                      className="hidden"
                                    />
                                  </label>

                                  {editImages.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-[10px] text-neutral-500">أو اختر من الصور:</span>
                                      {editImages.map((imgUrl, imgIdx) => {
                                        const isLinked = opt.image === imgUrl;
                                        return (
                                          <button
                                            type="button"
                                            key={imgIdx}
                                            onClick={() => {
                                              const next = editVariants.map((v, i) =>
                                                i === idx ? { ...v, image: imgUrl } : v
                                              );
                                              setEditingProduct({
                                                ...editingProduct,
                                                variantOptions: next
                                              });
                                            }}
                                            className={`w-7 h-7 rounded overflow-hidden border-2 transition-all cursor-pointer p-0.5 bg-white ${
                                              isLinked
                                                ? 'border-[#D4AF37] scale-105'
                                                : 'border-neutral-200 opacity-65 hover:opacity-100'
                                            }`}
                                          >
                                            <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Edit Featured in Strip Toggle */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-neutral-50 border border-[#D4AF37]/35 hover:border-[#D4AF37] cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={editingProduct.isFeaturedInStrip ?? false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isFeaturedInStrip: e.target.checked })}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>عرض هذا المنتج في الشريط المتحرك التفاعلي بالصفحة الرئيسية</span>
                </span>
              </label>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#D4AF37]/20 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-900 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-black gold-gradient-bg rounded-lg hover:brightness-110 cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Printable Delivery Waybill Modal */}
      {waybillOrder && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
          onClick={() => setWaybillOrder(null)}
        >
          <div 
            className="w-full max-w-xl bg-white text-black rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-4 border-neutral-300">
              <div className="text-left font-mono text-xs">
                <div>رقم البوليصة: <strong>{waybillOrder.orderNumber}</strong></div>
                <div>التاريخ: {formatDateTime(waybillOrder.createdAt)}</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-brand tracking-wider">متجر LC</div>
                <div className="text-xs text-neutral-600">بوليصة توصيل واستلام كاش (يداً بيد)</div>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-300 space-y-2 text-xs">
              <div className="text-sm font-bold text-neutral-900 border-b border-neutral-300 pb-1">
                بيانات المستلم وعنوان التوصيل:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-neutral-500 block">اسم الزبون:</span>
                  <span className="font-bold text-sm text-neutral-900">{waybillOrder.customer?.name}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">رقم هاتف الزبون:</span>
                  <span className="font-bold font-mono text-base text-neutral-900 dir-ltr">{waybillOrder.customer?.phone}</span>
                </div>
              </div>
              <div>
                <span className="text-neutral-500 block">عنوان التوصيل الدقيق:</span>
                <span className="font-semibold text-neutral-800">{waybillOrder.customer?.address}</span>
              </div>
              {waybillOrder.customer?.notes && (
                <div className="bg-amber-50 border border-amber-200 p-2 rounded text-amber-900 font-medium">
                  ملاحظات إضافية من الزبون: {waybillOrder.customer.notes}
                </div>
              )}
            </div>

            {/* Products List */}
            <div className="space-y-2 text-xs">
              <div className="font-bold border-b pb-1">المنتجات المطلوب تسليمها:</div>
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b text-neutral-600">
                    <th className="py-1">المنتج</th>
                    <th className="py-1 text-center">الكمية</th>
                    <th className="py-1 text-left">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {(waybillOrder.items || []).map((item, i) => (
                    <tr key={i} className="border-b border-neutral-200">
                      <td className="py-2 font-medium">
                        <div className="font-bold text-neutral-900">{item?.product?.name}</div>
                        {item?.selectedOption && (
                          <div className="text-[11px] font-bold text-[#7A5912] mt-0.5">
                            {item.selectedOptionLabel || item.product?.customOptionLabel || 'الخانة المحددة'}: {item.selectedOption}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-center font-bold">× {item?.quantity || 1}</td>
                      <td className="py-2 text-left font-mono">{formatPrice((item?.product?.priceUSD || 0) * (item?.quantity || 1), waybillOrder.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total to Collect */}
            <div className="bg-neutral-50 p-4 rounded-xl border-2 border-[#D4AF37] space-y-2">
              {(() => {
                const isWaybillFreeShipping = waybillOrder.isFreeShipping !== undefined
                  ? waybillOrder.isFreeShipping
                  : (freeShippingConfig.enabled && toIQD(waybillOrder.totalUSD) >= (freeShippingConfig.minOrderAmountIQD || 50000));
                const grandTotal = isWaybillFreeShipping ? toIQD(waybillOrder.totalUSD) : toIQD(waybillOrder.totalUSD) + 5000;
                return (
                  <>
                    <div className="flex items-center justify-between text-xs border-b border-[#D4AF37]/30 pb-1.5">
                      <span className="text-neutral-700 font-semibold">أجور التوصيل:</span>
                      {isWaybillFreeShipping ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                          توصيل مجاني 🎉 (0 د.ع)
                        </span>
                      ) : (
                        <span className="font-bold font-mono text-neutral-800">5,000 د.ع</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <div>
                        <div className="text-xs text-neutral-800 font-bold">المبلغ الكلي المطلوب استلامه نقداً (كاش):</div>
                        <div className="text-[11px] text-neutral-500">الدفع نقداً عند الاستلام يداً بيد</div>
                      </div>
                      <div className="text-2xl font-black font-mono text-neutral-900">
                        {formatPrice(grandTotal, waybillOrder.currency)}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center pt-3 border-t">
              <button
                onClick={() => setWaybillOrder(null)}
                className="px-4 py-2 text-xs text-neutral-600 hover:text-black font-medium cursor-pointer"
              >
                إغلاق
              </button>

              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 gold-gradient-bg text-black text-xs font-bold rounded-lg hover:brightness-110 flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة البوليصة الآن</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Block Customer Confirmation Modal */}
      {blockingUser && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setBlockingUser(null)}
        >
          <div 
            className="w-full max-w-md bg-white border border-red-400 rounded-2xl p-6 text-right space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <Ban className="w-5 h-5" />
                <span>تأكيد حظر حساب الزبون</span>
              </div>
              <button
                onClick={() => setBlockingUser(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-neutral-600 leading-relaxed">
                أنت على وشك حظر حساب الزبون <strong className="text-neutral-900 font-bold">{blockingUser.name}</strong> (رقم: {blockingUser.phone}).
                عند الحظر، لن يتمكن الزبون من تثبيت أي طلبات جديدة في المتجر.
              </p>

              <div>
                <label className="block text-neutral-700 font-bold mb-1.5">
                  سبب الحظر (سيظهر للإدارة وملاحظات الحظر):
                </label>
                <textarea
                  rows={2}
                  value={blockReasonInput}
                  onChange={(e) => setBlockReasonInput(e.target.value)}
                  placeholder="مثال: تكرار عدم استلام الطلبات، رقم غير متاح، إلخ..."
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setBlockingUser(null)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-900 font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isBlockingAction}
                  onClick={handleConfirmBlock}
                  className="px-5 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  <span>{isBlockingAction ? 'جاري الحظر...' : 'تأكيد الحظر الآن'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete User Account Confirmation Modal */}
      {userToDelete && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setUserToDelete(null)}
        >
          <div 
            className="w-full max-w-md bg-white border border-red-400 rounded-3xl p-6 text-right space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <Trash2 className="w-5 h-5" />
                <span>تأكيد حذف حساب الزبون نهائياً</span>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-neutral-600 leading-relaxed">
                أنت على وشك حذف حساب الزبون <strong className="text-neutral-900 font-bold">{userToDelete.name || userToDelete.email || userToDelete.phone}</strong> نهائياً من قاعدة بيانات المتجر.
              </p>
              <p className="text-[11px] text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200 font-semibold">
                ⚠️ تحذير: لا يمكن التراجع عن هذه الخطوة بعد إتمامها.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-neutral-600 hover:text-neutral-900 text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={async () => {
                  if (!userToDelete || !userToDelete.id) return;
                  setIsDeletingUser(true);
                  try {
                    await deleteUserAccountFromFirestore(userToDelete.id).catch(() => {});
                  } catch {
                    // Ignore
                  }
                  setRegisteredUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
                  try {
                    const current = JSON.parse(localStorage.getItem('lc_registered_users') || '[]');
                    const updated = current.filter((u: any) => u.id !== userToDelete.id);
                    localStorage.setItem('lc_registered_users', JSON.stringify(updated));
                  } catch {
                    // Ignore
                  }
                  showToast(`تم حذف الحساب بنجاح`);
                  setUserToDelete(null);
                  setIsDeletingUser(false);
                }}
                className="px-5 py-2.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingUser ? 'جاري الحذف...' : 'تأكيد الحذف نهائياً'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Order Rejection Confirmation Modal */}
      {orderToReject && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setOrderToReject(null)}
        >
          <div 
            className="w-full max-w-md bg-white border-2 border-red-400 rounded-3xl p-6 text-right space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>تأكيد رفض الطلب وإلغاؤه</span>
              </div>
              <button
                onClick={() => setOrderToReject(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Details Brief Card */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-[#D4AF37]/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">رقم الطلب:</span>
                <span className="font-mono font-bold text-[#7A5912] dir-ltr">{orderToReject.orderNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">اسم المشتري:</span>
                <span className="font-bold text-neutral-900">{orderToReject.customer?.name || 'الزبون'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">رقم الهاتف:</span>
                <span className="font-mono text-neutral-700 dir-ltr">{orderToReject.customer?.phone || 'غير محدد'}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-neutral-200">
                <span className="text-neutral-500">المبلغ الكلي للطلب:</span>
                <span className="font-mono font-bold text-red-600 text-sm">{formatPrice(orderToReject.totalUSD, orderToReject.currency)}</span>
              </div>
            </div>

            {/* Rejection Reason Selection */}
            <div className="space-y-2 text-xs">
              <label className="block text-neutral-700 font-bold">
                حدد سبب رفض الطلب:
              </label>
              
              <div className="space-y-1.5">
                {[
                  'الزبون لم يستلم الطلب عند وصول المندوب',
                  'الزبون ألغى الطلب أو غيّر رأيه',
                  'الزبون لا يجيب على اتصالات المندوب (مغلق)',
                  'العنوان غير صحيح أو تعذر الوصول إليه',
                  'سبب آخر...'
                ].map((reason) => (
                  <button
                    type="button"
                    key={reason}
                    onClick={() => {
                      setRejectReason(reason);
                      if (reason !== 'سبب آخر...') {
                        setCustomRejectReason('');
                      }
                    }}
                    className={`w-full text-right p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      rejectReason === reason
                        ? 'bg-red-50 text-red-800 border-red-400 font-bold shadow-xs'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:text-neutral-900 hover:border-neutral-300'
                    }`}
                  >
                    <span>{reason}</span>
                    {rejectReason === reason && <Check className="w-4 h-4 text-red-600" />}
                  </button>
                ))}
              </div>

              {rejectReason === 'سبب آخر...' && (
                <div className="pt-1">
                  <textarea
                    rows={2}
                    placeholder="اكتب سبب الرفض هنا..."
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs outline-none focus:border-red-500 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Warning Message */}
            <p className="text-[11px] text-red-800 leading-relaxed bg-red-50 p-2.5 rounded-xl border border-red-200">
              ⚠️ عند تأكيد الرفض، سيتم نقل الطلب إلى قسم <strong>"الطلبات المرفوضة"</strong> وإرجاع الكميات للمخزون تلقائياً.
            </p>

            {/* Confirmation & Cancel Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setOrderToReject(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold transition cursor-pointer"
              >
                تراجع / إلغاء
              </button>
              
              <button
                type="button"
                disabled={isRejectingOrder}
                onClick={async () => {
                  if (!orderToReject) return;
                  setIsRejectingOrder(true);
                  try {
                    onUpdateOrderStatus(orderToReject.id, 'rejected');
                    const chosenReason = rejectReason === 'سبب آخر...' && customRejectReason.trim() 
                      ? customRejectReason.trim() 
                      : rejectReason;
                    showToast(`تم رفض الطلب #${orderToReject.orderNumber} بنجاح (${chosenReason})`);
                    setOrderToReject(null);
                  } catch (e) {
                    alert('حدث خطأ أثناء رفض الطلب');
                  } finally {
                    setIsRejectingOrder(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <XCircle className="w-4 h-4" />
                <span>{isRejectingOrder ? 'جاري الرفض...' : 'تأكيد رفض الطلب الآن'}</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Notification Center Modal for Admin */}
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        isAdmin={true}
      />

    </div>
  );
};
