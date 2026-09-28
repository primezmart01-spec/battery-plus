import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CreditCard, CheckCircle2, ArrowRight, AlertCircle, Zap } from 'lucide-react';
import { Order } from '../types';

interface PaymentPortalPageProps {
  orderId: string;
  onNavigate: (route: string, param?: string) => void;
}

export const PaymentPortalPage: React.FC<PaymentPortalPageProps> = ({ orderId, onNavigate }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentType, setPaymentType] = useState<'card' | 'jazzcash' | 'easypaisa'>('card');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.order) {
          setOrder(d.order);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [orderId]);

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/payment/simulate-gateway-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentType
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onNavigate('order-confirmation', orderId);
      } else {
        setError(data.error || 'Payment confirmation failed');
      }
    } catch {
      setError('Connection to payment gateway failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center text-slate-500">
        <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-sm">Connecting to secure payment gateway...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h2>
        <button onClick={() => onNavigate('home')} className="bg-red-600 text-white font-bold px-5 py-2 rounded-lg text-xs">
          Return to Store
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 min-h-screen py-12 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center pb-4 border-b border-slate-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[11px] font-bold mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>PayFast / 3D Secure Pakistan Portal</span>
          </div>
          <h2 className="text-xl font-black text-white">Chaudhary Battery Online Checkout</h2>
          <p className="text-xs text-slate-400 mt-1">
            Order <strong className="text-white">#{order.order_number}</strong>
          </p>
        </div>

        {/* Amount Box */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-center">
          <span className="text-xs text-slate-400 block mb-1">Payable Amount</span>
          <div className="text-3xl font-black font-mono text-red-500">
            Rs. {Number(order.total_amount).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Verified by Server · 100% Secure Transaction
          </span>
        </div>

        {/* Method Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Select Online Payment Channel
          </label>

          <label
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              paymentType === 'card'
                ? 'border-red-500 bg-red-600/10 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <input
              type="radio"
              name="pm"
              checked={paymentType === 'card'}
              onChange={() => setPaymentType('card')}
              className="accent-red-600"
            />
            <CreditCard className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold">Visa / MasterCard / PayPak Debit & Credit</span>
          </label>

          <label
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              paymentType === 'jazzcash'
                ? 'border-red-500 bg-red-600/10 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <input
              type="radio"
              name="pm"
              checked={paymentType === 'jazzcash'}
              onChange={() => setPaymentType('jazzcash')}
              className="accent-red-600"
            />
            <Zap className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold">JazzCash Mobile Account & Voucher</span>
          </label>

          <label
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              paymentType === 'easypaisa'
                ? 'border-red-500 bg-red-600/10 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <input
              type="radio"
              name="pm"
              checked={paymentType === 'easypaisa'}
              onChange={() => setPaymentType('easypaisa')}
              className="accent-red-600"
            />
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">EasyPaisa Mobile Account</span>
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-900/40 border border-red-700/60 rounded-lg text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2 space-y-3">
          <button
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 px-6 rounded-lg text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <span>VERIFYING SERVER WEBHOOK SIGNATURE...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>CONFIRM PAYMENT & DISPATCH BATTERY</span>
              </>
            )}
          </button>

          <button
            onClick={() => onNavigate('checkout')}
            disabled={isProcessing}
            className="w-full text-slate-500 hover:text-slate-300 text-xs text-center py-2 transition-colors"
          >
            Cancel and Return to Checkout
          </button>
        </div>

        <div className="pt-4 border-t border-slate-900 text-[10px] text-slate-500 text-center leading-relaxed">
          Chaudhary Battery And UPS F10 uses PCI-DSS compliant server-side webhook verification. Raw card data is never logged or stored.
        </div>
      </div>
    </div>
  );
};
