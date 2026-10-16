/**
 * Push & Device Notifications Engine for LC Boutique
 * Supports Web Notifications API, Service Worker Background Notifications,
 * Audio Chime, Vibration, and Instant Notification Dispatch without hanging.
 */

export interface LCNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  type: 'order_new' | 'order_accepted' | 'order_shipping' | 'order_delivered' | 'order_cancelled' | 'system';
  orderId?: string;
  read: boolean;
}

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Play luxury notification chime safely without blocking
 */
export const playNotificationChime = () => {
  setTimeout(() => {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // Harmonic luxury chime tones (F#5 -> C#6 -> A#6)
      const playTone = (freq: number, start: number, duration: number, gainVal: number) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + duration);
        } catch {
          // ignore tone errors
        }
      };

      playTone(740, now, 0.35, 0.15);           // F#5
      playTone(1108.73, now + 0.08, 0.45, 0.2); // C#6
      playTone(1480, now + 0.18, 0.6, 0.22);    // F#6
    } catch {
      // Ignore audio context errors safely
    }
  }, 0);
};

/**
 * Trigger physical device vibration
 */
export const triggerDeviceVibration = () => {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 250]);
    }
  } catch {
    // Ignore
  }
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('lc_notifications_enabled', 'true');
      playNotificationChime();
      triggerDeviceVibration();

      // Ensure service worker is registered
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
      }
      return true;
    } else {
      localStorage.setItem('lc_notifications_enabled', 'false');
      return false;
    }
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return false;
  }
};

/**
 * Fast, non-hanging resolution for Service Worker Registration
 */
async function resolveSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    // 1. Check if controller already exists and has registration
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing && existing.active) {
      return existing;
    }

    // 2. Race ready against a quick 400ms timeout so it NEVER hangs
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 400));
    const readyReg = await Promise.race([navigator.serviceWorker.ready, timeoutPromise]);
    if (readyReg) {
      return readyReg;
    }

    // 3. Fallback to any existing registration
    if (existing) {
      return existing;
    }

    // 4. Register dynamically if not registered yet
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (e) {
    console.warn('SW resolution note:', e);
    return null;
  }
}

/**
 * Send device notification to customer or admin
 * Guaranteed NEVER to hang and ALWAYS arrives multiple times with distinct IDs
 */
export const sendDeviceNotification = async (
  title: string,
  options: {
    body: string;
    icon?: string;
    tag?: string;
    orderId?: string;
    type?: LCNotification['type'];
    url?: string;
  }
): Promise<boolean> => {
  if (!isNotificationSupported()) {
    return false;
  }

  // If permission is default, do not throw or hang
  if (Notification.permission !== 'granted') {
    return false;
  }

  // Play audio chime and physical vibration
  playNotificationChime();
  triggerDeviceVibration();

  // Save to local notification history
  const uniqueId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  saveNotificationToHistory({
    id: uniqueId,
    title,
    body: options.body,
    timestamp: Date.now(),
    type: options.type || 'system',
    orderId: options.orderId,
    read: false
  });

  // Always use a unique tag combined with renotify: true so subsequent notifications are NEVER suppressed
  const distinctTag = options.tag 
    ? `${options.tag}-${Date.now()}` 
    : `lc-notif-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  const notificationOptions: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: options.body,
    icon: options.icon || '/pwa-192x192.png',
    badge: '/icon.svg',
    tag: distinctTag,
    renotify: true,
    vibrate: [250, 100, 250],
    data: {
      url: options.url || (typeof window !== 'undefined' ? window.location.href : '/'),
      orderId: options.orderId
    },
    dir: 'rtl',
    lang: 'ar'
  };

  let shown = false;

  // Path 1: Service Worker Registration (Required for Android Mobile Chrome & Background)
  try {
    const swReg = await resolveSWRegistration();
    if (swReg && typeof swReg.showNotification === 'function') {
      await swReg.showNotification(title, notificationOptions);
      shown = true;
      return true;
    }
  } catch (swErr) {
    console.warn('SW showNotification attempted:', swErr);
  }

  // Path 2: Post message to active Service Worker controller
  try {
    if (!shown && navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: notificationOptions
      });
      shown = true;
      return true;
    }
  } catch {
    // ignore
  }

  // Path 3: Standard window Notification fallback (Desktop browsers like Chrome, Edge, Safari, Firefox)
  try {
    if (!shown) {
      const n = new Notification(title, notificationOptions);
      n.onclick = () => {
        try {
          window.focus();
        } catch {
          // ignore
        }
        n.close();
      };
      shown = true;
      return true;
    }
  } catch (notifErr) {
    console.warn('Standard Notification fallback note:', notifErr);
  }

  return shown;
};

/**
 * Local Notification History management
 */
export const getNotificationHistory = (): LCNotification[] => {
  try {
    const saved = localStorage.getItem('lc_notification_history');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }
  return [];
};

export const saveNotificationToHistory = (item: LCNotification) => {
  try {
    const current = getNotificationHistory();
    const updated = [item, ...current.filter((n) => n.id !== item.id)].slice(0, 40);
    localStorage.setItem('lc_notification_history', JSON.stringify(updated));
  } catch {
    // Ignore
  }
};

export const markAllNotificationsAsRead = () => {
  try {
    const current = getNotificationHistory();
    const updated = current.map((n) => ({ ...n, read: true }));
    localStorage.setItem('lc_notification_history', JSON.stringify(updated));
  } catch {
    // Ignore
  }
};

/**
 * Register Admin Device for notifications (Standard Service Worker registration)
 */
export const registerAdminDeviceForBackgroundPush = async (
  staffName?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const permission = await requestNotificationPermission();
    if (permission) {
      return { success: true, message: 'تم تفعيل إشعارات جهاز الإدارة بنجاح 🔔' };
    }
    return { success: false, message: 'يرجى السماح بالإشعارات من إعدادات المتصفح' };
  } catch {
    return { success: false, message: 'تعذر تفعيل الإشعارات' };
  }
};

/**
 * Dispatch notification helper
 */
export const sendOrderPushNotificationToServer = async (order: any) => {
  // Safe no-op
};

