import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/common/ProductCard';
import { Product, Brand, Category } from '../types';
import {
  SlidersHorizontal,
  X,
  Search,
  Filter,
  Check,
  ChevronDown,
  RotateCcw,
  Zap,
  PackageX
} from 'lucide-react';

interface ShopPageProps {
  initialFilter?: string;
  onNavigate: (route: string, param?: string) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({ initialFilter, onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Filters State
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedVoltage, setSelectedVoltage] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minAh, setMinAh] = useState<string>('');
  const [maxAh, setMaxAh] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<string>('featured');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Parse initial query params if present (e.g. search=..., brand=..., vehicleModelId=...)
  useEffect(() => {
    if (initialFilter) {
      const params = new URLSearchParams(initialFilter);
      if (params.get('search')) setSearch(params.get('search')!);
      if (params.get('brand')) setSelectedBrand(params.get('brand')!);
      if (params.get('category')) setSelectedCategory(params.get('category')!);
    }
  }, [initialFilter]);

  // Load brands and categories once
  useEffect(() => {
    Promise.all([
      fetch('/api/catalog/brands').then(r => r.json()),
      fetch('/api/catalog/categories').then(r => r.json())
    ]).then(([bData, cData]) => {
      if (bData.success) setBrands(bData.brands || []);
      if (cData.success) setCategories(cData.categories || []);
    });
  }, []);

  // Fetch products based on active filters
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedBrand) queryParams.set('brand', selectedBrand);
      if (selectedCategory) queryParams.set('category', selectedCategory);
      if (selectedType) queryParams.set('type', selectedType);
      if (selectedVoltage) queryParams.set('voltage', selectedVoltage);
      if (minPrice) queryParams.set('minPrice', minPrice);
      if (maxPrice) queryParams.set('maxPrice', maxPrice);
      if (minAh) queryParams.set('minAh', minAh);
      if (maxAh) queryParams.set('maxAh', maxAh);
      if (inStockOnly) queryParams.set('inStock', 'true');
      if (search) queryParams.set('search', search);
      queryParams.set('sort', sort);
      queryParams.set('page', page.toString());
      queryParams.set('limit', '12');

      const res = await fetch(`/api/products?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedBrand, selectedCategory, selectedType, selectedVoltage, minPrice, maxPrice, minAh, maxAh, inStockOnly, sort, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const clearAllFilters = () => {
    setSelectedBrand('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedVoltage('');
    setMinPrice('');
    setMaxPrice('');
    setMinAh('');
    setMaxAh('');
    setInStockOnly(false);
    setSearch('');
    setSort('featured');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    selectedBrand || selectedCategory || selectedType || selectedVoltage ||
    minPrice || maxPrice || minAh || maxAh || inStockOnly || search
  );

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header Breadcrumbs & Title */}
        <div className="mb-6">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <button onClick={() => onNavigate('home')} className="hover:text-slate-900">Home</button>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Battery Store</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                All Batteries & Power Systems
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Showing {totalCount} authentic products with warranty in Islamabad.
              </p>
            </div>

            {/* Mobile Filter Toggle Button */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold"
              >
                <Filter className="w-4 h-4 text-red-500" />
                <span>Filters {hasActiveFilters ? '(Active)' : ''}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search & Sort Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="w-full sm:max-w-md relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by keyword (e.g. 50Ah, GL-65, TS-1800)..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-9 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-2.5 text-slate-400 hover:text-red-600"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end text-xs">
            <span className="text-slate-500 whitespace-nowrap">Sort by:</span>
            <select
              value={sort}
              onChange={e => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-500"
            >
              <option value="featured">Featured & Recommended</option>
              <option value="bestseller">Best Selling Batteries</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="latest">Latest Arrivals</option>
              <option value="alpha">Alphabetical (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary Bar */}
        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Active Filters:</span>
            {selectedBrand && (
              <span className="bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                Brand: {selectedBrand.toUpperCase()}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedBrand('')} />
              </span>
            )}
            {selectedCategory && (
              <span className="bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                Category: {selectedCategory}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory('')} />
              </span>
            )}
            {selectedVoltage && (
              <span className="bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                {selectedVoltage}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedVoltage('')} />
              </span>
            )}
            {inStockOnly && (
              <span className="bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                In Stock Only
                <X className="w-3 h-3 cursor-pointer" onClick={() => setInStockOnly(false)} />
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700 font-bold ml-2 underline"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Main Grid + Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm divide-y divide-slate-100">
              <div className="flex items-center justify-between pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-red-600" />
                  <span>Filter Catalog</span>
                </h3>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="text-[11px] text-red-600 font-semibold hover:underline">
                    Reset
                  </button>
                )}
              </div>

              {/* Brands */}
              <div className="py-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                  Battery Brand
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                    <input
                      type="radio"
                      name="brand"
                      checked={selectedBrand === ''}
                      onChange={() => setSelectedBrand('')}
                      className="accent-red-600"
                    />
                    <span>All Brands</span>
                  </label>
                  {brands.map(b => (
                    <label key={b.id} className="flex items-center justify-between text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="brand"
                          checked={selectedBrand === b.slug}
                          onChange={() => setSelectedBrand(b.slug)}
                          className="accent-red-600"
                        />
                        <span>{b.name}</span>
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">{b.product_count || ''}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="py-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                  Category
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === ''}
                      onChange={() => setSelectedCategory('')}
                      className="accent-red-600"
                    />
                    <span>All Categories</span>
                  </label>
                  {categories.map(c => (
                    <label key={c.id} className="flex items-center justify-between text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategory === c.slug}
                          onChange={() => setSelectedCategory(c.slug)}
                          className="accent-red-600"
                        />
                        <span>{c.name}</span>
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">{c.product_count || ''}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Voltage */}
              <div className="py-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                  Voltage
                </h4>
                <div className="flex gap-2">
                  {['', '12V', '24V'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedVoltage(v)}
                      className={`flex-1 py-1.5 px-2 rounded border text-xs font-bold font-mono transition-colors ${
                        selectedVoltage === v
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {v === '' ? 'All' : v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacity Ah Preset Quick Filters */}
              <div className="py-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                  Capacity (Ah)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setMinAh('35'); setMaxAh('55'); }}
                    className="p-2 border rounded text-left hover:border-red-500 font-mono"
                  >
                    35Ah - 55Ah
                    <span className="block text-[10px] text-slate-400 font-sans">Compact Cars</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinAh('60'); setMaxAh('100'); }}
                    className="p-2 border rounded text-left hover:border-red-500 font-mono"
                  >
                    60Ah - 100Ah
                    <span className="block text-[10px] text-slate-400 font-sans">Sedans / SUVs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinAh('120'); setMaxAh('185'); }}
                    className="p-2 border rounded text-left hover:border-red-500 font-mono"
                  >
                    120Ah - 185Ah
                    <span className="block text-[10px] text-slate-400 font-sans">UPS Backup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinAh('200'); setMaxAh('250'); }}
                    className="p-2 border rounded text-left hover:border-red-500 font-mono"
                  >
                    200Ah - 250Ah
                    <span className="block text-[10px] text-slate-400 font-sans">Solar Tubular</span>
                  </button>
                </div>
              </div>

              {/* In Stock Toggle */}
              <div className="pt-4">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={e => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded"
                  />
                  <span>Show In-Stock Only</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 h-96 animate-pulse">
                    <div className="w-full h-48 bg-slate-200 rounded-lg mb-4" />
                    <div className="w-1/3 h-4 bg-slate-200 rounded mb-2" />
                    <div className="w-3/4 h-5 bg-slate-200 rounded mb-4" />
                    <div className="w-1/2 h-4 bg-slate-200 rounded mb-6" />
                    <div className="w-full h-10 bg-slate-200 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <PackageX className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">No Matching Batteries Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  We couldn't find any products matching your selected filter criteria. Try adjusting your brand, Ah, or price filters.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 px-6 rounded-lg transition-colors"
                >
                  RESET ALL FILTERS
                </button>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setPage(i + 1)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold font-mono transition-colors ${
                          page === i + 1
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileFilterOpen(false)} />
          <div className="relative w-4/5 max-w-sm bg-white h-full overflow-y-auto p-5 flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">Filters</h3>
                <button onClick={() => setMobileFilterOpen(false)} className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Brands */}
              <div className="py-4 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase mb-2">Brand</h4>
                <div className="space-y-1 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mbrand"
                      checked={selectedBrand === ''}
                      onChange={() => setSelectedBrand('')}
                      className="accent-red-600"
                    />
                    <span>All Brands</span>
                  </label>
                  {brands.map(b => (
                    <label key={b.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mbrand"
                        checked={selectedBrand === b.slug}
                        onChange={() => setSelectedBrand(b.slug)}
                        className="accent-red-600"
                      />
                      <span>{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="py-4 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase mb-2">Category</h4>
                <div className="space-y-1 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mcat"
                      checked={selectedCategory === ''}
                      onChange={() => setSelectedCategory('')}
                      className="accent-red-600"
                    />
                    <span>All Categories</span>
                  </label>
                  {categories.map(c => (
                    <label key={c.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mcat"
                        checked={selectedCategory === c.slug}
                        onChange={() => setSelectedCategory(c.slug)}
                        className="accent-red-600"
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg text-xs"
              >
                APPLY FILTERS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
