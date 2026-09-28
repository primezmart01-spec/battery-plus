import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Zap, Truck, RotateCcw, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { Banner } from '../../types';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface HeroBannerProps {
  onNavigate: (route: string, param?: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onNavigate }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { settings } = useStoreSettings();

  const businessName = settings.business_name || 'Chaudhary Battery And UPS F10';
  const phone = settings.business_phone || '+92 51 2212345';

  useEffect(() => {
    fetch('/api/cms/banners')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.banners?.length > 0) {
          setBanners(d.banners);
        }
      })
      .catch(() => {});
  }, []);

  const defaultBanners: Banner[] = [
    {
      id: 'b1',
      title: 'Islamabad’s Premier Battery & UPS Wholesaler',
      subtitle: '100% Original Japanese GS Yuasa AGS, Korean Daewoo Maintenance-Free, Volta & Osaka Tall Tubular solar batteries with official stamped warranty in F-10 Markaz.',
      image_url: '/uploads/battery_ags_gl65.jpg',
      cta_text: 'Explore Battery Catalog',
      cta_link: 'shop',
      display_order: 1
    },
    {
      id: 'b2',
      title: 'Heavy-Duty Tall Tubular Batteries for Solar & Inverters',
      subtitle: 'Designed for extreme summer loads and uninterrupted backup. Volta TS-1800 and Osaka TS-2500 deep cycle tubular batteries in stock with rapid dispatch.',
      image_url: '/uploads/battery_volta_ts1800.jpg',
      cta_text: 'View Solar Tubular Range',
      cta_link: 'tubular-batteries',
      display_order: 2
    },
    {
      id: 'b3',
      title: '100% Maintenance-Free Sealed Batteries with Magic Eye',
      subtitle: 'Zero water topping or acid pouring required. Instant state-of-charge optical indicator for Corolla, Civic, Sportage, Prado, and Japanese 660cc cars.',
      image_url: '/uploads/battery_daewoo_dls65.jpg',
      cta_text: 'Shop Daewoo Range',
      cta_link: 'maintenance-free-batteries',
      display_order: 3
    }
  ];

  const activeBanners = banners.length > 0 ? banners : defaultBanners;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % activeBanners.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const slide = activeBanners[currentSlide];

  return (
    <div className="relative bg-gradient-to-tr from-slate-50 via-white to-slate-100/70 text-slate-900 overflow-hidden border-b border-slate-200/80">
      {/* Decorative clean radial graphics */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Carousel Area */}
      <div className="relative min-h-[460px] md:min-h-[500px] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16 w-full z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-800 text-xs font-bold tracking-wide uppercase shadow-sm">
                <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>{businessName}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5.5xl font-black text-slate-950 tracking-tight leading-[1.12]">
                {slide.title}
              </h1>

              <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-xl">
                {slide.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  onClick={() => onNavigate('shop')}
                  className="bg-red-600 hover:bg-red-700 text-white font-black py-3.5 px-7 rounded-xl text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                >
                  <span>SHOP BATTERIES NOW</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('category', 'car-batteries')}
                  className="bg-white hover:bg-slate-50 text-slate-800 font-bold py-3.5 px-6 rounded-xl text-xs border border-slate-200 transition-colors shadow-sm"
                >
                  CAR BATTERIES
                </button>

                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="hidden sm:flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-3 px-4 rounded-xl border border-slate-200 transition-colors"
                >
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>Call: {phone}</span>
                </a>
              </div>
            </div>

            {/* Right Visual Display Column */}
            <div className="hidden lg:flex lg:col-span-5 items-center justify-center relative">
              <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative group transition-transform duration-300 hover:scale-[1.01]">
                <div className="absolute -top-3 -right-3 bg-slate-950 text-white font-black text-[10px] tracking-wider px-3 py-1 rounded-full uppercase shadow-md border border-slate-800">
                  100% Genuine Stock
                </div>

                <div className="w-full h-56 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-4 border border-slate-150">
                  <img
                    src={slide.image_url}
                    alt={slide.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/uploads/battery_ags_gl65.jpg';
                    }}
                    className="max-h-full max-w-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase font-bold">Authorized Retailer</div>
                    <div className="font-extrabold text-slate-900">AGS · Daewoo · Volta · Osaka</div>
                  </div>
                  <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Stamped Warranty
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Slide Controls */}
        <button
          onClick={() => setCurrentSlide(prev => (prev - 1 + activeBanners.length) % activeBanners.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 hover:bg-slate-100 text-slate-700 shadow-md border border-slate-200 transition-colors backdrop-blur-sm"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setCurrentSlide(prev => (prev + 1) % activeBanners.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 hover:bg-slate-100 text-slate-700 shadow-md border border-slate-200 transition-colors backdrop-blur-sm"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Trust Highlights Strip below Hero */}
      <div className="bg-white border-t border-slate-200/80 py-4.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-slate-900 font-extrabold">100% Stamped Warranty</div>
              <div className="text-[11px] text-slate-500">Official manufacturer cards</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Truck className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-slate-900 font-extrabold">45-Min Mobile Fitting</div>
              <div className="text-[11px] text-slate-500">Roadside van in Islamabad & RWP</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <RotateCcw className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-slate-900 font-extrabold">Old Scrap Battery Rebate</div>
              <div className="text-[11px] text-slate-500">Instant Rs. 500 discount</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
              <Zap className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-slate-900 font-extrabold">Free Alternator Test</div>
              <div className="text-[11px] text-slate-500">Digital load & charging test</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
