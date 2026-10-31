export type Category = string;

export interface ProductList {
  id: string;
  name: string;
  description?: string;
  categories?: string[]; // Array of category names/labels assigned to this list
  productIds: string[];
  createdAt: string;
}

export interface ProductVariantOption {
  name: string;
  stockCount: number;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  category: string;
  categoryLabel: string;
  priceUSD: number; // Amount in IQD (Dinar)
  priceIQD?: number;
  originalPriceUSD?: number;
  image: string;
  images?: string[]; // Multiple images support for gallery
  shortDesc: string;
  description: string;
  specs?: {
    material?: string;
    origin?: string;
    warranty?: string;
    dimensions?: string;
  };
  inStock: boolean;
  stockCount: number;
  rating: number;
  reviewsCount: number;
  isFeatured?: boolean;
  isFeaturedInStrip?: boolean;
  sizes?: string[]; // Optional legacy sizes
  customOptions?: string[]; // Optional custom options/variants defined by admin (e.g. colors, models, types)
  customOptionLabel?: string; // Optional label for the custom options (e.g. 'اللون / النوع المطلوب')
  variantOptions?: ProductVariantOption[]; // Per-option stock count and linked image
}

export function getProductVariants(product?: Product | null): ProductVariantOption[] {
  if (!product) return [];
  if (Array.isArray(product.variantOptions) && product.variantOptions.length > 0) {
    return product.variantOptions
      .filter((v) => v && typeof v.name === 'string' && v.name.trim().length > 0)
      .map((v) => ({
        name: v.name.trim(),
        stockCount: typeof v.stockCount === 'number' ? Math.max(0, Math.floor(v.stockCount)) : 10,
        ...(v.image && typeof v.image === 'string' && v.image.trim() ? { image: v.image.trim() } : {})
      }));
  }
  if (Array.isArray(product.customOptions) && product.customOptions.length > 0) {
    const fallbackStock = typeof product.stockCount === 'number' ? Math.max(0, Math.floor(product.stockCount)) : 10;
    return product.customOptions
      .filter((opt) => typeof opt === 'string' && opt.trim().length > 0)
      .map((opt) => ({
        name: opt.trim(),
        stockCount: fallbackStock
      }));
  }
  return [];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string; // Optional legacy chosen size
  selectedOption?: string; // Chosen custom option/variant by the customer
  selectedOptionLabel?: string; // Label of the custom option group
  selectedOptionImage?: string; // Image linked to the chosen custom option/variant
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  contactType?: 'email' | 'phone';
  contactValue?: string; // for compatibility
  joinedAt: string;
  isBlocked?: boolean;
  blockReason?: string;
  blockedAt?: string;
}

export interface Order {
  id: string;
  userId?: string;
  orderNumber: string;
  createdAt: string;
  items: CartItem[];
  subtotalUSD: number;
  shippingUSD: number;
  totalUSD: number;
  currency: 'USD' | 'IQD';
  currencyRate: number; // e.g. 1320 IQD per USD
  customer: {
    name: string;
    contact: string;
    phone: string;
    city: string;
    address: string;
    notes?: string;
  };
  paymentMethod: 'cod';
  status: 'pending' | 'approved' | 'rejected' | 'delivered';
  adminNotes?: string;
  isFreeShipping?: boolean;
  stockDeducted?: boolean;
}

export interface FreeShippingConfig {
  enabled: boolean;
  minOrderAmountIQD: number; // Minimum order subtotal in IQD to unlock free shipping
  minItemsCount?: number; // Legacy fallback
}

export interface AdminStaffMember {
  id: string;
  name: string;
  pin: string;
  role?: 'admin' | 'manager';
  createdAt: string;
  lastLoginAt?: string;
}


