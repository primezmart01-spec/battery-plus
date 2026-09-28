import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { StoreSettingsProvider } from './context/StoreSettingsContext';
import { CartProvider } from './context/CartContext';
import { CompareProvider } from './context/CompareContext';
import { WishlistProvider } from './context/WishlistContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { CartDrawer } from './components/common/CartDrawer';

import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { PaymentPortalPage } from './pages/PaymentPortalPage';
import { AccountPage } from './pages/AccountPage';
import { ComparePage } from './pages/ComparePage';
import { WishlistPage } from './pages/WishlistPage';
import { AuthPages } from './pages/AuthPages';
import { BrandPage } from './pages/BrandPage';
import { CategoryPage } from './pages/CategoryPage';
import { CmsPages } from './pages/CmsPages';
import { AdminLayout } from './pages/admin/AdminLayout';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [routeParam, setRouteParam] = useState<string>('');

  // Handle URL hash or path on load
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
      const search = window.location.search;

      if (!path || path === '') {
        setCurrentRoute('home');
        setRouteParam('');
      } else if (path === 'shop') {
        setCurrentRoute('shop');
        setRouteParam(search.replace(/^\?/, ''));
      } else if (path.startsWith('product/')) {
        setCurrentRoute('product');
        setRouteParam(path.replace('product/', ''));
      } else if (path.startsWith('brand/')) {
        setCurrentRoute('brand');
        setRouteParam(path.replace('brand/', ''));
      } else if (path.startsWith('category/')) {
        setCurrentRoute('category');
        setRouteParam(path.replace('category/', ''));
      } else if (path === 'cart') {
        setCurrentRoute('cart');
      } else if (path === 'checkout') {
        setCurrentRoute('checkout');
      } else if (path.startsWith('checkout/pay/')) {
        setCurrentRoute('payment-portal');
        setRouteParam(path.replace('checkout/pay/', ''));
      } else if (path.startsWith('order/')) {
        setCurrentRoute('order-confirmation');
        setRouteParam(path.replace('order/', ''));
      } else if (path === 'track-order' || path === 'track') {
        setCurrentRoute('track-order');
        setRouteParam('');
      } else if (path === 'compare') {
        setCurrentRoute('compare');
      } else if (path === 'wishlist') {
        setCurrentRoute('wishlist');
      } else if (path === 'account') {
        setCurrentRoute('account');
      } else if (path === 'login') {
        setCurrentRoute('login');
      } else if (path === 'register') {
        setCurrentRoute('register');
      } else if (path === 'admin') {
        setCurrentRoute('admin');
      } else if (['about', 'contact', 'warranty', 'shipping', 'privacy', 'terms'].includes(path)) {
        setCurrentRoute(path);
      } else {
        setCurrentRoute('home');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (route: string, param = '') => {
    setCurrentRoute(route);
    setRouteParam(param);

    // Update browser history cleanly
    let newPath = '/';
    if (route === 'home') newPath = '/';
    else if (route === 'shop') newPath = param ? `/shop?${param}` : '/shop';
    else if (route === 'product') newPath = `/product/${param}`;
    else if (route === 'brand') newPath = `/brand/${param}`;
    else if (route === 'category') newPath = `/category/${param}`;
    else if (route === 'order-confirmation') newPath = `/order/${param}`;
    else if (route === 'payment-portal') newPath = `/checkout/pay/${param}`;
    else newPath = `/${route}`;

    window.history.pushState({}, '', newPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAdminRoute = currentRoute === 'admin';

  return (
    <StoreSettingsProvider>
      <AuthProvider>
        <CartProvider>
          <CompareProvider>
            <WishlistProvider>
              <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-red-600 selection:text-white">
                {/* Header (hidden in dedicated full admin panel) */}
                {!isAdminRoute && (
                  <Header onNavigate={navigate} currentRoute={currentRoute} />
                )}

                {/* Main Content Router */}
                <main className="flex-1">
                  {currentRoute === 'home' && <HomePage onNavigate={navigate} />}
                  {currentRoute === 'shop' && <ShopPage initialFilter={routeParam} onNavigate={navigate} />}
                  {currentRoute === 'product' && <ProductDetailPage slug={routeParam} onNavigate={navigate} />}
                  {currentRoute === 'brand' && <BrandPage slug={routeParam} onNavigate={navigate} />}
                  {currentRoute === 'category' && <CategoryPage slug={routeParam} onNavigate={navigate} />}
                  {currentRoute === 'cart' && <CartPage onNavigate={navigate} />}
                  {currentRoute === 'checkout' && <CheckoutPage onNavigate={navigate} />}
                  {currentRoute === 'order-confirmation' && <OrderConfirmationPage orderId={routeParam} onNavigate={navigate} />}
                  {currentRoute === 'track-order' && <OrderTrackingPage initialOrderNumber={routeParam} onNavigate={navigate} />}
                  {currentRoute === 'payment-portal' && <PaymentPortalPage orderId={routeParam} onNavigate={navigate} />}
                  {currentRoute === 'compare' && <ComparePage onNavigate={navigate} />}
                  {currentRoute === 'wishlist' && <WishlistPage onNavigate={navigate} />}
                  {currentRoute === 'account' && <AccountPage onNavigate={navigate} />}
                  {currentRoute === 'login' && <AuthPages initialMode="login" onNavigate={navigate} />}
                  {currentRoute === 'register' && <AuthPages initialMode="register" onNavigate={navigate} />}
                  {currentRoute === 'vehicle-finder' && <ShopPage initialFilter="" onNavigate={navigate} />}
                  {currentRoute === 'admin' && <AdminLayout onNavigate={navigate} />}
                  {['about', 'contact', 'warranty', 'shipping', 'privacy', 'terms'].includes(currentRoute) && (
                    <CmsPages pageType={currentRoute as any} onNavigate={navigate} />
                  )}
                </main>

                {/* Slide-out Cart Drawer */}
                <CartDrawer onNavigate={navigate} />

                {/* Global Footer (hidden on admin page) */}
                {!isAdminRoute && <Footer onNavigate={navigate} />}
              </div>
            </WishlistProvider>
          </CompareProvider>
        </CartProvider>
      </AuthProvider>
    </StoreSettingsProvider>
  );
}
