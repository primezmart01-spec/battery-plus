import React from 'react';
import { ArrowRight, ShieldCheck, Zap, Award } from 'lucide-react';
import { Brand } from '../../types';

interface BrandShowcaseProps {
  brands: Brand[];
  onNavigate: (route: string, param?: string) => void;
}

export const BrandShowcase: React.FC<BrandShowcaseProps> = ({ brands, onNavigate }) => {
  const brandSubtitles: Record<string, string> = {
    ags: 'Atlas Battery Limited · GS Yuasa Japan Technology',
    daewoo: '100% Maintenance-Free Sealed Korean Technology',
    volta: 'Pakistan Accumulators · Tall Tubular & Platinum Series',
    osaka: 'Tubo-Solar & Heavy Deep Cycle Inverter Batteries',
    exide: 'Heavy Duty Automotive Starting Power Since 1953',
    phoenix: 'Extreme Summer High-Heat Resistant Formula'
  };

  const brandBadges: Record<string, string> = {
    ags: 'GS Yuasa Japan',
    daewoo: '100% Sealed Dry',
    volta: 'Tall Tubular Solar',
    osaka: 'Tubo-Solar Series',
    exide: 'Heavy Duty',
    phoenix: 'Heat Resistant'
  };

  return (
    <section className="py-14 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-slate-900 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Authorised Pakistani Brand Wholesaler</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Shop Top Battery Manufacturers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Direct master dealer supply with fresh manufacturing dates and official warranty cards stamped in F-10 Markaz.
            </p>
          </div>

          <button
            onClick={() => onNavigate('shop')}
            className="text-xs font-bold text-slate-900 hover:text-slate-700 flex items-center gap-1 self-start sm:self-auto group"
          >
            <span>Browse Complete Brand Catalog</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Brand Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {brands.map(brand => (
            <div
              key={brand.id}
              onClick={() => onNavigate('brand', brand.slug)}
              className="group bg-slate-50 border border-slate-200 hover:border-slate-900 rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 hover:shadow-lg hover:bg-white flex flex-col justify-between"
            >
              <div>
                <span className="inline-block text-[9px] font-extrabold uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full mb-2">
                  {brandBadges[brand.slug] || 'Original'}
                </span>

                <div className="h-14 flex items-center justify-center mb-2">
                  <span className="font-black text-xl tracking-tight text-slate-900 group-hover:scale-105 transition-transform">
                    {brand.name}
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight mb-3">
                  {brandSubtitles[brand.slug] || brand.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-900 group-hover:text-blue-900 flex items-center justify-center gap-1">
                <span>View Models</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
