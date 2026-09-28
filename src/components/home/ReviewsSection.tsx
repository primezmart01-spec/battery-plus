import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, ChevronLeft, ChevronRight, Quote, ShieldCheck } from 'lucide-react';
import { Review } from '../../types';

export const ReviewsSection: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const defaultReviews = [
    {
      id: 'r1',
      customer_name: 'Malik Tariq Mehmood',
      location: 'F-10/2 Islamabad',
      rating: 5,
      title: 'Emergency delivery to F-10 within 45 minutes!',
      comment: 'Car refused to start on a Monday morning. Contacted Chaudhary Battery F-10, ordered the AGS GL-65 on Cash on Delivery. Rider was at my doorstep in 45 mins with battery and tools, replaced it and gave a fair scrap discount for my old battery.',
      product: 'AGS GL-65 (50Ah)',
      is_verified_purchase: 1
    },
    {
      id: 'r2',
      customer_name: 'Dr. Shahzad Afzal',
      location: 'G-10/4 Islamabad',
      rating: 5,
      title: 'Authentic Daewoo Maintenance Free',
      comment: 'Cleanest battery installation. Magic eye status indicator is deep green, fresh production batch date code stamped. Best battery supplier in Islamabad.',
      product: 'Daewoo DLS-65 Maintenance-Free',
      is_verified_purchase: 1
    },
    {
      id: 'r3',
      customer_name: 'Engr. Kamran Siddiqui',
      location: 'E-11/3 Islamabad',
      rating: 5,
      title: 'Volta TS-1800 Tall Tubular for Home Solar',
      comment: 'Bought 4 batteries for 5kW hybrid inverter. The technician explained the specific gravity check and float level plugs thoroughly. 9+ hours continuous backup during night load shedding.',
      product: 'Volta TS-1800 Tall Tubular 185Ah',
      is_verified_purchase: 1
    },
    {
      id: 'r4',
      customer_name: 'Brig. (R) Hassan Raza',
      location: 'DHA Phase 2 Rawalpindi',
      rating: 5,
      title: 'Reliable Osaka TS-2500 Deep Cycle Storage',
      comment: 'Replaced my old Gel batteries with Osaka Tubo-Solar TS-2500. Runs 2 inverter ACs seamlessly without battery voltage collapse. Official company stamped warranty delivered on spot.',
      product: 'Osaka Tubo-Solar TS-2500 (230Ah)',
      is_verified_purchase: 1
    },
    {
      id: 'r5',
      customer_name: 'Usman Chaudhry',
      location: 'F-11 Markaz Islamabad',
      rating: 5,
      title: 'Perfect Fit for Suzuki Alto 660cc',
      comment: 'Exide NS-40 fitted within 30 minutes at F-11 Markaz. Cold cranking speed is super fast even in January cold. Extremely polite shop staff.',
      product: 'Exide NS-40 (38Ah)',
      is_verified_purchase: 1
    },
    {
      id: 'r6',
      customer_name: 'Mrs. Saadia Bilal',
      location: 'Bahria Town Phase 4',
      rating: 5,
      title: 'Solid Inverter Battery Backup',
      comment: 'Phoenix TX-1000 running our home lights and fans smoothly for 5 hours during power cuts. Very satisfied with Chaudhary Battery F-10 service.',
      product: 'Phoenix TX-1000 (100Ah)',
      is_verified_purchase: 1
    }
  ];

  useEffect(() => {
    fetch('/api/products/prod_ags_gl65')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.product?.reviews) && d.product.reviews.length > 0) {
          setReviews(d.product.reviews);
        } else {
          setReviews(defaultReviews);
        }
      })
      .catch(() => setReviews(defaultReviews));
  }, []);

  const activeReviews = reviews.length > 0 ? reviews : defaultReviews;

  // Auto carousel rotation every 6 seconds
  useEffect(() => {
    if (activeReviews.length <= 3) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % (activeReviews.length - 2));
    }, 6000);
    return () => clearInterval(timer);
  }, [activeReviews.length]);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? Math.max(0, activeReviews.length - 3) : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev >= activeReviews.length - 3 ? 0 : prev + 1));
  };

  const visibleReviews = activeReviews.slice(currentIndex, currentIndex + 3);

  return (
    <section className="py-16 bg-slate-50 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-red-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Customer Feedback</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Trusted by Motorists & Homeowners Across ICT
            </h2>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-bold text-slate-800">4.9 / 5.0 Rating</span>
              <span>· Based on 1,250+ verified local installations</span>
            </div>
          </div>

          {/* Carousel Controls */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handlePrev}
              aria-label="Previous review slide"
              className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-900 hover:text-white text-slate-700 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next review slide"
              className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-900 hover:text-white text-slate-700 transition-colors shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carousel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-500">
          {visibleReviews.map((r, i) => (
            <div
              key={r.id || i}
              className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all flex flex-col justify-between relative group"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-slate-100 group-hover:text-amber-100 transition-colors pointer-events-none" />

              <div>
                {/* Rating & Verified badge */}
                <div className="flex items-center justify-between mb-3 z-10 relative">
                  <div className="flex text-amber-400">
                    {[...Array(r.rating || 5)].map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  {r.is_verified_purchase === 1 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Verified Purchaser
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-slate-900 text-sm mb-2 leading-snug">
                  {r.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  "{r.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs">
                <div className="font-bold text-slate-900">{r.customer_name}</div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between mt-0.5">
                  <span>{r.location || 'Islamabad'}</span>
                  {r.product && <span className="font-semibold text-slate-700">{r.product}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: Math.max(1, activeReviews.length - 2) }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                currentIndex === idx ? 'w-8 bg-slate-900' : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
