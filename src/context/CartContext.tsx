import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  isLoading: boolean;
  lastAddedName: string | null;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (productId: string, variantId?: string, quantity?: number) => Promise<{ success: boolean; error?: string; message?: string }>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Memory fallback in case localStorage is blocked by iframe or browser restrictions
let inMemorySessionId: string | null = null;

function getLocalSessionId(): string {
  if (typeof window === 'undefined') return 'sess_default';
  try {
    let sid = localStorage.getItem('cbf10_session_id');
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('cbf10_session_id', sid);
    }
    return sid;
  } catch (err) {
    if (!inMemorySessionId) {
      inMemorySessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    return inMemorySessionId;
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);

  const getHeaders = useCallback(() => {
    let token = '';
    try {
      token = localStorage.getItem('cbf10_token') || '';
    } catch (_) {}

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-session-id': getLocalSessionId()
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart', {
        headers: getHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.cart) {
          const cartItems = data.cart.items || [];
          setItems(cartItems);
          setTotalItems(data.cart.totalItems || 0);
          setSubtotal(data.cart.subtotal || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
    }
  }, [getHeaders]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (productId: string, variantId?: string, quantity = 1) => {
    setIsLoading(true);
    const sid = getLocalSessionId();
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ productId, variantId, quantity, sessionId: sid })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.cart) {
          setItems(data.cart.items || []);
          setTotalItems(data.cart.totalItems || 0);
          setSubtotal(data.cart.subtotal || 0);
        } else {
          await refreshCart();
        }
        if (data.lastAddedName) {
          setLastAddedName(data.lastAddedName);
          setTimeout(() => setLastAddedName(null), 3000);
        }
        setIsCartOpen(true);
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Failed to add item to cart' };
    } catch (err) {
      console.error('addToCart error:', err);
      return { success: false, error: 'Network error connecting to cart' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ quantity })
      });
      const data = await res.json();
      if (res.ok && data.cart) {
        setItems(data.cart.items || []);
        setTotalItems(data.cart.totalItems || 0);
        setSubtotal(data.cart.subtotal || 0);
      } else {
        await refreshCart();
      }
    } catch (err) {
      console.error('Failed to update quantity:', err);
      await refreshCart();
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.cart) {
        setItems(data.cart.items || []);
        setTotalItems(data.cart.totalItems || 0);
        setSubtotal(data.cart.subtotal || 0);
      } else {
        await refreshCart();
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
      await refreshCart();
    }
  };

  const clearCart = async () => {
    try {
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.cart) {
        setItems(data.cart.items || []);
        setTotalItems(data.cart.totalItems || 0);
        setSubtotal(data.cart.subtotal || 0);
      } else {
        setItems([]);
        setTotalItems(0);
        setSubtotal(0);
      }
    } catch (err) {
      console.error('Failed to clear cart:', err);
      await refreshCart();
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        isCartOpen,
        isLoading,
        lastAddedName,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
