import React, { useState, useEffect } from 'react';
import { CheckCircle2, Package, Printer, ArrowRight, ShieldCheck, Phone, MapPin, Zap, Download, Building2, Smartphone, CreditCard, Banknote, Copy, Check } from 'lucide-react';
import { Order } from '../types';
import { InvoiceModal } from '../components/common/InvoiceModal';

interface OrderConfirmationPageProps {
  orderId: string;
  onNavigate: (route: string, param?: string) => void;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({ orderId, onNavigate }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvoice, setShowInvoice] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

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

  const handleCopyTracking = (trackingNum: string) => {
    navigator.clipboard.writeText(trackingNum);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center text-slate-500">
        <div className="inline-block w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-sm text-slate-800">Confirming your battery order with F-10 dispatch...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Order Confirmed</h2>
        <p className="text-xs text-slate-500 mb-6">Your order has been recorded in our system.</p>
        <button
          onClick={() => onNavigate('home')}
          className="bg-slate-900 text-white font-bold px-6 py-2.5 rounded-xl text-xs"
        >
          RETURN TO STORE
        </button>
      </div>
    );
  }

  const clientBankDetails = (order as any).clientPaymentDetails || (order.payment?.raw_response ? (() => {
    try { return JSON.parse(order.payment.raw_response); } catch { return null; }
  })() : null);

  const getPaymentMethodDisplay = (method: string) => {
    switch (method) {
      case 'cod':
        return { label: 'Cash on Delivery (Doorstep Verification)', icon: Banknote, color: 'text-emerald-700 bg-emerald-50' };
      case 'bank_transfer':
        return { label: 'Direct Bank Transfer (IBFT / Meezan Bank)', icon: Building2, color: 'text-blue-700 bg-blue-50' };
      case 'jazzcash':
        return { label: 'JazzCash Mobile Account', icon: Smartphone, color: 'text-rose-700 bg-rose-50' };
      case 'easypaisa':
        return { label: 'EasyPaisa Mobile Account', icon: Smartphone, color: 'text-emerald-700 bg-emerald-50' };
      case 'card':
        return { label: 'Debit / Credit Card (1Link)', icon: CreditCard, color: 'text-indigo-700 bg-indigo-50' };
      default:
        return { label: method?.toUpperCase() || 'STANDARD PAYMENT', icon: CreditCard, color: 'text-slate-700 bg-slate-50' };
    }
  };

  const paymentDisplay = getPaymentMethodDisplay(order.payment_method);
  const PaymentIcon = paymentDisplay.icon;

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Success Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm text-center mb-8">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full mb-3 inline-block">
            Order Confirmed & Logged in Admin Dispatch
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
            Shukriya! Your Order is Confirmed
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
            Order <strong className="text-slate-900 font-mono">#{order.order_number}</strong> has been received by our technical dispatch team at F-10 Markaz Islamabad. A confirmation email with full tracking details has been sent to <strong className="text-slate-900">{order.customer_email}</strong>.
          </p>

          {/* Automatic Consignment Tracking Banner */}
          {order.tracking_number && (
            <div className="bg-blue-50/80 border-2 border-blue-200 rounded-2xl p-4 sm:p-5 max-w-md mx-auto mb-6 text-left">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-700" />
                  <span>Consignment Tracking ID (Auto Created)</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  LIVE READY
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-blue-200">
                <span className="font-mono font-black text-sm sm:text-base text-slate-900 tracking-wider">
                  {order.tracking_number}
                </span>
                <button
                  onClick={() => handleCopyTracking(order.tracking_number!)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors flex-shrink-0"
                >
                  {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTracking ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>
              <p className="text-[11px] text-blue-700 mt-2">
                Use this ID to track your roadside technician delivery van in real-time.
              </p>
            </div>
          )}

          {/* Order & Payment Summary Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-w-md mx-auto text-left text-xs space-y-3 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Order Number:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-200/70 px-2 py-0.5 rounded">
                #{order.order_number}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold text-slate-900">{order.customer_name}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment Method:</span>
              <span className={`font-bold text-[11px] px-2 py-0.5 rounded flex items-center gap-1 ${paymentDisplay.color}`}>
                <PaymentIcon className="w-3 h-3" />
                <span>{paymentDisplay.label}</span>
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment Status:</span>
              <span className={`font-bold uppercase px-2 py-0.5 rounded text-[11px] ${order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {order.payment_status}
              </span>
            </div>

            {/* Client Submitted Bank Details */}
            {(clientBankDetails || order.payment_method === 'bank_transfer') && (
              <div className="pt-2 border-t border-slate-200 space-y-1.5 text-[11px] text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-blue-700" />
                  <span>Submitted Bank Transfer Details:</span>
                </div>
                {clientBankDetails?.senderBank && <div>Sender Bank: <strong>{clientBankDetails.senderBank}</strong></div>}
                {clientBankDetails?.accountTitle && <div>Account Title: <strong>{clientBankDetails.accountTitle}</strong></div>}
                {clientBankDetails?.accountNumber && <div>Account/IBAN: <code className="font-mono text-slate-800">{clientBankDetails.accountNumber}</code></div>}
                {clientBankDetails?.transactionRef && <div>Transaction Ref / ID: <code className="font-mono font-bold text-blue-800 bg-blue-50 px-1 py-0.5 rounded">{clientBankDetails.transactionRef}</code></div>}
              </div>
            )}

            <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-sm">
              <span className="font-bold text-slate-900">Total Bill:</span>
              <span className="font-mono font-black text-slate-900 text-base">
                Rs. {Number(order.total_amount).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowInvoice(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>VIEW / PRINT OFFICIAL INVOICE</span>
            </button>

            <button
              onClick={() => onNavigate('track-order', order.tracking_number || order.order_number)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Package className="w-4 h-4" />
              <span>TRACK LIVE DELIVERY</span>
            </button>
          </div>
        </div>

        {/* Delivery & Warranty Instructions Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4 text-xs text-slate-700">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Delivery & Official Warranty Claim Guarantee</span>
          </h3>

          <ul className="space-y-2.5 list-disc pl-5 leading-relaxed text-slate-600">
            <li>
              <strong className="text-slate-900">Doorstep Technician Contact:</strong> Our delivery rider will call on your phone ({order.customer_phone}) prior to arrival.
            </li>
            <li>
              <strong className="text-slate-900">Official Stamped Warranty Card:</strong> The physical official manufacturer warranty slip stamped by Chaudhary Battery And UPS F10 will be handed to you upon delivery.
            </li>
            <li>
              <strong className="text-slate-900">Old Battery Scrap Trade-in:</strong> If you applied for the scrap rebate, please have your old core battery ready for exchange.
            </li>
          </ul>

          <div className="pt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 gap-2">
            <span>Chaudhary Battery And UPS · F-10 Markaz Islamabad</span>
            <span className="font-semibold text-slate-800">Support WhatsApp: +92 300 5551234</span>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && (
        <InvoiceModal
          order={order}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
};
