import { useEffect, useState } from 'react';
import {
  MapPin,
  Layers,
  Shield,
  Activity,
  Compass,
  Satellite,
  Info,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import InteractiveGisMap from '@/components/InteractiveGisMap';
import { useApp } from '@/context/AppContext';
import { defaultLocationId, northeastLocations } from '@/data/neLocations';
import { fetchRegionalRisk, type RiskLocation } from '@/api';

export default function RiskMapPage() {
  const { settings, setPersona } = useApp();
  const [regionalRisk, setRegionalRisk] = useState<RiskLocation[]>([]);
  const [selectedId, setSelectedId] = useState(defaultLocationId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthority = settings.persona === 'authority';

  useEffect(() => {
    let isMounted = true;
    const fetchRisk = async () => {
      try {
        const data = await fetchRegionalRisk();
        if (isMounted) {
          setRegionalRisk(data);
          setError(null);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setRegionalRisk([]);
          setError('Live GIS map service unreachable. Active offline layer mode.');
          setLoading(false);
        }
      }
    };

    fetchRisk();
    if (settings.autoRefresh) {
      const id = window.setInterval(fetchRisk, 30000);
      return () => {
        isMounted = false;
        window.clearInterval(id);
      };
    }
    return () => {
      isMounted = false;
    };
  }, [settings.autoRefresh]);

  const selectedLocation = regionalRisk.find((l) => l.id === selectedId) ||
    northeastLocations.find((l) => l.id === selectedId) ||
    northeastLocations[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Layers className="h-4 w-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-blue-400">
              Multi-Layer Spatial Hazard Intelligence (9 Scientific Layers)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Northeast India GIS Hazard & Landslide Map
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Integrates real-time IoT sensors, rainfall infiltration, soil pore-water pressure, geotechnical slope gradients, active tectonic fault slip (Dauki, Kopili, MBT), GSI historical landslide catalog, and InSAR satellite deformation velocities.
          </p>
        </div>

        {/* Quick Location Dropdown & Persona Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-800 p-1.5 border border-slate-700">
            <MapPin className="h-4 w-4 text-blue-400 ml-2" />
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-2"
            >
              {northeastLocations.map((loc) => (
                <option key={loc.id} value={loc.id} className="bg-slate-900 text-white">
                  {loc.name}, {loc.state}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setPersona(isAuthority ? 'citizen' : 'authority')}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
              isAuthority
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>{isAuthority ? 'NDRF Tactical View' : 'Citizen View'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs font-medium text-amber-900">
          {error}
        </div>
      )}

      {/* Flagship Interactive GIS Map */}
      <InteractiveGisMap
        locations={regionalRisk}
        selectedLocationId={selectedId}
        onSelectLocation={(loc) => setSelectedId(loc.id)}
        isAuthorityMode={isAuthority}
        heightClass="h-[620px]"
      />

      {/* Scientific Legend & Data Sources Documentation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
            <Activity className="h-4 w-4 text-blue-600" />
            <span>1. Sensor & Hydrology Telemetry</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Continuously monitors piezometric pore-water pressure (<code className="font-mono text-blue-700">u</code> in kPa), soil volumetric water content (VWC %), and hourly cumulative rainfall. Triggers threshold alarms when pore pressure reduces effective normal stress.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
            <Compass className="h-4 w-4 text-amber-600" />
            <span>2. Tectonic & Geomorphology</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Visualizes regional structural discontinuities including the Main Boundary Thrust (MBT), Dauki Fault, and Kopili Fault. Displays micro-seismic accelerations (<code className="font-mono text-amber-700">PGA &ge; 0.08g</code>) capable of triggering co-seismic mass wasting.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
            <Satellite className="h-4 w-4 text-purple-600" />
            <span>3. InSAR & Historical Inventory</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Integrates Sentinel-1 Persistent Scatterer InSAR surface deformation line-of-sight velocities (mm/yr) combined with the Geological Survey of India (GSI) historical landslide spatial inventory for multi-hazard validation.
          </p>
        </div>
      </div>
    </div>
  );
}
