import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Zap,
  ShoppingCart,
  Heart,
  Scale,
  Check,
  Star,
  ChevronRight,
  Car,
  AlertCircle,
  MessageSquare,
  Wrench,
  HelpCircle
} from 'lucide-react';
import { Product, ProductVariant, Review } from '../types';
import { useCart } from '../../src/context/CartContext';
import { useCompare } from '../../src/context/CompareContext';
import { useAuth } from '../../src/context/AuthContext';
import { ProductCard } from '../components/common/ProductCard';

interface ProductDetailPageProps {
  slug: string;
  onNavigate: (route: string, param?: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ slug, onNavigate }) => {
  const { addToCart } = useCart();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [scrapTradeIn, setScrapTradeIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'specs' | 'fitment' | 'warranty' | 'reviews'>('specs');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [justAdded, setJustAdded] = useState<boolean>(false);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/products/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.product) {
          setProduct(d.product);
          setSelectedImage(d.product.primary_image || (d.product.images?.[0]?.image_url ?? ''));
          if (d.product.variants && d.product.variants.length > 0) {
            setSelectedVariant(d.product.variants[0]);
          } else {
            setSelectedVariant(null);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-sm">Loading battery specifications...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Battery Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">The product you are looking for does not exist or has been discontinued.</p>
        <button
          onClick={() => onNavigate('shop')}
          className="bg-red-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs"
        >
          BROWSE CATALOG
        </button>
      </div>
    );
  }

  // Authoritative prices
  const basePrice = selectedVariant
    ? (selectedVariant.sale_price && selectedVariant.sale_price > 0 ? selectedVariant.sale_price : selectedVariant.price)
    : (product.sale_price && product.sale_price > 0 ? product.sale_price : product.price);

  const originalPrice = selectedVariant ? selectedVariant.price : product.price;
  const hasDiscount = basePrice < originalPrice;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - basePrice) / originalPrice) * 100) : 0;
  const maxStock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;
  const isOutOfStock = maxStock <= 0;
  const inCompare = isInCompare(product.id);

  const effectiveTotal = Math.max(0, basePrice * quantity - (scrapTradeIn ? 500 : 0));

  const handleAddToCart = async (buyNow = false) => {
    if (isOutOfStock || isAdding) return;
    setIsAdding(true);
    const res = await addToCart(product.id, selectedVariant?.id, quantity);
    setIsAdding(false);

    if (res.success) {
      if (buyNow) {
        onNavigate('checkout');
      } else {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      }
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTitle || !reviewComment) return;

    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/cms/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
          customerName: user ? `${user.firstName} ${user.lastName}` : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setReviewModalOpen(false);
        setReviewTitle('');
        setReviewComment('');
        // Re-fetch product
        const pr = await fetch(`/api/products/${slug}`).then(r => r.json());
        if (pr.success) setProduct(pr.product);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="text-xs text-slate-500 mb-6 flex items-center gap-1.5 flex-wrap">
          <button onClick={() => onNavigate('home')} className="hover:text-slate-900">Home</button>
          <span>/</span>
          <button onClick={() => onNavigate('shop')} className="hover:text-slate-900">Shop</button>
          <span>/</span>
          <button onClick={() => onNavigate('brand', product.brand_slug)} className="hover:text-slate-900">{product.brand_name}</button>
          <span>/</span>
          <span className="text-slate-900 font-semibold truncate max-w-xs">{product.name}</span>
        </div>

        {/* Top Product Hero Block */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left: Image Gallery */}
            <div>
              <div className="relative w-full pt-[85%] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-4">
                <img
                  src={selectedImage || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80'}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {hasDiscount && (
                  <span className="absolute top-3 left-3 bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded shadow">
                    SAVE {discountPercent}%
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {product.images.map((img, i) => (
                    <button
                      key={img.id || i}
                      onClick={() => setSelectedImage(img.image_url)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors ${
                        selectedImage === img.image_url ? 'border-red-600' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Technical Specs & Buying Box */}
            <div className="flex flex-col justify-between">
              <div>
                {/* Brand & SKU Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-600 font-bold text-xs uppercase tracking-wider">
                    {product.brand_name} Official Stock
                  </span>
                  <span className="font-mono text-slate-400 text-xs">SKU: {selectedVariant ? selectedVariant.sku : product.sku}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
                  {product.name}
                </h1>

                {/* Star Ratings */}
                <div className="flex items-center gap-2 mb-4 text-xs">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.avgRating || 5) ? 'fill-amber-400' : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-slate-800">{product.avgRating || '5.0'}</span>
                  <span className="text-slate-500">({product.reviewsCount || 1} verified reviews)</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Official Stamped Warranty
                  </span>
                </div>

                {/* Price Display */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-6">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono">
                      Rs. {basePrice.toLocaleString()}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-slate-400 line-through font-mono">
                        Rs. {originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>Tax Included</span>
                    <span>·</span>
                    <span className="text-emerald-700 font-bold">Free Roadside Delivery in Islamabad</span>
                  </div>
                </div>

                {/* Product Variants (if applicable) */}
                {product.variants && product.variants.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Choose Variation / Ah Capacity:
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {product.variants.map(v => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedVariant?.id === v.id
                              ? 'border-red-600 bg-red-50/50 ring-1 ring-red-600'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-xs text-slate-900">{v.title}</div>
                          <div className="text-xs font-mono font-bold text-red-600 mt-1">
                            Rs. {(v.sale_price || v.price).toLocaleString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Old Battery Scrap Trade-In Rebate Commitment (Section 4 & 51) */}
                <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scrapTradeIn}
                      onChange={e => setScrapTradeIn(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 mt-0.5 rounded cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <span>Trade-In Old Dead Battery (Save Rs. 500 Extra)</span>
                        <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                          ECO RECYCLE
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                        Hand over your old scrap battery to our delivery technician upon receiving your new battery to claim an immediate Rs. 500 cash rebate!
                      </p>
                    </div>
                  </label>
                </div>

                {/* Stock Status Indicator */}
                <div className="mb-6 text-xs">
                  {isOutOfStock ? (
                    <div className="inline-flex items-center gap-1.5 text-rose-600 font-bold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                      <AlertCircle className="w-4 h-4" />
                      <span>Currently Out of Stock</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>In Stock at F-10 Markaz ({maxStock} units ready for prompt dispatch)</span>
                    </div>
                  )}
                </div>

                {/* Quantity & CTA Buttons */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1 || isOutOfStock}
                        className="px-3 py-2.5 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                      >
                        -
                      </button>
                      <span className="px-4 text-xs font-bold font-mono text-slate-900">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.min(maxStock, q + 1))}
                        disabled={quantity >= maxStock || isOutOfStock}
                        className="px-3 py-2.5 text-slate-600 hover:text-slate-900 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleAddToCart(false)}
                      disabled={isOutOfStock || isAdding}
                      className={`flex-1 py-3 px-6 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                        isOutOfStock
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : justAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 active:scale-[0.98]'
                      }`}
                    >
                      {justAdded ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>ADDED TO CART</span>
                        </>
                      ) : isAdding ? (
                        <span>PROCESSING...</span>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>ADD TO CART</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Buy Now Button */}
                  <button
                    onClick={() => handleAddToCart(true)}
                    disabled={isOutOfStock || isAdding}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-lg text-xs transition-colors shadow-md disabled:opacity-50"
                  >
                    BUY NOW · CASH ON DELIVERY OR ONLINE
                  </button>
                </div>

                {/* Compare & Wishlist Secondary Actions */}
                <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-100 text-xs font-medium text-slate-600">
                  <button
                    onClick={() => {
                      if (inCompare) removeFromCompare(product.id);
                      else addToCompare(product.id);
                    }}
                    className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
                  >
                    <Scale className="w-4 h-4" />
                    <span>{inCompare ? 'In Comparison List' : 'Add to Compare'}</span>
                  </button>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 pt-6 mt-6 border-t border-slate-100 text-center text-[10px] text-slate-500">
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <span className="font-bold text-slate-800 block">{product.warranty_months}M Warranty</span>
                  <span>Official Stamp</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <Truck className="w-4 h-4 text-red-600 mx-auto mb-1" />
                  <span className="font-bold text-slate-800 block">45-Min Van</span>
                  <span>Islamabad Delivery</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <Wrench className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <span className="font-bold text-slate-800 block">Free Fitting</span>
                  <span>Terminal Cleaning</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Specifications, Vehicle Fitment, Warranty & Reviews */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-12">
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 overflow-x-auto">
            <button
              onClick={() => setActiveTab('specs')}
              className={`py-3.5 px-6 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'specs'
                  ? 'border-red-600 text-red-600 bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('fitment')}
              className={`py-3.5 px-6 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'fitment'
                  ? 'border-red-600 text-red-600 bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Vehicle Compatibility ({product.compatibleVehicles?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('warranty')}
              className={`py-3.5 px-6 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'warranty'
                  ? 'border-red-600 text-red-600 bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Warranty & Delivery Info
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-3.5 px-6 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'border-red-600 text-red-600 bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Customer Reviews ({product.reviewsCount || 0})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 sm:p-8">
            {/* 1. Specs */}
            {activeTab === 'specs' && (
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-4">Complete Technical Sheet</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Brand Manufacturer:</span>
                    <span className="font-bold text-slate-900">{product.brand_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Model SKU:</span>
                    <span className="font-mono font-bold text-slate-900">{product.sku}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Nominal Voltage:</span>
                    <span className="font-mono font-bold text-slate-900">{product.voltage}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Rated Capacity (C20):</span>
                    <span className="font-mono font-bold text-slate-900">{product.ah_capacity} Ah</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Cold Cranking Amps (CCA):</span>
                    <span className="font-mono font-bold text-slate-900">{product.cca ? `${product.cca} CCA` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Total Plate Count:</span>
                    <span className="font-mono font-bold text-slate-900">{product.plates ? `${product.plates} Plates` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Battery Type & Technology:</span>
                    <span className="font-bold text-slate-900">{product.battery_type}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Official Warranty Duration:</span>
                    <span className="font-bold text-emerald-700">{product.warranty_months} Months Stamped Replacement</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Physical Dimensions (L x W x H):</span>
                    <span className="font-mono text-slate-900">{product.dimensions || 'Standard DIN/JIS'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Approx. Weight:</span>
                    <span className="font-mono text-slate-900">{product.weight ? `${product.weight} kg` : 'N/A'}</span>
                  </div>
                </div>

                {/* Features List */}
                {product.features && product.features.length > 0 && (
                  <div className="mt-8">
                    <h4 className="font-bold text-slate-900 text-sm mb-3">Key Performance Highlights</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
                      {product.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 2. Vehicle Fitment */}
            {activeTab === 'fitment' && (
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-2">Compatible Vehicle Models</h3>
                <p className="text-xs text-slate-500 mb-6">
                  This battery has been verified for perfect terminal polarity, terminal post size, and tray dimensions on the following vehicles:
                </p>

                {product.compatibleVehicles && product.compatibleVehicles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {product.compatibleVehicles.map(v => (
                      <div key={v.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-red-600" />
                          <span>{v.make} {v.model_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Years: {v.start_year} - {v.end_year} | Engine: {v.engine || 'Standard Petrol/Diesel'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-500 text-xs">
                    This battery is designed primarily for Home Solar Inverters, Commercial UPS setups, or universal high-capacity power applications.
                  </div>
                )}
              </div>
            )}

            {/* 3. Warranty & Delivery Info */}
            {activeTab === 'warranty' && (
              <div className="space-y-6 text-xs text-slate-700 leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Official Manufacturer Replacement Warranty</span>
                  </h4>
                  <p>
                    Every battery purchased through Chaudhary Battery And UPS F10 is backed by the official company stamped warranty slip with dealer stamp and barcode.
                    Warranty claims can be submitted directly at our F-10 Markaz shop or any authorized distributor across Pakistan.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-600" />
                    <span>Delivery & Roadside Installation Van Service</span>
                  </h4>
                  <p>
                    We deliver across Islamabad (F-10, F-11, G-10, G-11, E-11, F-8, Blue Area, Bahria Town, DHA) within 45 to 60 minutes.
                    Delivery includes battery bracket fitting, terminal cleaning, and applying anti-corrosive terminal grease free of charge.
                  </p>
                </div>
              </div>
            )}

            {/* 4. Reviews */}
            {activeTab === 'reviews' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Customer Feedback</h3>
                    <p className="text-xs text-slate-500">Authentic reviews from verified Pakistani purchasers.</p>
                  </div>

                  <button
                    onClick={() => setReviewModalOpen(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Write a Review</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {(product.reviews || []).map(r => (
                    <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{r.customer_name}</span>
                          {r.is_verified_purchase === 1 && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        <div className="flex text-amber-400">
                          {[...Array(r.rating || 5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <h5 className="font-bold text-slate-900 mb-1">{r.title}</h5>
                      <p className="text-slate-600 leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {product.related && product.related.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-6">
              Frequently Bought Together & Alternatives
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {product.related.map(rel => (
                <ProductCard key={rel.id} product={rel} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Submission Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-base text-slate-900 mb-1">Write a Review</h3>
            <p className="text-xs text-slate-500 mb-4">Share your experience with {product.name}</p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-amber-400"
                    >
                      <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Review Title</label>
                <input
                  type="text"
                  required
                  value={reviewTitle}
                  onChange={e => setReviewTitle(e.target.value)}
                  placeholder="e.g. Great backup on Corolla Altis"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Detailed Feedback</label>
                <textarea
                  rows={3}
                  required
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="How was the delivery, installation, and battery performance?"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-5 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
                >
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
