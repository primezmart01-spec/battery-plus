import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Zap,
  Phone,
  UserCheck,
  Smartphone,
  Sparkles,
  FileText,
  Tag,
  X
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface CheckoutPageProps {
  onNavigate: (route: string, param?: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const { items, subtotal, clearCart } = useCart();
  const { user, login, register } = useAuth();

  // Multi-step Checkout state
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Inline Account Auth Tab (if not logged in)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authPhone, setAuthPhone] = useState('+92 3');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Auto populate when user changes
  useEffect(() => {
    if (user) {
      setCustomerName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
      setCustomerEmail(user.email || '');
      setCustomerPhone(user.phone || '+92 ');
      setShippingAddress(prev => ({
        ...prev,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        phone: user.phone || ''
      }));
    }
  }, [user]);

  // Shipping Address
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: 'Islamabad',
    province: 'Islamabad Capital Territory',
    postalCode: '44000'
  });

  // Billing Address
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: 'Islamabad',
    province: 'Islamabad Capital Territory',
    postalCode: '44000'
  });

  // Options & Payment Methods
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'card'>('cod');
  const [senderBank, setSenderBank] = useState('Meezan Bank');
  const [senderAccountTitle, setSenderAccountTitle] = useState('');
  const [bankTxRef, setBankTxRef] = useState('');
  const [mobileWalletNumber, setMobileWalletNumber] = useState('');
  const [walletTxRef, setWalletTxRef] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [oldBatteryTradeIn, setOldBatteryTradeIn] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Calculations
  const isIslamabad = shippingAddress.city.toLowerCase().includes('islamabad') || shippingAddress.city.toLowerCase().includes('f-10') || shippingAddress.city.toLowerCase().includes('f-11') || shippingAddress.city.toLowerCase().includes('g-10') || shippingAddress.city.toLowerCase().includes('e-11');
  const isRawalpindi = shippingAddress.city.toLowerCase().includes('rawalpindi') || shippingAddress.city.toLowerCase().includes('rwp');
  const shippingFee = isIslamabad ? 0 : isRawalpindi ? (subtotal >= 30000 ? 0 : 500) : 1500;
  const scrapDiscount = oldBatteryTradeIn ? 500 : 0;
  const grandTotal = Math.max(0, subtotal + shippingFee - scrapDiscount - couponDiscount);

  // Handle Coupon Apply
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setIsApplyingCoupon(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const res = await fetch('/api/catalog/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), amount: subtotal })
      });
      const data = await res.json();
      if (res.ok && data.success && data.coupon) {
        setAppliedCoupon(data.coupon);
        setCouponDiscount(data.coupon.discountAmount);
        setCouponSuccess(data.message || `Coupon "${data.coupon.code}" applied!`);
      } else {
        setCouponError(data.error || 'Invalid or expired coupon code.');
        setAppliedCoupon(null);
        setCouponDiscount(0);
      }
    } catch {
      setCouponError('Error validating coupon code. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
  };

  // Handle Inline Authentication
  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);

    try {
      if (authTab === 'login') {
        const res = await login(authEmail, authPassword);
        if (!res.success) {
          setAuthError(res.error || 'Invalid email or password.');
        }
      } else {
        const res = await register({
          firstName: authFirstName,
          lastName: authLastName,
          email: authEmail,
          phone: authPhone,
          password: authPassword,
          terms: true
        });
        if (!res.success) {
          setAuthError(res.error || 'Registration failed. Please check your fields.');
        }
      }
    } catch {
      setAuthError('Connection error. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-slate-50 min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Your Cart is Empty</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Select high-performance AGS, Daewoo, Volta, Osaka or Exide batteries before proceeding to checkout.
          </p>
          <button
            onClick={() => onNavigate('shop')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs tracking-wider transition-colors shadow-md"
          >
            EXPLORE BATTERY CATALOG
          </button>
        </div>
      </div>
    );
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (step === 1) {
      if (!customerName || !customerEmail || !customerPhone) {
        setErrorMessage('Please provide your complete customer contact details.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!shippingAddress.addressLine1 || !shippingAddress.city) {
        setErrorMessage('Please provide a complete street delivery address.');
        return;
      }
      setStep(3);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      setErrorMessage('An account is required to place your order. Please sign in or register above.');
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let txReference = '';
      if (paymentMethod === 'bank_transfer') txReference = bankTxRef || 'Pending bank deposit';
      else if (paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') txReference = `Mobile: ${mobileWalletNumber} (Tx: ${walletTxRef || 'Instant'})`;
      else if (paymentMethod === 'card') txReference = `Card: ending in ${cardNumber.slice(-4) || '4242'}`;

      const bankDetails = {
        senderBank: paymentMethod === 'bank_transfer' ? (senderBank || 'Meezan Bank') : (paymentMethod === 'jazzcash' ? 'JazzCash Mobile' : (paymentMethod === 'easypaisa' ? 'EasyPaisa Mobile' : 'Online Card')),
        senderAccountTitle: senderAccountTitle || customerName || `${user.firstName} ${user.lastName}`,
        transactionReference: bankTxRef || walletTxRef || txReference
      };

      const payload = {
        customerName: customerName || `${user.firstName} ${user.lastName}`,
        customerEmail: customerEmail || user.email,
        customerPhone: customerPhone || user.phone || '+923005551234',
        shippingAddress: {
          fullName: shippingAddress.fullName || customerName || `${user.firstName} ${user.lastName}`,
          phone: shippingAddress.phone || customerPhone || user.phone || '+923005551234',
          addressLine1: shippingAddress.addressLine1 || 'Shop / House address',
          addressLine2: shippingAddress.addressLine2 || '',
          city: shippingAddress.city || 'Islamabad',
          province: shippingAddress.province || 'Islamabad Capital Territory',
          postalCode: shippingAddress.postalCode || '44000'
        },
        billingAddress: billingSameAsShipping ? undefined : billingAddress,
        billingSameAsShipping,
        paymentMethod,
        transactionReference: txReference,
        bankDetails,
        shippingNotes,
        oldBatteryTradeIn,
        couponCode: appliedCoupon ? appliedCoupon.code : (couponCode.trim() || undefined),
        items: items.map(it => ({
          productId: it.productId,
          variantId: it.variantId || undefined,
          quantity: it.quantity
        }))
      };

      const token = localStorage.getItem('cbf10_token');
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Order processing failed. Please check your details.');
        setIsSubmitting(false);
        return;
      }

      // Order created successfully!
      await clearCart();
      onNavigate('order-confirmation', data.orderId);
    } catch (err: any) {
      setErrorMessage('A network error occurred while submitting your order. Please retry.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header Strip */}
        <div className="mb-8 text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-bold mb-3 shadow-sm">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Official Authorised Dealer · 256-Bit Encrypted Order</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Secure Checkout & Express Dispatch
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Free doorstep delivery & professional computerized load testing across Islamabad & Rawalpindi.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${step >= 1 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                1
              </span>
              <span>Account & Contact</span>
            </div>
            <div className={`h-0.5 flex-1 mx-3 ${step >= 2 ? 'bg-slate-900' : 'bg-slate-200'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${step >= 2 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                2
              </span>
              <span>Delivery Address</span>
            </div>
            <div className={`h-0.5 flex-1 mx-3 ${step >= 3 ? 'bg-slate-900' : 'bg-slate-200'}`} />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${step >= 3 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                3
              </span>
              <span>Payment & Confirmation</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Checkout Steps (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-6">

            {/* STEP 1: Account Gate & Contact Information */}
            {step === 1 && (
              <div className="space-y-6">
                {!user ? (
                  <div className="bg-white border-2 border-slate-900/10 rounded-2xl p-6 sm:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <UserCheck className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          Account Required for Order & Warranty
                        </h3>
                        <p className="text-xs text-slate-500">
                          Sign in or create an account in 10 seconds to link your official warranty slip & track live delivery.
                        </p>
                      </div>
                    </div>

                    {/* Auth Mode Tabs */}
                    <div className="flex border-b border-slate-200 mb-5">
                      <button
                        type="button"
                        onClick={() => setAuthTab('register')}
                        className={`pb-2.5 px-4 font-bold text-xs transition-colors border-b-2 ${
                          authTab === 'register'
                            ? 'border-slate-900 text-slate-900'
                            : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        Create New Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthTab('login')}
                        className={`pb-2.5 px-4 font-bold text-xs transition-colors border-b-2 ${
                          authTab === 'login'
                            ? 'border-slate-900 text-slate-900'
                            : 'border-transparent text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        Sign In with Password
                      </button>
                    </div>

                    {authError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}

                    <form onSubmit={handleInlineAuth} className="space-y-4 text-xs">
                      {authTab === 'register' ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-700 font-bold mb-1">First Name</label>
                              <input
                                type="text"
                                required
                                value={authFirstName}
                                onChange={e => setAuthFirstName(e.target.value)}
                                placeholder="Tariq"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-700 font-bold mb-1">Last Name</label>
                              <input
                                type="text"
                                required
                                value={authLastName}
                                onChange={e => setAuthLastName(e.target.value)}
                                placeholder="Mehmood"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                              <input
                                type="email"
                                required
                                value={authEmail}
                                onChange={e => setAuthEmail(e.target.value)}
                                placeholder="customer@gmail.com"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-700 font-bold mb-1">Mobile / WhatsApp</label>
                              <input
                                type="tel"
                                required
                                value={authPhone}
                                onChange={e => setAuthPhone(e.target.value)}
                                placeholder="+92 300 1234567"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Password</label>
                            <input
                              type="password"
                              required
                              minLength={8}
                              value={authPassword}
                              onChange={e => setAuthPassword(e.target.value)}
                              placeholder="Minimum 8 characters"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isAuthenticating}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg text-xs transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <span>{isAuthenticating ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT & PROCEED TO ADDRESS'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                            <input
                              type="email"
                              required
                              value={authEmail}
                              onChange={e => setAuthEmail(e.target.value)}
                              placeholder="your-email@domain.com"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Password</label>
                            <input
                              type="password"
                              required
                              value={authPassword}
                              onChange={e => setAuthPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isAuthenticating}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg text-xs transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <span>{isAuthenticating ? 'AUTHENTICATING...' : 'SIGN IN & CONTINUE CHECKOUT'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </form>
                  </div>
                ) : (
                  <form onSubmit={handleNextStep} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                            Authenticated Customer: {user.firstName} {user.lastName}
                          </h3>
                          <span className="text-[11px] text-slate-500">{user.email} · Verified Account</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="e.g. Tariq Mehmood"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={customerEmail}
                          onChange={e => setCustomerEmail(e.target.value)}
                          placeholder="e.g. tariq@gmail.com"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Mobile / WhatsApp Number</label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          placeholder="+92 300 1234567"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl text-xs flex items-center gap-2 shadow-md transition-transform active:scale-95"
                      >
                        <span>PROCEED TO DELIVERY ADDRESS</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* STEP 2: Delivery & Shipping Address */}
            {step === 2 && (
              <form onSubmit={handleNextStep} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-base text-slate-900">
                    2. Delivery Address (Islamabad & Rawalpindi)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-slate-600 font-bold hover:underline"
                  >
                    Edit Contact
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City / Sector</label>
                    <select
                      value={shippingAddress.city}
                      onChange={e => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white font-semibold"
                    >
                      <option value="Islamabad">Islamabad (F-10, F-11, E-11, G-10, DHA, Bahria)</option>
                      <option value="Rawalpindi">Rawalpindi (Saddar, Cantt, Satellite Town)</option>
                      <option value="Wah Cantt">Wah Cantt / Taxila</option>
                      <option value="Other">Other Nationwide (Express Cargo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Province</label>
                    <input
                      type="text"
                      value={shippingAddress.province}
                      onChange={e => setShippingAddress({ ...shippingAddress, province: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Complete Street Address / House / Plot #</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.addressLine1}
                    onChange={e => setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })}
                    placeholder="e.g. House # 42, Street 18, Sector F-10/2, Islamabad"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nearby Landmark / Delivery Instructions (Optional)</label>
                  <input
                    type="text"
                    value={shippingNotes}
                    onChange={e => setShippingNotes(e.target.value)}
                    placeholder="e.g. Near Markaz Mosque, call when entering gate"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl text-xs flex items-center gap-2 shadow-md transition-transform active:scale-95"
                  >
                    <span>CONTINUE TO PAYMENT</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Payment Method Selection & Review */}
            {step === 3 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-base text-slate-900">
                    3. Choose Payment Method
                  </h3>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs text-slate-600 font-bold hover:underline"
                  >
                    Edit Address
                  </button>
                </div>

                {/* 4 Pakistani Payment Options */}
                <div className="space-y-3.5">
                  {/* Option 1: Cash on Delivery (COD) */}
                  <label
                    className={`p-4 rounded-xl border-2 cursor-pointer flex items-start gap-4 transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-slate-900 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          <span>Cash on Delivery (Doorstep Verification)</span>
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                          FREE INSTALLATION
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Pay cash directly to our rider/technician upon delivery in Islamabad/Rawalpindi. Official stamped manufacturer warranty card provided on spot.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Direct Bank Transfer (Meezan Bank F-10) */}
                  <label
                    className={`p-4 rounded-xl border-2 cursor-pointer flex items-start gap-4 transition-all ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={() => setPaymentMethod('bank_transfer')}
                      className="accent-slate-900 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span>Direct Bank Transfer (Meezan Bank / IBAN)</span>
                        </span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                          ONLINE BANKING
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                        Transfer via Raast / 1Link to: <strong>Meezan Bank F-10 Markaz Islamabad</strong> (IBAN: PK42MEZN0000100123456789).
                      </p>
                      {paymentMethod === 'bank_transfer' && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Your Sender Bank Name
                              </label>
                              <input
                                type="text"
                                value={senderBank}
                                onChange={e => setSenderBank(e.target.value)}
                                placeholder="e.g. Meezan Bank / HBL / Allied"
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Your Account Title / Sender Name
                              </label>
                              <input
                                type="text"
                                value={senderAccountTitle}
                                onChange={e => setSenderAccountTitle(e.target.value)}
                                placeholder="e.g. Malik Tariq Mehmood"
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Bank Deposit Reference / Transaction TRX #
                            </label>
                            <input
                              type="text"
                              value={bankTxRef}
                              onChange={e => setBankTxRef(e.target.value)}
                              placeholder="e.g. MEZN-TX-849201 / Raast TRX # 981273"
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Option 3: JazzCash / EasyPaisa Mobile Wallet */}
                  <label
                    className={`p-4 rounded-xl border-2 cursor-pointer flex items-start gap-4 transition-all ${
                      paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa'
                        ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa'}
                      onChange={() => setPaymentMethod('jazzcash')}
                      className="accent-slate-900 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-rose-600" />
                          <span>JazzCash & EasyPaisa Mobile Wallet</span>
                        </span>
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                          INSTANT WALLET
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Pay from your JazzCash or EasyPaisa account. Instant mobile confirmation.
                      </p>
                      {(paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') && (
                        <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Wallet Account Number</label>
                            <input
                              type="tel"
                              value={mobileWalletNumber}
                              onChange={e => setMobileWalletNumber(e.target.value)}
                              placeholder="03001234567"
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Wallet Provider</label>
                            <select
                              value={paymentMethod}
                              onChange={e => setPaymentMethod(e.target.value as any)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                            >
                              <option value="jazzcash">JazzCash Mobile Account</option>
                              <option value="easypaisa">EasyPaisa Mobile Account</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Option 4: Debit / Credit Card (1Link / Visa / MasterCard) */}
                  <label
                    className={`p-4 rounded-xl border-2 cursor-pointer flex items-start gap-4 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="accent-slate-900 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-indigo-600" />
                          <span>Credit / Debit Card (Visa, MasterCard, PayPak)</span>
                        </span>
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                          1LINK SECURE
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Instant card processing with 3D Secure OTP verification.
                      </p>
                      {paymentMethod === 'card' && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Card Number</label>
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={e => setCardNumber(e.target.value)}
                              placeholder="4123 •••• •••• 4242"
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Expiry (MM/YY)</label>
                              <input
                                type="text"
                                value={cardExpiry}
                                onChange={e => setCardExpiry(e.target.value)}
                                placeholder="12/28"
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">CVV</label>
                              <input
                                type="password"
                                maxLength={4}
                                value={cardCvv}
                                onChange={e => setCardCvv(e.target.value)}
                                placeholder="•••"
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {/* Old Battery Scrap Trade-in Rebate */}
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={oldBatteryTradeIn}
                      onChange={e => setOldBatteryTradeIn(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 mt-0.5 rounded"
                    />
                    <div>
                      <span className="font-bold text-xs text-emerald-950 block">
                        Trade In Old Dead Battery for Instant Rs. 500 Discount
                      </span>
                      <span className="text-[11px] text-emerald-800 leading-relaxed block mt-0.5">
                        Our technician will collect your old scrap battery at the time of new battery installation.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 px-8 rounded-xl text-xs tracking-wider shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>{isSubmitting ? 'RECORDING ORDER IN SYSTEM...' : 'CONFIRM & PLACE ORDER NOW'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs text-slate-400 font-normal">({items.length} Batteries)</span>
              </h3>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                {items.map(it => (
                  <div key={it.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate">{it.productName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Qty: {it.quantity} × Rs. {it.unitPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 whitespace-nowrap">
                      Rs. {it.subtotal.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Box */}
              <div className="pt-2">
                {appliedCoupon ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="font-mono font-bold text-emerald-900 text-xs">{appliedCoupon.code}</div>
                        <div className="text-[11px] text-emerald-700">Applied (-Rs. {couponDiscount.toLocaleString()})</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title="Remove coupon"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="PROMO CODE (e.g. F10WELCOME)"
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900 uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isApplyingCoupon || !couponCode.trim()}
                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition-colors"
                      >
                        {isApplyingCoupon ? '...' : 'APPLY'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{couponError}</p>
                    )}
                    {couponSuccess && (
                      <p className="text-[11px] text-emerald-700 mt-1 font-semibold">{couponSuccess}</p>
                    )}
                    <div className="mt-1.5 flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => { setCouponCode('F10WELCOME'); }}
                        className="text-[10px] text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-mono"
                      >
                        Try F10WELCOME
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCouponCode('SOLARSAVE5'); }}
                        className="text-[10px] text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded font-mono"
                      >
                        Try SOLARSAVE5
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs border-t border-slate-100 pt-4">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">Rs. {subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Delivery & Installation:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {shippingFee === 0 ? 'FREE (Islamabad)' : `Rs. ${shippingFee.toLocaleString()}`}
                  </span>
                </div>

                {oldBatteryTradeIn && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Scrap Trade-in Rebate:</span>
                    <span className="font-mono font-bold">- Rs. 500</span>
                  </div>
                )}

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount ({appliedCoupon?.code || couponCode}):</span>
                    <span className="font-mono font-bold">- Rs. {couponDiscount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-3">
                  <span>Grand Total:</span>
                  <span className="font-mono text-slate-900">Rs. {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>100% Stamped Warranty Slip Included</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>45-Min Mobile Fitting Van in ICT</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Free Computerized Alternator Diagnostic</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
