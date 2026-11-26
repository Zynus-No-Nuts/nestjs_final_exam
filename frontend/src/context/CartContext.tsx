import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient } from '../api/client';
import type { ApiEnvelope, Cart } from '../types';
import { useAuth } from './AuthContext';

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get<ApiEnvelope<Cart>>('/cart');
      setCart(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const addToCart = async (productId: string, quantity = 1) => {
    const res = await apiClient.post<ApiEnvelope<Cart>>('/cart/items', { productId, quantity });
    setCart(res.data.data);
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    const res = await apiClient.patch<ApiEnvelope<Cart>>(`/cart/items/${productId}`, {
      quantity,
    });
    setCart(res.data.data);
  };

  const removeItem = async (productId: string) => {
    const res = await apiClient.delete<ApiEnvelope<Cart>>(`/cart/items/${productId}`);
    setCart(res.data.data);
  };

  const clearCart = async () => {
    const res = await apiClient.delete<ApiEnvelope<Cart>>('/cart');
    setCart(res.data.data);
  };

  return (
    <CartContext.Provider
      value={{ cart, loading, refreshCart, addToCart, updateQuantity, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
