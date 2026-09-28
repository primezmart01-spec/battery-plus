import React from 'react';
import { ShieldCheck, Truck, RotateCcw, Wrench, Award, PhoneCall } from 'lucide-react';

export const WhyChooseUs: React.FC = () => {
  const points = [
    {
      icon: ShieldCheck,
      title: '100% Genuine Stamped Stock',
      desc: 'No duplicate, refurbished, or low-acid batteries. Every battery carries an original manufacturer serial barcode and authorized F-10 dealer seal.'
    },
    {
      icon: Truck,
      title: 'Rapid 45-Min Mobile Fitting',
      desc: 'Stranded on the road or at home in Islamabad? Our mobile technicians arrive with replacement battery, terminal grease, and fitting tools.'
    },
    {
      icon: Wrench,
      title: 'Free Computerized Diagnostic',
      desc: 'Before replacing your battery, we test your vehicle alternator charging voltage, starter motor draw, and acid specific gravity.'
    },
    {
      icon: RotateCcw,
      title: 'Old Battery Scrap Rebate',
      desc: 'Get fair market cash discount (Rs. 500) on your old dead battery. We ensure certified eco-friendly lead recycling.'
    },
    {
      icon: Award,
      title: 'Direct Warranty Claim Center',
      desc: 'We handle official warranty claims on the spot at our F-10 Markaz shop with computerized load tester verification.'
    },
    {
      icon: PhoneCall,
      title: 'Solar & Inverter Advisory',
      desc: 'Expert sizing for home solar systems (Inverex, Crown, SolarMax, Homage) to ensure maximum backup hours without error codes.'
    }
  ];

  return (
    <section className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-red-600 font-extrabold text-xs uppercase tracking-wider mb-2">
            Why Islamabad Motorists & Homeowners Choose Us
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            The Chaudhary Battery & UPS Standard
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-2">
            Serving motorists, homeowners, and commercial establishments across Islamabad and Rawalpindi with integrity and technical precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {points.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 hover:border-slate-300 hover:shadow-md transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-base font-extrabold text-slate-950 mb-2">{p.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
