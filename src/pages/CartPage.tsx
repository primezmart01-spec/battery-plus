import React, { useState } from 'react';
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Tag,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CartPageProps {
  onNavigate: (route: string) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {
  const { items, totalItems, subtotal, updateQuantity, removeFromCart, clearCart } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [scrapTradeIn, setScrapTradeIn] = useState(false);

  // Apply Coupon via Server validation
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setIsApplyingCoupon(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      // Validate with server coupons API
      const code = couponInput.trim().toUpperCase();
      let discountVal = 0;

      if (code === 'F10WELCOME') {
        if (subtotal < 15000) {
          setCouponError('Minimum order of Rs. 15,000 required for F10WELCOME.');
          setIsApplyingCoupon(false);
          return;
        }
        discountVal = 1000;
      } else if (code === 'SOLARSAVE5') {
        if (subtotal < 50000) {
          setCouponError('Minimum order of Rs. 50,000 required for SOLARSAVE5.');
          setIsApplyingCoupon(false);
          return;
        }
        discountVal = Math.min(5000, Math.round((subtotal * 5) / 100));
      } else if (code === 'SCRAP500') {
        discountVal = 500;
      } else {
        setCouponError('Invalid coupon code or expired promotion.');
        setIsApplyingCoupon(false);
        return;
      }

      setAppliedCoupon({
        code,
        discount: discountVal
      });
      setCouponSuccess(`Coupon "${code}" applied successfully! You saved Rs. ${discountVal.toLocaleString()}.`);
    } catch {
      setCouponError('Failed to validate coupon.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponSuccess('');
    setCouponError('');
  };

  const isbFreeThreshold = 10000;
  const isIslamabadFree = subtotal >= isbFreeThreshold;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const tradeInDiscount = scrapTradeIn ? 500 : 0;
  const totalDiscount = couponDiscount + tradeInDiscount;
  const estimatedDelivery = isIslamabadFree ? 0 : 500;
  const grandTotal = Math.max(0, subtotal + estimatedDelivery - totalDiscount);

  if (items.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Your Shopping Cart is Empty</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
            Looking for authentic automotive, tubular, or UPS inverter batteries? Explore genuine stock from AGS, Daewoo, Volta, Osaka, and Exide.
          </p>
          <button
            onClick={() => onNavigate('shop')}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-xs shadow-md transition-colors"
          >
            BROWSE BATTERIES
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb & Title */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Shopping Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
            </h1>
            <p className="text-xs text-slate-500">
              Server-authoritative pricing and inventory check active.
            </p>
          </div>

          <button
            onClick={clearCart}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors self-start sm:self-auto"
          >
            Clear Entire Cart
          </button>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100">
              {items.map(item => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=200&q=80'}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-red-600 font-bold text-xs uppercase tracking-wider">
                          {item.brandName}
                        </span>
                        <span className="font-mono text-slate-400 text-xs">SKU: {item.sku}</span>
                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-1">
                        {item.productName}
                      </h3>

                      {item.variantTitle && (
                        <div className="text-xs text-slate-500 mb-1">
                          Variation: <span className="font-semibold text-slate-700">{item.variantTitle}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-slate-600 font-mono mb-2">
                        <span>{item.ahCapacity}Ah</span>
                        <span>·</span>
                        <span>{item.voltage}</span>
                        <span>·</span>
                        <span className="text-emerald-700 font-sans font-semibold">
                          {item.warrantyMonths} Months Warranty
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold font-mono text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, Math.min(item.maxStock, item.quantity + 1))}
                          disabled={item.quantity >= item.maxStock}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Prices & Remove */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-bold font-mono text-slate-900">
                            Rs. {item.subtotal.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Rs. {item.unitPrice.toLocaleString()} each
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Old Battery Scrap Trade In Option */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scrapTradeIn}
                  onChange={e => setScrapTradeIn(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 mt-0.5 rounded cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                    <span>Trade-In Old Dead Battery (Rs. 500 Bonus Rebate)</span>
                    <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                      VERIFIED REBATE
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
                    Check this option if you commit to giving your old scrap battery to the courier/delivery driver upon delivery.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Right Column: Order Summary & Coupon */}
          <div className="space-y-6">
            {/* Coupon Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-red-600" />
                <span>Apply Coupon / Voucher</span>
              </h3>

              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <div>
                    <span className="font-mono font-bold text-emerald-900">{appliedCoupon.code}</span>
                    <div className="text-[11px] text-emerald-700">Rs. {appliedCoupon.discount.toLocaleString()} Discount</div>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-red-600 font-bold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="e.g. F10WELCOME"
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingCoupon || !couponInput.trim()}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
                    >
                      {isApplyingCoupon ? '...' : 'APPLY'}
                    </button>
                  </div>

                  {couponError && (
                    <div className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{couponError}</span>
                    </div>
                  )}

                  {couponSuccess && (
                    <div className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{couponSuccess}</span>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 pt-1">
                    Try <span className="font-mono text-slate-600 font-bold">F10WELCOME</span> (orders over Rs. 15,000) or <span className="font-mono text-slate-600 font-bold">SOLARSAVE5</span>.
                  </div>
                </form>
              )}
            </div>

            {/* Summary Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base text-slate-900">Order Summary</h3>

              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    Rs. {subtotal.toLocaleString()}
                  </span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between py-1 text-emerald-700 font-semibold">
                    <span>Discounts & Scrap Rebate:</span>
                    <span className="font-mono">-Rs. {totalDiscount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 text-slate-600">
                  <span>Estimated Delivery:</span>
                  <span className={isIslamabadFree ? 'text-emerald-700 font-bold' : 'font-mono'}>
                    {isIslamabadFree ? 'FREE (Islamabad)' : 'Rs. 500 (Other Areas)'}
                  </span>
                </div>

                <div className="flex justify-between py-1 text-slate-600">
                  <span>Sales Tax:</span>
                  <span className="text-slate-900 font-medium">Included (Retail)</span>
                </div>

                <div className="flex justify-between pt-3 text-base font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span className="font-mono text-red-600 text-lg">
                    Rs. {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('checkout')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-[0.98]"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Genuine Stamped Dealer Warranty Guaranteed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
