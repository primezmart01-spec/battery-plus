import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlistIds: string[];
  toggleWishlist: (productId: string) => Promise<boolean>;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('cbf10_wishlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Fetch wishlist from server whenever user changes/logs in
  const refreshWishlist = async () => {
    const token = localStorage.getItem('cbf10_token');
    if (!token || !user) {
      try {
        const stored = localStorage.getItem('cbf10_wishlist');
        setWishlistIds(stored ? JSON.parse(stored) : []);
      } catch {
        setWishlistIds([]);
      }
      return;
    }

    try {
      const res = await fetch('/api/wishlist', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        const ids = data.items.map((i: any) => i.id);
        setWishlistIds(ids);
        localStorage.setItem('cbf10_wishlist', JSON.stringify(ids));
      }
    } catch (err) {
      console.error('Failed to sync wishlist from server:', err);
    }
  };

  useEffect(() => {
    refreshWishlist();
  }, [user]);

  // Save to localStorage when wishlistIds change
  useEffect(() => {
    try {
      localStorage.setItem('cbf10_wishlist', JSON.stringify(wishlistIds));
    } catch (e) {
      console.error(e);
    }
  }, [wishlistIds]);

  const toggleWishlist = async (productId: string): Promise<boolean> => {
    const currentlyIn = wishlistIds.includes(productId);
    const updated = currentlyIn
      ? wishlistIds.filter(id => id !== productId)
      : [...wishlistIds, productId];

    setWishlistIds(updated);

    const token = localStorage.getItem('cbf10_token');
    if (token && user) {
      try {
        await fetch('/api/wishlist/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({ productId })
        });
      } catch (err) {
        console.error('Error toggling wishlist on backend:', err);
      }
    }

    return !currentlyIn;
  };

  const isInWishlist = (productId: string) => wishlistIds.includes(productId);

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        toggleWishlist,
        isInWishlist,
        wishlistCount: wishlistIds.length,
        refreshWishlist
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider');
  return context;
};
