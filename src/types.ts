export type Category = string;

export interface ProductList {
  id: string;
  name: string;
  description?: string;
  categories?: string[]; // Array of category names/labels assigned to this list
  productIds: string[];
  createdAt: string;
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
  sizes?: string[]; // Optional available sizes (e.g. S, M, L, XL or 40, 41, 42)
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string; // Optional chosen size
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
}

export interface AdminStaffMember {
  id: string;
  name: string;
  pin: string;
  role?: 'admin' | 'manager';
  createdAt: string;
  lastLoginAt?: string;
}

