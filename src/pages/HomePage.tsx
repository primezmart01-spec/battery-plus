import React, { useState, useEffect } from 'react';
import { HeroBanner } from '../components/home/HeroBanner';
import { BrandShowcase } from '../components/home/BrandShowcase';
import { WhyChooseUs } from '../components/home/WhyChooseUs';
import { ReviewsSection } from '../components/home/ReviewsSection';
import { VehicleFinder } from '../components/common/VehicleFinder';
import { ProductCard } from '../components/common/ProductCard';
import { Brand, Category, Product } from '../types';
import { ArrowRight, Zap, ShieldAlert, Phone, Mail, CheckCircle2, Truck, CreditCard, ShieldCheck } from 'lucide-react';
import { useStoreSettings } from '../context/StoreSettingsContext';

interface HomePageProps {
  onNavigate: (route: string, param?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { settings } = useStoreSettings();
  const phone = settings.business_phone || '+92 51 2212345';
  const whatsapp = settings.business_whatsapp || '+92 300 5551234';

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'featured' | 'bestsellers' | 'solar'>('featured');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/catalog/brands').then(r => r.json()),
      fetch('/api/catalog/categories').then(r => r.json()),
      fetch('/api/products?limit=8').then(r => r.json())
    ])
      .then(([bData, cData, pData]) => {
        if (bData.success) setBrands(bData.brands || []);
        if (cData.success) setCategories(cData.categories || []);
        if (pData.success) setProducts(pData.products || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const filteredProducts = products.filter(p => {
    if (activeTab === 'featured') return p.is_featured === 1;
    if (activeTab === 'bestsellers') return p.is_bestseller === 1;
    if (activeTab === 'solar') return p.category_slug === 'tubular-batteries' || p.category_slug === 'solar-batteries';
    return true;
  });

  const displayProducts = filteredProducts.length > 0 ? filteredProducts : products.slice(0, 4);

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* 1. Hero Banner Carousel */}
      <HeroBanner onNavigate={onNavigate} />

      {/* 2. Why Choose Us Icon Boxes Section (Moved up so icon boxes display properly) */}
      <WhyChooseUs />

      {/* 3. Vehicle & Inverter Battery Precision Matcher (Moved down with clean padding) */}
      <section className="py-12 bg-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-6">
            <span className="text-amber-600 font-bold text-xs uppercase tracking-wider block mb-1">
              Smart Vehicle & Inverter Compatibility Tool
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Vehicle Battery Precision Matcher
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select your vehicle make, model, or inverter power load to discover 100% guaranteed fit batteries.
            </p>
          </div>
          <VehicleFinder onNavigate={onNavigate} />
        </div>
      </section>

      {/* 4. Shop by Authorized Brand */}
      <BrandShowcase brands={brands} onNavigate={onNavigate} />

      {/* 5. Featured Batteries Section with Tabs */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-slate-900 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Certified Fresh Inventory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Top Performance Batteries
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Ready for immediate dispatch with official warranty cards stamped by Chaudhary Battery F-10.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-bold text-slate-700">
            <button
              onClick={() => setActiveTab('featured')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'featured' ? 'bg-slate-900 text-white shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              Featured
            </button>
            <button
              onClick={() => setActiveTab('bestsellers')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'bestsellers' ? 'bg-slate-900 text-white shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              Best Sellers
            </button>
            <button
              onClick={() => setActiveTab('solar')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'solar' ? 'bg-slate-900 text-white shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              Solar & Tubular
            </button>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayProducts.map(product => (
            <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => onNavigate('shop')}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl text-xs tracking-wider transition-colors shadow-md active:scale-95"
          >
            <span>VIEW ALL BATTERIES IN CATALOG</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 5. Battery Categories Showcase */}
      <section className="py-14 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <div className="text-slate-900 font-bold text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Engineered Power Solutions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Explore Battery Categories
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select the right battery chemistry and container format for your vehicle or home backup.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.slice(0, 4).map(c => (
              <div
                key={c.id}
                onClick={() => onNavigate('category', c.slug)}
                className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all border border-slate-200"
              >
                <img
                  src={c.image_url}
                  alt={c.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                    Master Category
                  </span>
                  <h3 className="font-extrabold text-lg text-white mb-1 group-hover:text-amber-300 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Customer Reviews Carousel */}
      <ReviewsSection />

      {/* 8. Roadside Emergency Assistance CTA in Premium Light-Slate */}
      <section className="py-14 bg-gradient-to-r from-red-50 via-slate-50 to-red-50/45 text-slate-900 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="bg-red-600 text-white font-extrabold text-[10px] px-3 py-1 rounded-full inline-block mb-3 uppercase tracking-wider shadow-sm">
              ⚡ Emergency Roadside Battery Assistance
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              Car Won't Start in Islamabad or Rawalpindi?
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Our mobile technician reaches your location with a computerized battery load tester and fresh battery within 45 to 60 minutes across ICT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 flex-shrink-0">
            <a
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className="bg-red-600 hover:bg-red-700 text-white font-black text-xs py-3.5 px-6 rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95"
            >
              <Phone className="w-4 h-4 text-white" />
              <span>CALL {phone}</span>
            </a>
            <a
              href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-slate-50 text-emerald-700 border border-slate-200 font-black text-xs py-3.5 px-6 rounded-xl shadow-sm flex items-center gap-2 transition-transform active:scale-95"
            >
              <span>WHATSAPP DISPATCH</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
