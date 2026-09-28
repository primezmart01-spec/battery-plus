import React, { useState, useEffect } from 'react';
import {
  User,
  Package,
  MapPin,
  Lock,
  Trash2,
  Plus,
  ShieldCheck,
  Printer,
  AlertTriangle,
  Clock,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order, Address } from '../types';
import { InvoiceModal } from '../components/common/InvoiceModal';

interface AccountPageProps {
  onNavigate: (route: string, param?: string) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ onNavigate }) => {
  const { user, logout, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile' | 'security'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);

  // Form states
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileMsg, setProfileMsg] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });

  // Address modal state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddr, setNewAddr] = useState({
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    phone: user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city: 'Islamabad',
    province: 'Islamabad Capital Territory',
    isDefaultShipping: true
  });

  // Account deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  const loadOrders = async () => {
    const token = localStorage.getItem('cbf10_token');
    if (!token || !user) return;
    setIsRefreshingOrders(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingOrders(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone || '');

    // Fetch orders & addresses with auth headers
    loadOrders();

    const token = localStorage.getItem('cbf10_token');
    if (token) {
      fetch('/api/auth/addresses', {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) setAddresses(d.addresses || []);
        })
        .catch(console.error);
    }
  }, [user]);

  // Re-fetch and auto-poll when user switches to orders tab
  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
      const interval = setInterval(loadOrders, 10000); // Auto-poll order status every 10 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Please Sign In</h2>
        <p className="text-xs text-slate-500 mb-6">You need to sign in to access your account dashboard.</p>
        <button
          onClick={() => onNavigate('login')}
          className="bg-red-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs"
        >
          GO TO LOGIN
        </button>
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfileMsg('Profile updated successfully.');
        await refreshUser();
      }
    } catch {
      setProfileMsg('Failed to update profile.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg({ text: '', isError: false });

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMsg({ text: 'Password changed successfully.', isError: false });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ text: data.error || 'Password update failed.', isError: true });
      }
    } catch {
      setPasswordMsg({ text: 'Connection error.', isError: true });
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddr)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddressModal(false);
        // Refresh addresses
        const adRes = await fetch('/api/auth/addresses').then(r => r.json());
        if (adRes.success) setAddresses(adRes.addresses);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await fetch(`/api/auth/addresses/${id}`, { method: 'DELETE' });
      setAddresses(prev => prev.filter(a => (a as any).id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmPassword: deletePassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteModalOpen(false);
        await logout();
        onNavigate('home');
      } else {
        setDeleteError(data.error || 'Failed to delete account.');
      }
    } catch {
      setDeleteError('Connection error.');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-600 text-white rounded-xl flex items-center justify-center font-black text-2xl shadow-lg">
              {user.firstName[0]}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-xs text-slate-400 font-mono">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold bg-slate-800 text-emerald-400 px-2 py-0.5 rounded uppercase">
                  Verified Customer
                </span>
                {user.role === 'admin' && (
                  <button
                    onClick={() => onNavigate('admin')}
                    className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded uppercase"
                  >
                    Go to Admin Dashboard →
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              await logout();
              onNavigate('home');
            }}
            className="self-start sm:self-auto bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Dashboard Tabs & Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-1">
            <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm space-y-1 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
                  activeTab === 'orders' ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>My Orders ({orders.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('addresses')}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
                  activeTab === 'addresses' ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Saved Addresses ({addresses.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
                  activeTab === 'profile' ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Account Profile</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
                  activeTab === 'security' ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Security & Password</span>
              </button>
            </div>
          </div>

          {/* Main Tab Content */}
          <div className="lg:col-span-3">
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900">Order History</h3>
                    <button
                      onClick={loadOrders}
                      disabled={isRefreshingOrders}
                      className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md border border-slate-200 transition-colors"
                      title="Sync latest order status from server"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingOrders ? 'animate-spin text-red-600' : ''}`} />
                      <span>{isRefreshingOrders ? 'Syncing...' : 'Sync Status'}</span>
                    </button>
                  </div>
                  <button
                    onClick={() => onNavigate('shop')}
                    className="text-xs text-red-600 font-bold hover:underline"
                  >
                    Order Another Battery
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-700">No orders placed yet</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Your battery orders and official stamped warranty slips will appear here.</p>
                    <button
                      onClick={() => onNavigate('shop')}
                      className="bg-red-600 text-white font-bold text-xs px-5 py-2 rounded-lg"
                    >
                      BROWSE BATTERIES
                    </button>
                  </div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                        <div>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            #{order.order_number}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {order.payment_method}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            order.order_status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.order_status === 'shipped' || order.order_status === 'out_for_delivery'
                              ? 'bg-blue-100 text-blue-800'
                              : order.order_status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : order.order_status === 'confirmed' || order.order_status === 'processing' || order.order_status === 'packed'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {order.order_status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Product Line Items List */}
                      {order.items && order.items.length > 0 && (
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-3 space-y-2 text-xs">
                          <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider block mb-1">
                            Ordered Items ({order.items.length})
                          </span>
                          {order.items.map((it: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200/50 first:border-0 first:pt-0">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 bg-white border border-slate-200 rounded p-0.5 flex-shrink-0 flex items-center justify-center">
                                  <img
                                    src={it.product_image || it.image_url || '/uploads/battery_ags_gl65.jpg'}
                                    alt=""
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/battery_ags_gl65.jpg'; }}
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate">{it.product_title || 'Lead-Acid Battery'}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    SKU: {it.sku} · Qty: {it.quantity} × Rs. {Number(it.unit_price).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className="font-mono font-bold text-slate-900 whitespace-nowrap">
                                Rs. {Number(it.subtotal_price || (it.unit_price * it.quantity)).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Summary & Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs pt-1">
                        <div>
                          <div className="font-bold text-slate-800">
                            Grand Total: <span className="font-mono text-slate-900 text-sm">Rs. {Number(order.total_amount).toLocaleString()}</span>
                          </div>
                          {order.tracking_number && (
                            <div className="text-slate-500 mt-0.5">
                              Tracking ID: <span className="font-mono font-bold text-slate-900">{order.tracking_number}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOrderForInvoice(order)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </button>

                          <button
                            onClick={() => onNavigate('track-order', order.order_number)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-1.5 rounded-lg transition-colors"
                          >
                            Track Delivery
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-extrabold text-base text-slate-900">Saved Addresses</h3>
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Address</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((a: any) => (
                    <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900 text-sm">{a.full_name}</span>
                          {a.is_default_shipping === 1 && (
                            <span className="bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2 py-0.5 rounded">
                              Default Shipping
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600">{a.phone}</div>
                        <div className="text-slate-700 font-medium mt-1">
                          {a.address_line1}, {a.city}, {a.province}
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => handleDeleteAddress(a.id)}
                          className="text-slate-400 hover:text-red-600 flex items-center gap-1 text-[11px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 max-w-xl">
                <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3">
                  Account Details
                </h3>

                <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Email (Read Only)</label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full border border-slate-200 bg-slate-100 rounded-lg px-3 py-2 text-slate-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>

                  {profileMsg && (
                    <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg font-semibold">
                      {profileMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs"
                  >
                    SAVE CHANGES
                  </button>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6 max-w-xl">
                {/* Change Password */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3">
                    Change Password
                  </h3>

                  <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Current Password</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">New Password (min 8 chars)</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                      />
                    </div>

                    {passwordMsg.text && (
                      <div className={`p-2.5 rounded-lg font-semibold ${passwordMsg.isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {passwordMsg.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg text-xs"
                    >
                      UPDATE PASSWORD
                    </button>
                  </form>
                </div>

                {/* Account Deletion (Section 76 & 48) */}
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 shadow-sm space-y-3 text-xs">
                  <h3 className="font-extrabold text-sm text-rose-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Delete Account & Anonymize Personal Data</span>
                  </h3>
                  <p className="text-rose-800 leading-relaxed">
                    This permanently removes your profile, addresses, and wishlist. Historical sales orders are preserved for accounting with your personal identifiers permanently anonymized.
                  </p>
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg text-xs"
                  >
                    REQUEST ACCOUNT DELETION
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-xs">
            <h3 className="font-bold text-base text-slate-900 mb-4">Add New Delivery Address</h3>
            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newAddr.fullName}
                  onChange={e => setNewAddr({ ...newAddr, fullName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={newAddr.phone}
                  onChange={e => setNewAddr({ ...newAddr, phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={newAddr.addressLine1}
                  onChange={e => setNewAddr({ ...newAddr, addressLine1: e.target.value })}
                  placeholder="House #, Street #"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">City / Sector</label>
                <input
                  type="text"
                  required
                  value={newAddr.city}
                  onChange={e => setNewAddr({ ...newAddr, city: e.target.value })}
                  placeholder="e.g. Islamabad, F-10"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Verification Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-xs">
            <h3 className="font-bold text-base text-rose-900 mb-2">Confirm Account Deletion</h3>
            <p className="text-slate-600 mb-4">
              Enter your current account password to confirm permanent deletion and anonymization.
            </p>

            <input
              type="password"
              placeholder="Enter your password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3"
            />

            {deleteError && (
              <div className="p-2 bg-red-50 text-red-700 rounded mb-3 font-semibold">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-5 py-2 bg-rose-600 text-white font-bold rounded-lg"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedOrderForInvoice && (
        <InvoiceModal order={selectedOrderForInvoice} onClose={() => setSelectedOrderForInvoice(null)} />
      )}
    </div>
  );
};
