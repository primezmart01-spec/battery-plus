import React from 'react';
import { X, Trash2, ArrowRight, ShoppingBag, ShieldCheck, Zap, Plus, Minus } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface CartDrawerProps {
  onNavigate: (route: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigate }) => {
  const { items, totalItems, subtotal, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart } = useCart();

  if (!isCartOpen) return null;

  const isbFreeThreshold = 10000;
  const progressPercent = Math.min(100, (subtotal / isbFreeThreshold) * 100);
  const remainingForFreeDelivery = Math.max(0, isbFreeThreshold - subtotal);

  const handleCheckout = () => {
    setIsCartOpen(false);
    onNavigate('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-base">Your Cart ({totalItems})</h2>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-white"
            aria-label="Close Cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Alert for Islamabad */}
        <div className="bg-amber-50 border-b border-amber-200/80 p-3 text-xs text-amber-900">
          <div className="flex items-center justify-between font-semibold mb-1">
            <span>⚡ Islamabad Free Roadside Delivery</span>
            <span>{subtotal >= isbFreeThreshold ? 'UNLOCKED' : `Rs. ${remainingForFreeDelivery.toLocaleString()} away`}</span>
          </div>
          <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="font-bold text-slate-800 text-base mb-1">Your cart is empty</p>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                Explore our genuine battery collection from AGS, Daewoo, Volta, Osaka, and Exide.
              </p>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onNavigate('shop');
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow transition-colors"
              >
                BROWSE BATTERIES
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="py-3.5 flex gap-3">
                <img
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=200&q=80'}
                  alt={item.productName}
                  className="w-16 h-16 object-cover rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-red-600 uppercase tracking-wide">
                    {item.brandName}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate mb-0.5">
                    {item.productName}
                  </h4>
                  {item.variantTitle && (
                    <div className="text-[10px] text-slate-500 mb-1">
                      Variant: {item.variantTitle}
                    </div>
                  )}
                  <div className="text-xs font-bold font-mono text-slate-900">
                    Rs. {item.unitPrice.toLocaleString()}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity Controls */}
                    <div className="flex items-center border border-slate-200 rounded">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="px-2 py-1 text-slate-500 hover:text-slate-800 disabled:opacity-40"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-800 font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.maxStock}
                        className="px-2 py-1 text-slate-500 hover:text-slate-800 disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                Rs. {subtotal.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Estimated Delivery:</span>
              <span className="font-bold text-emerald-600">
                {subtotal >= isbFreeThreshold ? 'FREE (Islamabad)' : 'Rs. 500 (Rwp) / Calculated at checkout'}
              </span>
            </div>

            <div className="flex items-center justify-between font-extrabold text-base text-slate-900 border-t border-slate-200 pt-2">
              <span>Grand Total:</span>
              <span className="font-mono text-red-600">
                Rs. {subtotal.toLocaleString()}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 justify-center py-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Official Stamped Warranty Card Included</span>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-[0.99] text-sm"
            >
              <span>PROCEED TO CHECKOUT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
