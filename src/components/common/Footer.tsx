import React from 'react';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import {
  Zap,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  CheckCircle2
} from 'lucide-react';

interface FooterProps {
  onNavigate: (route: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { settings } = useStoreSettings();
  const businessName = settings.business_name || 'Chaudhary Battery And UPS F10';
  const tagline = settings.business_tagline || 'Authorised Dealer & Wholesaler for AGS, Daewoo, Volta, Osaka, Exide & Phoenix';
  const address = settings.business_address || 'Shop # 14-16, Ground Floor, Capital Trade Centre, F-10 Markaz, Islamabad, 44000, Pakistan';
  const phone = settings.business_phone || '+92 51 2212345';
  const whatsapp = settings.business_whatsapp || '+92 300 5551234';
  const email = settings.business_email || 'sales@chaudharybattery.pk';

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 text-xs">
      {/* 1. Value Props Strip */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">100% Genuine Batteries</h4>
              <p className="text-slate-400 text-[11px]">Direct dealer stamped official warranty</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600/10 border border-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Fast Islamabad Delivery</h4>
              <p className="text-slate-400 text-[11px]">Free delivery on orders over Rs. 10,000</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Old Battery Scrap Rebate</h4>
              <p className="text-slate-400 text-[11px]">Cash back on trade-in of old batteries</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Verified COD & Online Pay</h4>
              <p className="text-slate-400 text-[11px]">Pay on delivery or secure card/portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Links & Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Bio */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold text-white">
                <Zap className="w-5 h-5" />
              </div>
              <div className="font-extrabold text-base tracking-tight text-white uppercase">
                {businessName}
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs max-w-sm">
              {tagline}
            </p>

            <div className="space-y-2 pt-1 text-slate-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>Phone: {phone} | WhatsApp: {whatsapp}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Mon - Sun: 9:00 AM – 10:00 PM (Emergency mobile team on call)</span>
              </div>
            </div>
          </div>

          {/* Shop Categories */}
          <div>
            <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4 border-l-2 border-red-600 pl-2">
              Categories
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button onClick={() => onNavigate('category', 'car-batteries')} className="hover:text-white transition-colors">
                  Car Batteries
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'tubular-batteries')} className="hover:text-white transition-colors">
                  Tall Tubular Solar
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'solar-batteries')} className="hover:text-white transition-colors">
                  Solar Deep Cycle
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'ups-batteries')} className="hover:text-white transition-colors">
                  UPS Inverter Batteries
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'maintenance-free-batteries')} className="hover:text-white transition-colors">
                  Maintenance-Free Dry
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'commercial-vehicle-batteries')} className="hover:text-white transition-colors">
                  Commercial & Truck
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('category', 'motorcycle-batteries')} className="hover:text-white transition-colors">
                  Motorcycle Batteries
                </button>
              </li>
            </ul>
          </div>

          {/* Brands */}
          <div>
            <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4 border-l-2 border-red-600 pl-2">
              Brands
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button onClick={() => onNavigate('brand', 'ags')} className="hover:text-white transition-colors">
                  AGS (GS Yuasa Japan)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('brand', 'daewoo')} className="hover:text-white transition-colors">
                  Daewoo Maintenance-Free
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('brand', 'volta')} className="hover:text-white transition-colors">
                  Volta (Pakistan Accumulators)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('brand', 'osaka')} className="hover:text-white transition-colors">
                  Osaka Tubo-Solar
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('brand', 'exide')} className="hover:text-white transition-colors">
                  Exide Pakistan
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('brand', 'phoenix')} className="hover:text-white transition-colors">
                  Phoenix Batteries
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Support & Legal */}
          <div>
            <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4 border-l-2 border-red-600 pl-2">
              Customer Support
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button onClick={() => onNavigate('track-order')} className="hover:text-white transition-colors">
                  Track Your Order
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('warranty')} className="hover:text-white transition-colors">
                  Warranty Claim Terms
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shipping')} className="hover:text-white transition-colors">
                  Delivery & Roadside Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-white transition-colors">
                  About Chaudhary Battery
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors">
                  Contact & Shop Map
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy')} className="hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors">
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. Bottom Strip */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <div>
            © {new Date().getFullYear()} Chaudhary Battery And UPS F10. All rights reserved. NTN: 7321094-1.
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-slate-400">Accepted Payment Methods:</span>
            <span className="bg-slate-900 border border-slate-700 px-2 py-1 rounded font-bold text-white">Cash on Delivery</span>
            <span className="bg-slate-900 border border-slate-700 px-2 py-1 rounded font-bold text-white">Bank Transfer</span>
            <span className="bg-slate-900 border border-slate-700 px-2 py-1 rounded font-bold text-white">PayFast / JazzCash</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
