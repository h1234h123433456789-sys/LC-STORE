import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  getDocFromServer,
  getDocs,
  query,
  where,
  getDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, ProductList, Order, User, AdminStaffMember } from '../types';
import { hashPassword, verifyPassword, sanitizeInput } from '../utils/security';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: The app will use the explicit databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Universal helper to recursively strip out any 'undefined' values from objects before writing to Firestore.
// Firestore does not accept 'undefined' fields and throws a write validation exception.
export function sanitizeDocData(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeDocData(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = sanitizeDocData(val);
        }
      }
    }
    return cleaned;
  }
  return obj;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  // Check if error is related to Firestore Daily Quota Limits (resource-exhausted / quota exceeded)
  const isQuota = 
    errMessage.toLowerCase().includes('quota') || 
    errMessage.toLowerCase().includes('resource-exhausted') ||
    errMessage.toLowerCase().includes('resource_exhausted') ||
    errMessage.toLowerCase().includes('limit exceeded');

  if (isQuota) {
    setQuotaExceededInSession();
    try {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: errInfo }));
    } catch (e) {
      // Ignore in non-browser environments
    }
  }

  return errInfo;
}

let isQuotaExceeded = false;

export function isQuotaExceededInSession(): boolean {
  if (isQuotaExceeded) return true;
  try {
    return sessionStorage.getItem('lc_firestore_quota_exceeded') === 'true';
  } catch {
    return false;
  }
}

export function setQuotaExceededInSession() {
  isQuotaExceeded = true;
  try {
    sessionStorage.setItem('lc_firestore_quota_exceeded', 'true');
  } catch {
    // ignore
  }
}

// Test connection on boot (non-blocking with fast timeout)
export async function testConnection(): Promise<boolean> {
  try {
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 1200));
    const check = getDoc(doc(db, 'test', 'connection'))
      .then(() => {
        console.log('Firebase Firestore Connected Successfully!');
        return true;
      })
      .catch((error) => {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn('Firebase client offline, caching enabled.');
        }
        return true;
      });
    return await Promise.race([check, timeout]);
  } catch {
    return true;
  }
}

// ================= REAL-TIME SUBSCRIBERS =================

export function subscribeToProducts(
  onSuccess: (products: Product[]) => void,
  onError?: (err: unknown) => void
) {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping subscribeToProducts: Firestore quota exceeded.');
    return () => {};
  }
  const colRef = collection(db, 'products');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) });
      });
      onSuccess(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      if (onError) onError(error);
    }
  );
}

export function subscribeToProductLists(
  onSuccess: (lists: ProductList[]) => void,
  onError?: (err: unknown) => void
) {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping subscribeToProductLists: Firestore quota exceeded.');
    return () => {};
  }
  const colRef = collection(db, 'productLists');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const lists: ProductList[] = [];
      snapshot.forEach((docSnap) => {
        lists.push({ id: docSnap.id, ...(docSnap.data() as Omit<ProductList, 'id'>) });
      });
      onSuccess(lists);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'productLists');
      if (onError) onError(error);
    }
  );
}

export function subscribeToOrders(
  onSuccess: (
    orders: Order[], 
    changes?: { type: 'added' | 'modified' | 'removed'; order: Order }[], 
    isInitial?: boolean
  ) => void,
  onError?: (err: unknown) => void
) {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping subscribeToOrders: Firestore quota exceeded.');
    return () => {};
  }
  const colRef = collection(db, 'orders');
  let isInitial = true;

  return onSnapshot(
    colRef,
    (snapshot) => {
      const orders: Order[] = [];
      const changes: { type: 'added' | 'modified' | 'removed'; order: Order }[] = [];

      snapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...(docSnap.data() as Omit<Order, 'id'>) });
      });

      if (!isInitial) {
        snapshot.docChanges().forEach((change) => {
          const order = { id: change.doc.id, ...(change.doc.data() as Omit<Order, 'id'>) };
          changes.push({ type: change.type, order });
        });
      }

      // Sort orders descending by createdAt
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onSuccess(orders, changes, isInitial);
      isInitial = false;
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      if (onError) onError(error);
    }
  );
}

// ================= FIRESTORE MUTATIONS =================

export async function saveProductToFirestore(product: Product) {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping saveProductToFirestore: Firestore quota exceeded.');
    return;
  }
  try {
    const docRef = doc(db, 'products', product.id);
    await setDoc(docRef, sanitizeDocData(product), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
    throw error;
  }
}

export async function deleteProductFromFirestore(productId: string) {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping deleteProductFromFirestore: Firestore quota exceeded.');
    return;
  }
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    throw error;
  }
}

export async function saveProductListToFirestore(list: ProductList) {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping saveProductListToFirestore: Firestore quota exceeded.');
    return;
  }
  try {
    const docRef = doc(db, 'productLists', list.id);
    await setDoc(docRef, sanitizeDocData(list), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `productLists/${list.id}`);
    throw error;
  }
}

export async function deleteProductListFromFirestore(listId: string) {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping deleteProductListFromFirestore: Firestore quota exceeded.');
    return;
  }
  try {
    const docRef = doc(db, 'productLists', listId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `productLists/${listId}`);
    throw error;
  }
}

export async function saveOrderToFirestore(order: Order) {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping saveOrderToFirestore: Firestore quota exceeded.');
    return;
  }
  try {
    const docRef = doc(db, 'orders', order.id);
    await setDoc(docRef, sanitizeDocData(order));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `orders/${order.id}`);
    throw error;
  }
}

export async function updateOrderStatusInFirestore(orderId: string, status: Order['status']) {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping updateOrderStatusInFirestore: Firestore quota exceeded.');
    return;
  }
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    throw error;
  }
}

export async function deleteOrderFromFirestore(orderId: string) {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping deleteOrderFromFirestore: Firestore quota exceeded.');
    return;
  }
  try {
    const docRef = doc(db, 'orders', orderId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
    throw error;
  }
}

// ================= USER ACCOUNTS & AUTH =================

export interface UserAccountData {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  createdAt: string;
  isBlocked?: boolean;
  blockedAt?: string;
  blockReason?: string;
}

// Register new user: ensures unique email, hashed password, sanitized inputs
export async function registerUserInFirestore({
  name,
  email,
  phone,
  password
}: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<User> {
  const cleanEmail = sanitizeInput(email.trim().toLowerCase(), 100);
  const cleanPhone = sanitizeInput(phone.trim(), 30);
  const cleanName = sanitizeInput(name.trim(), 80);

  if (isQuotaExceededInSession()) {
    console.warn('Registering user locally (quota exceeded)');
    const userId = `usr-local-${Date.now()}`;
    return {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      contactType: 'email',
      contactValue: cleanEmail,
      joinedAt: new Date().toISOString(),
      isBlocked: false
    };
  }

  try {
    // 1. Check if email already exists in Firestore
    const usersCol = collection(db, 'users');
    const qEmail = query(usersCol, where('email', '==', cleanEmail));
    const snapshot = await getDocs(qEmail);

    if (!snapshot.empty) {
      throw new Error('هذا البريد الإلكتروني مسجل مسبقاً في المتجر! يرجى تسجيل الدخول أو استخدام بريد آخر.');
    }

    // 2. Cryptographically hash password before saving to database
    const securePasswordHash = await hashPassword(password, cleanEmail);

    // 3. Generate secure User ID
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newUserData: UserAccountData = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password: securePasswordHash,
      isBlocked: false,
      createdAt: new Date().toISOString()
    };

    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, sanitizeDocData(newUserData));

    const user: User = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      contactType: 'email',
      contactValue: cleanEmail,
      joinedAt: newUserData.createdAt,
      isBlocked: false
    };

    return user;
  } catch (error: any) {
    if (error?.code) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
    throw error;
  }
}

// Login user with email or phone + password
export async function loginUserFromFirestore({
  emailOrPhone,
  password
}: {
  emailOrPhone: string;
  password: string;
}): Promise<User> {
  const cleanIdentifier = sanitizeInput(emailOrPhone.trim().toLowerCase(), 100);
  const cleanPassword = password.trim();

  try {
    const usersCol = collection(db, 'users');
    
    // Check by email
    const qEmail = query(usersCol, where('email', '==', cleanIdentifier));
    let snapshot = await getDocs(qEmail);

    // If not found by email, try matching by phone
    if (snapshot.empty) {
      const qPhone = query(usersCol, where('phone', '==', emailOrPhone.trim()));
      snapshot = await getDocs(qPhone);
    }

    if (snapshot.empty) {
      throw new Error('الحساب غير مسجل! يرجى التأكد من البريد أو إنشاء حساب جديد.');
    }

    const docSnap = snapshot.docs[0];
    const userData = docSnap.data() as UserAccountData;

    if (userData.isBlocked) {
      throw new Error(
        userData.blockReason 
          ? `عذراً، تم حظر هذا الحساب من الطلب والاستخدام: (${userData.blockReason}). يرجى التواصل مع إدارة المتجر.`
          : 'عذراً، تم حظر هذا الحساب من الطلب والاستخدام من قبل إدارة المتجر.'
      );
    }

    // Verify password with cryptographic hash comparison
    const isPasswordValid = await verifyPassword(cleanPassword, userData.password, userData.email);

    if (!isPasswordValid) {
      throw new Error('كلمة المرور غير صحيحة! يرجى التأكد من الرمز والمحاولة ثانية.');
    }

    // If account was using old plain text password, silently upgrade to SHA-256 hash
    if (userData.password === cleanPassword && !userData.password.startsWith('LC_') && userData.password.length < 40) {
      try {
        const upgradedHash = await hashPassword(cleanPassword, userData.email);
        await updateDoc(docSnap.ref, { password: upgradedHash });
      } catch (e) {
        // non-blocking upgrade
      }
    }

    const user: User = {
      id: userData.id || docSnap.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      contactType: 'email',
      contactValue: userData.email,
      joinedAt: userData.createdAt || new Date().toISOString(),
      isBlocked: userData.isBlocked || false,
      blockReason: userData.blockReason
    };

    return user;
  } catch (error: any) {
    if (error?.code) {
      handleFirestoreError(error, OperationType.GET, 'users');
    }
    throw error;
  }
}

// Check if a customer email or phone is blocked before placing orders
export async function checkCustomerBlocked(emailOrPhone: string): Promise<{ isBlocked: boolean; reason?: string }> {
  if (!emailOrPhone) return { isBlocked: false };
  try {
    const clean = emailOrPhone.trim().toLowerCase();
    const usersCol = collection(db, 'users');
    let q = query(usersCol, where('email', '==', clean));
    let snapshot = await getDocs(q);

    if (snapshot.empty) {
      q = query(usersCol, where('phone', '==', emailOrPhone.trim()));
      snapshot = await getDocs(q);
    }

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data() as UserAccountData;
      if (data.isBlocked) {
        return { isBlocked: true, reason: data.blockReason };
      }
    }
    return { isBlocked: false };
  } catch (e) {
    return { isBlocked: false };
  }
}

// Subscribe to all registered user accounts (for Admin Portal)
export function subscribeToUsers(callback: (users: UserAccountData[]) => void): () => void {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping subscribeToUsers: Firestore quota exceeded.');
    return () => {};
  }
  const usersCol = collection(db, 'users');
  return onSnapshot(usersCol, (snapshot) => {
    const usersList: UserAccountData[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as UserAccountData;
      usersList.push({
        ...data,
        id: doc.id
      });
    });
    // Sort latest first
    usersList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    callback(usersList);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'users');
  });
}

// Update customer profile (e.g. edit name, phone)
export async function updateUserProfileInFirestore(
  userId: string,
  updates: { name?: string; phone?: string }
): Promise<void> {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping updateUserProfileInFirestore: Firestore quota exceeded.');
    return;
  }
  try {
    const userDocRef = doc(db, 'users', userId);
    const cleanUpdates: Partial<UserAccountData> = {};
    if (updates.name) {
      cleanUpdates.name = sanitizeInput(updates.name.trim(), 80);
    }
    if (updates.phone) {
      cleanUpdates.phone = sanitizeInput(updates.phone.trim(), 30);
    }
    await updateDoc(userDocRef, cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    throw error;
  }
}

// Block / Unblock customer account
export async function setUserBlockedStatus(
  userId: string,
  isBlocked: boolean,
  blockReason?: string
): Promise<void> {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping setUserBlockedStatus: Firestore quota exceeded.');
    return;
  }
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      isBlocked,
      blockedAt: isBlocked ? new Date().toISOString() : null,
      blockReason: isBlocked ? (blockReason || 'تم الحظر بواسطة إدارة المتجر') : null,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    throw error;
  }
}

// Delete customer account
export async function deleteUserAccountFromFirestore(userId: string): Promise<void> {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping deleteUserAccountFromFirestore: Firestore quota exceeded.');
    return;
  }
  try {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    throw error;
  }
}


// ================= ADMIN PIN CLOUD SYNC =================

// Real-time synchronization of the store owner's Admin PIN across all devices
export function subscribeToAdminPin(
  onSuccess: (pin: string) => void,
  onError?: (err: unknown) => void
) {
  if (isQuotaExceededInSession()) {
    console.warn('Skipping subscribeToAdminPin: Firestore quota exceeded.');
    return () => {};
  }
  const docRef = doc(db, 'settings', 'admin_security');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && typeof data.pin === 'string' && data.pin.trim()) {
          onSuccess(data.pin.trim());
        }
      }
    },
    (error) => {
      console.warn('Could not sync admin PIN from Firestore:', error);
      if (onError) onError(error);
    }
  );
}

// Save or change the store owner's Admin PIN in Firestore Cloud
export async function saveAdminPinToFirestore(pin: string): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'admin_security');
    await setDoc(docRef, { 
      pin: pin.trim(), 
      updatedAt: new Date().toISOString() 
    }, { merge: true });
  } catch (error) {
    console.error('Error saving admin PIN to Firestore:', error);
    handleFirestoreError(error, OperationType.WRITE, 'settings/admin_security');
    throw error;
  }
}

// ================= MULTI-ADMIN & STAFF MANAGEMENT =================
export function subscribeToAdminStaff(
  onSuccess: (staff: AdminStaffMember[]) => void,
  onError?: (err: unknown) => void
) {
  if (isQuotaExceededInSession()) {
    return () => {};
  }
  const docRef = doc(db, 'settings', 'admin_staff');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.members)) {
          onSuccess(data.members);
          return;
        }
      }
      onSuccess([]);
    },
    (error) => {
      console.warn('Could not sync admin staff from Firestore:', error);
      if (onError) onError(error);
    }
  );
}

export async function saveAdminStaffToFirestore(members: AdminStaffMember[]): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'admin_staff');
    await setDoc(docRef, {
      members: members.map((m) => ({
        id: m.id,
        name: m.name.trim(),
        pin: m.pin.trim(),
        role: m.role || 'manager',
        createdAt: m.createdAt,
        lastLoginAt: m.lastLoginAt || null
      })),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving admin staff to Firestore:', error);
    handleFirestoreError(error, OperationType.WRITE, 'settings/admin_staff');
    throw error;
  }
}

export async function getAdminStaffFromFirestore(): Promise<AdminStaffMember[] | null> {
  try {
    const docRef = doc(db, 'settings', 'admin_staff');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && Array.isArray(data.members)) {
        return data.members;
      }
    }
    return null;
  } catch (error) {
    console.warn('Error fetching admin staff from Firestore:', error);
    return null;
  }
}


// ================= MASTER CATEGORIES CLOUD SYNC =================
export function subscribeToStoreCategories(
  onSuccess: (categories: string[]) => void,
  onError?: (err: unknown) => void
) {
  if (isQuotaExceededInSession()) {
    return () => {};
  }
  const docRef = doc(db, 'settings', 'store_categories');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.categories)) {
          onSuccess(data.categories);
        }
      }
    },
    (error) => {
      console.warn('Could not sync store categories from Firestore:', error);
      if (onError) onError(error);
    }
  );
}

export async function saveStoreCategoriesToFirestore(categories: string[]): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'store_categories');
    await setDoc(docRef, { 
      categories, 
      updatedAt: new Date().toISOString() 
    }, { merge: true });
  } catch (error) {
    console.warn('Error saving categories to Firestore:', error);
  }
}

// Direct fetch of the current Admin PIN from Firestore
export async function getAdminPinFromFirestore(): Promise<string | null> {
  try {
    const docRef = doc(db, 'settings', 'admin_security');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && typeof data.pin === 'string' && data.pin.trim()) {
        return data.pin.trim();
      }
    }
    return null;
  } catch (error) {
    console.warn('Error fetching admin PIN from Firestore:', error);
    return null;
  }
}


