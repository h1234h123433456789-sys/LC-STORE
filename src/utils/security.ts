/**
 * LC Luxury Boutique - Internal Security Suite & Anti-Tamper Shield
 * Provides:
 * 1. Cryptographic Password Hashing (SHA-256 + Salt)
 * 2. XSS & Script Injection Sanitizer
 * 3. Anti-Tamper Price Verification
 * 4. Brute-Force Lockout Protection (Admin PIN)
 * 5. Spam / Bot Rate Limiting
 */

// Salt prefix for hash fortification
const CRYPTO_SALT_PREFIX = 'LC_BOUTIQUE_SECURE_SALT_2026_';

/**
 * Generates a cryptographic SHA-256 hash for passwords with salt.
 * Ensures passwords are never saved or transmitted as plaintext.
 */
export async function hashPassword(password: string, email: string): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  const saltedString = `${CRYPTO_SALT_PREFIX}:${cleanEmail}:${cleanPass}`;
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(saltedString);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback simple hash if subtle crypto is not available
  let hash = 0;
  for (let i = 0; i < saltedString.length; i++) {
    const char = saltedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

/**
 * Checks if a provided password matches the stored password/hash.
 * Supports both hashed and legacy plaintext during transition.
 */
export async function verifyPassword(
  providedPass: string, 
  storedPassOrHash: string, 
  email: string
): Promise<boolean> {
  if (!providedPass || !storedPassOrHash) return false;
  
  // 1. Direct match (if old legacy plain text)
  if (providedPass.trim() === storedPassOrHash.trim()) {
    return true;
  }
  
  // 2. Cryptographic hash comparison
  const calculatedHash = await hashPassword(providedPass, email);
  return calculatedHash === storedPassOrHash.trim();
}

/**
 * Deep Sanitize user string inputs against XSS, HTML tags, and malicious payloads
 */
export function sanitizeInput(input: string, maxLength = 300): string {
  if (!input || typeof input !== 'string') return '';
  
  let cleaned = input
    .trim()
    // Remove HTML tags and script injections
    .replace(/<[^>]*>?/gm, '')
    // Remove dangerous javascript: or data: prefixes
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+=/gi, '')
    // Replace dangerous angle brackets and quotes
    .replace(/[<>]/g, '');

  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  return cleaned;
}

/**
 * Anti-Tamper Price Check:
 * Compares cart items against actual catalog prices in real-time.
 * If any price discrepancy is detected (e.g. user tampered with client state),
 * it returns corrected total and flags the tampering attempt.
 */
export interface PriceVerificationResult {
  isValid: boolean;
  tampered: boolean;
  correctSubtotalUSD: number;
  warnings: string[];
}

export function verifyOrderIntegrity(
  cartItems: Array<{ product: { id: string; priceUSD: number }; quantity: number }>,
  catalogProducts: Array<{ id: string; priceUSD: number }>
): PriceVerificationResult {
  let calculatedSubtotal = 0;
  let tampered = false;
  const warnings: string[] = [];

  const catalogMap = new Map<string, number>();
  catalogProducts.forEach(p => catalogMap.set(p.id, p.priceUSD));

  for (const item of cartItems) {
    const officialPrice = catalogMap.get(item.product.id);
    const itemQty = Math.max(1, Math.min(item.quantity, 50)); // Max 50 per item constraint

    if (officialPrice !== undefined) {
      if (Math.abs(item.product.priceUSD - officialPrice) > 0.01) {
        tampered = true;
        warnings.push(`تم كشف محاولة تلاعب بسعر المنتج (${item.product.id}). السعر الرسمي هو $${officialPrice}.`);
      }
      calculatedSubtotal += officialPrice * itemQty;
    } else {
      // If product not in catalog map, fallback to item's stated price
      calculatedSubtotal += Math.max(0, item.product.priceUSD) * itemQty;
    }
  }

  return {
    isValid: !tampered,
    tampered,
    correctSubtotalUSD: calculatedSubtotal,
    warnings,
  };
}

/**
 * Admin Portal PIN Brute-Force Shield:
 * Limits maximum failed attempts to prevent automated password guessing.
 */
const LOCKOUT_KEY = 'lc_admin_pin_lockout';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export interface LockoutStatus {
  isLocked: boolean;
  remainingMinutes: number;
  remainingSeconds: number;
  attemptsLeft: number;
}

export function checkAdminLockout(): LockoutStatus {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
    
    const data = JSON.parse(raw);
    const now = Date.now();

    if (data.lockedUntil && now < data.lockedUntil) {
      const diffMs = data.lockedUntil - now;
      return {
        isLocked: true,
        remainingMinutes: Math.ceil(diffMs / 60000),
        remainingSeconds: Math.ceil(diffMs / 1000),
        attemptsLeft: 0,
      };
    }

    // Lock expired, reset
    if (data.lockedUntil && now >= data.lockedUntil) {
      localStorage.removeItem(LOCKOUT_KEY);
      return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
    }

    const failed = data.failedAttempts || 0;
    return {
      isLocked: false,
      remainingMinutes: 0,
      remainingSeconds: 0,
      attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - failed),
    };
  } catch (e) {
    return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }
}

export function recordFailedAdminPinAttempt(): LockoutStatus {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    let failed = 1;
    if (raw) {
      const data = JSON.parse(raw);
      failed = (data.failedAttempts || 0) + 1;
    }

    if (failed >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ failedAttempts: failed, lockedUntil }));
      return {
        isLocked: true,
        remainingMinutes: 10,
        remainingSeconds: 600,
        attemptsLeft: 0,
      };
    } else {
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ failedAttempts: failed }));
      return {
        isLocked: false,
        remainingMinutes: 0,
        remainingSeconds: 0,
        attemptsLeft: MAX_FAILED_ATTEMPTS - failed,
      };
    }
  } catch (e) {
    return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }
}

export function resetAdminLockout(): void {
  try {
    localStorage.removeItem(LOCKOUT_KEY);
  } catch (e) {
    // ignore
  }
}
