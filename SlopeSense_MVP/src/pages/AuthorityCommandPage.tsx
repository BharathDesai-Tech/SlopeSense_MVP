import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Activity,
  Layers,
  Camera,
  FileText,
  Send,
  CheckCircle2,
  AlertTriangle,
  X,
  Gauge,
  Mountain,
  Compass,
  Satellite,
  Lock,
  ArrowRight,
  ExternalLink,
  MapPin,
  Clock,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import InteractiveGisMap from '@/components/InteractiveGisMap';
import { fetchRegionalRisk, type RiskLocation } from '@/api';
import { defaultLocationId, northeastLocations } from '@/data/neLocations';
import { useApp } from '@/context/AppContext';

interface AuthorityCommandPageProps {
  onAuthClick: () => void;
}

const LIVE_HIGHWAY_CAMS = [
  {
    id: 'cam-ghy-01',
    name: 'NH-27 Kamakhya Foothills Cut',
    location: 'Guwahati, Assam',
    status: 'ONLINE',
    fps: 25,
    aiDetection: 'Tension Creep Warning (0.4 mm/hr)',
    riskLevel: 'CRITICAL',
    image: 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cam-shl-02',
    name: 'NH-6 Barapani Escarpment',
    location: 'Ri-Bhoi / Shillong, Meghalaya',
    status: 'ONLINE',
    fps: 30,
    aiDetection: 'Heavy Water Seepage Surcharge',
    riskLevel: 'WARNING',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'cam-skt-03',
    name: 'NH-10 Singtam-Teesta River Gorge',
    location: 'East Sikkim',
    status: 'ONLINE',
    fps: 24,
    aiDetection: 'Structural Scarp Joint Stable',
    riskLevel: 'STABLE',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
  },
];

export default function AuthorityCommandPage({ onAuthClick }: AuthorityCommandPageProps) {
  const { user, reports, updateReportStatus, isOnline } = useApp();
  const navigate = useNavigate();

  const [locations, setLocations] = useState<RiskLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState(defaultLocationId);
  const [triageFilter, setTriageFilter] = useState<'pending' | 'verified' | 'all'>('pending');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const isAuthorityUser =
    user?.role === 'responder' || user?.role === 'admin' || user?.organization != null;

  useEffect(() => {
    fetchRegionalRisk()
      .then((data) => setLocations(data))
      .catch(() => {
        const fallback = northeastLocations.map((loc) => ({
          ...loc,
          metrics: {
            live_rainfall_mm: 5.2,
            current_temperature_c: 24.5,
            soil_moisture_pct: 62.0,
            ground_displacement_mm: 1.4,
          },
          risk_analysis: {
            overall_risk_score: loc.severity === 'high' ? 78 : loc.severity === 'moderate' ? 52 : 25,
            risk_level: loc.severity === 'high' ? ('CRITICAL' as const) : loc.severity === 'moderate' ? ('WARNING' as const) : ('STABLE' as const),
            confidence: 0.92,
            advisory: 'Geotechnical shear stress nearing failure envelope.',
            explainability: { factors: [], normalised_total: 62, method: 'XGBoost + FoS' },
            shap_breakdown: {},
          },
        }));
        setLocations(fallback as unknown as RiskLocation[]);
      });
  }, []);

  const selectedLoc = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? locations[0],
    [locations, selectedLocationId]
  );

  const filteredReports = useMemo(() => {
    if (triageFilter === 'all') return reports;
    return reports.filter((r) => r.status === triageFilter);
  }, [reports, triageFilter]);

  // If user is not logged in as disaster responder, display secure clearance gate
  if (!isAuthorityUser) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in">
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-white shadow-2xl text-center space-y-6">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Lock className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Government Clearance Mandatory
            </span>
            <h1 className="text-2xl font-black text-white">Disaster Authority & NDRF Operations Desk</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              This terminal is strictly restricted to verified NDRF commanders, State Disaster Management Authorities (SDMA),
              and Geological Survey of India (GSI) geotechnical officers.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-left max-w-md mx-auto space-y-2 text-xs">
            <p className="font-bold text-slate-200">Demonstration Officer Credentials (SIH 2026):</p>
            <div className="font-mono text-[11px] text-slate-300 space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div>Email: <strong className="text-blue-400">commander@ndrf.gov.in</strong></div>
              <div>Password: <strong className="text-blue-400">ndrf2026</strong></div>
              <div>Clearance Code: <strong className="text-amber-400">NDRF-SECURE-2026</strong></div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onAuthClick}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-6 py-3 text-sm font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Sign In as Disaster Responder</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = locations.filter((l) => l.risk_analysis?.risk_level === 'CRITICAL').length;
  const warningCount = locations.filter((l) => l.risk_analysis?.risk_level === 'WARNING').length;
  const stableCount = locations.length - criticalCount - warningCount;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Command Center Top Bar */}
      <div className="rounded-3xl bg-slate-950 text-white p-5 sm:p-7 shadow-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                Official NDRF / SDMA Incident Command Room
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Northeast Regional Landslide Operations Room
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Logged in as: <strong className="text-white">{user?.name}</strong> •{' '}
              <strong className="text-amber-400">{user?.organization ?? 'NDRF 1st Battalion'}</strong> •{' '}
              Badge ID: <strong className="font-mono text-blue-400">{user?.badge_id ?? 'NDRF-OFFICER-01'}</strong>
            </p>
          </div>

          {/* Direct Link to Authority Geotech & XAI Lab */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/lab')}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-3 text-xs font-black shadow-lg shadow-purple-600/30 active:scale-95 transition-all"
            >
              <Sliders className="h-4 w-4" />
              <span>Launch Geotech & XAI Lab</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Real-time Sector Breakdown Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-2xl bg-rose-950/60 p-3 border border-rose-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-rose-400 block">Critical Evacuation</span>
              <span className="text-2xl font-black text-white">{criticalCount} Sectors</span>
            </div>
            <ShieldAlert className="h-6 w-6 text-rose-500" />
          </div>

          <div className="rounded-2xl bg-amber-950/60 p-3 border border-amber-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 block">Watch & Standby</span>
              <span className="text-2xl font-black text-white">{warningCount} Sectors</span>
            </div>
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>

          <div className="rounded-2xl bg-emerald-950/60 p-3 border border-emerald-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-400 block">Stable Slopes</span>
              <span className="text-2xl font-black text-white">{stableCount} Sectors</span>
            </div>
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
          </div>

          <div className="rounded-2xl bg-blue-950/60 p-3 border border-blue-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-400 block">Pending Triage</span>
              <span className="text-2xl font-black text-white">
                {reports.filter((r) => r.status === 'pending').length} Reports
              </span>
            </div>
            <FileText className="h-6 w-6 text-blue-400" />
          </div>
        </div>
      </div>

      {/* 2. Full 9-Layer GIS Operations Room Centerpiece */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-blue-600 animate-pulse" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Multi-Sensor GIS Tactical Operations Map
              </h2>
              <p className="text-xs text-slate-500">
                Full 9 scientific data layers: IoT Telemetry, Pore Pressure $u$, InSAR Velocity, Seismic Faults & Scarp Scars
              </p>
            </div>
          </div>
        </div>

        <InteractiveGisMap
          locations={locations}
          selectedLocationId={selectedLocationId}
          onSelectLocation={(loc) => setSelectedLocationId(loc.id)}
          isAuthorityMode={true}
          heightClass="h-[520px] sm:h-[640px]"
        />
      </section>

      {/* 3. Deep Telemetry Inspector & 9-Layer Geotechnical Analysis */}
      <section className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900">
                Geotechnical Telemetry Inspector: {selectedLoc?.name}, {selectedLoc?.state}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Correlated piezometric, LiDAR gradient, and Sentinel-1 InSAR measurements for early warning threshold validation
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lab')}
            className="flex items-center gap-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 px-3.5 py-1.5 text-xs font-bold transition-all border border-purple-200"
          >
            <span>Run 2D Failure Simulation</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {/* 9 Scientific Parameters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Rainfall (1h / 24h)</span>
            <span className="text-base font-black text-cyan-600">
              {(selectedLoc?.metrics?.live_rainfall_mm ?? 2.1).toFixed(1)} mm
            </span>
            <span className="text-[10px] text-slate-500 block">AWS Gauge</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pore Water $u$</span>
            <span className="text-base font-black text-indigo-600">
              {(selectedLoc?.geotechnical?.pore_pressure_u_kpa ?? 22.4).toFixed(1)} kPa
            </span>
            <span className="text-[10px] text-slate-500 block">VW Piezometer</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Slope Angle</span>
            <span className="text-base font-black text-amber-600">
              {(selectedLoc?.geotechnical?.slope_angle_deg ?? 34).toFixed(0)}°
            </span>
            <span className="text-[10px] text-slate-500 block">LiDAR DEM</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Ground Creep</span>
            <span className="text-base font-black text-rose-600">
              {(selectedLoc?.metrics?.ground_displacement_mm ?? 1.2).toFixed(1)} mm/d
            </span>
            <span className="text-[10px] text-slate-500 block">Inclinometer</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">InSAR LOS</span>
            <span className="text-base font-black text-violet-600">
              {(selectedLoc?.remote_sensing?.insar_velocity_los_mm_yr ?? -4.5).toFixed(1)} mm/yr
            </span>
            <span className="text-[10px] text-slate-500 block">Sentinel-1 SAR</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Factor of Safety</span>
            <span
              className={`text-base font-black ${
                (selectedLoc?.geotechnical?.factor_of_safety ?? 1.35) < 1.1
                  ? 'text-rose-600'
                  : 'text-emerald-600'
              }`}
            >
              {(selectedLoc?.geotechnical?.factor_of_safety ?? 1.35).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 block">Mohr-Coulomb</span>
          </div>
        </div>
      </section>

      {/* 4. Corroborating Live CCTV / Highway Drone Feeds */}
      <section className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Corroborating Highway CCTV & Drone Feeds</h3>
              <p className="text-xs text-slate-500">Optical flow edge detection on vulnerable road cuts</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            3 Feeds Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LIVE_HIGHWAY_CAMS.map((cam) => (
            <div key={cam.id} className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 text-white space-y-2">
              <div className="relative h-44 overflow-hidden">
                <img src={cam.image} alt={cam.name} className="w-full h-full object-cover opacity-85" />
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{cam.status} • {cam.fps} FPS</span>
                </div>
                <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-md p-2 rounded-xl text-[10px] text-slate-200 border border-white/10">
                  <span className="text-amber-400 font-bold">AI Detection:</span> {cam.aiDetection}
                </div>
              </div>
              <div className="p-3">
                <h4 className="text-xs font-bold text-white">{cam.name}</h4>
                <p className="text-[10px] text-slate-400">{cam.location}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Incident Triage Desk with Citizen Trust & Points Awarding */}
      <section className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Incident Triage Desk & Citizen Point Awarding
              </h3>
              <p className="text-xs text-slate-500">
                Validate public hazard reports. Verifying a report automatically awards the citizen +25 Sentinel Points.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold">
            {(['pending', 'verified', 'all'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTriageFilter(filter)}
                className={`px-3 py-1 rounded-xl transition-all ${
                  triageFilter === filter
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.toUpperCase()} ({reports.filter((r) => filter === 'all' || r.status === filter).length})
              </button>
            ))}
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-semibold">
            No incident reports in the '{triageFilter}' queue.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl bg-slate-50/90 p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 capitalize">
                      {report.type.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        report.status === 'verified'
                          ? 'bg-blue-100 text-blue-700'
                          : report.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {report.status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Reporter Trust: <strong>{Math.round(report.reporter_trust_score ?? 50)}%</strong>
                    </span>
                  </div>

                  <p className="text-xs text-slate-700">{report.description}</p>

                  {/* Official NDRF Triage Note */}
                  {report.admin_notes && (
                    <div className="flex items-start gap-2 bg-blue-50/90 border border-blue-200/80 rounded-xl p-2.5 text-xs text-blue-950 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[10px] text-blue-700 uppercase tracking-wider block">
                          NDRF Triage Note:
                        </span>
                        <span>{report.admin_notes}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-mono text-slate-600">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {report.location}
                    </span>
                    {report.landmark_description && (
                      <span className="bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded-md font-semibold">
                        Landmark: {report.landmark_description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Duty Officer Action Triggers */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {report.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(report.photoUrl!)}
                      className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-xl"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Inspect Photo</span>
                    </button>
                  )}

                  {report.status !== 'verified' && (
                    <button
                      type="button"
                      onClick={() =>
                        updateReportStatus(
                          report.id,
                          'verified',
                          'Verified by Regional NDRF Command. Hazard mapped; telemetry updated.'
                        )
                      }
                      className="flex items-center gap-1 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-xl shadow active:scale-95 transition-all"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Verify & Award +25 Pts</span>
                    </button>
                  )}

                  {report.status !== 'investigating' && (
                    <button
                      type="button"
                      onClick={() =>
                        updateReportStatus(
                          report.id,
                          'investigating',
                          'NDRF Battalion Quick Response Team deployed to sector.'
                        )
                      }
                      className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Dispatch Team</span>
                    </button>
                  )}

                  {report.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() =>
                        updateReportStatus(
                          report.id,
                          'rejected',
                          'Field review concluded harmless superficial road wear. False alarm recorded.'
                        )
                      }
                      className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject (-10 Pts)</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Photo Zoom Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Geotechnical Photo Evidence</span>
              <button onClick={() => setSelectedPhoto(null)} className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <img src={selectedPhoto} alt="Zoomed Inspection" className="w-full max-h-[70vh] object-contain bg-slate-950" />
          </div>
        </div>
      )}
    </div>
  );
}
