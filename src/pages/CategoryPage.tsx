import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/common/ProductCard';
import { Category, Product } from '../types';
import { ArrowLeft, Zap, ShieldCheck } from 'lucide-react';

interface CategoryPageProps {
  slug: string;
  onNavigate: (route: string, param?: string) => void;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({ slug, onNavigate }) => {
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/catalog/categories/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCategory(d.category);
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
        <p className="font-semibold text-xs">Loading category batteries...</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Category Not Found</h2>
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
          <button onClick={() => onNavigate('shop')} className="hover:text-slate-900">Categories</button>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{category.name}</span>
        </div>

        {/* Category Banner */}
        <div className="relative rounded-2xl overflow-hidden mb-10 shadow-sm min-h-[180px] flex items-center bg-slate-900 text-white p-6 sm:p-8">
          <img
            src={category.image_url}
            alt={category.name}
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
          <div className="relative z-10 max-w-2xl">
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block mb-1">
              Category Collection
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
              {category.name} in Islamabad
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {category.description}
            </p>
          </div>
        </div>

        {/* Product Grid */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Available Models ({products.length})
          </h2>
          <button
            onClick={() => onNavigate('shop')}
            className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View All Categories</span>
          </button>
        </div>

        {products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
            No products currently in stock for this category.
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
