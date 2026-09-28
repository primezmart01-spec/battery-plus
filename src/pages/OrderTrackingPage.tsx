import React, { useState, useEffect } from 'react';
import { Package, Search, CheckCircle2, Clock, Truck, ShieldCheck, MapPin, AlertCircle, Phone, UserCheck } from 'lucide-react';
import { Order } from '../types';

interface OrderTrackingPageProps {
  initialOrderNumber?: string;
  onNavigate: (route: string, param?: string) => void;
}

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({ initialOrderNumber, onNavigate }) => {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber || '');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [trackingData, setTrackingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTracking = async (num: string, contact?: string) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: num.trim(),
          trackingNumber: num.trim(),
          phoneOrEmail: contact ? contact.trim() : undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTrackingData(data.tracking);
      } else {
        setError(data.error || 'No matching order or tracking number found.');
        setTrackingData(null);
      }
    } catch {
      setError('Connection error while tracking order.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) {
      fetchTracking(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber) {
      setError('Please enter your Order Number (e.g. CBF10-2026-XXXX) or Tracking ID.');
      return;
    }
    fetchTracking(orderNumber, phoneOrEmail);
  };

  const statuses = [
    { key: 'pending', label: 'Order Placed', desc: 'Order received at F-10 dispatch' },
    { key: 'confirmed', label: 'Order Confirmed', desc: 'Stock verified & technician assigned' },
    { key: 'processing', label: 'Diagnostic Testing', desc: 'Acid load & state-of-charge hydrometer checked' },
    { key: 'packed', label: 'Warranty Card Stamped', desc: 'Official dealer warranty card packed' },
    { key: 'shipped', label: 'Out for Mobile Delivery', desc: 'Technician van in transit to location' },
    { key: 'delivered', label: 'Delivered & Fitted', desc: 'Installed in vehicle with terminal grease' }
  ];

  const getStatusIndex = (currentStatus: string) => {
    const map: Record<string, number> = {
      pending: 0,
      confirmed: 1,
      processing: 2,
      packed: 3,
      shipped: 4,
      out_for_delivery: 4,
      delivered: 5
    };
    return map[currentStatus] ?? 0;
  };

  const currentStep = trackingData ? getStatusIndex(trackingData.order_status) : 0;

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-bold mb-3 shadow-sm">
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>Chaudhary Battery F-10 Live Dispatch Logistics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Track Battery Delivery & Installation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time status updates for Islamabad roadside mobile fitting vans and nationwide courier consignments.
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm mb-10">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Order Number or Tracking ID
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="e.g. CBF10-2026-4580 or TRK-849201"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white font-bold"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-md"
              >
                <Search className="w-4 h-4 text-amber-400" />
                <span>{isLoading ? 'SEARCHING LOGS...' : 'TRACK SHIPMENT'}</span>
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}
        </div>

        {/* Tracking Details Display */}
        {trackingData && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Order Reference
                  </span>
                  <div className="text-xl font-black text-slate-900 font-mono">
                    #{trackingData.order_number}
                  </div>
                  {trackingData.tracking_number && (
                    <div className="text-xs text-slate-600 mt-1 font-mono">
                      Tracking ID: <strong className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{trackingData.tracking_number}</strong>
                    </div>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide ${
                    trackingData.order_status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : trackingData.order_status === 'shipped' || trackingData.order_status === 'out_for_delivery'
                      ? 'bg-blue-100 text-blue-800'
                      : trackingData.order_status === 'cancelled'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{trackingData.order_status.replace('_', ' ')}</span>
                  </span>
                  <div className="text-xs text-slate-400 mt-1">
                    Ordered on {new Date(trackingData.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Cancelled Banner if applicable */}
              {trackingData.order_status === 'cancelled' && (
                <div className="my-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <div>
                    <strong className="font-bold block text-sm">Order Cancelled</strong>
                    This order has been marked as cancelled. If you have questions regarding refunds or cancellation details, please contact our F-10 Markaz helpline.
                  </div>
                </div>
              )}

              {/* Progress Stepper */}
              <div className="py-8">
                <div className="relative">
                  <div className="absolute top-5 left-4 right-4 h-1 bg-slate-200 -z-0 hidden md:block" />
                  <div
                    className="absolute top-5 left-4 h-1 bg-slate-900 -z-0 hidden md:block transition-all duration-700"
                    style={{ width: `${(currentStep / (statuses.length - 1)) * 92}%` }}
                  />

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-6 relative z-10">
                    {statuses.map((s, idx) => {
                      const isComplete = idx <= currentStep;
                      const isCurrent = idx === currentStep;

                      return (
                        <div key={s.key} className="text-left md:text-center space-y-2">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs md:mx-auto transition-colors shadow-sm ${
                              isComplete
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            {isComplete ? <CheckCircle2 className="w-5 h-5 text-amber-400" /> : idx + 1}
                          </div>

                          <div>
                            <div className={`font-bold text-xs ${isCurrent ? 'text-slate-900 font-black' : isComplete ? 'text-slate-800' : 'text-slate-400'}`}>
                              {s.label}
                            </div>
                            <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                              {s.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Destination & Recipient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100 text-xs text-slate-600">
                <div className="space-y-1">
                  <span className="font-bold text-slate-900 block uppercase text-[10px]">Customer Recipient:</span>
                  <div className="font-bold text-slate-800">{trackingData.customer_name}</div>
                  <div className="font-mono">{trackingData.customer_phone}</div>
                  {trackingData.shippingAddress && (
                    <div className="text-slate-700">
                      {trackingData.shippingAddress.address_line1}, {trackingData.shippingAddress.city}
                    </div>
                  )}
                </div>

                <div className="space-y-1 sm:text-right">
                  <span className="font-bold text-slate-900 block uppercase text-[10px]">Payment & Total:</span>
                  <div>
                    Payment: <strong className="uppercase">{trackingData.payment_method}</strong> ({trackingData.payment_status})
                  </div>
                  <div className="font-mono font-black text-slate-900 text-sm">
                    Rs. {Number(trackingData.total_amount).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Helpline Dispatch Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Need Roadside Van Arrival Update?</h4>
                  <p className="text-xs text-slate-300">Call our F-10 Markaz dispatch desk directly for immediate location coordination.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href="tel:+92512212345"
                  className="bg-white text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>+92 51 2212345</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
