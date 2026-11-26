export type Role = 'ADMIN' | 'CUSTOMER';

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'MOCK' | 'VNPAY' | 'MOMO' | 'STRIPE' | 'COD';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
  meta: PaginationMeta | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  isActive?: boolean;
  createdAt: string;
}

export interface Address {
  id: string;
  recipientName: string;
  phone: string;
  street: string;
  ward?: string | null;
  district: string;
  city: string;
  country: string;
  postalCode?: string | null;
  isDefault: boolean;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  productCount: number;
  children: CategoryTreeNode[];
}

export interface CategoryFlat {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  _count?: { products: number; children: number };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  price: string;
  stock: number;
  images: string[];
  isActive: boolean;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
  };
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    price: string;
    stock: number;
    images: string[];
    isActive: boolean;
  };
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalItems: number;
  totalAmount: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  shippingAddress: {
    recipientName: string;
    phone: string;
    street: string;
    ward?: string | null;
    district: string;
    city: string;
    country: string;
    postalCode?: string | null;
  };
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTransactionId?: string | null;
  totalAmount: string;
  note?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  items: OrderItem[];
  user?: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
  };
}
