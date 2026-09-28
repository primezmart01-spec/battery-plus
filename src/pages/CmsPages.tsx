import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  Truck,
  Send,
  CheckCircle2,
  AlertCircle,
  Zap,
  RotateCcw
} from 'lucide-react';

interface CmsPageProps {
  pageType: 'about' | 'contact' | 'warranty' | 'shipping' | 'privacy' | 'terms';
  onNavigate: (route: string, param?: string) => void;
}

export const CmsPages: React.FC<CmsPageProps> = ({ pageType, onNavigate }) => {
  // Contact Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+92 ');
  const [vehicleOrBattery, setVehicleOrBattery] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; msg: string } | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/cms/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, vehicleOrBattery, message })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitResult({ success: true, msg: data.message || 'Message sent successfully.' });
        setName('');
        setEmail('');
        setMessage('');
        setVehicleOrBattery('');
      } else {
        setSubmitResult({ success: false, msg: data.error || 'Failed to send message.' });
      }
    } catch {
      setSubmitResult({ success: false, msg: 'Connection error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* About Page */}
        {pageType === 'about' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed">
            <div className="border-b border-slate-200 pb-4">
              <span className="text-red-600 font-bold text-xs uppercase tracking-wider block mb-1">
                F-10 Markaz Islamabad · Since 1998
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                About Chaudhary Battery And UPS F10
              </h1>
            </div>

            <p>
              Located centrally at Capital Trade Centre in <strong>F-10 Markaz, Islamabad</strong>, Chaudhary Battery And UPS has been the capital territory’s most reliable automotive battery distributor, solar deep-cycle specialist, and commercial inverter backup provider for more than two decades.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-emerald-600 mb-2" />
                <h4 className="font-bold text-slate-900 text-sm mb-1">Direct Factory Distribution</h4>
                <p className="text-xs text-slate-500">
                  Authorised master retailer for AGS (Atlas Battery Ltd), Daewoo Maintenance Free, Volta (PAL), Osaka, Exide Pakistan, and Phoenix. Guaranteed 100% fresh batch stock.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <Truck className="w-6 h-6 text-red-600 mb-2" />
                <h4 className="font-bold text-slate-900 text-sm mb-1">Emergency Mobile Fitting Vans</h4>
                <p className="text-xs text-slate-500">
                  Dedicated mobile fleet covering all Islamabad sectors (F-10, F-11, G-10, G-11, E-11, F-8, DHA, Bahria) with 45-minute doorstep battery replacement and terminal greasing.
                </p>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-900 pt-2">Our Physical Location in Islamabad</h3>
            <div className="bg-slate-900 text-white p-5 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>Shop # 14-16, Ground Floor, Capital Trade Centre, F-10 Markaz, Islamabad, 44000, Pakistan</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>Landline: +92 51 2212345 · Mobile/WhatsApp: +92 300 5551234</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Working Hours: Monday – Sunday: 9:00 AM – 10:00 PM</span>
              </div>
            </div>
          </div>
        )}

        {/* Contact Page */}
        {pageType === 'contact' && (
          <div className="space-y-8">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-red-600 font-bold text-xs uppercase tracking-wider block mb-1">
                We Are Here To Help
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Contact & F-10 Shop Location
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Reach out for battery price quotes, solar sizing, or roadside breakdown dispatch.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contact Information */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 text-xs text-slate-700">
                  <h3 className="font-extrabold text-sm text-slate-900">Store Information</h3>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block">F-10 Markaz Store</strong>
                      <span>Shop # 14-16, Capital Trade Centre, F-10 Markaz, Islamabad</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block">Phone Helpline</strong>
                      <span>+92 51 2212345</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block">Direct WhatsApp</strong>
                      <span className="font-mono text-emerald-700 font-bold">+92 300 5551234</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 block">Email</strong>
                      <span>sales@chaudharybattery.pk</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Islamabad Map Widget */}
                <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 text-center space-y-3">
                  <MapPin className="w-8 h-8 text-red-500 mx-auto" />
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-200">Map & Directions</h4>
                    <p className="text-[11px] text-slate-400">Capital Trade Centre, F-10 Markaz Islamabad (Adjacent to banks & food street)</p>
                  </div>
                  <a
                    href="https://maps.google.com/?q=F-10+Markaz+Islamabad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold px-3 py-1.5 rounded transition-colors"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
                <h3 className="font-extrabold text-base text-slate-900 mb-1">Send an Inquiry or Battery Order Request</h3>
                <p className="text-xs text-slate-500 mb-6">Our team will call or WhatsApp you within 15 minutes during shop hours.</p>

                <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                  {submitResult && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 font-semibold ${
                      submitResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
                    }`}>
                      {submitResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{submitResult.msg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Your Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Tariq Mehmood"
                        className="w-full border rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="tariq@example.com"
                        className="w-full border rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Phone / WhatsApp</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+92 300 1234567"
                        className="w-full border rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Car Model or Battery Type</label>
                      <input
                        type="text"
                        value={vehicleOrBattery}
                        onChange={e => setVehicleOrBattery(e.target.value)}
                        placeholder="e.g. Corolla 2018 or 185Ah Solar"
                        className="w-full border rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Your Message or Address for Delivery</label>
                    <textarea
                      rows={4}
                      required
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Please specify if you need immediate roadside installation in Islamabad..."
                      className="w-full border rounded-lg px-3 py-2 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs flex items-center gap-2 shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'SENDING...' : 'DISPATCH INQUIRY'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Warranty Policy */}
        {pageType === 'warranty' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed">
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Official Manufacturer Warranty & Claim Policy
              </h1>
            </div>
            <p>
              Every battery sold by Chaudhary Battery And UPS F10 is backed by the manufacturer warranty card stamped with our authorized dealer seal and date of purchase.
            </p>
            <h3 className="text-base font-bold text-slate-900">Warranty Coverage Periods:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Automotive Car Batteries:</strong> 12 Months free replacement against internal cell defect.</li>
              <li><strong>Tall Tubular Solar Batteries:</strong> 12 to 24 Months manufacturer replacement guarantee.</li>
              <li><strong>Motorcycle Batteries:</strong> 6 Months manufacturer replacement warranty.</li>
            </ul>
          </div>
        )}

        {/* Shipping Policy */}
        {pageType === 'shipping' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed">
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Shipping & Roadside Delivery Van Policy
              </h1>
            </div>
            <p>
              Chaudhary Battery operates dedicated delivery vans across Islamabad and Rawalpindi equipped with computerized battery load testers and terminal replacement kits.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Islamabad (ICT):</strong> Free delivery on all battery orders over Rs. 10,000. Typical dispatch within 45 to 60 minutes.</li>
              <li><strong>Rawalpindi:</strong> Rs. 500 flat delivery or Free on orders over Rs. 30,000.</li>
              <li><strong>Nationwide Courier:</strong> Dispatched via pallet freight logistics across Pakistan.</li>
            </ul>
          </div>
        )}

        {/* Privacy Policy */}
        {pageType === 'privacy' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm space-y-4 text-slate-700 text-xs leading-relaxed">
            <h1 className="text-2xl font-black text-slate-900 mb-2">Privacy & Personal Data Protection</h1>
            <p>
              Chaudhary Battery And UPS F10 respects customer privacy. We do not store raw credit card numbers or bank credentials. All customer information is securely encrypted. Customers may request full account anonymization at any time through their account settings.
            </p>
          </div>
        )}

        {/* Terms */}
        {pageType === 'terms' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm space-y-4 text-slate-700 text-xs leading-relaxed">
            <h1 className="text-2xl font-black text-slate-900 mb-2">Terms and Conditions of Sale</h1>
            <p>
              By purchasing from Chaudhary Battery And UPS F10, you agree to official manufacturer warranty guidelines. Prices are displayed in Pakistani Rupees (PKR) and subject to verified stock availability.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
