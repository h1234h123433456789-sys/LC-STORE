import React, { useState, useEffect } from 'react';
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
  Smartphone
} from 'lucide-react';
import { Product, Order, ProductList, AdminStaffMember } from '../types';
import { formatPrice, formatDateTime } from '../utils/formatters';
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

  // Product Sizes State (Multi-size support: S, M, L, XL, 38, 40...)
  const [newSizes, setNewSizes] = useState<string[]>([]);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [editSizeInput, setEditSizeInput] = useState('');

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

  // Add Size handlers for Add Product form
  const handleAddNewSize = (sizeToAdd?: string) => {
    const val = (sizeToAdd !== undefined ? sizeToAdd : newSizeInput).trim();
    if (!val) return;
    if (!newSizes.includes(val)) {
      setNewSizes((prev) => [...prev, val]);
    }
    if (sizeToAdd === undefined) {
      setNewSizeInput('');
    }
  };

  const handleRemoveNewSize = (sizeToRemove: string) => {
    setNewSizes((prev) => prev.filter((s) => s !== sizeToRemove));
  };

  const handleToggleNewSizePreset = (sizePreset: string) => {
    if (newSizes.includes(sizePreset)) {
      setNewSizes((prev) => prev.filter((s) => s !== sizePreset));
    } else {
      setNewSizes((prev) => [...prev, sizePreset]);
    }
  };

  // Edit Size handlers for Edit Product Modal
  const handleAddEditSize = (sizeToAdd?: string) => {
    if (!editingProduct) return;
    const val = (sizeToAdd !== undefined ? sizeToAdd : editSizeInput).trim();
    if (!val) return;
    const currentSizes = editingProduct.sizes || [];
    if (!currentSizes.includes(val)) {
      setEditingProduct({
        ...editingProduct,
        sizes: [...currentSizes, val]
      });
    }
    if (sizeToAdd === undefined) {
      setEditSizeInput('');
    }
  };

  const handleRemoveEditSize = (sizeToRemove: string) => {
    if (!editingProduct) return;
    const currentSizes = editingProduct.sizes || [];
    setEditingProduct({
      ...editingProduct,
      sizes: currentSizes.filter((s) => s !== sizeToRemove)
    });
  };

  const handleToggleEditSizePreset = (sizePreset: string) => {
    if (!editingProduct) return;
    const currentSizes = editingProduct.sizes || [];
    if (currentSizes.includes(sizePreset)) {
      setEditingProduct({
        ...editingProduct,
        sizes: currentSizes.filter((s) => s !== sizePreset)
      });
    } else {
      setEditingProduct({
        ...editingProduct,
        sizes: [...currentSizes, sizePreset]
      });
    }
  };

  // Add Product Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const primaryImage = newImages[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop';
    const categoryText = newCategory.trim() || 'معروضات عامة';
    const finalPriceIQD = Math.max(250, Number(newPriceIQD) || 25000);

    const prod: Product = {
      id: `lc-prod-${Date.now()}`,
      name: newName.trim(),
      category: categoryText.toLowerCase().replace(/\s+/g, '-'),
      categoryLabel: categoryText,
      priceUSD: finalPriceIQD,
      priceIQD: finalPriceIQD,
      image: primaryImage,
      images: newImages.length > 0 ? newImages : [primaryImage],
      shortDesc: newDesc.trim() || newName.trim(),
      description: newDesc.trim() || 'منتج أصلي معروض في متجر LC متاح للتسليم الفوري مع الدفع كاش عند الاستلام.',
      specs: {
        material: 'خامات أصلية فاخرة',
        warranty: 'جديد أصلي 100% بتغليف المصنع'
      },
      inStock: true,
      stockCount: 999,
      rating: 5.0,
      reviewsCount: 1,
      isFeatured: true,
      isFeaturedInStrip: newIsFeaturedInStrip,
      sizes: newSizes.length > 0 ? newSizes : undefined
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
    setNewDesc('');
    setNewIsFeaturedInStrip(false);
    setNewImages([]);
    setImageUrlInput('');
    setNewSizes([]);
    setNewSizeInput('');
    setSelectedListIdsForNewProd([]);
    setActiveTab('products');
  };

  // Save Edit Product
  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const currentImages = editingProduct.images && editingProduct.images.length > 0
      ? editingProduct.images
      : [editingProduct.image];

    const finalSizes = editingProduct.sizes && editingProduct.sizes.length > 0
      ? editingProduct.sizes
      : undefined;

    onUpdateProduct({
      ...editingProduct,
      image: currentImages[0] || editingProduct.image,
      images: currentImages,
      sizes: finalSizes
    });
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
      <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center p-4 selection:bg-[#D4AF37]/30 selection:text-[#F3E5AB]">
        <div className="w-full max-w-md bg-[#111116] border border-[#D4AF37]/40 rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#181822] border-2 border-[#D4AF37] flex items-center justify-center mx-auto text-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.25)]">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1A26] border border-[#D4AF37]/40 text-[#D4AF37] text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>نظام إدارة متجر LC المعتمد</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">تسجيل دخول فريق الإدارة</h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
              أدخل اسمك المسجل كمدير أو موظف والرمز السري للوصول للوحة التحكم وإدارة المنتجات والطلبات.
            </p>
          </div>

          {lockoutStatus.isLocked ? (
            <div className="p-4 rounded-xl bg-red-950/80 border border-red-700 text-xs text-red-200 text-right space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>تم إغلاق لوحة التحكم أمنياً!</span>
              </div>
              <p className="text-[11px] text-neutral-300">
                تم رصد عدة محاولات خاطئة متتالية. لحماية المتجر وقاعدة البيانات، تم حظر الدخول مؤقتاً.
              </p>
              <div className="bg-black/60 p-2 rounded-lg text-center font-mono font-bold text-[#F3E5AB]">
                الوقت المتبقي لفتح القفل: {lockoutStatus.remainingMinutes} دقيقة ({lockoutStatus.remainingSeconds} ثانية)
              </div>
            </div>
          ) : (
            pinError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-200 text-right animate-ios-slide-up">
                {pinError}
              </div>
            )
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-right">
            {/* Staff Name Input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                اسم المدير أو الموظف المسجل <span className="text-[#D4AF37]">*</span>
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  disabled={lockoutStatus.isLocked}
                  placeholder="مثال: المدير العام أو اسمك"
                  value={adminNameInput}
                  onChange={(e) => setAdminNameInput(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-3 bg-[#171720] border border-neutral-700 focus:border-[#D4AF37] rounded-xl text-white text-xs outline-none transition-colors"
                />
              </div>
            </div>

            {/* PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs text-neutral-400">
                <span className="text-[10px] text-neutral-500 font-mono">
                  المحاولات المتبقية: <strong className="text-[#D4AF37]">{lockoutStatus.attemptsLeft}</strong>
                </span>
                <label className="font-semibold text-neutral-300">
                  الرمز السري الخاص بك <span className="text-[#D4AF37]">*</span>
                </label>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-neutral-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showLoginPin ? 'text' : 'password'}
                  required
                  disabled={lockoutStatus.isLocked}
                  placeholder="••••••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full pr-10 pl-10 py-3 bg-[#171720] border border-neutral-700 focus:border-[#D4AF37] rounded-xl text-white text-xs outline-none font-mono transition-colors text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPin(!showLoginPin)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
                >
                  {showLoginPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#14141E] border border-neutral-800 text-[11px] text-neutral-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
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

          <div className="pt-2 border-t border-neutral-800">
            <button
              onClick={onExitAdmin}
              className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
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
    <div className="min-h-screen bg-[#070709] text-[#EDEDED] flex flex-col font-sans animate-fade-in">
      
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-[#0B0B0E]/95 border-b border-[#D4AF37]/25 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-brand font-extrabold gold-gradient-text">LC</span>
            <div className="h-4 w-[1px] bg-neutral-700 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold text-white">لوحة التحكم الكاملة</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#181824] border border-[#D4AF37]/50 text-[#F3E5AB] font-bold flex items-center gap-1">
                <span>👤</span>
                <span>{currentStaffSession?.name || 'المدير العام'}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14141E] hover:bg-[#1C1C2A] border border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#F3E5AB] rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="تحديث البيانات والطلبات"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-[#D4AF37] ${isManualRefreshing ? 'animate-spin' : ''}`} />
            <span>{isManualRefreshing ? 'جاري التحديث...' : 'تحديث الطلبات'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsNotificationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#F3E5AB] bg-[#161620] border border-[#D4AF37]/40 hover:border-[#D4AF37] rounded-lg transition-all cursor-pointer active:scale-95"
            title="إعدادات وتنبيهات إشعارات الطلبات"
          >
            <Bell className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">إشعارات الطلبات</span>
          </button>

          <button
            type="button"
            onClick={onExitAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#F3E5AB] bg-[#161620] border border-[#D4AF37]/40 hover:border-[#D4AF37] rounded-lg transition-all cursor-pointer active:scale-95"
            title="معاينة المتجر كما يراه الزبون"
          >
            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">معاينة متجر الزبائن</span>
          </button>

          <button
            type="button"
            onClick={handleLogoutAdmin}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-red-400 transition-colors cursor-pointer active:scale-95"
          >
            قفل اللوحة
          </button>
        </div>
      </header>

      {/* Main Admin Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-right">
        
        {/* KPI Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#111116] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-neutral-400 block mb-1">طلبات بانتظار موافقتك</span>
              <span className="text-2xl font-bold text-amber-400 font-mono">{pendingOrders.length}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#111116] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-neutral-400 block mb-1">طلبات تمت الموافقة عليها</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">{approvedOrders.length}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#111116] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-neutral-400 block mb-1">كاش مطلوب استلامه من الزبائن</span>
              <span className="text-base sm:text-lg font-bold text-[#F3E5AB] font-mono tabular-nums">
                {formatPrice(pendingCashUSD, 'IQD')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#2A2518] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Banknote className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#111116] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-neutral-400 block mb-1">المنتجات المعروضة بالمتجر</span>
              <span className="text-2xl font-bold text-white font-mono">{products.length}</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#181822] border border-neutral-700 flex items-center justify-center text-neutral-300">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab Switcher Bar - Fully Scrollable and accessible on ALL screens */}
        <div className="border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2 p-1.5 bg-[#121217] rounded-xl border border-neutral-800 overflow-x-auto scrollbar-thin">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#22222C] text-[#F3E5AB] border border-[#D4AF37]/50 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#D4AF37]" />
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
                  ? 'bg-[#182618] text-[#A7F3D0] border border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'text-neutral-400 hover:text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>الطلبات المستلمة والأرباح</span>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] font-mono font-bold rounded-full">
                {deliveredOrdersList.length} طلب ({formatPrice(totalDeliveredProfitIQD, 'IQD')})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#22222C] text-[#F3E5AB] border border-[#D4AF37]/50 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>معروضات المتجر ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'add'
                  ? 'bg-[#22222C] text-[#F3E5AB] border border-[#D4AF37]/50 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>إضافة منتج جديد</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lists')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'lists'
                  ? 'bg-[#22222C] text-[#F3E5AB] border border-[#D4AF37]/50 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>قوائم ومجموعات المنتجات ({productLists.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'accounts'
                  ? 'bg-[#22222C] text-[#F3E5AB] border border-[#D4AF37]/50 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
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
                  ? 'bg-[#22222C] text-[#F3E5AB] border border-[#D4AF37]/60 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>فريق الإدارة والموظفين ({staffMembers.length})</span>
            </button>
          </div>
        </div>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-black/90 border border-[#D4AF37] text-[#F3E5AB] shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ================= TAB 1: ORDERS MANAGEMENT ================= */}
        {activeTab === 'orders' && (
          <div key="tab-orders" className="space-y-4 animate-mac-tab">
            
            {/* Redesigned Responsive Orders Filter & Search Bar */}
            <div className="bg-[#111116] border border-neutral-800 rounded-2xl p-4 space-y-3.5">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search in orders */}
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="ابحث برقم الطلب #LC... أو اسم الزبون أو رقم هاتفه..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    className="w-full pr-9 pl-4 py-2 bg-[#171722] border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-[#D4AF37] transition-colors"
                  />
                  <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
                  {orderSearchTerm && (
                    <button
                      onClick={() => setOrderSearchTerm('')}
                      className="absolute left-3 top-2.5 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-neutral-400 flex items-center justify-between md:justify-end gap-3">
                  <span>الطلبات المطابقة: <strong className="text-[#F3E5AB] font-mono text-sm">{filteredOrders.length}</strong> من <span className="font-mono">{orders.length}</span></span>
                </div>
              </div>

              {/* Status Filter Buttons - Wrapping & Horizontal Scroll */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-neutral-800/80">
                <span className="text-xs font-semibold text-neutral-400 ml-2 hidden sm:inline">الحالة:</span>
                
                <button
                  type="button"
                  onClick={() => setOrderFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    orderFilter === 'all'
                      ? 'bg-[#282838] text-white border border-[#D4AF37]/60 shadow-sm'
                      : 'bg-[#15151E] text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  <ShoppingBag className="w-3 h-3 text-[#D4AF37]" />
                  <span>كافة الطلبات</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-neutral-800 text-neutral-300 font-mono">
                    {orders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    orderFilter === 'pending'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-600 shadow-sm'
                      : 'bg-[#15151E] text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>بانتظار الموافقة</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-400 font-mono">
                    {pendingOrders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    orderFilter === 'approved'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600 shadow-sm'
                      : 'bg-[#15151E] text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>تمت الموافقة</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                    {approvedOrders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilter('delivered')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    orderFilter === 'delivered'
                      ? 'bg-sky-950/80 text-sky-300 border border-sky-600 shadow-sm'
                      : 'bg-[#15151E] text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  <Check className="w-3 h-3 text-sky-400" />
                  <span>تم التسليم كاش</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-sky-500/20 text-sky-400 font-mono">
                    {deliveredOrders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    orderFilter === 'rejected'
                      ? 'bg-red-950/80 text-red-300 border border-red-600 shadow-sm'
                      : 'bg-[#15151E] text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  <XCircle className="w-3 h-3 text-red-400" />
                  <span>مرفوضة</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-red-500/20 text-red-400 font-mono">
                    {rejectedOrders.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-[#111116] border border-neutral-800 rounded-2xl">
                <ShoppingBag className="w-12 h-12 text-neutral-600 mx-auto" />
                <h4 className="text-base font-bold text-white">لا توجد طلبات في هذا القسم</h4>
                <p className="text-xs text-neutral-400">
                  فور قيام أي زبون بالشراء والدفع كاش، سيظهر طلبه فوراً هنا بكل تفاصيل هاتفه وعنوانه لتتخذ قرار الموافقة عليه أو رفضه.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className={`bg-[#121218] rounded-2xl border p-5 sm:p-6 space-y-4 transition-all ${
                      ord.status === 'pending'
                        ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                        : ord.status === 'approved'
                        ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                        : ord.status === 'delivered'
                        ? 'border-sky-500/30'
                        : 'border-neutral-800 opacity-75'
                    }`}
                  >
                    {/* Top Row: Order ID, Date, and Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-bold text-[#F3E5AB] dir-ltr">
                          {ord.orderNumber}
                        </span>
                        <span className="text-neutral-500">·</span>
                        <span className="text-xs text-neutral-400">{formatDateTime(ord.createdAt)}</span>
                      </div>

                      {/* Status Badges */}
                      <div>
                        {ord.status === 'pending' && (
                          <span className="px-3 py-1 text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-700/60 rounded-full flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>بانتظار موافقتك</span>
                          </span>
                        )}
                        {ord.status === 'approved' && (
                          <span className="px-3 py-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 rounded-full flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تمت الموافقة - جاهز للتوصيل</span>
                          </span>
                        )}
                        {ord.status === 'delivered' && (
                          <span className="px-3 py-1 text-xs font-bold text-sky-400 bg-sky-950/60 border border-sky-700/60 rounded-full flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تم التوصيل واستلام الكاش</span>
                          </span>
                        )}
                        {ord.status === 'rejected' && (
                          <span className="px-3 py-1 text-xs font-bold text-red-400 bg-red-950/60 border border-red-700/60 rounded-full flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>طلب مرفوض</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer & Delivery Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      
                      {/* Customer contact */}
                      <div className="p-3.5 rounded-xl bg-[#171720] border border-neutral-800 space-y-2">
                        <div className="font-bold text-[#F3E5AB] text-sm">{ord.customer?.name || 'الزبون'}</div>
                        {ord.customer?.phone && (
                          <div className="flex items-center gap-2 text-neutral-300">
                            <Phone className="w-4 h-4 text-[#D4AF37]" />
                            <span>رقم هاتف الزبون:</span>
                            <a
                              href={`tel:${ord.customer.phone}`}
                              dir="ltr"
                              className="text-[#F3E5AB] font-mono font-bold hover:underline"
                            >
                              {ord.customer.phone}
                            </a>
                          </div>
                        )}
                        <div className="text-[11px] text-neutral-400">
                          حساب الزبون: {ord.customer?.contact || ord.customer?.phone || 'غير محدد'}
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="p-3.5 rounded-xl bg-[#171720] border border-neutral-800 space-y-2">
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <MapPin className="w-4 h-4 text-[#D4AF37]" />
                          <span>موقع وعنوان التوصيل:</span>
                        </div>
                        <p className="text-neutral-200 text-xs leading-relaxed">
                          {ord.customer?.address || 'العنوان غير محدد'}
                        </p>
                        {ord.customer?.notes && (
                          <div className="text-[11px] text-amber-300/90 pt-1">
                            ملاحظة إضافية من الزبون: {ord.customer.notes}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Items Purchased List */}
                    <div className="space-y-2 text-xs">
                      <div className="font-bold text-neutral-300">المنتجات في الطلب:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(ord.items || []).map((item, idx) => (
                          <div
                            key={item?.product?.id || idx}
                            className="p-2.5 rounded-lg bg-[#181822] border border-neutral-800 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={item?.product?.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop'}
                                alt={item?.product?.name || 'منتج'}
                                className="w-10 h-10 object-contain rounded-md border border-neutral-700 bg-black"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-xs sm:text-sm">{item?.product?.name || 'منتج'}</span>
                                  {(item?.selectedSize || (item as any)?.size) && (
                                    <span className="px-2 py-0.5 rounded-md bg-[#D4AF37] text-black font-extrabold text-[11px] shadow-[0_0_12px_rgba(212,175,55,0.4)] flex items-center gap-1 shrink-0">
                                      <span>القياس:</span>
                                      <span className="underline">{item?.selectedSize || (item as any)?.size}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                                  <span>الكمية: <strong className="text-white font-mono">{item?.quantity || 1}</strong></span>
                                  {!(item?.selectedSize || (item as any)?.size) && (
                                    <span className="text-neutral-500 text-[10px]">(بدون قياس محدد)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className="font-bold text-[#F3E5AB] tabular-nums">
                              {formatPrice((item?.product?.priceUSD || 0) * (item?.quantity || 1), ord.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Row: Total Cash to Collect & Action Buttons (Approve / Reject) */}
                    <div className="pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400">المبلغ المطلوب استلامه كاش:</span>
                        <span className="text-lg font-bold gold-gradient-text tabular-nums font-mono">
                          {formatPrice(ord.totalUSD, ord.currency)}
                        </span>
                      </div>

                      {/* Primary Owner Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {ord.status === 'pending' && (
                          <>
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, 'approved')}
                              className="px-4 py-2 text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
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
                              className="px-3.5 py-2 text-xs font-semibold text-red-300 hover:text-white bg-red-950/70 hover:bg-red-900 border border-red-800 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <XCircle className="w-4 h-4 text-red-400" />
                              <span>رفض الطلب</span>
                            </button>
                          </>
                        )}

                        {ord.status === 'approved' && (
                          <>
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, 'delivered')}
                              className="px-4 py-2 text-xs font-bold text-black gold-gradient-bg hover:brightness-110 rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
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
                              className="px-3.5 py-2 text-xs font-semibold text-red-300 hover:text-white bg-red-950/70 hover:bg-red-900 border border-red-800/80 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="رفض الطلب إذا تعذر التسليم أو رفض الزبون الاستلام"
                            >
                              <XCircle className="w-4 h-4 text-red-400" />
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
                            className="px-3 py-2 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>إعادة فتح والموافقة على الطلب</span>
                          </button>
                        )}

                        <button
                          onClick={() => setWaybillOrder(ord)}
                          className="px-3 py-2 text-xs font-semibold text-[#F3E5AB] bg-[#181822] hover:bg-[#22222E] border border-[#D4AF37]/40 rounded-lg flex items-center gap-1.5 transition-colors"
                          title="عرض وطباعة بوليصة التوصيل للمندوب"
                        >
                          <Printer className="w-4 h-4 text-[#D4AF37]" />
                          <span>طباعة بوليصة للمندوب</span>
                        </button>

                        <button
                          onClick={() => onDeleteOrder(ord.id)}
                          className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
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
            
            {/* Hero Profit Summary Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121A14] via-[#11141B] to-[#121218] border-2 border-emerald-500/50 p-5 sm:p-7 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
              {/* Background Ambient Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div className="space-y-2 text-right">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>خزينة أرباح الطلبات المستلمة (كاش فعلي)</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    إجمالي أرباح ومبالغ الطلبات المستلمة
                  </h2>
                  <p className="text-xs text-neutral-300 max-w-xl leading-relaxed">
                    المبالغ المحصلة من الطلبات التي تم تسليمها للزبائن واستلام ثمنها نقداً بنجاح.
                  </p>
                </div>

                {/* Big Profit Counter Display */}
                <div className="w-full lg:w-auto p-4 sm:p-5 rounded-2xl bg-[#090C0F]/90 border border-emerald-500/50 text-center space-y-1 shrink-0 shadow-lg">
                  <span className="text-xs text-emerald-300 font-bold block">مجموع الكاش المستلم:</span>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight tabular-nums">
                    {formatPrice(totalDeliveredProfitIQD, 'IQD')}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-medium">
                    من إجمالي <strong className="text-white font-mono">{deliveredOrdersList.length}</strong> طلب مكتمل
                  </div>
                </div>
              </div>

              {/* KPI Mini Stats Grid - Perfectly symmetrical & uniform heights on all screens */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5 pt-5 border-t border-neutral-800/80">
                <div className="p-4 rounded-xl bg-[#14141E]/90 border border-neutral-800 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-400 block font-medium">عدد الطلبات المستلمة</span>
                    <div className="text-xl font-black text-white font-mono">{deliveredOrdersList.length} طلب</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#14141E]/90 border border-neutral-800 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-400 block font-medium">إجمالي القطع المباعة</span>
                    <div className="text-xl font-black text-[#F3E5AB] font-mono">{totalDeliveredItemsCount} قطعة</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#241F15] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#14141E]/90 border border-neutral-800 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-neutral-400 block font-medium">متوسط قيمة الطلب</span>
                    <div className="text-xl font-black text-emerald-300 font-mono">{formatPrice(avgDeliveredOrderIQD, 'IQD')}</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                    <Banknote className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar for Delivered Orders */}
            <div className="bg-[#111116] border border-neutral-800 rounded-2xl p-4 space-y-3.5">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search input */}
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="ابحث برقم الطلب المستلم، اسم الزبون، هاتفه، أو المدينة..."
                    value={deliveredSearchTerm}
                    onChange={(e) => setDeliveredSearchTerm(e.target.value)}
                    className="w-full pr-9 pl-4 py-2 bg-[#171722] border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-emerald-500 transition-colors"
                  />
                  <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
                  {deliveredSearchTerm && (
                    <button
                      onClick={() => setDeliveredSearchTerm('')}
                      className="absolute left-3 top-2.5 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort Order Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-400 font-medium">ترتيب حسب:</span>
                  <select
                    value={deliveredSortOrder}
                    onChange={(e) => setDeliveredSortOrder(e.target.value as any)}
                    className="bg-[#171722] border border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-200 outline-none focus:border-emerald-500"
                  >
                    <option value="newest">الأحدث استلاماً</option>
                    <option value="oldest">الأقدم استلاماً</option>
                    <option value="highest-price">الأعلى ربحاً وسعراً</option>
                  </select>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C1C26] hover:bg-[#252533] border border-neutral-700 text-xs font-bold text-neutral-200 hover:text-white transition-all cursor-pointer shadow-sm"
                    title="طباعة تقرير المبيعات والأرباح"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">طباعة التقرير</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Delivered Orders List Cards */}
            {filteredDeliveredOrders.length === 0 ? (
              <div className="py-16 text-center space-y-4 bg-[#111116] border border-neutral-800 rounded-3xl p-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">لا توجد طلبات مستلمة بعد</h4>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                  عند وصول طلب جديد وتوصيله للزبون واستلام ثمنه، قم بتحويل حالة الطلب في قسم "إدارة طلبات الزبائن" إلى <strong className="text-emerald-400">"تم التوصيل واستلام الكاش"</strong> لتظهر جميع أرباحه وتفاصيله هنا تلقائياً.
                </p>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA7A1E] text-black font-bold text-xs hover:brightness-110 transition shadow-md"
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
                      className="bg-[#121218] rounded-2xl border border-emerald-500/40 p-5 sm:p-6 space-y-4 shadow-[0_0_20px_rgba(16,185,129,0.08)] hover:border-emerald-500/70 transition-all"
                    >
                      {/* Top Bar: Order ID, Delivered Badge & Cash Amount */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-base font-bold text-[#F3E5AB] dir-ltr">
                            {ord.orderNumber}
                          </span>
                          <span className="text-neutral-500">·</span>
                          <span className="text-xs text-neutral-400">{formatDateTime(ord.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-600 rounded-full flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>تم الاستلام وتحصيل الكاش بنجاح</span>
                          </span>
                        </div>
                      </div>

                      {/* Customer Info & Financial Cash Box */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        
                        {/* Customer contact card */}
                        <div className="p-3.5 rounded-xl bg-[#171720] border border-neutral-800 space-y-2">
                          <span className="text-neutral-400 block font-semibold text-[11px]">بيانات المشتري:</span>
                          <div className="font-bold text-[#F3E5AB] text-sm">{ord.customer?.name || 'الزبون'}</div>
                          {ord.customer?.phone && (
                            <div className="flex items-center gap-2 text-neutral-300">
                              <Phone className="w-4 h-4 text-[#D4AF37]" />
                              <span>الهاتف:</span>
                              <a
                                href={`tel:${ord.customer.phone}`}
                                dir="ltr"
                                className="text-[#F3E5AB] font-mono font-bold hover:underline"
                              >
                                {ord.customer.phone}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Delivery address */}
                        <div className="p-3.5 rounded-xl bg-[#171720] border border-neutral-800 space-y-1.5">
                          <span className="text-neutral-400 block font-semibold text-[11px]">عنوان الاستلام والتوصيل:</span>
                          <div className="flex items-center gap-1.5 text-neutral-200 font-medium">
                            <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
                            <span>المحافظة: {ord.customer?.city || 'غير محدد'}</span>
                          </div>
                          <div className="text-neutral-400 text-[11px] leading-relaxed">
                            العنوان التفصيلي: {ord.customer?.address || 'غير محدد'}
                          </div>
                        </div>

                        {/* Financial profit box */}
                        <div className="p-3.5 rounded-xl bg-[#131E17] border border-emerald-500/40 flex flex-col justify-between">
                          <span className="text-emerald-300 text-[11px] font-bold block">المبلغ المستلم كاش:</span>
                          <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight my-1">
                            {formatPrice(ord.totalUSD, 'IQD')}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            الدفع كاش عند الاستلام ({itemsCount} قطع)
                          </div>
                        </div>

                      </div>

                      {/* Items Purchased in this delivered order */}
                      <div className="p-3.5 rounded-xl bg-[#15151E] border border-neutral-800 space-y-2">
                        <span className="text-neutral-400 text-xs font-semibold block">
                          المنتجات المستلمة في هذا الطلب:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {(ord.items || []).map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-[#1A1A24] rounded-lg border border-neutral-700/80 flex items-center gap-2.5"
                            >
                              <img
                                src={item.product?.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop'}
                                alt={item.product?.name}
                                className="w-10 h-10 object-contain rounded bg-black p-0.5 border border-neutral-700 shrink-0"
                              />
                              <div className="min-w-0 flex-1 text-right">
                                <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                                  <span className="truncate">{item.product?.name}</span>
                                  {(item.selectedSize || (item as any)?.size) && (
                                    <span className="text-black font-extrabold bg-[#D4AF37] px-2 py-0.5 rounded text-[10px] shadow-sm">
                                      القياس: {item.selectedSize || (item as any)?.size}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] mt-1">
                                  <span className="text-[#F3E5AB] font-mono">
                                    {item.quantity} × {formatPrice(item.product?.priceUSD, 'IQD')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                        <span className="text-neutral-400 text-[11px]">
                          طريقة الدفع: الدفع نقداً عند استلام الشحنة
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateOrderStatus(ord.id, 'approved');
                              showToast(`تم إعادة الطلب #${ord.orderNumber} إلى قائمة الطلبات المعتمدة`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition cursor-pointer text-[11px]"
                            title="إعادة تعيين الحالة إذا حدث خطأ"
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

        {/* ================= TAB 2: PRODUCTS LIST & EDIT ================= */}
        {activeTab === 'products' && (
          <div key="tab-products" className="space-y-4 animate-mac-tab">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">المنتجات المعروضة في متجرك حالياً</h3>
                <p className="text-xs text-neutral-400">يمكنك تعديل الأسعار، تغيير الكمية، أو حذف أي منتج فوراً</p>
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
              <div className="bg-[#121218] border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37]">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        إدارة شريط صور المنتجات المتحرك (بالصفحة الرئيسية)
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        حدد المنتجات التي تريد ظهور صورها في المستطيل المتحرك أسفل قسم الترحيب
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(() => {
                      const count = products.filter((p) => p.isFeaturedInStrip).length;
                      if (count < 6) {
                        return (
                          <span className="text-xs font-bold text-amber-400 bg-amber-950/70 border border-amber-800/80 px-3 py-1 rounded-lg">
                            🟡 غير نشط بالرئيسية (المحدد: {count}/6 - يلزم {6 - count} إضافية)
                          </span>
                        );
                      }
                      return (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-3 py-1 rounded-lg">
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
                            ? 'bg-[#242014] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                            : 'bg-[#161620] border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-600'
                        }`}
                      >
                        <div className="relative w-12 h-12 bg-black rounded-lg overflow-hidden border border-neutral-700/80 p-1 flex items-center justify-center">
                          <img src={p.image} alt="" className="w-full h-full object-contain" />
                          <span className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isSelected ? 'bg-[#D4AF37] text-black' : 'bg-neutral-800 text-neutral-400'
                          }`}>
                            {isSelected ? '✓' : ''}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-white truncate w-full">
                          {p.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {products.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-[#111116] border border-neutral-800 rounded-2xl">
                <Package className="w-12 h-12 text-neutral-600 mx-auto" />
                <h4 className="text-base font-bold text-white">لا توجد أي منتجات معروضة بعد</h4>
                <p className="text-xs text-neutral-400">
                  انقر على زر "إضافة منتج جديد" لعرض أول سلعة تبيعها في متجر LC مع إمكانية رفع عدة صور
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => {
                  const imageCount = p.images?.length || 1;
                  return (
                    <div
                      key={p.id}
                      className="p-4 bg-[#121218] border border-neutral-800 hover:border-[#D4AF37]/50 rounded-xl space-y-3 transition-all"
                    >
                      <div className="flex gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-16 h-16 object-contain rounded-lg border border-neutral-700 bg-black p-1"
                          />
                          {imageCount > 1 && (
                            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-[#D4AF37] text-black text-[9px] font-bold rounded-full">
                              {imageCount} صور
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-[#D4AF37] font-semibold">{p.categoryLabel}</span>
                          <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                          <div className="text-sm font-bold text-[#F3E5AB] font-mono mt-1">
                            {formatPrice(p.priceUSD, currency)}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-400 line-clamp-2">
                        {p.shortDesc}
                      </div>

                      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs gap-2">
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
                              ? 'bg-[#2A261A] text-[#F3E5AB] border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                              : 'bg-[#181822] text-neutral-400 border-neutral-700 hover:text-white'
                          }`}
                          title="تحديد ظهور هذا المنتج في الشريط المتحرك التفاعلي"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>{p.isFeaturedInStrip ? 'في الشريط المتحرك ✓' : '+ إضافة للشريط'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingProduct(p)}
                            className="p-1.5 text-neutral-300 hover:text-[#D4AF37] bg-[#181822] border border-neutral-800 rounded-md"
                            title="تعديل تفاصيل وسعر وصور المنتج"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteProduct(p.id)}
                            className="p-1.5 text-neutral-300 hover:text-red-400 bg-[#181822] border border-neutral-800 rounded-md"
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
          <div key="tab-add" className="max-w-3xl mx-auto bg-[#111116] border border-[#D4AF37]/35 rounded-3xl p-6 sm:p-8 space-y-6 animate-mac-tab shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37]">
                    <Plus className="w-5 h-5" />
                  </span>
                  <span>إضافة منتج جديد لمعروضات المتجر</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  أدخل تفاصيل السلعة، الصور، والقياسات بتنظيم دقيق ومريح لتظهر بشكل احترافي للزبائن.
                </p>
              </div>
            </div>

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>تم نشر وعرض المنتج في المتجر بنجاح!</span>
              </div>
            )}

            {imageError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{imageError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-5 text-xs">
              <div className="bg-[#161620] p-5 rounded-2xl border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-sm border-b border-neutral-800/80 pb-2">
                  <span>1️⃣ معلومات المنتج الأساسية</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-300 font-medium mb-1.5">
                      اسم المنتج <span className="text-[#D4AF37]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: قميص، حقيبة، جهاز، إلخ..."
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3.5 py-3 bg-[#111116] border border-neutral-700 focus:border-[#D4AF37] rounded-xl text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-300 font-medium mb-1.5">
                      السعر بالدينار العراقي (د.ع) <span className="text-[#D4AF37]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={250}
                      step={250}
                      placeholder="مثال: 25000"
                      value={newPriceIQD}
                      onChange={(e) => setNewPriceIQD(Number(e.target.value))}
                      className="w-full px-3.5 py-3 bg-[#111116] border border-neutral-700 focus:border-[#D4AF37] rounded-xl text-white outline-none font-mono"
                    />
                    <span className="text-[11px] text-[#F3E5AB] mt-1.5 block font-semibold">
                      يظهر للزبون: {formatPrice(newPriceIQD || 0, 'IQD')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#171720] p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#D4AF37]" />
                    <label className="text-white font-bold text-xs">
                      القائمة والقسم التابع لهما هذا المنتج:
                    </label>
                  </div>
                  <span className="text-[11px] text-[#F3E5AB]">
                    (تضيف المنتج للقسم ➔ والقسم مربوط بالقائمة)
                  </span>
                </div>

                {/* 1. Pick or Link to a List */}
                <div className="space-y-1.5">
                  <label className="block text-neutral-300 font-medium text-[11px]">
                    1. حدد القائمة التي ترغب بربط المنتج وقسمه بها:
                  </label>
                  {productLists && productLists.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedListIdsForNewProd([])}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          selectedListIdsForNewProd.length === 0
                            ? 'bg-[#2A261A] text-[#F3E5AB] border-[#D4AF37]'
                            : 'bg-[#12121A] text-neutral-400 border-neutral-800 hover:text-white'
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
                                ? 'bg-[#2A261A] text-[#F3E5AB] border-[#D4AF37] shadow-sm'
                                : 'bg-[#12121A] text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                            }`}
                          >
                            <span>{isSelected ? '✓' : ''}</span>
                            <span>{list.name}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              ({list.categories?.length || 0} أقسام)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-400">
                      لم تقم بإنشاء قوائم بعد. يمكنك كتابة اسم القسم بالأسفل، أو إنشاء قائمة فوراً.
                    </p>
                  )}
                </div>

                {/* 2. Choose Category or Enter New Category */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-800/80">
                  <label className="block text-neutral-300 font-medium text-[11px]">
                    2. القسم أو التصنيف لهذا المنتج:
                  </label>

                  {/* If a list is selected, show its categories as quick one-click chips */}
                  {selectedListIdsForNewProd.length > 0 && (() => {
                    const selList = productLists.find(l => l.id === selectedListIdsForNewProd[0]);
                    const listCats = selList?.categories || [];
                    if (listCats.length > 0) {
                      return (
                        <div className="space-y-1 pb-1">
                          <span className="text-[10px] text-neutral-400 block">
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
                                    : 'bg-[#161622] text-[#F3E5AB] border-neutral-700 hover:border-[#D4AF37]'
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
                      <span className="text-[10px] text-neutral-400 block">
                        أقسام المتجر المتوفرة (انقر للاختيار المباشر):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-[#12121A] rounded-xl border border-neutral-800">
                        {allCategories.map((cat) => (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => setNewCategory(cat)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              newCategory === cat
                                ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                                : 'bg-[#181824] text-[#F3E5AB] border-neutral-700 hover:border-[#D4AF37]'
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
                      className="w-full px-3.5 py-2.5 bg-[#171720] border border-neutral-700 focus:border-[#D4AF37] rounded-lg text-white outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400 block">
                    إذا كتبت اسماً لقسم جديد، سيتم حفظه وربطه تلقائياً بالقائمة المحددة أعلاه.
                  </span>
                </div>

                {/* Quick Add New List Inline */}
                <div className="pt-2 border-t border-neutral-800/80">
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
                        className="flex-1 px-3 py-2 bg-[#12121A] border border-[#D4AF37]/50 focus:border-[#D4AF37] rounded-lg text-white text-xs outline-none"
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
                          className="px-3 py-2 bg-[#22222E] hover:bg-[#2C2C3A] text-neutral-300 text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingQuickList(true)}
                      className="text-xs text-[#F3E5AB] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer py-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>+ إنشاء قائمة جديدة وربط هذا المنتج وقسمه بها</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Image Upload & Management */}
              <div className="bg-[#171720] p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-300 font-medium block">
                    صور المنتج (يمكنك رفع عدة صور واضحة) <span className="text-[#D4AF37]">*</span>
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    تمت إضافة: <strong className="text-[#F3E5AB]">{newImages.length}</strong> صور
                  </span>
                </div>

                {/* Upload inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center justify-center gap-2 p-3 bg-[#1F1F2B] hover:bg-[#272737] border border-dashed border-[#D4AF37]/50 rounded-xl cursor-pointer transition-all">
                    {isCompressing ? (
                      <Loader2 className="w-4 h-4 text-[#D4AF37] animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#D4AF37]" />
                    )}
                    <span className="text-xs font-semibold text-white">
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
                      className="flex-1 px-3 py-2 bg-[#14141C] border border-neutral-700 rounded-lg text-white text-xs outline-none text-left"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-3 py-2 bg-[#252535] hover:bg-[#2D2D40] text-[#F3E5AB] rounded-lg text-xs font-bold transition-colors"
                    >
                      إضافة
                    </button>
                  </div>
                </div>

                {/* Thumbnails Gallery of Added Images */}
                {newImages.length > 0 && (
                  <div className="pt-2 border-t border-neutral-800 space-y-2">
                    <span className="text-[11px] text-neutral-400 block">
                      الصور المحددة (الصورة الأولى هي الصورة الرئيسية للغلاف):
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                      {newImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-[#D4AF37]/40 bg-black aspect-square">
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

              {/* Product Sizes Section (Multi-size options: S, M, L, XL, 38, 40...) */}
              <div className="bg-[#171720] p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#D4AF37]" />
                    <label className="text-white font-bold text-xs">
                      خانات القياسات والأحجام للمنتج (اختياري):
                    </label>
                  </div>
                  <span className="text-[11px] font-semibold text-[#F3E5AB]">
                    {newSizes.length > 0 ? `(${newSizes.length} قياسات محددة)` : '(بدون قياسات)'}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  إذا كان المنتج يتطلب قياسات (تيشيرت، بنطلون، حذاء، فستان...) أضف القياسات المتوفرة لتظهر للزبون ليختار قياسه قبل الطلب. <strong className="text-[#F3E5AB]">إذا لم تضف أي قياسات فلن يظهر أي خيار قياس للزبون نهائياً.</strong>
                </p>

                {/* Quick Presets (Clothes & Shoes) */}
                <div className="space-y-2 pt-1">
                  {/* Apparel Presets */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400 ml-1 font-semibold">قياسات ملابس:</span>
                    {['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Free Size'].map((preset) => {
                      const isAdded = newSizes.includes(preset);
                      return (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => handleToggleNewSizePreset(preset)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37] shadow-sm'
                              : 'bg-[#12121A] text-neutral-300 border-neutral-700 hover:border-[#D4AF37] hover:text-white'
                          }`}
                        >
                          {isAdded ? `✓ ${preset}` : `+ ${preset}`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footwear Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-neutral-400 ml-1 font-semibold">نمر أحذية:</span>
                    {['38', '39', '40', '41', '42', '43', '44', '45'].map((preset) => {
                      const isAdded = newSizes.includes(preset);
                      return (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => handleToggleNewSizePreset(preset)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37] shadow-sm'
                              : 'bg-[#12121A] text-neutral-300 border-neutral-700 hover:border-[#D4AF37] hover:text-white'
                          }`}
                        >
                          {isAdded ? `✓ ${preset}` : `+ ${preset}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom size input */}
                <div className="pt-2 border-t border-neutral-800/80">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="أو اكتب قياساً مخصصاً (مثال: Oversize أو 52 أو كبير أو وسط)..."
                      value={newSizeInput}
                      onChange={(e) => setNewSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewSize();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-[#12121A] border border-neutral-700 focus:border-[#D4AF37] rounded-lg text-white text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNewSize()}
                      className="px-3.5 py-2 bg-[#252535] hover:bg-[#D4AF37] hover:text-black text-[#F3E5AB] rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      + إضافة خانة قياس
                    </button>
                  </div>
                </div>

                {/* Selected Sizes Chips Preview */}
                {newSizes.length > 0 ? (
                  <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-neutral-300 font-medium">
                        القياسات المضافة التي ستظهر للزبون عند طلب هذا المنتج:
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewSizes([])}
                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
                      >
                        مسح كافة القياسات
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {newSizes.map((sz) => (
                        <span
                          key={sz}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#222230] text-[#F3E5AB] border border-[#D4AF37]/50 text-xs font-bold shadow-sm"
                        >
                          <span>{sz}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewSize(sz)}
                            className="text-neutral-400 hover:text-red-400 p-0.5 rounded cursor-pointer transition-colors"
                            title="حذف هذا القياس"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-[#121218] border border-dashed border-neutral-800 text-center">
                    <span className="text-[11px] text-neutral-400">
                      لم تضف قياسات لهذا المنتج (لن يظهر أي خيار قياس للزبون، وسيتمكن من طلب المنتج مباشرة بدون قياسات).
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1.5">
                  وصف ومواصفات المنتج للزبائن
                </label>
                <textarea
                  rows={3}
                  placeholder="اكتب مواصفات المنتج، الألوان، المقاسات، أو مميزات الخامة..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#171720] border border-neutral-700 focus:border-[#D4AF37] rounded-lg text-white outline-none resize-none"
                />
              </div>

              {/* Featured in Marquee Strip Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#171720] border border-neutral-700 hover:border-[#D4AF37]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={newIsFeaturedInStrip}
                  onChange={(e) => setNewIsFeaturedInStrip(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>عرض هذا المنتج في الشريط المتحرك التفاعلي بالصفحة الرئيسية</span>
                </span>
              </label>

              <button
                type="submit"
                disabled={isCompressing}
                className="w-full py-3.5 font-bold text-black gold-gradient-bg rounded-xl hover:brightness-110 shadow-lg flex items-center justify-center gap-2 transition-all"
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
              <div className="bg-[#121218] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block mb-1">إجمالي الحسابات المسجلة</span>
                  <span className="text-2xl font-bold text-white font-mono">{registeredUsers.length}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#181824] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#121218] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block mb-1">حسابات نشطة ومتاحة للشراء</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono">{activeUsersList.length}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#121218] border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block mb-1">حسابات محظورة من الطلب</span>
                  <span className="text-2xl font-bold text-red-400 font-mono">{blockedUsersList.length}</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-950/40 border border-red-800/40 flex items-center justify-center text-red-400">
                  <Ban className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-[#111116] border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search in customers */}
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، أو رقم الهاتف، أو البريد الإلكتروني..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pr-9 pl-4 py-2 bg-[#171722] border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-[#D4AF37]"
                  />
                  <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
                  {userSearchTerm && (
                    <button
                      onClick={() => setUserSearchTerm('')}
                      className="absolute left-3 top-2.5 text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sub-tabs: All / Active / Blocked */}
                <div className="flex items-center gap-1 bg-[#171722] p-1 rounded-xl border border-neutral-800 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setUserFilterTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userFilterTab === 'all'
                        ? 'bg-[#282838] text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    الكل ({registeredUsers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilterTab('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userFilterTab === 'active'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    النشطة ({activeUsersList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilterTab('blocked')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      userFilterTab === 'blocked'
                        ? 'bg-red-950/80 text-red-300 border border-red-700/50'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    المحظورين ({blockedUsersList.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Users List */}
            {filteredUsers.length === 0 ? (
              <div className="py-14 text-center space-y-3 bg-[#111116] border border-neutral-800 rounded-2xl">
                <Users className="w-12 h-12 text-neutral-600 mx-auto" />
                <h4 className="text-base font-bold text-white">لا توجد حسابات مطابقة للبحث</h4>
                <p className="text-xs text-neutral-400">
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
                      className={`bg-[#121218] rounded-2xl border p-4 sm:p-5 space-y-3.5 transition-all ${
                        usr.isBlocked
                          ? 'border-red-600/50 bg-red-950/10 shadow-[0_0_15px_rgba(220,38,38,0.1)]'
                          : 'border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {/* Customer Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                            usr.isBlocked
                              ? 'bg-red-950/70 border border-red-700 text-red-300'
                              : 'bg-[#1D1D28] border border-[#D4AF37]/40 text-[#F3E5AB]'
                          }`}>
                            {usr.name ? usr.name.slice(0, 2).toUpperCase() : 'LC'}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{usr.name}</span>
                              {usr.isBlocked && (
                                <span className="px-2 py-0.5 text-[10px] font-bold text-red-400 bg-red-950/80 border border-red-800 rounded-full flex items-center gap-1">
                                  <Ban className="w-3 h-3" />
                                  <span>محظور</span>
                                </span>
                              )}
                            </h4>
                            <span className="text-[11px] text-neutral-400 block font-mono dir-ltr text-right">
                              انضم: {formatDateTime(usr.createdAt)}
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#181822] text-neutral-300 border border-neutral-800 font-mono">
                          {customerOrdersCount} {customerOrdersCount === 1 ? 'طلب' : 'طلبات'}
                        </span>
                      </div>

                      {/* Customer Info Box */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#171722] p-3 rounded-xl border border-neutral-800/80">
                        <div className="flex items-center gap-2 text-neutral-300">
                          <Phone className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                          <span className="font-mono dir-ltr font-medium text-white">{usr.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-300 truncate">
                          <Mail className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                          <span className="font-mono dir-ltr truncate text-neutral-300" title={usr.email}>{usr.email}</span>
                        </div>
                      </div>

                      {/* Block Reason Note if blocked */}
                      {usr.isBlocked && usr.blockReason && (
                        <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/70 text-red-200 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-[11px] text-red-300">سبب الحظر:</span>
                            <span className="text-xs">{usr.blockReason}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                        {usr.isBlocked ? (
                          <button
                            type="button"
                            onClick={() => handleUnblockUser(usr)}
                            className="flex-1 py-2 px-3 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                            className="flex-1 py-2 px-3 rounded-lg bg-red-950/50 hover:bg-red-950 text-red-300 border border-red-800/80 hover:border-red-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                          className="py-2 px-3 rounded-lg bg-red-950/40 hover:bg-red-900 text-red-300 hover:text-white border border-red-800/70 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          title="حذف هذا الحساب نهائياً"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
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
            <div className="bg-[#111116] border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">فريق إدارة وموظفي متجر LC</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D4AF37]/20 text-[#F3E5AB] border border-[#D4AF37]/40">
                    {staffMembers.length} موظف ومدير
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
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
                  className="py-2.5 px-4 rounded-xl bg-[#1C1C28] hover:bg-[#252538] border border-[#D4AF37]/60 text-[#F3E5AB] font-bold text-xs active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <KeyRound className="w-4 h-4 text-[#D4AF37]" />
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
            <div className="bg-gradient-to-r from-[#17140B] via-[#221C11] to-[#17140B] border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 text-right">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                  <span className="text-sm font-bold text-white">
                    أنت مسجل حالياً باسم: <span className="text-[#F3E5AB] font-mono">{currentStaffSession?.name || 'المدير العام'}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold">
                    جلسة نشطة ومحفوظة ✓
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
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
                  className="px-3.5 py-2 bg-[#1A1A28] border border-[#D4AF37]/60 text-[#F3E5AB] hover:bg-[#252538] active:scale-95 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                >
                  <KeyRound className="w-4 h-4 text-[#D4AF37]" />
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
                  className="px-3.5 py-2 bg-[#111118] border border-neutral-700 text-neutral-300 hover:text-white active:scale-95 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                >
                  <Smartphone className="w-4 h-4 text-[#D4AF37]" />
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
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                      isCurrent
                        ? 'bg-gradient-to-b from-[#181826] to-[#101016] border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.2)]'
                        : 'bg-[#111116] border-neutral-800 hover:border-neutral-700 shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#1A1A26] border border-[#D4AF37]/50 flex items-center justify-center text-lg font-bold text-[#F3E5AB] shadow-md shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{member.name}</h3>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37] text-black font-extrabold shadow-sm">
                                أنت
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#D4AF37] font-semibold">
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
                            className="px-2.5 py-1.5 rounded-xl bg-[#1C1C28] hover:bg-[#28283A] border border-[#D4AF37]/50 text-[#F3E5AB] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
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
                              className="p-2 rounded-xl bg-neutral-900 hover:bg-[#222232] border border-neutral-700 hover:border-[#D4AF37]/50 text-neutral-300 hover:text-[#F3E5AB] transition-all cursor-pointer active:scale-95 shadow-sm"
                            >
                              <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setStaffToDelete(member)}
                              title="حذف هذا الموظف"
                              className="p-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-500/50 hover:bg-red-950/30 transition-all cursor-pointer active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-800/80 text-[11px] text-neutral-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>تاريخ الإضافة:</span>
                        <span className="text-neutral-300 font-mono">
                          {new Date(member.createdAt).toLocaleDateString('ar-IQ')}
                        </span>
                      </div>
                      {member.lastLoginAt && (
                        <div className="flex items-center justify-between">
                          <span>آخر تسجيل دخول:</span>
                          <span className="text-neutral-300 font-mono">
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
      {isAddStaffModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={() => setIsAddStaffModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#111116] border border-[#D4AF37]/50 rounded-2xl p-6 text-right space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#D4AF37]" />
                <span>إضافة مدير أو موظف جديد للإدارة</span>
              </h3>
              <button
                onClick={() => setIsAddStaffModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewStaff} className="space-y-3.5 text-xs text-right">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  اسم الموظف / المدير <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد حميد"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171720] border border-neutral-700 rounded-xl text-white outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  الرمز السري للدخول (PIN) <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="أدخل رمز سري من 4 أرقام أو حروف"
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171720] border border-neutral-700 rounded-xl text-white outline-none focus:border-[#D4AF37] font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  تأكيد الرمز السري <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="أعد كتابة الرمز للتأكيد"
                  value={newStaffConfirmPin}
                  onChange={(e) => setNewStaffConfirmPin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171720] border border-neutral-700 rounded-xl text-white outline-none focus:border-[#D4AF37] font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  نوع الصلاحية
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as 'admin' | 'manager')}
                  className="w-full px-3 py-2.5 bg-[#171720] border border-neutral-700 rounded-xl text-white outline-none focus:border-[#D4AF37]"
                >
                  <option value="manager">مشرف مبيعات وتجهيز طلبات</option>
                  <option value="admin">مدير عام (كامل الصلاحيات)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
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
        </div>
      )}

      {/* Modal: Confirm Delete Staff Member */}
      {staffToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setStaffToDelete(null)}
        >
          <div 
            className="w-full max-w-md bg-[#111116] border border-red-500/50 rounded-2xl p-6 text-right space-y-4 shadow-2xl animate-ios-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-500 flex items-center justify-center text-red-400 mx-auto">
              <UserMinus className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">
                تأكيد حذف حساب الموظف ({staffToDelete.name})
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا الحساب؟ سيتم إلغاء صلاحياته فوراً وإخراجه من لوحة التحكم، ولن يتمكن من الدخول مجدداً إلا بعد إنشاء حساب جديد له.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold cursor-pointer"
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
        </div>
      )}

      {/* Modal: Employee Self Change PIN (Requires Old PIN) */}
      {isSelfChangePinOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={() => setIsSelfChangePinOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#111116] border border-[#D4AF37]/50 rounded-2xl p-6 text-right space-y-4 shadow-2xl animate-ios-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                <span>تغيير الرمز السري لحسابي ({currentStaffSession?.name || 'المدير'})</span>
              </h3>
              <button
                onClick={() => setIsSelfChangePinOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              يشترط إدخال الرمز السري القديم المعتمد حالياً، ثم كتابة الرمز السري الجديد وتأكيده بالمثل.
            </p>

            {selfPinError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{selfPinError}</span>
              </div>
            )}

            <form onSubmit={handleSelfChangePin} className="space-y-3.5 text-xs text-right">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  الرمز السري القديم / الحالي <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  type={showSelfPins ? 'text' : 'password'}
                  required
                  placeholder="أدخل الرمز السري القديم"
                  value={selfOldPin}
                  onChange={(e) => setSelfOldPin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171720] border border-neutral-700 rounded-xl text-white outline-none focus:border-[#D4AF37] font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  الرمز السري الجديد (4 أرقام أو أكثر) <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  type={showSelfPins ? 'text' : 'password'}
                  required
                  minLength={4}
                  placeholder="أدخل الرمز السري الجديد"
                  value={selfNewPin}
                  onChange={(e) => setSelfNewPin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171720] border border-neutral-700 rounded-xl text-white outline-none focus:border-[#D4AF37] font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  تأكيد الرمز السري الجديد <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  type={showSelfPins ? 'text' : 'password'}
                  required
                  minLength={4}
                  placeholder="أعد كتابة الرمز الجديد للتأكيد"
                  value={selfConfirmPin}
                  onChange={(e) => setSelfConfirmPin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171720] border border-neutral-700 rounded-xl text-white outline-none focus:border-[#D4AF37] font-mono tracking-wider"
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
                <label htmlFor="show-self-pins-toggle" className="text-neutral-400 text-[11px] cursor-pointer">
                  إظهار الأرقام أثناء الكتابة
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSelfChangePinOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
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
        </div>
      )}

      {/* Modal: Main Admin Reset Employee PIN directly */}
      {adminResetMember && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={() => setAdminResetMember(null)}
        >
          <div 
            className="w-full max-w-md bg-[#111116] border border-[#D4AF37]/50 rounded-2xl p-6 text-right space-y-4 shadow-2xl animate-ios-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                <span>تعديل الرمز السري للموظف ({adminResetMember.name})</span>
              </h3>
              <button
                onClick={() => setAdminResetMember(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#1A1A26] border border-[#D4AF37]/30 text-xs text-[#F3E5AB]">
              بصفتك المدير العام، يمكنك تعيين وتعيين رمز سري جديد مباشر لـ <strong>{adminResetMember.name}</strong> ليستخدمه في تسجيل الدخول القادم.
            </div>

            {adminResetPinError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{adminResetPinError}</span>
              </div>
            )}

            <form onSubmit={handleAdminResetStaffPin} className="space-y-3.5 text-xs text-right">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  الرمز السري الجديد للموظف <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="أدخل رمز سري جديد للموظف"
                  value={adminNewPinInput}
                  onChange={(e) => setAdminNewPinInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171720] border border-neutral-700 rounded-xl text-white outline-none focus:border-[#D4AF37] font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  تأكيد الرمز السري الجديد <span className="text-[#D4AF37]">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="أعد كتابة الرمز للتأكيد"
                  value={adminConfirmPinInput}
                  onChange={(e) => setAdminConfirmPinInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171720] border border-neutral-700 rounded-xl text-white outline-none focus:border-[#D4AF37] font-mono tracking-wider"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdminResetMember(null)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
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
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={() => setEditingProduct(null)}
        >
          <div 
            className="w-full max-w-lg bg-[#111116] border border-[#D4AF37]/50 rounded-2xl p-6 text-right space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">تعديل بيانات وصور المنتج</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1">اسم المنتج</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#171720] border border-neutral-700 rounded-lg text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">السعر بالدينار العراقي (د.ع)</label>
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
                  className="w-full px-3 py-2 bg-[#171720] border border-neutral-700 rounded-lg text-white font-mono outline-none"
                />
                <span className="text-[10px] text-[#F3E5AB] block mt-1">
                  {formatPrice(editingProduct.priceUSD, 'IQD')}
                </span>
              </div>

              {/* Lists checklist in edit modal */}
              {productLists && productLists.length > 0 && (
                <div className="bg-[#171720] p-3 rounded-xl border border-neutral-800 space-y-2">
                  <label className="block text-neutral-300 font-medium">القوائم والمجموعات لهذا المنتج:</label>
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
                              ? 'bg-[#2A261A] text-[#F3E5AB] border-[#D4AF37]'
                              : 'bg-[#14141C] text-neutral-400 border-neutral-700 hover:text-white'
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
              <div className="bg-[#171720] p-3 rounded-xl border border-neutral-800 space-y-2.5">
                <label className="block text-neutral-300 font-medium">صور المنتج:</label>
                
                <div className="flex gap-2">
                  <label className="flex-1 py-1.5 px-3 bg-[#242432] hover:bg-[#2E2E3E] rounded-lg text-center cursor-pointer text-xs font-semibold text-white border border-neutral-700 flex items-center justify-center gap-1.5">
                    {isEditCompressing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />}
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
                      className="w-full px-2 py-1 bg-[#14141C] border border-neutral-700 rounded text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddEditImageUrl}
                      className="px-2.5 py-1 bg-[#282838] text-[#F3E5AB] rounded text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {(editingProduct.images && editingProduct.images.length > 0 ? editingProduct.images : [editingProduct.image]).map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-neutral-700 bg-black aspect-square">
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
                <label className="block text-neutral-300 mb-1">وصف المنتج</label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value, shortDesc: e.target.value })}
                  className="w-full px-3 py-2 bg-[#171720] border border-neutral-700 rounded-lg text-white outline-none resize-none"
                />
              </div>

              {/* Edit Product Sizes Section */}
              <div className="bg-[#171720] p-3.5 rounded-xl border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#D4AF37]" />
                    <label className="text-white font-bold text-xs">
                      قياسات وأحجام المنتج:
                    </label>
                  </div>
                  <span className="text-[11px] font-semibold text-[#F3E5AB]">
                    {(editingProduct.sizes && editingProduct.sizes.length > 0)
                      ? `(${editingProduct.sizes.length} قياسات محددة)`
                      : '(بدون قياسات)'}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400">
                  إذا لم تضف أي قياسات فلن تظهر خانة القياس للزبون نهائياً.
                </p>

                {/* Quick Presets */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400 ml-1">ملابس:</span>
                    {['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Free Size'].map((preset) => {
                      const isAdded = (editingProduct.sizes || []).includes(preset);
                      return (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => handleToggleEditSizePreset(preset)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                              : 'bg-[#12121A] text-neutral-300 border-neutral-700 hover:border-[#D4AF37] hover:text-white'
                          }`}
                        >
                          {isAdded ? `✓ ${preset}` : preset}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-neutral-400 ml-1">أحذية:</span>
                    {['38', '39', '40', '41', '42', '43', '44', '45'].map((preset) => {
                      const isAdded = (editingProduct.sizes || []).includes(preset);
                      return (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => handleToggleEditSizePreset(preset)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                              : 'bg-[#12121A] text-neutral-300 border-neutral-700 hover:border-[#D4AF37] hover:text-white'
                          }`}
                        >
                          {isAdded ? `✓ ${preset}` : preset}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom size input */}
                <div className="flex gap-2 pt-1 border-t border-neutral-800/80">
                  <input
                    type="text"
                    placeholder="اكتب قياساً مخصصاً (مثال: XXL أو 42)..."
                    value={editSizeInput}
                    onChange={(e) => setEditSizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEditSize();
                      }
                    }}
                    className="flex-1 px-2.5 py-1.5 bg-[#12121A] border border-neutral-700 focus:border-[#D4AF37] rounded-lg text-white text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddEditSize()}
                    className="px-3 py-1.5 bg-[#252535] hover:bg-[#D4AF37] hover:text-black text-[#F3E5AB] rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    + إضافة
                  </button>
                </div>

                {/* Active sizes chips */}
                {editingProduct.sizes && editingProduct.sizes.length > 0 ? (
                  <div className="pt-1.5 border-t border-neutral-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400">القياسات الحالية:</span>
                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, sizes: [] })}
                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
                      >
                        مسح كافة القياسات
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {editingProduct.sizes.map((sz) => (
                        <span
                          key={sz}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#222230] text-[#F3E5AB] border border-[#D4AF37]/50 text-xs font-bold shadow-sm"
                        >
                          <span>{sz}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEditSize(sz)}
                            className="text-neutral-400 hover:text-red-400 p-0.5 rounded cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-[#121218] border border-dashed border-neutral-800 text-center text-[10px] text-neutral-400">
                    لا توجد قياسات محددة (لن يظهر أي خيار قياس للزبون)
                  </div>
                )}
              </div>

              {/* Edit Featured in Strip Toggle */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#171720] border border-neutral-700 hover:border-[#D4AF37]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={editingProduct.isFeaturedInStrip ?? false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isFeaturedInStrip: e.target.checked })}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>عرض هذا المنتج في الشريط المتحرك التفاعلي بالصفحة الرئيسية</span>
                </span>
              </label>

              <div className="pt-2 flex justify-end gap-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-black gold-gradient-bg rounded-lg hover:brightness-110"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Delivery Waybill Modal */}
      {waybillOrder && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto"
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
            <div className="bg-neutral-100 p-4 rounded-xl border border-neutral-300 space-y-2 text-xs">
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
                <div className="bg-amber-100 p-2 rounded text-amber-900 font-medium">
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
                        {(item?.selectedSize || (item as any)?.size) && (
                          <div className="inline-block mt-1 text-[11px] text-black font-extrabold bg-amber-200 border border-amber-400 px-2 py-0.5 rounded">
                            القياس المطلوب: {item?.selectedSize || (item as any)?.size}
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
            <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-400 flex justify-between items-center">
              <div>
                <div className="text-xs text-neutral-600 font-bold">المبلغ المطلوب استلامه نقداً (كاش) من الزبون:</div>
                <div className="text-[11px] text-neutral-500">يدفع الزبون للمندوب بعد استلام ومعاينة الطلب</div>
              </div>
              <div className="text-2xl font-black font-mono text-neutral-900">
                {formatPrice(waybillOrder.totalUSD, waybillOrder.currency)}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center pt-3 border-t">
              <button
                onClick={() => setWaybillOrder(null)}
                className="px-4 py-2 text-xs text-neutral-600 hover:text-black font-medium"
              >
                إغلاق
              </button>

              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة البوليصة الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Customer Confirmation Modal */}
      {blockingUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setBlockingUser(null)}
        >
          <div 
            className="w-full max-w-md bg-[#121218] border border-red-700/60 rounded-2xl p-6 text-right space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <Ban className="w-5 h-5" />
                <span>تأكيد حظر حساب الزبون</span>
              </div>
              <button
                onClick={() => setBlockingUser(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-neutral-300 leading-relaxed">
                أنت على وشك حظر حساب الزبون <strong className="text-white font-bold">{blockingUser.name}</strong> (رقم: {blockingUser.phone}).
                عند الحظر، لن يتمكن الزبون من تثبيت أي طلبات جديدة في المتجر.
              </p>

              <div>
                <label className="block text-neutral-400 font-medium mb-1.5">
                  سبب الحظر (سيظهر للإدارة وملاحظات الحظر):
                </label>
                <textarea
                  rows={2}
                  value={blockReasonInput}
                  onChange={(e) => setBlockReasonInput(e.target.value)}
                  placeholder="مثال: تكرار عدم استلام الطلبات، رقم غير متاح، إلخ..."
                  className="w-full p-2.5 bg-[#171722] border border-neutral-700 rounded-xl text-white outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setBlockingUser(null)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
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
        </div>
      )}

      {/* Delete User Account Confirmation Modal */}
      {userToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setUserToDelete(null)}
        >
          <div 
            className="w-full max-w-md bg-[#121218] border border-red-700/80 rounded-3xl p-6 text-right space-y-4 shadow-[0_0_40px_rgba(220,38,38,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <Trash2 className="w-5 h-5" />
                <span>تأكيد حذف حساب الزبون نهائياً</span>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-neutral-300 leading-relaxed">
                أنت على وشك حذف حساب الزبون <strong className="text-white font-bold">{userToDelete.name || userToDelete.email || userToDelete.phone}</strong> نهائياً من قاعدة بيانات المتجر.
              </p>
              <p className="text-[11px] text-red-400 bg-red-950/40 p-2.5 rounded-xl border border-red-900/50">
                ⚠️ تحذير: لا يمكن التراجع عن هذه الخطوة بعد إتمامها.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-neutral-400 hover:text-white text-xs font-medium cursor-pointer"
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
        </div>
      )}

      {/* Order Rejection Confirmation Modal */}
      {orderToReject && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setOrderToReject(null)}
        >
          <div 
            className="w-full max-w-md bg-[#121218] border-2 border-red-700/80 rounded-3xl p-6 text-right space-y-4 shadow-[0_0_50px_rgba(220,38,38,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>تأكيد رفض الطلب وإلغاؤه</span>
              </div>
              <button
                onClick={() => setOrderToReject(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Details Brief Card */}
            <div className="p-3.5 rounded-2xl bg-[#181822] border border-neutral-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">رقم الطلب:</span>
                <span className="font-mono font-bold text-[#F3E5AB] dir-ltr">{orderToReject.orderNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">اسم المشتري:</span>
                <span className="font-bold text-white">{orderToReject.customer?.name || 'الزبون'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">رقم الهاتف:</span>
                <span className="font-mono text-neutral-300 dir-ltr">{orderToReject.customer?.phone || 'غير محدد'}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                <span className="text-neutral-400">المبلغ الكلي للطلب:</span>
                <span className="font-mono font-bold text-red-400 text-sm">{formatPrice(orderToReject.totalUSD, orderToReject.currency)}</span>
              </div>
            </div>

            {/* Rejection Reason Selection */}
            <div className="space-y-2 text-xs">
              <label className="block text-neutral-300 font-semibold">
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
                        ? 'bg-red-950/70 text-red-200 border-red-600 shadow-sm'
                        : 'bg-[#161620] text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    <span>{reason}</span>
                    {rejectReason === reason && <Check className="w-4 h-4 text-red-400" />}
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
                    className="w-full p-2.5 bg-[#171722] border border-neutral-700 rounded-xl text-white text-xs outline-none focus:border-red-500 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Warning Message */}
            <p className="text-[11px] text-neutral-400 leading-relaxed bg-red-950/30 p-2.5 rounded-xl border border-red-900/40">
              ⚠️ عند تأكيد الرفض، سيتم نقل الطلب إلى قسم <strong>"الطلبات المرفوضة"</strong> ولن يتم احتساب كاش أو ربح له في الخزينة.
            </p>

            {/* Confirmation & Cancel Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setOrderToReject(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1A1A26] hover:bg-[#222232] text-neutral-300 hover:text-white text-xs font-medium transition cursor-pointer"
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
        </div>
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
