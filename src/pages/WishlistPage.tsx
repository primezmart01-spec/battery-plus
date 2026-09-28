import React, { useState, useEffect } from 'react';
import { Heart, Trash2, ShoppingCart, ShieldCheck, Zap } from 'lucide-react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

interface WishlistPageProps {
  onNavigate: (route: string, param?: string) => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { wishlistIds, toggleWishlist } = useWishlist();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const token = localStorage.getItem('cbf10_token');

    if (user && token) {
      fetch('/api/wishlist', {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      })
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.items)) {
            setItems(d.items);
          } else {
            fetchLocalProducts(wishlistIds);
          }
        })
        .catch(() => fetchLocalProducts(wishlistIds))
        .finally(() => setIsLoading(false));
    } else {
      fetchLocalProducts(wishlistIds);
    }
  }, [user, wishlistIds.join(',')]);

  const fetchLocalProducts = async (ids: string[]) => {
    if (ids.length === 0) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/products?limit=50');
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        const matched = data.products.filter((p: any) => ids.includes(p.id));
        setItems(matched.map((p: any) => ({
          ...p,
          image_url: p.primary_image || p.image_url || '/uploads/battery_ags_gl65.jpg'
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (productId: string) => {
    await toggleWishlist(productId);
    setItems(prev => prev.filter(i => i.id !== productId));
  };

  if (!user) {
    return (
      <div className="bg-slate-50 min-h-screen py-20 text-center">
        <div className="max-w-md mx-auto px-4">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-1">Sign In to View Wishlist</h2>
          <p className="text-xs text-slate-500 mb-6">
            Your saved batteries are synchronized to your account across devices.
          </p>
          <button
            onClick={() => onNavigate('login')}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs"
          >
            SIGN IN TO ACCOUNT
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center text-slate-500">
        <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-xs">Loading wishlist...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-600" />
            <span>My Saved Wishlist ({items.length})</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Batteries you have bookmarked for future vehicle or solar backup replacement.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 max-w-lg mx-auto">
            <Heart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-base text-slate-900 mb-1">Your Wishlist is Empty</h3>
            <p className="text-xs text-slate-500 mb-6">
              Click the heart icon on any battery card to save it for later review.
            </p>
            <button
              onClick={() => onNavigate('shop')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs"
            >
              EXPLORE BATTERIES
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map(item => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="p-4">
                  <div className="relative pt-[70%] bg-slate-50 rounded-lg overflow-hidden mb-3">
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=400&q=80'}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 text-slate-500 hover:text-red-600 rounded-full shadow"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-1">
                    {item.brand_name}
                  </span>
                  <h4
                    onClick={() => onNavigate('product', item.slug)}
                    className="font-bold text-sm text-slate-900 line-clamp-2 cursor-pointer hover:text-red-600 transition-colors mb-2"
                  >
                    {item.name}
                  </h4>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-600 mb-2">
                    <span>{item.ah_capacity}Ah</span>
                    <span>·</span>
                    <span>{item.voltage}</span>
                    <span>·</span>
                    <span className="text-emerald-700 font-sans font-semibold">
                      {item.warranty_months}M Warranty
                    </span>
                  </div>

                  <div className="text-base font-extrabold font-mono text-slate-900 mb-2">
                    Rs. {(item.sale_price || item.price).toLocaleString()}
                  </div>

                  <div className="text-[11px] mb-3">
                    {item.stock_quantity > 0 ? (
                      <span className="text-emerald-700 font-semibold">In Stock ({item.stock_quantity})</span>
                    ) : (
                      <span className="text-rose-600 font-semibold">Out of Stock</span>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => addToCart(item.id, undefined, 1)}
                    disabled={item.stock_quantity <= 0}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>ADD TO CART</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
