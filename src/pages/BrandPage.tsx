import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/common/ProductCard';
import { Brand, Product } from '../types';
import { Zap, ShieldCheck, ArrowLeft } from 'lucide-react';

interface BrandPageProps {
  slug: string;
  onNavigate: (route: string, param?: string) => void;
}

export const BrandPage: React.FC<BrandPageProps> = ({ slug, onNavigate }) => {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/catalog/brands/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setBrand(d.brand);
          setProducts(d.products || []);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">
        <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-xs">Loading brand catalog...</p>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Brand Not Found</h2>
        <button onClick={() => onNavigate('shop')} className="bg-red-600 text-white font-bold px-5 py-2 rounded-lg text-xs">
          Return to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="text-xs text-slate-500 mb-6 flex items-center gap-1.5">
          <button onClick={() => onNavigate('home')} className="hover:text-slate-900">Home</button>
          <span>/</span>
          <button onClick={() => onNavigate('shop')} className="hover:text-slate-900">Brands</button>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{brand.name}</span>
        </div>

        {/* Brand Banner Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block mb-1">
                Official Authorised Dealership
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
                {brand.name} Batteries Pakistan
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {brand.description}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Genuine Stamped Stock · Official Manufacturer Warranty Card Included</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center self-start sm:self-auto min-w-[140px]">
              <div className="text-2xl font-black text-slate-900 font-mono">{products.length}</div>
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Models In Stock</div>
            </div>
          </div>
        </div>

        {/* Brand Products Grid */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Available {brand.name} Battery Series
          </h2>
          <button
            onClick={() => onNavigate('shop')}
            className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Other Brands</span>
          </button>
        </div>

        {products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
            No products currently in stock for this brand.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(p => (
              <ProductCard key={p.id} product={p} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
