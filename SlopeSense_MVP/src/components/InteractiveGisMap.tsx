import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  Activity,
  CloudRain,
  Droplets,
  Mountain,
  Gauge,
  Compass,
  Radio,
  History,
  Satellite,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  ExternalLink,
  Info,
  Maximize2,
  Check,
} from 'lucide-react';
import type { RiskLocation, FaultLine, HistoricalLandslide } from '@/api';
import { fetchMapLayers } from '@/api';
import { OFFLINE_SAFE_SHELTERS, type SafeShelter } from '@/services/offlineEmergency';
import { useApp } from '@/context/AppContext';

// Center of Northeast India
const NORTHEAST_CENTER: [number, number] = [26.1445, 92.8];

interface InteractiveGisMapProps {
  locations: RiskLocation[];
  selectedLocationId: string;
  onSelectLocation: (location: RiskLocation) => void;
  isAuthorityMode?: boolean;
  heightClass?: string;
}

// Map Controller for smooth fly-to animations
function MapCameraController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom ?? map.getZoom(), { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

// Generate high-resolution SVG div icons for clean rendering without broken PNG assets
function createPulsingStationIcon(color: string, label: string) {
  return L.divIcon({
    className: 'custom-gis-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
        <span style="position: absolute; width: 24px; height: 24px; border-radius: 9999px; background-color: ${color}; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <span style="position: relative; display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 9999px; background-color: ${color}; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">
        </span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function createShelterIcon() {
  return L.divIcon({
    className: 'custom-shelter-marker',
    html: `
      <div style="background-color: #0284c7; color: white; width: 24px; height: 24px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 11px; font-weight: 900;">
        H
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function createHistoricalSlideIcon() {
  return L.divIcon({
    className: 'custom-history-marker',
    html: `
      <div style="background-color: #475569; color: #f8fafc; width: 22px; height: 22px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; border: 2px solid #cbd5e1; box-shadow: 0 2px 5px rgba(0,0,0,0.35); font-size: 10px; font-weight: 800;">
        ▲
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

function createIncidentReportIcon(severity: string) {
  const bg = severity === 'critical' ? '#e11d48' : severity === 'moderate' ? '#d97706' : '#2563eb';
  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="background-color: ${bg}; color: white; width: 20px; height: 20px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4); font-size: 9px; font-weight: 900;">
        !
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

export default function InteractiveGisMap({
  locations,
  selectedLocationId,
  onSelectLocation,
  isAuthorityMode = false,
  heightClass = 'h-[500px] sm:h-[620px]',
}: InteractiveGisMapProps) {
  const { reports } = useApp();

  // 9 Scientific Map Layers Toggle States
  const [layers, setLayers] = useState({
    iotStations: true, // Layer 1
    rainfall: true, // Layer 2
    soilMoisture: true, // Layer 3
    slopeGradient: isAuthorityMode, // Layer 4
    porePressure: isAuthorityMode, // Layer 5
    groundDisplacement: isAuthorityMode, // Layer 6
    tectonicFaults: true, // Layer 7
    historicalLandslides: true, // Layer 8
    insarDeformation: isAuthorityMode, // Layer 9
    safeShelters: true, // Emergency Shelters
    citizenReports: true, // Public Ground Truth
  });

  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [faultLines, setFaultLines] = useState<FaultLine[]>([]);
  const [historicalLandslides, setHistoricalLandslides] = useState<HistoricalLandslide[]>([]);

  // Fetch vector fault lines and GSI historical landslides from API
  useEffect(() => {
    fetchMapLayers()
      .then((data) => {
        if (Array.isArray(data.fault_lines)) setFaultLines(data.fault_lines);
        if (Array.isArray(data.historical_landslides)) setHistoricalLandslides(data.historical_landslides);
      })
      .catch(() => {
        // Fallback default faults if offline
        setFaultLines([
          {
            name: 'Dauki Fault Line (Shillong Plateau Southern Boundary)',
            type: 'Reverse / Strike-Slip Active Fault',
            hazard_rating: 'Zone V',
            coordinates: [
              [25.18, 90.1],
              [25.2, 91.2],
              [25.19, 91.75],
              [25.15, 92.5],
              [25.05, 93.3],
            ],
          },
          {
            name: 'Kopili Fault Zone (Assam-Meghalaya Micro-Seismic Belt)',
            type: 'NW-SE Transcurrent Active Fault',
            hazard_rating: 'Zone V',
            coordinates: [
              [25.4, 92.6],
              [25.95, 92.9],
              [26.45, 93.2],
              [26.9, 93.45],
            ],
          },
          {
            name: 'Main Boundary Thrust (MBT) - Sub-Himalayan Front',
            type: 'Compressional Megathrust Wedge',
            hazard_rating: 'Zone V',
            coordinates: [
              [27.05, 88.5],
              [27.15, 90.2],
              [27.1, 92.3],
              [27.35, 94.1],
              [27.95, 96.0],
            ],
          },
        ]);
      });
  }, []);

  const selectedLoc = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? locations[0],
    [locations, selectedLocationId]
  );

  const toggleLayer = (layerKey: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const applyPreset = (preset: 'all' | 'citizen' | 'geotech') => {
    if (preset === 'all') {
      setLayers({
        iotStations: true,
        rainfall: true,
        soilMoisture: true,
        slopeGradient: true,
        porePressure: true,
        groundDisplacement: true,
        tectonicFaults: true,
        historicalLandslides: true,
        insarDeformation: true,
        safeShelters: true,
        citizenReports: true,
      });
    } else if (preset === 'citizen') {
      setLayers({
        iotStations: true,
        rainfall: true,
        soilMoisture: false,
        slopeGradient: false,
        porePressure: false,
        groundDisplacement: false,
        tectonicFaults: false,
        historicalLandslides: true,
        insarDeformation: false,
        safeShelters: true,
        citizenReports: true,
      });
    } else if (preset === 'geotech') {
      setLayers({
        iotStations: true,
        rainfall: true,
        soilMoisture: true,
        slopeGradient: true,
        porePressure: true,
        groundDisplacement: true,
        tectonicFaults: true,
        historicalLandslides: true,
        insarDeformation: true,
        safeShelters: false,
        citizenReports: false,
      });
    }
  };

  const selectedCenter: [number, number] = selectedLoc
    ? [selectedLoc.latitude, selectedLoc.longitude]
    : NORTHEAST_CENTER;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 bg-white shadow-xl">
      {/* Map Control Bar Overlay (Top Floating Header) */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Active Station Badge */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-2 shadow-lg border border-slate-700">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-black tracking-wide">
            {selectedLoc ? `${selectedLoc.name}, ${selectedLoc.state}` : 'Northeast Regional EWS'}
          </span>
          {selectedLoc && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                selectedLoc.risk_analysis.risk_level === 'CRITICAL'
                  ? 'bg-rose-500 text-white'
                  : selectedLoc.risk_analysis.risk_level === 'WARNING'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              FoS {(selectedLoc.geotechnical?.factor_of_safety ?? 1.35).toFixed(2)} • {selectedLoc.risk_analysis.risk_level}
            </span>
          )}
        </div>

        {/* Layer Controls Dropdown Trigger */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLayerPanelOpen((v) => !v)}
            className="flex items-center gap-2 rounded-2xl bg-white/95 text-slate-900 hover:bg-white backdrop-blur-md px-3.5 py-2 text-xs font-bold shadow-lg border border-slate-200 active:scale-95 transition-all"
          >
            <Layers className="h-4 w-4 text-blue-600" />
            <span>GIS Data Layers</span>
            <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold px-1.5 py-0.2">
              {Object.values(layers).filter(Boolean).length}/11
            </span>
          </button>
        </div>
      </div>

      {/* Floating 9-Layer Control Palette */}
      {layerPanelOpen && (
        <div className="absolute top-16 right-3 z-[1001] w-72 sm:w-80 rounded-3xl bg-slate-900/95 text-white backdrop-blur-md p-4 shadow-2xl border border-slate-700 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-bold tracking-wider uppercase text-slate-200">
                Scientific GIS Overlays
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLayerPanelOpen(false)}
              className="text-[11px] text-slate-400 hover:text-white font-bold"
            >
              Close
            </button>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 py-1 px-1.5 border border-blue-500/40 text-center"
            >
              All 9 Layers
            </button>
            <button
              type="button"
              onClick={() => applyPreset('citizen')}
              className="rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 py-1 px-1.5 border border-emerald-500/40 text-center"
            >
              Citizen Safe
            </button>
            <button
              type="button"
              onClick={() => applyPreset('geotech')}
              className="rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 py-1 px-1.5 border border-purple-500/40 text-center"
            >
              Geotech Lab
            </button>
          </div>

          {/* 9 Scientific Layers Toggle List */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 text-xs">
            <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <Radio className="h-3.5 w-3.5 text-blue-400" />
                <span>1. IoT Sensor Stations</span>
              </span>
              <input
                type="checkbox"
                checked={layers.iotStations}
                onChange={() => toggleLayer('iotStations')}
                className="rounded accent-blue-600"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <CloudRain className="h-3.5 w-3.5 text-cyan-400" />
                <span>2. Rainfall Intensity (1h/24h)</span>
              </span>
              <input
                type="checkbox"
                checked={layers.rainfall}
                onChange={() => toggleLayer('rainfall')}
                className="rounded accent-cyan-600"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <Droplets className="h-3.5 w-3.5 text-teal-400" />
                <span>3. Soil Moisture & Saturation</span>
              </span>
              <input
                type="checkbox"
                checked={layers.soilMoisture}
                onChange={() => toggleLayer('soilMoisture')}
                className="rounded accent-teal-600"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <Mountain className="h-3.5 w-3.5 text-amber-400" />
                <span>4. LiDAR Slope Gradient (°)</span>
              </span>
              <input
                type="checkbox"
                checked={layers.slopeGradient}
                onChange={() => toggleLayer('slopeGradient')}
                className="rounded accent-amber-600"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <Gauge className="h-3.5 w-3.5 text-indigo-400" />
                <span>5. Pore-Water Pressure ($u$ kPa)</span>
              </span>
              <input
                type="checkbox"
                checked={layers.porePressure}
                onChange={() => toggleLayer('porePressure')}
                className="rounded accent-indigo-600"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <Activity className="h-3.5 w-3.5 text-rose-400" />
                <span>6. Ground Velocity (mm/day)</span>
              </span>
              <input
                type="checkbox"
                checked={layers.groundDisplacement}
                onChange={() => toggleLayer('groundDisplacement')}
                className="rounded accent-rose-600"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <Compass className="h-3.5 w-3.5 text-red-500" />
                <span>7. Tectonic Faults & Tremors</span>
              </span>
              <input
                type="checkbox"
                checked={layers.tectonicFaults}
                onChange={() => toggleLayer('tectonicFaults')}
                className="rounded accent-red-600"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <History className="h-3.5 w-3.5 text-slate-300" />
                <span>8. GSI Historical Landslides</span>
              </span>
              <input
                type="checkbox"
                checked={layers.historicalLandslides}
                onChange={() => toggleLayer('historicalLandslides')}
                className="rounded accent-slate-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <Satellite className="h-3.5 w-3.5 text-violet-400" />
                <span>9. InSAR Satellite LOS Velocity</span>
              </span>
              <input
                type="checkbox"
                checked={layers.insarDeformation}
                onChange={() => toggleLayer('insarDeformation')}
                className="rounded accent-violet-600"
              />
            </label>

            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 cursor-pointer">
                <span className="flex items-center gap-2 text-sky-300 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                  <span>Safe Relief Shelters</span>
                </span>
                <input
                  type="checkbox"
                  checked={layers.safeShelters}
                  onChange={() => toggleLayer('safeShelters')}
                  className="rounded accent-sky-500"
                />
              </label>

              <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 cursor-pointer">
                <span className="flex items-center gap-2 text-amber-300 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span>Citizen Field Reports</span>
                </span>
                <input
                  type="checkbox"
                  checked={layers.citizenReports}
                  onChange={() => toggleLayer('citizenReports')}
                  className="rounded accent-amber-500"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Leaflet Map Container */}
      <div className={`w-full ${heightClass}`}>
        <MapContainer
          center={NORTHEAST_CENTER}
          zoom={7}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <MapCameraController center={selectedCenter} />

          {/* CartoDB Positron / OSM Base Map */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* LAYER 7: Tectonic Fault Lines & Thrust Zones */}
          {layers.tectonicFaults &&
            faultLines.map((fault, idx) => (
              <Polyline
                key={`fault-${idx}`}
                positions={fault.coordinates}
                pathOptions={{
                  color: '#dc2626',
                  weight: 3.5,
                  dashArray: '8, 6',
                  opacity: 0.85,
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1">
                    <span className="text-[10px] font-black uppercase text-red-600 tracking-wider">
                      Seismic Fault Line (Zone V)
                    </span>
                    <p className="text-xs font-bold text-slate-900">{fault.name}</p>
                    <p className="text-[11px] text-slate-600">{fault.type}</p>
                    <p className="text-[10px] font-mono text-red-700">
                      Hazard Rating: {fault.hazard_rating}
                    </p>
                  </div>
                </Popup>
              </Polyline>
            ))}

          {/* LAYER 8: GSI Historical Landslide Inventory */}
          {layers.historicalLandslides &&
            historicalLandslides.map((slide) => (
              <Marker
                key={slide.id}
                position={[slide.latitude, slide.longitude]}
                icon={createHistoricalSlideIcon()}
              >
                <Popup>
                  <div className="p-1.5 space-y-1 max-w-xs">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      GSI Historical Landslide Scar
                    </span>
                    <p className="text-xs font-bold text-slate-900">{slide.name} ({slide.year})</p>
                    <p className="text-[11px] text-slate-700 font-medium">
                      Failure Mode: {slide.failure_mode}
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-mono bg-slate-100 p-1.5 rounded-lg text-slate-800">
                      <div>Trigger: {slide.rainfall_trigger_mm} mm</div>
                      <div>Volume: {slide.volume_m3.toLocaleString()} m³</div>
                    </div>
                    <p className="text-[10px] text-slate-400">{slide.source}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* EMERGENCY SHELTERS LAYER */}
          {layers.safeShelters &&
            OFFLINE_SAFE_SHELTERS.map((shelter) => (
              <Marker
                key={shelter.id}
                position={[shelter.latitude, shelter.longitude]}
                icon={createShelterIcon()}
              >
                <Popup>
                  <div className="p-1.5 space-y-1 max-w-xs">
                    <span className="text-[10px] font-black uppercase text-sky-600 tracking-wider">
                      High-Ground Emergency Shelter
                    </span>
                    <p className="text-xs font-bold text-slate-900">{shelter.name}</p>
                    <p className="text-[11px] text-slate-600">
                      {shelter.district}, {shelter.state} (Elevation: {shelter.elevation_m}m)
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-semibold bg-sky-50 text-sky-900 p-1.5 rounded-lg border border-sky-200">
                      <span>Capacity: {shelter.capacity_persons.toLocaleString()} persons</span>
                      <span>{shelter.type}</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-700">
                      Helpline: {shelter.contact_helpline}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* CITIZEN INCIDENT REPORTS LAYER */}
          {layers.citizenReports &&
            reports
              .filter((r) => r.latitude && r.longitude)
              .map((rep) => (
                <Marker
                  key={rep.id}
                  position={[rep.latitude!, rep.longitude!]}
                  icon={createIncidentReportIcon(rep.severity ?? 'moderate')}
                >
                  <Popup>
                    <div className="p-1.5 space-y-1 max-w-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">
                          Citizen Field Report
                        </span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {rep.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">{rep.location}</p>
                      {rep.landmark_description && (
                        <p className="text-[11px] text-amber-900 bg-amber-50 p-1 rounded font-medium">
                          Landmark: {rep.landmark_description}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-600">{rep.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>Reporter Trust: {Math.round(rep.reporter_trust_score ?? 50)}%</span>
                        {rep.points_awarded ? (
                          <span className="text-emerald-600 font-bold">+{rep.points_awarded} pts</span>
                        ) : null}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

          {/* LAYERS 1-6 & 9: 54 Northeast IoT Stations & Geotech Overlays */}
          {locations.map((loc) => {
            const isSelected = loc.id === selectedLocationId;
            const score = loc.risk_analysis?.overall_risk_score ?? 35;
            const riskLevel = loc.risk_analysis?.risk_level ?? 'STABLE';
            const color =
              riskLevel === 'CRITICAL' || score > 70
                ? '#e11d48'
                : riskLevel === 'WARNING' || score > 40
                ? '#d97706'
                : '#10b981';

            const rainfallMm = loc.metrics?.live_rainfall_mm ?? 1.2;
            const moisturePct = loc.metrics?.soil_moisture_pct ?? 45.0;
            const porePressure = loc.geotechnical?.pore_pressure_u_kpa ?? 18.5;
            const groundDisplacement = loc.metrics?.ground_displacement_mm ?? 0.8;
            const slopeAngle = loc.geotechnical?.slope_angle_deg ?? 28.0;

            return (
              <div key={loc.id}>
                {/* LAYER 1: Core IoT Hazard Radius Circle */}
                {layers.iotStations && (
                  <Circle
                    center={[loc.latitude, loc.longitude]}
                    radius={riskLevel === 'CRITICAL' ? 1400 : riskLevel === 'WARNING' ? 950 : 600}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: isSelected ? 0.45 : 0.2,
                      weight: isSelected ? 3.5 : 1.5,
                    }}
                    eventHandlers={{
                      click: () => onSelectLocation(loc),
                    }}
                  />
                )}

                {/* LAYER 2: Rainfall Trigger Isohyet Ring */}
                {layers.rainfall && rainfallMm > 5 && (
                  <Circle
                    center={[loc.latitude, loc.longitude]}
                    radius={Math.min(2500, rainfallMm * 40)}
                    pathOptions={{
                      color: '#06b6d4',
                      fillColor: '#06b6d4',
                      fillOpacity: 0.12,
                      weight: 1,
                      dashArray: '4, 4',
                    }}
                  />
                )}

                {/* LAYER 3: Soil Moisture Saturation Ring */}
                {layers.soilMoisture && moisturePct > 65 && (
                  <Circle
                    center={[loc.latitude, loc.longitude]}
                    radius={Math.min(2000, moisturePct * 25)}
                    pathOptions={{
                      color: '#14b8a6',
                      fillColor: '#14b8a6',
                      fillOpacity: 0.15,
                      weight: 1,
                    }}
                  />
                )}

                {/* LAYER 5: Pore-Water Pressure Hazard Ring */}
                {layers.porePressure && porePressure > 35 && (
                  <Circle
                    center={[loc.latitude, loc.longitude]}
                    radius={porePressure * 25}
                    pathOptions={{
                      color: '#6366f1',
                      fillColor: '#6366f1',
                      fillOpacity: 0.18,
                      weight: 1.5,
                      dashArray: '3, 5',
                    }}
                  />
                )}

                {/* Station Marker */}
                <Marker
                  position={[loc.latitude, loc.longitude]}
                  icon={createPulsingStationIcon(color, loc.name)}
                  eventHandlers={{
                    click: () => onSelectLocation(loc),
                  }}
                >
                  <Popup>
                    <div className="p-1 space-y-2 min-w-[220px]">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div>
                          <p className="font-extrabold text-xs text-slate-900">{loc.name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{loc.state} Sector</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white ${
                            riskLevel === 'CRITICAL'
                              ? 'bg-rose-600'
                              : riskLevel === 'WARNING'
                              ? 'bg-amber-600'
                              : 'bg-emerald-600'
                          }`}
                        >
                          {riskLevel}
                        </span>
                      </div>

                      {/* FoS Gauge & Risk Score */}
                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-xs">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Risk Score</p>
                          <p className="text-base font-black text-slate-800">{Math.round(score)}/100</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Factor of Safety</p>
                          <p
                            className={`text-base font-black ${
                              (loc.geotechnical?.factor_of_safety ?? 1.35) < 1.1
                                ? 'text-rose-600'
                                : (loc.geotechnical?.factor_of_safety ?? 1.35) < 1.3
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {(loc.geotechnical?.factor_of_safety ?? 1.35).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* 9-Layer Mini Telemetry Grid */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-700 bg-slate-50 p-2 rounded-xl">
                        <div>
                          <span className="text-slate-400">Rainfall:</span>{' '}
                          <strong>{rainfallMm.toFixed(1)} mm</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Moisture:</span>{' '}
                          <strong>{moisturePct.toFixed(0)}%</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Pore Press $u$:</span>{' '}
                          <strong>{porePressure.toFixed(1)} kPa</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Displacement:</span>{' '}
                          <strong>{groundDisplacement.toFixed(1)} mm</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Slope:</span>{' '}
                          <strong>{slopeAngle.toFixed(0)}°</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">InSAR LOS:</span>{' '}
                          <strong>
                            {loc.remote_sensing?.insar_velocity_los_mm_yr ?? -4.2} mm/yr{' '}
                            <span className="text-[10px] text-slate-400 font-normal">
                              {(loc.remote_sensing?.insar_velocity_los_mm_yr ?? -4.2) < 0 ? '(Subsidence)' : '(Uplift)'}
                            </span>
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectLocation(loc)}
                        className="w-full rounded-xl bg-blue-700 hover:bg-blue-800 py-1.5 text-[11px] font-bold text-white transition-all text-center"
                      >
                        Inspect Station Telemetry
                      </button>
                    </div>
                  </Popup>
                </Marker>
              </div>
            );
          })}
        </MapContainer>
      </div>

      {/* Synchronized Bottom Telemetry Strip (Directly Anchored Under Map) */}
      <div className="bg-slate-900 text-white p-3.5 sm:p-5 border-t border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Station Identifier & Civil Defense Directive */}
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
              <h3 className="text-sm font-bold text-white">
                {selectedLoc ? `${selectedLoc.name}, ${selectedLoc.state}` : 'Northeast Landslide Surveillance Corridor'}
              </h3>
              <span className="text-xs text-slate-400">
                (Lat: {selectedLoc?.latitude.toFixed(4)}°N, Lon: {selectedLoc?.longitude.toFixed(4)}°E)
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedLoc?.risk_analysis?.advisory ??
                'Continuous real-time multi-sensor telemetry active. No emergency sector evacuation currently mandated.'}
            </p>
          </div>

          {/* Synchronized Geotechnical Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            <div className="rounded-2xl bg-slate-800/90 p-2.5 border border-slate-700/80 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Rainfall (1h/24h)</span>
              <span className="text-sm font-black text-cyan-400">
                {(selectedLoc?.metrics?.live_rainfall_mm ?? 0).toFixed(1)} mm
              </span>
            </div>

            <div className="rounded-2xl bg-slate-800/90 p-2.5 border border-slate-700/80 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pore Water $u$</span>
              <span className="text-sm font-black text-indigo-400">
                {(selectedLoc?.geotechnical?.pore_pressure_u_kpa ?? 18.2).toFixed(1)} kPa
              </span>
            </div>

            <div className="rounded-2xl bg-slate-800/90 p-2.5 border border-slate-700/80 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Ground Creep</span>
              <span className="text-sm font-black text-rose-400">
                {(selectedLoc?.metrics?.ground_displacement_mm ?? 0.6).toFixed(1)} mm/d
              </span>
            </div>

            <div className="rounded-2xl bg-slate-800/90 p-2.5 border border-slate-700/80 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">InSAR LOS</span>
              <span className="text-sm font-black text-violet-400">
                {(selectedLoc?.remote_sensing?.insar_velocity_los_mm_yr ?? -3.8).toFixed(1)} mm/yr
              </span>
              <span className="text-[9px] text-slate-400 block font-semibold">
                {(selectedLoc?.remote_sensing?.insar_velocity_los_mm_yr ?? -3.8) < 0 ? '(Subsidence)' : '(Uplift)'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
