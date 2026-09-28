import React, { useState, useEffect } from 'react';
import { Scale, Trash2, ShoppingCart, ShieldCheck, Zap, Check, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { useCompare } from '../context/CompareContext';
import { useCart } from '../context/CartContext';

interface ComparePageProps {
  onNavigate: (route: string, param?: string) => void;
}

export const ComparePage: React.FC<ComparePageProps> = ({ onNavigate }) => {
  const { compareIds, removeFromCompare, clearCompare } = useCompare();
  const { addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (compareIds.length === 0) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    fetch(`/api/compare?ids=${compareIds.join(',')}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setProducts(d.products || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [compareIds]);

  if (compareIds.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen py-20">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Scale className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">No Batteries to Compare</h2>
          <p className="text-xs text-slate-500 mb-6">
            Select up to 4 batteries across AGS, Daewoo, Volta, Osaka, and Exide to compare their cranking power, capacity, and warranty side-by-side.
          </p>
          <button
            onClick={() => onNavigate('shop')}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs"
          >
            BROWSE BATTERY CATALOG
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Scale className="w-6 h-6 text-red-600" />
              <span>Battery Comparison Matrix</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Comparing {products.length} models side by side.
            </p>
          </div>

          <button
            onClick={clearCompare}
            className="text-xs font-semibold text-slate-500 hover:text-red-600"
          >
            Clear Comparison List
          </button>
        </div>

        {/* Comparison Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-4 w-44 font-bold text-slate-400 uppercase tracking-wider">Specifications</th>
                {products.map(p => (
                  <th key={p.id} className="p-4 min-w-[200px] align-top">
                    <div className="relative">
                      <button
                        onClick={() => removeFromCompare(p.id)}
                        className="absolute -top-1 -right-1 p-1 text-slate-400 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <img
                        src={p.primary_image || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=200&q=80'}
                        alt={p.name}
                        className="w-24 h-24 object-cover rounded-lg bg-slate-100 border border-slate-200 mb-2"
                      />
                      <span className="font-bold text-red-600 uppercase text-[10px] block">{p.brand_name}</span>
                      <h4 className="font-bold text-slate-900 text-sm line-clamp-2 cursor-pointer hover:text-red-600 mb-2" onClick={() => onNavigate('product', p.slug)}>
                        {p.name}
                      </h4>
                      <div className="text-base font-extrabold font-mono text-slate-900 mb-3">
                        Rs. {(p.sale_price || p.price).toLocaleString()}
                      </div>
                      <button
                        onClick={() => addToCart(p.id, undefined, 1)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/50">Capacity (Ah)</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-mono font-bold text-slate-900 text-sm">
                    {p.ah_capacity} Ah
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/50">Nominal Voltage</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-mono font-bold text-slate-800">
                    {p.voltage}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/50">Cold Cranking Amps (CCA)</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-mono text-slate-800">
                    {p.cca ? `${p.cca} CCA` : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/50">Total Plates</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-mono text-slate-800">
                    {p.plates ? `${p.plates} Plates` : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/50">Technology</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-semibold text-slate-800">
                    {p.battery_type}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/50">Official Warranty</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-bold text-emerald-700">
                    {p.warranty_months} Months Stamped Replacement
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/50">Dimensions</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-mono text-slate-600">
                    {p.dimensions || 'Standard'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/50">Weight</td>
                {products.map(p => (
                  <td key={p.id} className="p-4 font-mono text-slate-600">
                    {p.weight ? `${p.weight} kg` : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-500 bg-slate-50/50">Stock Availability</td>
                {products.map(p => (
                  <td key={p.id} className="p-4">
                    {p.stock_quantity > 0 ? (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        In Stock ({p.stock_quantity})
                      </span>
                    ) : (
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded">
                        Out of Stock
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
