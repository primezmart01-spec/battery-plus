import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Heart,
  Scale,
  User as UserIcon,
  Phone,
  MapPin,
  Clock,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Zap,
  LogOut,
  SlidersHorizontal,
  Package,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { Brand } from '../../types';

interface HeaderProps {
  onNavigate: (route: string, param?: string) => void;
  currentRoute: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentRoute }) => {
  const { user, logout } = useAuth();
  const { totalItems, subtotal, setIsCartOpen } = useCart();
  const { compareIds } = useCompare();
  const { settings } = useStoreSettings();

  const businessName = settings.business_name || 'Chaudhary Battery And UPS F10';
  const tagline = settings.business_tagline || 'Authorised Dealer & Wholesaler for AGS, Daewoo, Volta, Osaka, Exide & Phoenix';
  const address = settings.business_address || 'Shop # 14-16, Ground Floor, Capital Trade Centre, F-10 Markaz, Islamabad, 44000, Pakistan';
  const phone = settings.business_phone || '+92 51 2212345';
  const whatsapp = settings.business_whatsapp || '+92 300 5551234';
  const email = settings.business_email || 'sales@chaudharybattery.pk';

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [brandsList, setBrandsList] = useState<Brand[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch brands for navigation
  useEffect(() => {
    fetch('/api/catalog/brands')
      .then(res => res.json())
      .then(data => {
        if (data.success) setBrandsList(data.brands);
      })
      .catch(() => {});
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products/search-suggestions?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setSuggestions(data.products || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    onNavigate('shop', `search=${encodeURIComponent(searchQuery)}`);
  };

  const selectSuggestion = (slug: string) => {
    setShowSuggestions(false);
    setSearchQuery('');
    onNavigate('product', slug);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
      {/* 1. Top Announcement & Emergency Service Bar */}
      <div className="bg-slate-950 text-slate-300 text-[10px] sm:text-xs border-b border-slate-800/80 py-1.5 sm:py-2 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center sm:justify-start">
            <span className="flex items-center gap-1.5 text-amber-400 font-extrabold tracking-wide uppercase">
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse" />
              {businessName}
            </span>
            <span className="hidden md:inline text-slate-700">|</span>
            <span className="hidden md:flex items-center gap-1 text-slate-300 truncate max-w-xs">
              <MapPin className="w-3 h-3 text-red-500" />
              {address}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
            <a
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Phone className="w-3 h-3 text-red-500" />
              <span className="font-bold">{phone}</span>
            </a>
            <span className="text-slate-800">|</span>
            <a
              href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Main Header with Branding & Search */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-2.5 sm:gap-4 md:gap-8">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-1.5 text-slate-300 hover:text-white focus:outline-none flex-shrink-0"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5.5 h-5.5 sm:w-6 sm:h-6" />
          </button>

          {/* Brand Logo */}
          <div
            onClick={() => onNavigate('home')}
            className="cursor-pointer flex items-center gap-1.5 sm:gap-3 select-none flex-shrink-0"
          >
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded bg-red-600 flex items-center justify-center font-extrabold text-white shadow-lg shadow-red-900/30 flex-shrink-0">
              <Zap className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-0.5 sm:gap-1 leading-none">
                <span className="font-extrabold tracking-tight text-xs sm:text-lg md:text-xl text-white">CHAUDHARY</span>
                <span className="font-extrabold tracking-tight text-xs sm:text-lg md:text-xl text-red-500">BATTERY</span>
              </div>
              <div className="text-[9px] tracking-wider text-slate-400 font-semibold uppercase mt-0.5 hidden md:block">
                & UPS · F-10 MARKAZ ISLAMABAD
              </div>
            </div>
          </div>

          {/* Search Bar with Autocomplete */}
          <div className="hidden sm:block flex-1 max-w-2xl relative" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Search battery by model, Ah (e.g. 50Ah, 185Ah), brand (AGS, Daewoo), car (Corolla, Alto)..."
                className="w-full bg-slate-800/90 text-slate-100 placeholder-slate-400 pl-4 pr-12 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm transition-colors"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center justify-center transition-colors"
                aria-label="Submit Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Suggestions Overlay */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 divide-y divide-slate-800">
                <div className="p-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-950">
                  Matching Batteries ({suggestions.length})
                </div>
                {suggestions.map(item => (
                  <div
                    key={item.id}
                    onClick={() => selectSuggestion(item.slug)}
                    className="p-3 hover:bg-slate-800 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-10 h-10 object-cover rounded bg-slate-800 border border-slate-700" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center text-slate-500">
                        <Zap className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>{item.brand_name}</span>
                        <span>·</span>
                        <span className="font-mono text-slate-300">SKU: {item.sku}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-400">
                        Rs. {(item.sale_price || item.price).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div
                  onClick={handleSearchSubmit}
                  className="p-2.5 text-center text-xs font-semibold text-red-400 hover:text-red-300 bg-slate-950/80 cursor-pointer transition-colors"
                >
                  View all results for "{searchQuery}" →
                </div>
              </div>
            )}
          </div>

          {/* Action Tools (Compare, Wishlist, Cart, Account) */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {/* Compare */}
            <button
              onClick={() => onNavigate('compare')}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:flex"
              title="Compare Batteries"
              aria-label="Compare Batteries"
            >
              <Scale className="w-5 h-5" />
              {compareIds.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {compareIds.length}
                </span>
              )}
            </button>

            {/* Wishlist */}
            <button
              onClick={() => onNavigate('wishlist')}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:flex"
              title="Saved Wishlist"
              aria-label="Saved Wishlist"
            >
              <Heart className="w-5 h-5" />
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-700/80 text-white px-3.5 py-2 rounded-lg border border-slate-700 transition-colors relative"
              aria-label="Open Shopping Cart"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-red-500" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                    {totalItems}
                  </span>
                )}
              </div>
              <div className="hidden xl:block text-left leading-tight">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">My Cart</div>
                <div className="text-xs font-bold text-white">Rs. {subtotal.toLocaleString()}</div>
              </div>
            </button>

            {/* User Account Menu */}
            <div className="relative" ref={userMenuRef}>
              {user ? (
                <div>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-white transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-red-500" />
                    <span className="hidden md:inline truncate max-w-[100px]">{user.firstName}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1.5 z-50 divide-y divide-slate-800">
                      <div className="px-4 py-2 text-xs">
                        <div className="font-bold text-white truncate">{user.firstName} {user.lastName}</div>
                        <div className="text-slate-400 truncate">{user.email}</div>
                        <span className="inline-block mt-1 uppercase text-[10px] font-bold text-emerald-400">
                          {user.role}
                        </span>
                      </div>

                      <div className="py-1">
                        {(user.role === 'admin' || user.role === 'super_admin') && (
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              onNavigate('admin');
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-slate-800 flex items-center gap-2"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Admin Panel
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('account');
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <UserIcon className="w-3.5 h-3.5" />
                          My Account & Orders
                        </button>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onNavigate('track-order');
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Package className="w-3.5 h-3.5" />
                          Track Order
                        </button>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={async () => {
                            setUserMenuOpen(false);
                            await logout();
                            onNavigate('home');
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>SIGN IN</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="sm:hidden mt-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search batteries, brands, cars..."
              className="w-full bg-slate-800 text-slate-100 placeholder-slate-400 pl-4 pr-10 py-2 rounded-lg border border-slate-700 text-xs focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-2.5 bg-red-600 text-white rounded flex items-center justify-center"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* 3. Navigation Links Bar */}
      <nav className="bg-slate-950/70 border-t border-slate-800 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onNavigate('shop')}
              className={`px-3 py-2.5 transition-colors ${currentRoute === 'shop' ? 'text-red-500 font-bold' : 'text-slate-300 hover:text-white'}`}
            >
              All Batteries
            </button>
            <button
              onClick={() => onNavigate('category', 'car-batteries')}
              className="px-3 py-2.5 text-slate-300 hover:text-white transition-colors"
            >
              Car Batteries
            </button>
            <button
              onClick={() => onNavigate('category', 'tubular-batteries')}
              className="px-3 py-2.5 text-slate-300 hover:text-white transition-colors"
            >
              Tall Tubular
            </button>
            <button
              onClick={() => onNavigate('category', 'solar-batteries')}
              className="px-3 py-2.5 text-slate-300 hover:text-white transition-colors"
            >
              Solar Deep-Cycle
            </button>
            <button
              onClick={() => onNavigate('category', 'ups-batteries')}
              className="px-3 py-2.5 text-slate-300 hover:text-white transition-colors"
            >
              UPS Batteries
            </button>
            <button
              onClick={() => onNavigate('category', 'maintenance-free-batteries')}
              className="px-3 py-2.5 text-slate-300 hover:text-white transition-colors"
            >
              Maintenance-Free (Dry)
            </button>

            {/* Brands Dropdown */}
            <div className="relative group">
              <button
                className="px-3 py-2.5 text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Brands</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute top-full left-0 hidden group-hover:block w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-2 z-50">
                {brandsList.map(b => (
                  <button
                    key={b.id}
                    onClick={() => onNavigate('brand', b.slug)}
                    className="w-full text-left px-4 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    {b.name} Batteries
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => onNavigate('vehicle-finder')}
              className="px-3 py-2.5 text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Battery Finder by Vehicle</span>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate('track-order')}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <Package className="w-3.5 h-3.5 text-slate-400" />
              Track Order
            </button>
            <button
              onClick={() => onNavigate('about')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              About F-10 Shop
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Contact Us
            </button>
          </div>
        </div>
      </nav>

      {/* 4. Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm bg-slate-900 h-full overflow-y-auto p-5 text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-bold text-sm tracking-tight">CHAUDHARY BATTERY</div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-1 text-sm font-medium">
                <button
                  onClick={() => { setMobileMenuOpen(false); onNavigate('home'); }}
                  className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200"
                >
                  Home
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onNavigate('shop'); }}
                  className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200"
                >
                  Shop All Batteries
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onNavigate('category', 'car-batteries'); }}
                  className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200"
                >
                  Car Batteries
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onNavigate('category', 'tubular-batteries'); }}
                  className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200"
                >
                  Tall Tubular Solar
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onNavigate('category', 'ups-batteries'); }}
                  className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200"
                >
                  UPS Inverter Batteries
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onNavigate('category', 'maintenance-free-batteries'); }}
                  className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200"
                >
                  Maintenance-Free (Dry)
                </button>

                {/* Brands in Mobile */}
                <div className="pt-2 pb-1">
                  <div className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Brands
                  </div>
                  {brandsList.map(b => (
                    <button
                      key={b.id}
                      onClick={() => { setMobileMenuOpen(false); onNavigate('brand', b.slug); }}
                      className="w-full text-left py-1.5 px-3 text-xs rounded hover:bg-slate-800 text-slate-300"
                    >
                      {b.name} Batteries
                    </button>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-1">
                  <div className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    My Account & Tools
                  </div>
                  <button
                    onClick={() => { setMobileMenuOpen(false); onNavigate('wishlist'); }}
                    className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <Heart className="w-4 h-4 text-red-500" />
                    <span>My Saved Wishlist</span>
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); onNavigate('compare'); }}
                    className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <Scale className="w-4 h-4 text-blue-400" />
                    <span>Compare Matrix ({compareIds.length})</span>
                  </button>
                  {user && (user.role === 'admin' || user.role === 'super_admin') && (
                    <button
                      onClick={() => { setMobileMenuOpen(false); onNavigate('admin'); }}
                      className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-amber-400 flex items-center gap-2 font-bold"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                      <span>Admin Panel</span>
                    </button>
                  )}
                  {user ? (
                    <button
                      onClick={() => { setMobileMenuOpen(false); onNavigate('account'); }}
                      className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>My Profile ({user.firstName})</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { setMobileMenuOpen(false); onNavigate('login'); }}
                      className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-red-400 flex items-center gap-2 font-bold"
                    >
                      <UserIcon className="w-4 h-4 text-red-500" />
                      <span>Sign In / Register</span>
                    </button>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-1">
                  <div className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Customer Service
                  </div>
                  <button
                    onClick={() => { setMobileMenuOpen(false); onNavigate('track-order'); }}
                    className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200"
                  >
                    Track Order Status
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); onNavigate('about'); }}
                    className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200"
                  >
                    About Us
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); onNavigate('contact'); }}
                    className="w-full text-left py-2 px-3 rounded hover:bg-slate-800 text-slate-200"
                  >
                    Contact & Shop Location
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
              <div>F-10 Markaz, Islamabad, Pakistan</div>
              <a href="tel:+92512212345" className="block text-white font-semibold">+92 51 2212345</a>
              <a href="https://wa.me/923005551234" className="block text-emerald-400 font-semibold">WhatsApp: +92 300 5551234</a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
