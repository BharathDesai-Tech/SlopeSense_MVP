import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  MapPin,
  AlertTriangle,
  Siren,
  Volume2,
  Droplets,
  CloudRain,
  PhoneCall,
  Search,
  ExternalLink,
  Award,
  Sparkles,
  WifiOff,
  Navigation,
  CheckCircle2,
  ArrowRight,
  Printer,
} from 'lucide-react';
import InteractiveGisMap from '@/components/InteractiveGisMap';
import { fetchRegionalRisk, type RiskLocation } from '@/api';
import { defaultLocationId, northeastLocations } from '@/data/neLocations';
import { useApp } from '@/context/AppContext';
import { OFFLINE_SAFE_SHELTERS } from '@/services/offlineEmergency';
import type { ReportType, Lang } from '@/types';

interface CitizenPortalPageProps {
  onReportClick: (type?: ReportType) => void;
  onAuthClick: () => void;
}

const MULTILINGUAL_DIRECTIVES: Record<Lang, { label: string; text: string; audioMsg: string }> = {
  en: {
    label: 'English',
    text: 'NDMA Advisory: Saturated slope conditions along mountain highways. Residents in vulnerable escarpment sectors should prepare for relocation to designated high-ground community shelters.',
    audioMsg: 'High landslide risk alert. Slope saturation exceeds safety thresholds. Please move to high-ground relief centers.',
  },
  hi: {
    label: 'हिन्दी (Hindi)',
    text: 'एनडीएमए सलाह: पर्वतीय राजमार्गों पर मिट्टी में अत्यधिक पानी जमा होने से भूस्खलन का खतरा। ढलान पर बसे नागरिक तुरंत सुरक्षित राहत शिविरों की ओर प्रस्थान करें।',
    audioMsg: 'भूस्खलन की चेतावनी। कृपया तुरंत ऊंचे सुरक्षित राहत शिविरों की ओर जाएं।',
  },
  as: {
    label: 'অসমীয়া (Assamese)',
    text: 'এনডিএমএৰ সতৰ্কবাণী: পাহাৰীয়া ঘাইপথত ভূমিস্খলনৰ গভীৰ আশংকা। বিপদজনক অঞ্চলত থকা লোকসকলক নিকটৱৰ্তী নিৰাপদ আশ্ৰয়স্থললৈ যাবলৈ অনুৰোধ জনোৱা হ’ল।',
    audioMsg: 'ভূমিস্খলনৰ সতৰ্কবাণী। অনুগ্ৰহ কৰি ততাতৈয়াকৈ নিৰাপদ আশ্ৰয় শিবিৰলৈ যাওক।',
  },
};

function getCitizenRank(points: number): { title: string; badgeColor: string; icon: string } {
  if (points >= 300) return { title: 'Chief Volunteer Sentinel', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300', icon: '⭐' };
  if (points >= 150) return { title: 'Trusted Slope Sentinel', badgeColor: 'bg-purple-100 text-purple-900 border-purple-300', icon: '🛡️' };
  if (points >= 50) return { title: 'Verified Field Scout', badgeColor: 'bg-blue-100 text-blue-900 border-blue-300', icon: '🔍' };
  return { title: 'Novice Community Observer', badgeColor: 'bg-slate-100 text-slate-800 border-slate-300', icon: '🌱' };
}

export default function CitizenPortalPage({ onReportClick, onAuthClick }: CitizenPortalPageProps) {
  const { user, isOnline, isSirenActive, toggleSiren, triggerVoiceAlert } = useApp();
  const [locations, setLocations] = useState<RiskLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState(defaultLocationId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>('en');
  const [selectedShelterFilter, setSelectedShelterFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [autoAlarmedId, setAutoAlarmedId] = useState<string | null>(null);
  const [locateStatus, setLocateStatus] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  // Auto-detect nearest monitoring station using browser geolocation (100% free)
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocateStatus('Geolocation not supported by your browser.');
      setTimeout(() => setLocateStatus(null), 4000);
      return;
    }

    setLocateStatus('Pinpointing nearest station...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;

        if (!locations || locations.length === 0) return;

        let closestLoc = locations[0];
        let minDistanceKm = Infinity;

        for (const loc of locations) {
          const dLat = ((loc.latitude - userLat) * Math.PI) / 180;
          const dLon = ((loc.longitude - userLon) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((userLat * Math.PI) / 180) *
              Math.cos((loc.latitude * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const d = 6371 * c;

          if (d < minDistanceKm) {
            minDistanceKm = d;
            closestLoc = loc;
          }
        }

        if (closestLoc) {
          setSelectedLocationId(closestLoc.id);
          const distStr = minDistanceKm < 50 ? `${minDistanceKm.toFixed(1)} km away` : `${Math.round(minDistanceKm)} km away`;
          setLocateStatus(`Nearest station: ${closestLoc.name} (${distStr})`);
          setTimeout(() => setLocateStatus(null), 5000);
        }
      },
      () => {
        setLocateStatus('GPS permission unavailable. Defaulting to Guwahati.');
        setTimeout(() => setLocateStatus(null), 4000);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [locations]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch real-time regional risk feed
  useEffect(() => {
    fetchRegionalRisk()
      .then((data) => {
        setLocations(data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback simulated objects
        const fallback = northeastLocations.map((loc) => ({
          ...loc,
          metrics: {
            live_rainfall_mm: 4.5,
            current_temperature_c: 24.2,
            soil_moisture_pct: 54.0,
            ground_displacement_mm: 0.8,
          },
          risk_analysis: {
            overall_risk_score: loc.severity === 'high' ? 76 : loc.severity === 'moderate' ? 48 : 22,
            risk_level: loc.severity === 'high' ? ('CRITICAL' as const) : loc.severity === 'moderate' ? ('WARNING' as const) : ('STABLE' as const),
            confidence: 0.88,
            advisory: 'Standard monsoon surveillance active.',
            explainability: { factors: [], normalised_total: 45, method: 'Hydrological proxy' },
            shap_breakdown: {},
          },
        }));
        setLocations(fallback as unknown as RiskLocation[]);
        setLoading(false);
      });
  }, []);

  const selectedLoc = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? locations[0],
    [locations, selectedLocationId]
  );

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return locations.filter((l) =>
      `${l.name} ${l.state}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locations, searchQuery]);

  const userRank = getCitizenRank(user?.reputation_points ?? 10);

  const filteredShelters = useMemo(() => {
    if (selectedShelterFilter === 'All') return OFFLINE_SAFE_SHELTERS;
    return OFFLINE_SAFE_SHELTERS.filter((s) => s.state.toLowerCase().includes(selectedShelterFilter.toLowerCase()));
  }, [selectedShelterFilter]);

  const riskScore = Math.round(selectedLoc?.risk_analysis?.overall_risk_score ?? 35);

  // Automatic Audio Alarm: Automatically synthesized vocal alarm when risk reaches or exceeds 90%
  useEffect(() => {
    if (!selectedLoc?.id) return;
    const currentScore = Math.round(selectedLoc.risk_analysis?.overall_risk_score ?? 0);
    if (currentScore >= 90 && autoAlarmedId !== selectedLoc.id) {
      setAutoAlarmedId(selectedLoc.id);
      const directive =
        activeLang === 'hi'
          ? `चेतावनी! ${selectedLoc.name} में भूस्खलन का ख़तरा ${currentScore} प्रतिशत पहुँच चुका है। कृपया तुरंत सुरक्षित राहत शिविरों की ओर जाएँ।`
          : activeLang === 'as'
          ? `চৰম সতৰ্কবাণী! ${selectedLoc.name}ত ভূমিস্খলনৰ আশংকা ${currentScore} শতাংশ হৈছে। অনুগ্ৰহ কৰি ততাতৈয়াকৈ নিৰাপদ আশ্ৰয় শিবিৰলৈ যাওক।`
          : `EMERGENCY EVACUATION WARNING. Landslide risk in ${selectedLoc.name} is ${currentScore} percent. Immediate relocation to safe high-ground relief centers is mandated.`;

      triggerVoiceAlert(activeLang, directive);
    }
  }, [selectedLoc, activeLang, autoAlarmedId, triggerVoiceAlert]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header Banner & Quick Actions */}
      <div className="rounded-3xl bg-slate-900 text-white p-5 sm:p-7 shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Official SIH 2026 Community Warning Node
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              SlopeSense Citizen Safety Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time crowdsourced early landslide detection and evacuation network across Northeast India.
              Color-coded GIS hazard tracking synchronized with live IoT weather telemetry.
            </p>
          </div>

          {/* Quick Action Button Group */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onReportClick('ground_cracks')}
              className="flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Report Hazard Incident</span>
            </button>

            <button
              type="button"
              onClick={toggleSiren}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-md ${
                isSirenActive
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
            >
              <Siren className="h-4 w-4 text-amber-400" />
              <span>{isSirenActive ? 'Silence Siren' : 'Test Acoustic Siren'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-md"
              title="Print or save official Evacuation Action Plan to PDF"
            >
              <Printer className="h-4 w-4 text-blue-400" />
              <span>Export Evacuation Sheet</span>
            </button>
          </div>
        </div>

        {/* 2. Citizen Trust Profile & Points Card */}
        <div className="rounded-2xl bg-slate-800/90 p-4 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30 text-xl font-bold">
              {userRank.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {user ? user.name : 'Guest Community Scout'}
                </span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${userRank.badgeColor}`}>
                  {userRank.title}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Reporter Trust Rating:{' '}
                <strong className="text-emerald-400">{Math.round(user?.trust_score ?? 50)}%</strong> •{' '}
                Reputation Points: <strong className="text-amber-400">{user?.reputation_points ?? 10} pts</strong> •{' '}
                Verified Reports: <strong className="text-blue-400">{user?.verified_reports_count ?? 0}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {user ? (
              <div className="text-[11px] text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700">
                Earn <strong className="text-emerald-400">+20 pts</strong> on verification (<strong className="text-amber-300">+5 photo bonus</strong>)!
              </div>
            ) : (
              <button
                type="button"
                onClick={onAuthClick}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-bold shadow active:scale-95 transition-all"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Sign In to Track Points</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. PRIMARY VISUAL CENTERPIECE: The Colour-Coded GIS Hazard Map */}
      <section className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Northeast GIS Hazard Surveillance Centerpiece
              </h2>
              <p className="text-xs text-slate-500">
                Live color-coded risk sectors, high-ground shelters, historical slide zones, and crowdsourced reports
              </p>
            </div>
          </div>

          {/* Quick Search Dropdown with Outside Click Dismiss & GPS Locate Me */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleLocateMe}
              title="Auto-detect nearest Northeast monitoring station using GPS"
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 text-xs font-bold transition-all shrink-0 active:scale-95 shadow-sm"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Locate Me</span>
            </button>

            {locateStatus && (
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded-xl animate-fade-in shrink-0">
                {locateStatus}
              </span>
            )}

            <div ref={searchRef} className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsSearchOpen(false);
                }}
                placeholder="Search 54 Northeast sectors..."
                className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              {isSearchOpen && filteredLocations.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[1050] mt-1 max-h-48 overflow-y-auto rounded-xl bg-white p-1 shadow-2xl border border-slate-200">
                {filteredLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocationId(loc.id);
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-blue-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>{loc.name}, {loc.state}</span>
                    <span className="font-bold text-[10px] uppercase text-slate-500">{loc.severity}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Flagship GIS Component */}
        <InteractiveGisMap
          locations={locations}
          selectedLocationId={selectedLocationId}
          onSelectLocation={(loc) => setSelectedLocationId(loc.id)}
          isAuthorityMode={false}
          heightClass="h-[460px] sm:h-[580px]"
        />
      </section>

      {/* 90%+ Critical Landslide Risk Acoustic & Vocal Alarm Banner */}
      {riskScore >= 90 && (
        <div className="rounded-3xl bg-rose-600 text-white p-4 sm:p-5 shadow-2xl border-2 border-rose-400 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-900/80 border border-rose-400 text-white">
              <Siren className="h-6 w-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-400 text-white">
                  CRITICAL 90%+ EVACUATION ALARM ACTIVE
                </span>
                <span className="text-xs font-black text-rose-100">
                  {selectedLoc?.name} Sector Threat: <strong className="text-white text-sm">{riskScore}%</strong>
                </span>
              </div>
              <p className="text-xs text-rose-100 leading-relaxed max-w-2xl">
                Hydrological saturation and shear stress have exceeded slope failure thresholds. An automatic voice alert has been broadcast. Residents should relocate immediately to designated high-ground relief centers.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                triggerVoiceAlert(
                  activeLang,
                  `Emergency alert: Landslide risk in ${selectedLoc?.name} is ${riskScore} percent. Evacuate to high ground immediately.`
                )
              }
              className="flex items-center gap-1.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 px-3.5 py-2 text-xs font-black shadow transition-all active:scale-95"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Replay Voice Alert</span>
            </button>
            <button
              type="button"
              onClick={toggleSiren}
              className="flex items-center gap-1.5 rounded-xl bg-rose-950 hover:bg-black text-white px-3.5 py-2 text-xs font-black shadow transition-all active:scale-95 border border-rose-800"
            >
              <Siren className="h-3.5 w-3.5" />
              <span>{isSirenActive ? 'Silence Siren' : 'Sound Siren'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Selected Sector Telemetry & Safety Status */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* District Risk & FoS Gauge */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Sector Safety Analysis
              </span>
              <h3 className="text-base font-bold text-slate-900">{selectedLoc?.name}, {selectedLoc?.state}</h3>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wider ${
                selectedLoc?.risk_analysis?.risk_level === 'CRITICAL'
                  ? 'bg-rose-100 text-rose-700'
                  : selectedLoc?.risk_analysis?.risk_level === 'WARNING'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {selectedLoc?.risk_analysis?.risk_level ?? 'STABLE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Overall Risk Index</span>
              <span className="text-2xl font-black text-slate-900">
                {Math.round(selectedLoc?.risk_analysis?.overall_risk_score ?? 35)}
                <span className="text-xs text-slate-400 font-semibold">/100</span>
              </span>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Factor of Safety ($FoS$)</span>
              <span
                className={`text-2xl font-black ${
                  (selectedLoc?.geotechnical?.factor_of_safety ?? 1.35) < 1.1
                    ? 'text-rose-600'
                    : (selectedLoc?.geotechnical?.factor_of_safety ?? 1.35) < 1.3
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {(selectedLoc?.geotechnical?.factor_of_safety ?? 1.35).toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
            {selectedLoc?.risk_analysis?.advisory ??
              'Normal geological stability. Maintain routine hill drainage inspection.'}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/60 border border-blue-100">
              <CloudRain className="h-4 w-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Rainfall</span>
                <strong>{(selectedLoc?.metrics?.live_rainfall_mm ?? 1.5).toFixed(1)} mm</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-teal-50/60 border border-teal-100">
              <Droplets className="h-4 w-4 text-teal-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Soil Saturation</span>
                <strong>{(selectedLoc?.metrics?.soil_moisture_pct ?? 42).toFixed(0)}%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Multilingual Warning & Voice Broadcast */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Multilingual Broadcast</h3>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              Voice Siren Ready
            </span>
          </div>

          {/* Language Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            {(['en', 'hi', 'as'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setActiveLang(l)}
                className={`py-1.5 rounded-xl transition-all ${
                  activeLang === l ? 'bg-white text-slate-900 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {MULTILINGUAL_DIRECTIVES[l].label.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
            <p className="text-xs text-indigo-950 font-medium leading-relaxed">
              {MULTILINGUAL_DIRECTIVES[activeLang].text}
            </p>
            <button
              type="button"
              onClick={() => triggerVoiceAlert(activeLang, MULTILINGUAL_DIRECTIVES[activeLang].audioMsg)}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Announce in {MULTILINGUAL_DIRECTIVES[activeLang].label.split(' ')[0]}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Voice directives work 100% offline via browser speech synthesis.</span>
          </div>
        </div>

        {/* Emergency Helplines Direct Dial */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Emergency Helplines</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Toll-Free 24x7
            </span>
          </div>

          <div className="space-y-2">
            {[
              { agency: 'NDRF Disaster Control Helpline', number: '1078', desc: 'National First Responder Dispatch' },
              { agency: 'Assam State Disaster Control (ASDMA)', number: '1070', desc: 'Guwahati & Brahmaputra Valley' },
              { agency: 'Meghalaya SDMA Emergency Desk', number: '1077', desc: 'Shillong & Khasi Mountain Escarpment' },
              { agency: 'Sikkim Landslide Rescue Cell', number: '112', desc: 'Singtam-Teesta NH-10 Highway Corridor' },
            ].map((hp) => (
              <a
                key={hp.number}
                href={`tel:${hp.number}`}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-100 hover:border-emerald-200 transition-all group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">{hp.agency}</p>
                  <p className="text-[10px] text-slate-400">{hp.desc}</p>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-black text-sm text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-xl">
                  <PhoneCall className="h-3 w-3" />
                  <span>{hp.number}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Safe Relief Shelters Directory with Offline Capacity */}
      <section className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Designated High-Ground Safe Relief Shelters
              </h2>
              <p className="text-xs text-slate-500">
                Verified non-inundated relief staging points with offline GPS coordinates and helpline numbers
              </p>
            </div>
          </div>

          {/* State Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {['All', 'Assam', 'Meghalaya', 'Sikkim'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedShelterFilter(st)}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  selectedShelterFilter === st
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredShelters.map((shelter) => (
            <div
              key={shelter.id}
              className="rounded-2xl bg-slate-50/80 p-4 border border-slate-200/90 hover:border-sky-300 transition-all space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                    {shelter.type}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Elevation: {shelter.elevation_m}m
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">{shelter.name}</h4>
                <p className="text-[11px] text-slate-500">
                  {shelter.district}, {shelter.state}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-600 font-semibold">
                  Capacity: <strong className="text-slate-900">{shelter.capacity_persons.toLocaleString()}</strong>
                </span>
                <a
                  href={`tel:${shelter.contact_helpline.split(' ')[0]}`}
                  className="flex items-center gap-1 font-bold text-sky-700 hover:text-sky-900"
                >
                  <PhoneCall className="h-3 w-3" />
                  <span>Call Shelter</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Print-Only Official Disaster Evacuation Sheet (Activated on window.print()) */}
      <div className="hidden print:block p-6 bg-white text-slate-900 space-y-5 border-2 border-slate-900 rounded-2xl">
        <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">
              SlopeSense AI • Early Landslide Warning Platform
            </h1>
            <p className="text-xs text-slate-700 font-bold">
              National Disaster Response Force (NDRF) & State Disaster Management Authority (SDMA)
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <div><strong>Issue Time:</strong> {new Date().toLocaleString()}</div>
            <div><strong>Format:</strong> Field Evacuation Directive</div>
          </div>
        </div>

        <div className="border border-slate-400 p-4 rounded-xl space-y-2 bg-slate-50">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-black text-slate-900">
              Sector: {selectedLoc?.name}, {selectedLoc?.state}
            </h2>
            <span className="px-3 py-0.5 font-black text-xs uppercase border-2 border-slate-900 rounded-lg">
              Risk Level: {selectedLoc?.risk_analysis?.risk_level ?? 'MONITORING'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs pt-1">
            <div>Risk Score: <strong>{riskScore}/100</strong></div>
            <div>Factor of Safety ($FoS$): <strong>{(selectedLoc?.geotechnical?.factor_of_safety ?? 1.35).toFixed(2)}</strong></div>
            <div>Rainfall: <strong>{(selectedLoc?.metrics?.live_rainfall_mm ?? 0).toFixed(1)} mm</strong></div>
            <div>Soil Saturation: <strong>{(selectedLoc?.metrics?.soil_moisture_pct ?? 0).toFixed(0)}%</strong></div>
          </div>

          <p className="text-xs text-slate-800 pt-1 border-t border-slate-200">
            <strong>Advisory Directive:</strong> {selectedLoc?.risk_analysis?.advisory ?? 'Standard hill slope monitoring active.'}
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Designated High-Ground Relief Shelters & Safe Havens
          </h3>
          <table className="w-full text-xs border border-slate-400 text-left border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-400 font-bold">
                <th className="p-2">Shelter Facility</th>
                <th className="p-2">District / State</th>
                <th className="p-2">Elevation</th>
                <th className="p-2">Capacity</th>
                <th className="p-2">Helpline Contact</th>
              </tr>
            </thead>
            <tbody>
              {filteredShelters.slice(0, 6).map((s) => (
                <tr key={s.id} className="border-b border-slate-300">
                  <td className="p-2 font-bold">{s.name}</td>
                  <td className="p-2">{s.district}, {s.state}</td>
                  <td className="p-2">{s.elevation_m}m</td>
                  <td className="p-2">{s.capacity_persons.toLocaleString()} persons</td>
                  <td className="p-2 font-mono">{s.contact_helpline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border border-slate-400 p-3.5 rounded-xl space-y-1 text-xs">
          <h3 className="font-black uppercase text-slate-900">Official 24/7 Emergency Response Helplines</h3>
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
            <div><strong>NDRF National Desk:</strong> 1078</div>
            <div><strong>State SDRF Control:</strong> 1070</div>
            <div><strong>District Operations:</strong> 1077</div>
          </div>
        </div>
      </div>
    </div>
  );
}
