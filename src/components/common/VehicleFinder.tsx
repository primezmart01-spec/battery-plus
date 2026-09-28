import React, { useState, useEffect } from 'react';
import { Car, Search, Zap, CheckCircle2, ArrowRight, Sun, BatteryCharging, Sparkles } from 'lucide-react';

interface VehicleFinderProps {
  onSelectModel?: (modelId: string) => void;
  onNavigate: (route: string, param?: string) => void;
}

export const VehicleFinder: React.FC<VehicleFinderProps> = ({ onSelectModel, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'car' | 'ups'>('car');

  // Vehicle Finder State
  const [makes, setMakes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoadingMakes, setIsLoadingMakes] = useState<boolean>(true);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);

  // UPS / Solar Calculator State
  const [fansCount, setFansCount] = useState<number>(4);
  const [lightsCount, setLightsCount] = useState<number>(6);
  const [backupHours, setBackupHours] = useState<number>(4);

  useEffect(() => {
    fetch('/api/catalog/vehicles/makes')
      .then(r => r.json())
      .then(d => {
        if (d.success) setMakes(d.makes || []);
      })
      .catch(console.error)
      .finally(() => setIsLoadingMakes(false));
  }, []);

  const handleMakeChange = (makeId: string) => {
    setSelectedMake(makeId);
    setSelectedModel('');
    if (!makeId) {
      setModels([]);
      return;
    }

    setIsLoadingModels(true);
    fetch(`/api/catalog/vehicles/models?makeId=${makeId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setModels(d.models || []);
      })
      .catch(console.error)
      .finally(() => setIsLoadingModels(false));
  };

  const handleVehicleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) return;

    if (onSelectModel) {
      onSelectModel(selectedModel);
    }
    onNavigate('shop', `vehicleModelId=${selectedModel}`);
  };

  // Quick preset shortcuts for Pakistani drivers
  const popularCarShortcuts = [
    { label: 'Corolla / Yaris', query: 'toyota' },
    { label: 'Civic / City', query: 'honda' },
    { label: 'Alto / Cultus / Swift', query: 'suzuki' },
    { label: 'Sportage / Tucson', query: 'suv' }
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xl shadow-slate-900/5 text-slate-900">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
            {activeTab === 'car' ? <Car className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </div>
          <div>
            <h3 className="font-black text-base text-slate-900 tracking-tight flex items-center gap-2">
              <span>{activeTab === 'car' ? 'Vehicle Battery Precision Matcher' : 'UPS & Solar Backup Calculator'}</span>
              <span className="text-[10px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-full uppercase">
                100% Fit Guarantee
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {activeTab === 'car'
                ? 'Select your car make and model for the exact recommended battery size (Ah, CCA, Casing).'
                : 'Calculate recommended Tall Tubular battery capacity for home load-shedding backup.'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('car')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'car'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Car Battery
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ups')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'ups'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            UPS / Solar
          </button>
        </div>
      </div>

      {activeTab === 'car' ? (
        <div>
          <form onSubmit={handleVehicleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            {/* Make */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle Manufacturer
              </label>
              <select
                value={selectedMake}
                onChange={e => handleMakeChange(e.target.value)}
                disabled={isLoadingMakes}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white font-medium"
              >
                <option value="">Select Make (Toyota, Honda, Suzuki, etc.)</option>
                {makes.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.make}
                  </option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle Model & Engine
              </label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                disabled={!selectedMake || isLoadingModels}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white font-medium disabled:opacity-50"
              >
                <option value="">
                  {!selectedMake ? 'First select manufacturer' : isLoadingModels ? 'Loading models...' : 'Select Model'}
                </option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.model_name} ({m.start_year}-{m.end_year})
                  </option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={!selectedModel}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <Search className="w-4 h-4 text-amber-400" />
                <span>FIND COMPATIBLE BATTERIES</span>
              </button>
            </div>
          </form>

          {/* Quick Popular Shortcuts */}
          <div className="flex items-center gap-2 pt-3 text-xs text-slate-500 flex-wrap">
            <span className="font-semibold text-slate-700 text-[11px]">Popular in Islamabad:</span>
            {popularCarShortcuts.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onNavigate('shop', `search=${s.query}`)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-lg text-[11px] border border-slate-200 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* UPS & Solar Calculator Tab */
        <div className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Number of Ceiling Fans ({fansCount})</label>
              <input
                type="range"
                min={1}
                max={10}
                value={fansCount}
                onChange={e => setFansCount(parseInt(e.target.value))}
                className="w-full accent-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Number of LED Lights ({lightsCount})</label>
              <input
                type="range"
                min={2}
                max={20}
                value={lightsCount}
                onChange={e => setLightsCount(parseInt(e.target.value))}
                className="w-full accent-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Required Backup Time ({backupHours} Hours)</label>
              <input
                type="range"
                min={2}
                max={8}
                value={backupHours}
                onChange={e => setBackupHours(parseInt(e.target.value))}
                className="w-full accent-slate-900"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs">
              <div className="font-bold text-slate-900">
                Recommended Setup: <span className="text-slate-900 font-black">180Ah - 230Ah Tall Tubular Battery</span>
              </div>
              <div className="text-slate-500 text-[11px]">
                Ideal models: Volta TS-1800 (185Ah) or Osaka Tubo-Solar TS-2500 (230Ah) with deep-cycle tubular plates.
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('category', 'tubular-batteries')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 whitespace-nowrap shadow"
            >
              <span>VIEW TUBULAR BATTERIES</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
