import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Boxes,
  Users,
  Tag,
  MessageSquare,
  ShieldCheck,
  Settings,
  ArrowLeft,
  LogOut,
  AlertTriangle,
  Lock,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  Edit,
  Trash2,
  TrendingUp,
  CreditCard,
  DollarSign,
  RefreshCw,
  FileText,
  ChevronDown,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Order, Product, Brand, Category, Coupon, Review } from '../../types';
import { InvoiceModal } from '../../components/common/InvoiceModal';

interface AdminLayoutProps {
  onNavigate: (route: string, param?: string) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onNavigate }) => {
  const { user, login, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'inventory' | 'customers' | 'coupons' | 'reviews' | 'audit' | 'settings'>('dashboard');

  // Admin login fallback state if not authenticated as admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<any>({
    name: '',
    slug: '',
    brandId: 'brand_ags',
    categoryId: 'cat_car',
    sku: '',
    price: 18000,
    salePrice: 0,
    stockQuantity: 20,
    batteryType: 'Dry Charged Lead-Acid',
    voltage: '12V',
    ahCapacity: 50,
    cca: 400,
    warrantyMonths: 12,
    shortDesc: '',
    imageUrl: '',
    isAutoSku: true
  });

  useEffect(() => {
    if (!editingProductId && productForm.name) {
      const brandCode = (productForm.brandId || 'brand_ags').replace('brand_', '').toUpperCase();
      const categoryCode = (productForm.categoryId || 'cat_car').replace('cat_', '').toUpperCase();
      const ahCode = productForm.ahCapacity ? `${productForm.ahCapacity}AH` : '50AH';
      
      const generatedSlug = productForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const cleanName = productForm.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      const autoSku = `${brandCode}-${categoryCode}-${ahCode}-${cleanName || 'BAT'}`;
      
      setProductForm((prev: any) => ({
        ...prev,
        slug: generatedSlug,
        sku: prev.sku && !prev.isAutoSku ? prev.sku : autoSku,
        isAutoSku: prev.sku && !prev.isAutoSku ? false : true
      }));
    }
  }, [productForm.name, productForm.brandId, productForm.categoryId, productForm.ahCapacity, editingProductId]);

  // Stock Adjustment Modal
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<any>(null);
  const [stockChangeDelta, setStockChangeDelta] = useState(0);
  const [stockReason, setStockReason] = useState('Supplier shipment received');

  // Coupon Modal
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'fixed',
    discountValue: 1000,
    minOrderAmount: 15000,
    maxDiscount: 1000
  });

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  // Fetch admin data
  const loadAdminData = () => {
    if (!isAdmin) return;
    const token = localStorage.getItem('cbf10_token');
    const headers = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };

    fetch('/api/admin/dashboard', { headers, credentials: 'include' }).then(r => r.json()).then(d => { if (d.success) setStats(d); });
    fetch('/api/admin/orders', { headers, credentials: 'include' }).then(r => r.json()).then(d => { if (d.success) setOrders(d.orders || []); });
    fetch('/api/products?limit=50', { headers, credentials: 'include' }).then(r => r.json()).then(d => { if (d.success) setProducts(d.products || []); });
    fetch('/api/admin/inventory', { headers, credentials: 'include' }).then(r => r.json()).then(d => { if (d.success) { setInventoryItems(d.items || []); setInventoryLogs(d.logHistory || []); } });
    fetch('/api/admin/customers', { headers, credentials: 'include' }).then(r => r.json()).then(d => { if (d.success) setCustomers(d.customers || []); });
    fetch('/api/admin/coupons', { headers, credentials: 'include' }).then(r => r.json()).then(d => { if (d.success) setCoupons(d.coupons || []); });
    fetch('/api/admin/reviews', { headers, credentials: 'include' }).then(r => r.json()).then(d => { if (d.success) setReviews(d.reviews || []); });
    fetch('/api/admin/audit-logs', { headers, credentials: 'include' }).then(r => r.json()).then(d => { if (d.success) setAuditLogs(d.logs || []); });
    fetch('/api/admin/settings', { headers, credentials: 'include' }).then(r => r.json()).then(d => { if (d.success) setSettings(d.settings || {}); });
  };

  useEffect(() => {
    loadAdminData();
  }, [isAdmin, activeTab]);

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoggingIn(true);
    setLoginErr('');

    const res = await login(adminEmail || 'admin@chaudharybattery.pk', adminPass || 'ChaudharyAdmin@2026!');
    setIsLoggingIn(false);

    if (!res.success) {
      setLoginErr(res.error || 'Admin credentials incorrect.');
    }
  };

  const handleQuickSuperAdmin = async () => {
    setIsLoggingIn(true);
    setLoginErr('');
    try {
      const res = await fetch('/api/auth/quick-admin-login', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          try { localStorage.setItem('cbf10_token', data.token); } catch (_) {}
        }
        window.location.reload();
      } else {
        setLoginErr(data.error || 'Failed to authenticate as super admin');
      }
    } catch {
      setLoginErr('Connection error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePromoteCurrent = async () => {
    setIsLoggingIn(true);
    setLoginErr('');
    try {
      const res = await fetch('/api/auth/grant-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: user?.email || 'primezmart01@gmail.com' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          try { localStorage.setItem('cbf10_token', data.token); } catch (_) {}
        }
        window.location.reload();
      } else {
        setLoginErr(data.error || 'Failed to promote current user');
      }
    } catch {
      setLoginErr('Connection error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleUpdateOrderStatus = async (
    orderId: string,
    status?: string,
    trackingNumber?: string,
    notes?: string,
    paymentStatus?: string
  ) => {
    try {
      setUpdatingOrderId(orderId);
      const token = localStorage.getItem('cbf10_token');
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          orderStatus: status,
          paymentStatus,
          trackingNumber: trackingNumber !== undefined ? trackingNumber : trackingInputs[orderId],
          notes
        })
      });
      loadAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockProduct) return;

    try {
      await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedStockProduct.product_id || selectedStockProduct.id,
          quantityChange: stockChangeDelta,
          reason: stockReason
        })
      });
      setStockModalOpen(false);
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccess('');
    try {
      const token = localStorage.getItem('cbf10_token');
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSuccess('Store configurations successfully updated across the entire application!');
        loadAdminData();
        // Also trigger public settings reload if possible
        try {
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('store-settings-updated'));
        } catch (_) {}
      } else {
        alert(data.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProductForm({
      name: p.name || '',
      slug: p.slug || '',
      brandId: p.brand_id || (p as any).brandId || 'brand_ags',
      categoryId: p.category_id || (p as any).categoryId || 'cat_car',
      sku: p.sku || '',
      price: p.price || 0,
      salePrice: p.sale_price || (p as any).salePrice || 0,
      stockQuantity: p.stock_quantity ?? (p as any).stockQuantity ?? 0,
      batteryType: p.battery_type || (p as any).batteryType || 'Dry Charged Lead-Acid',
      voltage: p.voltage || '12V',
      ahCapacity: p.ah_capacity || (p as any).ahCapacity || 50,
      cca: p.cca || 400,
      warrantyMonths: p.warranty_months || (p as any).warrantyMonths || 12,
      shortDesc: p.short_desc || (p as any).shortDesc || '',
      status: (p as any).status || 'published',
      imageUrl: p.primary_image || (p as any).images?.[0]?.image_url || '',
      isAutoSku: false
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
      const method = editingProductId ? 'PUT' : 'POST';
      const token = localStorage.getItem('cbf10_token');

      const imagesToSave = productForm.imageUrl ? [productForm.imageUrl] : [];
      const payload = {
        ...productForm,
        images: imagesToSave
      };

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      setProductModalOpen(false);
      setEditingProductId(null);
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const token = localStorage.getItem('cbf10_token');
      await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(couponForm)
      });
      setCouponModalOpen(false);
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReviewStatus = async (reviewId: string, status: string) => {
    try {
      await fetch(`/api/admin/reviews/${reviewId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // If not logged in as Admin, show Admin Authorization Screen with Quick Access
  if (!isAdmin) {
    return (
      <div className="bg-slate-100 min-h-screen py-16 flex items-center justify-center p-4 text-slate-800">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white shadow-xl shadow-red-600/20">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight">Chaudhary Battery Admin Portal</h2>
            <p className="text-xs text-slate-500 mt-1">
              Authorized Management Dashboard · F-10 Markaz Islamabad
            </p>
          </div>

          {/* Quick Access Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-red-650" />
                <span>Admin Credentials</span>
              </span>
              <span className="bg-red-50 text-red-750 font-bold text-[10px] px-2 py-0.5 rounded border border-red-100">
                Super Admin
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px] bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-900 font-bold select-all">admin@chaudharybattery.pk</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Password:</span>
                <span className="text-red-650 font-bold select-all">ChaudharyAdmin@2026!</span>
              </div>
              {user && (
                <div className="flex justify-between pt-1 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-500">Current User:</span>
                  <span className="text-emerald-700 font-bold">{user.email}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleQuickSuperAdmin}
                disabled={isLoggingIn}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-red-600/10"
              >
                <span>⚡ 1-Click Sign In as Super Admin</span>
              </button>

              {user && (
                <button
                  type="button"
                  onClick={handlePromoteCurrent}
                  disabled={isLoggingIn}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-3 rounded-lg text-[11px] transition-colors"
                >
                  Promote {user.email} to Super Admin
                </button>
              )}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-[10px] uppercase font-bold tracking-wider">or sign in with password</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            {loginErr && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{loginErr}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Administrator Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="admin@chaudharybattery.pk"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Admin Password</label>
              <input
                type="password"
                required
                value={adminPass}
                onChange={e => setAdminPass(e.target.value)}
                placeholder="ChaudharyAdmin@2026!"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg text-xs transition-colors shadow-lg shadow-slate-900/10 disabled:opacity-50"
            >
              {isLoggingIn ? 'AUTHENTICATING...' : 'SIGN IN TO ADMIN PANEL'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-400">
            <button onClick={() => onNavigate('home')} className="hover:text-slate-600 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store</span>
            </button>
            <span>F-10 Markaz Islamabad</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 flex flex-col">
      {/* Top Admin Bar */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 flex items-center justify-between sticky top-0 z-30 text-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold text-white shadow-md shadow-red-600/15">
            ⚡
          </div>
          <div>
            <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>CHAUDHARY BATTERY ADMIN</span>
              <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.2 rounded font-mono font-bold">
                RBAC ACTIVE
              </span>
            </div>
            <div className="text-[10px] text-slate-500">F-10 Markaz, Islamabad, Pakistan</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:block text-right">
            <div className="font-bold text-slate-900">{user.firstName} ({user.role})</div>
            <div className="text-slate-500 text-[10px]">{user.email}</div>
          </div>

          <button
            onClick={() => onNavigate('home')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 font-bold"
          >
            <span>View Public Store</span>
          </button>

          <button
            onClick={async () => {
              await logout();
              onNavigate('home');
            }}
            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-1 flex-shrink-0 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeTab === 'dashboard' ? 'bg-red-50 text-red-700 font-extrabold border border-red-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeTab === 'orders' ? 'bg-red-50 text-red-700 font-extrabold border border-red-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeTab === 'products' ? 'bg-red-50 text-red-700 font-extrabold border border-red-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeTab === 'inventory' ? 'bg-red-50 text-red-700 font-extrabold border border-red-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Inventory Management</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeTab === 'customers' ? 'bg-red-50 text-red-700 font-extrabold border border-red-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customers ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeTab === 'coupons' ? 'bg-red-50 text-red-700 font-extrabold border border-red-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Coupons & Rebates</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeTab === 'reviews' ? 'bg-red-50 text-red-700 font-extrabold border border-red-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Review Moderation</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeTab === 'audit' ? 'bg-red-50 text-red-700 font-extrabold border border-red-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security Audit Log</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 transition-colors ${
              activeTab === 'settings' ? 'bg-red-50 text-red-700 font-extrabold border border-red-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Store Configuration</span>
          </button>
        </aside>

        {/* Tab Area */}
        <main className="flex-1 p-6 md:p-8 bg-slate-100/60 overflow-y-auto">
          {/* 1. Dashboard View */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Executive Performance Overview</h2>
                <p className="text-xs text-slate-400">Live analytics for Chaudhary Battery And UPS F10.</p>
              </div>

              {/* Metric KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                    <span>Total Paid Sales</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900">
                    Rs. {Number(stats.stats.totalRevenue).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1 font-semibold">Today: Rs. {Number(stats.stats.todayRevenue).toLocaleString()}</div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                    <span>Total Orders</span>
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900">
                    {stats.stats.totalOrders}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">{stats.stats.pendingOrders} Pending Verification</div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                    <span>Customers</span>
                    <Users className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900">
                    {stats.stats.totalCustomers}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Verified Accounts</div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                    <span>Low Stock Alert</span>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900">
                    {stats.stats.lowStockCount}
                  </div>
                  <div className="text-[10px] text-red-600 mt-1">{stats.stats.outOfStockCount} Out of Stock</div>
                </div>
              </div>

              {/* Top Products & Top Brands */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                {/* Top Selling Brands */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
                  <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center justify-between">
                    <span>Top Brand Market Share</span>
                    <span className="text-[10px] text-slate-500 font-mono">F-10 Dispatches</span>
                  </h3>
                  <div className="space-y-3">
                    {stats.topBrands.map((b: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                        <span className="font-bold text-slate-900">{b.name}</span>
                        <div className="text-right">
                          <span className="font-mono text-emerald-700 font-bold">Rs. {Number(b.revenue).toLocaleString()}</span>
                          <span className="text-slate-500 text-[10px] block">{b.units_sold} units sold</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 7-Day Sales Trend */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
                  <h3 className="font-bold text-sm text-slate-900 mb-3">7-Day Revenue Velocity (Islamabad)</h3>
                  <div className="space-y-2">
                    {stats.salesChart.map((s: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded">
                        <span className="font-bold text-slate-500 w-12">{s.day}</span>
                        <div className="flex-1 mx-3 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-red-650 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (s.revenue / 350000) * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          Rs. {s.revenue.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Orders Manager */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Order Management</h2>
                  <p className="text-xs text-slate-500">Manage dispatch, assign tracking numbers, and view customer invoices.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadAdminData}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Orders</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <h3 className="font-bold text-slate-800 text-sm">No Orders Found</h3>
                    <p className="text-xs mt-1">Orders placed on the website will immediately appear here.</p>
                  </div>
                ) : (
                  orders.map(order => {
                    const isExpanded = expandedOrderId === order.id;
                    const address = order.shippingAddress || order.shipping_address;
                    const currentTrackingVal = trackingInputs[order.id] !== undefined ? trackingInputs[order.id] : (order.tracking_number || '');

                    return (
                      <div key={order.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
                        {/* Header Row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                              #{order.order_number}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              order.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                              order.order_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                              order.order_status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {order.order_status}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {new Date(order.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setSelectedInvoiceOrder(order)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 border border-slate-200 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Invoice</span>
                            </button>

                            <button
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'View Products & Client Details'}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Summary Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-slate-600">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                            <div className="font-bold text-slate-900">{order.customer_name}</div>
                            <div className="font-mono text-slate-500">{order.customer_phone}</div>
                            <div className="text-slate-400 truncate">{order.customer_email}</div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Method & Bank Details</span>
                            <div className="font-mono font-bold text-slate-900 text-sm">
                              Rs. {Number(order.total_amount).toLocaleString()}
                            </div>
                            <div className="uppercase font-extrabold text-blue-900 text-[11px] flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                              <span>{order.payment_method}</span>
                            </div>
                            <select
                              value={order.payment_status}
                              onChange={e => handleUpdateOrderStatus(order.id, order.order_status, undefined, undefined, e.target.value)}
                              className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-900 focus:outline-none focus:border-slate-900 mt-1"
                            >
                              <option value="pending">Payment Pending</option>
                              <option value="paid">Payment Verified (Paid)</option>
                              <option value="failed">Payment Failed</option>
                              <option value="refunded">Refunded</option>
                            </select>
                            {(order.transaction_reference || order.transactionReference) && (
                              <div className="text-[10px] font-mono text-slate-700 bg-slate-100 p-1.5 rounded border border-slate-200 mt-1 font-semibold break-all">
                                {order.transaction_reference || order.transactionReference}
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Change Status</span>
                            <select
                              value={order.order_status}
                              onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 w-full mt-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="processing">Processing & Diagnostic</option>
                              <option value="packed">Packed with Stamped Warranty</option>
                              <option value="shipped">Out for Roadside Delivery</option>
                              <option value="delivered">Delivered & Installed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Tracking / Consignment ID</span>
                            <div className="flex gap-1.5 mt-1">
                              <input
                                type="text"
                                value={currentTrackingVal}
                                onChange={e => setTrackingInputs({ ...trackingInputs, [order.id]: e.target.value })}
                                placeholder="e.g. TRK-849201"
                                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono w-full text-slate-900"
                              />
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, order.order_status, currentTrackingVal)}
                                disabled={updatingOrderId === order.id}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs flex-shrink-0"
                              >
                                {updatingOrderId === order.id ? '...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Full Order Details Panel */}
                        {isExpanded && (
                          <div className="pt-4 border-t border-slate-100 space-y-4">
                            {/* 1. Client Delivery Form Details */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Client Delivery Address & Form Details</span>
                                </h4>
                                <div className="space-y-1 text-slate-700">
                                  <div><strong>Street Address:</strong> {address?.address_line1 || address?.addressLine1 || 'Shop/House Address'}</div>
                                  <div><strong>City / Sector:</strong> {address?.city || 'Islamabad'}, {address?.province || 'ICT'}</div>
                                  {order.shipping_notes && (
                                    <div className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                                      <strong>Client Delivery Note:</strong> {order.shipping_notes}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-extrabold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Billing & Promotions Applied</span>
                                </h4>
                                <div className="space-y-1 text-slate-700">
                                  <div><strong>Subtotal:</strong> Rs. {Number(order.subtotal || order.total_amount).toLocaleString()}</div>
                                  <div><strong>Delivery Fee:</strong> {Number(order.shipping_amount) === 0 ? 'FREE' : `Rs. ${Number(order.shipping_amount).toLocaleString()}`}</div>
                                  {Number(order.discount) > 0 && (
                                    <div className="text-emerald-700 font-bold">
                                      <strong>Coupon / Scrap Rebate:</strong> -Rs. {Number(order.discount).toLocaleString()} {order.coupon_code ? `(${order.coupon_code})` : ''}
                                    </div>
                                  )}
                                  <div><strong>Grand Total:</strong> <span className="font-mono font-bold text-slate-900">Rs. {Number(order.total_amount).toLocaleString()}</span></div>
                                </div>
                              </div>
                            </div>

                            {/* 2. Itemized Product Line Items */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                              <div className="bg-slate-900 text-white font-bold px-4 py-2 text-xs flex justify-between">
                                <span>Products in this Order ({order.items?.length || 1})</span>
                                <span>Total: Rs. {Number(order.total_amount).toLocaleString()}</span>
                              </div>
                              <div className="divide-y divide-slate-100 bg-white">
                                {(order.items && order.items.length > 0) ? (
                                  order.items.map((it: any, idx: number) => (
                                    <div key={idx} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                                      <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-slate-100 rounded-lg p-1 flex items-center justify-center border border-slate-200 flex-shrink-0">
                                          <img
                                            src={it.product_image || it.image_url || '/uploads/battery_ags_gl65.jpg'}
                                            alt=""
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/battery_ags_gl65.jpg'; }}
                                            className="max-h-full max-w-full object-contain"
                                          />
                                        </div>
                                        <div>
                                          <div className="font-bold text-slate-900 text-sm">{it.product_title || it.title || 'Lead-Acid Battery'}</div>
                                          <div className="text-slate-400 font-mono text-[11px]">
                                            SKU: {it.sku} · {it.ah_capacity ? `${it.ah_capacity}Ah` : ''} · {it.voltage || '12V'} · {it.warranty_months || 12}M Warranty
                                          </div>
                                        </div>
                                      </div>

                                      <div className="text-right flex-shrink-0">
                                        <div className="text-slate-500 font-mono text-[11px]">
                                          Qty: <strong>{it.quantity}</strong> × Rs. {Number(it.unit_price).toLocaleString()}
                                        </div>
                                        <div className="font-mono font-bold text-slate-900 text-sm">
                                          Rs. {Number(it.subtotal_price || (it.unit_price * it.quantity)).toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-slate-400">
                                    No line items details found. Total: Rs. {Number(order.total_amount).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. Products Manager */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Product Catalog</h2>
                  <p className="text-xs text-slate-500">Add, edit, or adjust pricing of batteries in stock.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm({
                      name: '',
                      slug: '',
                      brandId: 'brand_ags',
                      categoryId: 'cat_car',
                      sku: '',
                      price: 19500,
                      salePrice: 0,
                      stockQuantity: 20,
                      batteryType: 'Dry Charged Lead-Acid',
                      voltage: '12V',
                      ahCapacity: 50,
                      cca: 400,
                      warrantyMonths: 12,
                      shortDesc: ''
                    });
                    setProductModalOpen(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Battery</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-x-auto text-xs">
                <table className="w-full text-left divide-y divide-slate-200/80">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Product Title</th>
                      <th className="p-3.5">Brand</th>
                      <th className="p-3.5">SKU / Specs</th>
                      <th className="p-3.5">Price</th>
                      <th className="p-3.5">Stock</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900 max-w-xs truncate">
                          {p.name}
                        </td>
                        <td className="p-3.5 font-bold text-red-600 uppercase">{p.brand_name}</td>
                        <td className="p-3.5 font-mono text-slate-500">{p.sku} ({p.ah_capacity}Ah)</td>
                        <td className="p-3.5 font-mono font-bold text-slate-900">Rs. {p.price.toLocaleString()}</td>
                        <td className="p-3.5">
                          <span className={`font-mono font-bold ${p.stock_quantity <= p.low_stock_threshold ? 'text-red-650' : 'text-emerald-700'}`}>
                            {p.stock_quantity}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleEditProduct(p)}
                            className="bg-slate-100 hover:bg-slate-200 text-blue-600 font-bold px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] inline-flex items-center gap-1 transition-colors"
                            title="Edit battery specs, price and stock"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="bg-slate-100 hover:bg-red-50 text-red-600 font-bold px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] inline-flex items-center gap-1 transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Inventory Management */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Real-Time Inventory & Audit Logs</h2>
                <p className="text-xs text-slate-500">Track current stock in F-10 Markaz warehouse and audit manual adjustments.</p>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-x-auto text-xs">
                <table className="w-full text-left divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Product</th>
                      <th className="p-3.5">Brand</th>
                      <th className="p-3.5">Capacity</th>
                      <th className="p-3.5">Current Stock</th>
                      <th className="p-3.5">Threshold</th>
                      <th className="p-3.5 text-right">Adjustment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {inventoryItems.map((it: any) => (
                      <tr key={it.product_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{it.product_name}</td>
                        <td className="p-3.5 text-slate-700 font-bold uppercase">{it.brand_name}</td>
                        <td className="p-3.5 font-mono text-slate-500">{it.ah_capacity} Ah</td>
                        <td className="p-3.5 font-mono font-bold">
                          <span className={it.current_stock <= it.low_stock_threshold ? 'text-red-600' : 'text-emerald-700'}>
                            {it.current_stock}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">{it.low_stock_threshold}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedStockProduct(it);
                              setStockChangeDelta(0);
                              setStockModalOpen(true);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold px-3 py-1 rounded-lg text-[11px] transition-colors"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Adjustment Logs */}
              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
                <h3 className="font-bold text-sm text-slate-900 mb-3">Recent Stock Transaction Log</h3>
                <div className="space-y-2 text-xs">
                  {inventoryLogs.slice(0, 10).map((log: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                      <div>
                        <span className="font-bold text-slate-900">{log.product_name}</span>
                        <span className="text-slate-500 ml-2">({log.reason})</span>
                      </div>
                      <div className="font-mono text-right">
                        <span className={`font-bold ${log.quantity_changed > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. Customers */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Customer Directory</h2>
                <p className="text-xs text-slate-500">View customer accounts, registration dates, and purchase totals.</p>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-x-auto text-xs">
                <table className="w-full text-left divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Customer Name</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Phone</th>
                      <th className="p-3.5">Orders</th>
                      <th className="p-3.5">Total Spent</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {customers.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{c.first_name} {c.last_name}</td>
                        <td className="p-3.5 text-slate-500 font-mono">{c.email}</td>
                        <td className="p-3.5 text-slate-500 font-mono">{c.phone || 'N/A'}</td>
                        <td className="p-3.5 font-mono font-bold text-slate-900">{c.orders_count}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700">Rs. {Number(c.total_spent).toLocaleString()}</td>
                        <td className="p-3.5">
                          <button
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('cbf10_token');
                                const nextStatus = c.status === 'active' ? 'disabled' : 'active';
                                await fetch(`/api/admin/customers/${c.id}/status`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                                  },
                                  credentials: 'include',
                                  body: JSON.stringify({ status: nextStatus })
                                });
                                loadAdminData();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition-all ${
                              c.status === 'active'
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            }`}
                            title="Click to toggle customer account access"
                          >
                            {c.status}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. Coupons */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Discount Coupons & Vouchers</h2>
                  <p className="text-xs text-slate-500">Create promotional codes for Islamabad residents and solar customers.</p>
                </div>
                <button
                  onClick={() => setCouponModalOpen(true)}
                  className="bg-red-650 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Coupon</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {coupons.map(cp => (
                  <div key={cp.id} className="bg-white border border-slate-200 p-5 rounded-xl space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-extrabold text-red-600">{cp.code}</span>
                      <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase border border-slate-200">
                        {cp.discount_type === 'percentage' ? `${cp.discount_value}%` : `Rs. ${cp.discount_value}`}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs">{cp.description}</p>
                    <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
                      <span>Min Order: Rs. {cp.min_order_amount.toLocaleString()}</span>
                      <span>Used: {cp.times_used} times</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Reviews Moderation */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Review Moderation</h2>
                <p className="text-xs text-slate-500">Approve, reject, or feature verified purchaser battery reviews.</p>
              </div>

              <div className="space-y-3 text-xs">
                {reviews.map((r: any) => (
                  <div key={r.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-start justify-between gap-4 shadow-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900">{r.customer_name}</span>
                        <span className="text-slate-400">on</span>
                        <span className="text-red-650 font-semibold">{r.product_name}</span>
                        <span className="text-amber-500 font-mono font-bold">★ {r.rating}/5</span>
                      </div>
                      <h4 className="font-bold text-slate-800">{r.title}</h4>
                      <p className="text-slate-600 text-xs mt-1">"{r.comment}"</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateReviewStatus(r.id, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg text-[11px]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateReviewStatus(r.id, 'rejected')}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1 rounded-lg text-[11px]"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        r.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-amber-50 text-amber-700 border border-amber-150'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. Audit Trail */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Security Audit Logs (Section 56)</h2>
                <p className="text-xs text-slate-500">Immutable trail of administrative logins, price edits, stock changes, and refunds.</p>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-x-auto text-xs">
                <table className="w-full text-left divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Admin</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-slate-800">{log.admin_email}</td>
                        <td className="p-3 font-mono text-red-600 font-bold">{log.action}</td>
                        <td className="p-3 font-mono text-slate-500">{log.target_type}:{log.target_id}</td>
                        <td className="p-3 text-slate-600">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 9. Settings */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl text-xs">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Store & Gateway Configuration</h2>
                <p className="text-xs text-slate-500">Settings are persisted to the database and affect public store rules.</p>
              </div>

              {settingsSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl font-bold shadow-sm">
                  {settingsSuccess}
                </div>
              )}

              <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Business Information</h3>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Business Name</label>
                  <input
                    type="text"
                    required
                    value={settings.business_name || 'Chaudhary Battery And UPS F10'}
                    onChange={e => setSettings({ ...settings, business_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Physical Store Address</label>
                  <input
                    type="text"
                    required
                    value={settings.business_address || 'Shop # 14-16, Capital Trade Centre, F-10 Markaz, Islamabad'}
                    onChange={e => setSettings({ ...settings, business_address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Store Phone</label>
                    <input
                      type="text"
                      required
                      value={settings.business_phone || '+92 51 2212345'}
                      onChange={e => setSettings({ ...settings, business_phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Store WhatsApp</label>
                    <input
                      type="text"
                      required
                      value={settings.business_whatsapp || '+92 300 5551234'}
                      onChange={e => setSettings({ ...settings, business_whatsapp: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 pt-4">Bank Transfer Coordinates</h3>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Bank Name & Branch</label>
                  <input
                    type="text"
                    required
                    value={settings.bank_name || 'Meezan Bank Limited / F-10 Markaz Branch'}
                    onChange={e => setSettings({ ...settings, bank_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Account Title & IBAN</label>
                  <input
                    type="text"
                    required
                    value={settings.bank_iban || 'PK42MEZN0000100123456789'}
                    onChange={e => setSettings({ ...settings, bank_iban: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-emerald-700 font-bold focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md active:scale-95 transition-all text-xs"
                  >
                    {isSavingSettings ? 'Saving Configurations...' : 'SAVE STORE CONFIGURATION'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>

      {/* Stock Adjustment Modal */}
      {stockModalOpen && selectedStockProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-sm text-white">Adjust Stock: {selectedStockProduct.product_name}</h3>
            <p className="text-slate-400">Current stock: {selectedStockProduct.current_stock}</p>

            <form onSubmit={handleAdjustStock} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Quantity Change (+ to add, - to subtract)</label>
                <input
                  type="number"
                  required
                  value={stockChangeDelta}
                  onChange={e => setStockChangeDelta(parseInt(e.target.value) || 0)}
                  placeholder="+10 or -5"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Reason for Audit Log</label>
                <input
                  type="text"
                  required
                  value={stockReason}
                  onChange={e => setStockReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStockModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-700 rounded text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 text-white font-bold rounded"
                >
                  Save Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-white">
              {editingProductId ? 'Edit Battery' : 'Add New Battery Model'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. AGS GL-75 (65Ah) Heavy Duty Battery"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={e => setProductForm({ ...productForm, sku: e.target.value, isAutoSku: false })}
                    placeholder="AGS-GL-75"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Brand</label>
                  <select
                    value={productForm.brandId}
                    onChange={e => setProductForm({ ...productForm, brandId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-bold"
                  >
                    <option value="brand_ags">AGS</option>
                    <option value="brand_daewoo">Daewoo</option>
                    <option value="brand_volta">Volta</option>
                    <option value="brand_osaka">Osaka</option>
                    <option value="brand_exide">Exide</option>
                    <option value="brand_phoenix">Phoenix</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Price (PKR)</label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={e => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Sale Price</label>
                  <input
                    type="number"
                    value={productForm.salePrice}
                    onChange={e => setProductForm({ ...productForm, salePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Stock Qty</label>
                  <input
                    type="number"
                    required
                    value={productForm.stockQuantity}
                    onChange={e => setProductForm({ ...productForm, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Capacity (Ah)</label>
                  <input
                    type="number"
                    required
                    value={productForm.ahCapacity}
                    onChange={e => setProductForm({ ...productForm, ahCapacity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Voltage</label>
                  <input
                    type="text"
                    value={productForm.voltage}
                    onChange={e => setProductForm({ ...productForm, voltage: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Warranty (M)</label>
                  <input
                    type="number"
                    value={productForm.warrantyMonths}
                    onChange={e => setProductForm({ ...productForm, warrantyMonths: parseInt(e.target.value) || 12 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Product Image</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={productForm.imageUrl || ''}
                    onChange={e => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    placeholder="e.g. /uploads/image.jpg"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold px-3 py-2 rounded border border-slate-700 whitespace-nowrap text-center transition-colors">
                    Upload File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const formData = new FormData();
                        formData.append('image', file);
                        
                        try {
                          const token = localStorage.getItem('cbf10_token');
                          const res = await fetch('/api/upload', {
                            method: 'POST',
                            headers: {
                              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                            },
                            body: formData
                          });
                          const data = await res.json();
                          if (data.success) {
                            setProductForm((prev: any) => ({ ...prev, imageUrl: data.url }));
                          } else {
                            alert(data.error || 'Failed to upload image.');
                          }
                        } catch (err) {
                          console.error(err);
                          alert('Upload failed. Please check network.');
                        }
                      }}
                    />
                  </label>
                </div>
                {productForm.imageUrl && (
                  <div className="mt-2 bg-slate-900/60 p-2 rounded border border-slate-800 flex justify-center">
                    <img src={productForm.imageUrl} alt="Preview" className="max-h-24 object-contain rounded" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={productForm.shortDesc}
                  onChange={e => setProductForm({ ...productForm, shortDesc: e.target.value })}
                  placeholder="Battery fitment and technology summary..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 text-white font-bold rounded"
                >
                  Save Battery to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal in Admin */}
      {selectedInvoiceOrder && (
        <InvoiceModal order={selectedInvoiceOrder} onClose={() => setSelectedInvoiceOrder(null)} />
      )}
    </div>
  );
};
