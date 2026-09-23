import { useState, useEffect } from 'react';
import {
  Camera,
  Radio,
  Eye,
  Maximize2,
  Scan,
  Layers,
  Thermometer,
  ShieldAlert,
  Compass,
  BatteryCharging,
  Video,
} from 'lucide-react';
import { API_BASE_URL } from '@/api';

interface CameraFeed {
  id: string;
  name: string;
  location: string;
  hazard_type: string;
  stream_image: string;
  ai_detected_anomaly: string;
  anomaly_severity: 'CRITICAL' | 'WARNING' | 'STABLE';
  fps: number;
  latitude: number;
  longitude: number;
  elevation_m: number;
  detection_box: { top: string; left: string; width: string; height: string; label: string; confidence: number };
}

const FEEDS: CameraFeed[] = [
  {
    id: 'cctv-ghy-01',
    name: 'NH-27 Guwahati Mountain Bypass (Sector 4B)',
    location: 'Guwahati, Assam',
    hazard_type: 'Active Highway Tension Crack & Colluvial Creep',
    stream_image: '/uploads/reports/crack_nh27.svg',
    ai_detected_anomaly: 'Tensile scarp fissure widening at 1.4 mm/hr',
    anomaly_severity: 'CRITICAL',
    fps: 24,
    latitude: 26.1445,
    longitude: 91.7362,
    elevation_m: 240,
    detection_box: { top: '35%', left: '30%', width: '42%', height: '38%', label: 'Active Tension Fissure #01', confidence: 96.4 },
  },
  {
    id: 'cctv-chr-02',
    name: 'Cherrapunji High-Rainfall Escarpment (Station 12)',
    location: 'Sohra / Cherrapunji, Meghalaya',
    hazard_type: 'Severe Pore Pressure Seepage & Mud Flow Channels',
    stream_image: '/uploads/reports/seepage_cherra.svg',
    ai_detected_anomaly: 'Subsurface water breakout at slope toe (94% saturation)',
    anomaly_severity: 'WARNING',
    fps: 30,
    latitude: 25.2986,
    longitude: 91.7289,
    elevation_m: 1430,
    detection_box: { top: '48%', left: '22%', width: '50%', height: '40%', label: 'Seepage Breakout Surcharge', confidence: 91.8 },
  },
  {
    id: 'cctv-gtk-03',
    name: 'NH-10 Teesta River Cut Corridor (Station 07)',
    location: 'Singtam / Gangtok, Sikkim',
    hazard_type: 'Wedge Rockfall & Talus Runout Hazard',
    stream_image: '/uploads/reports/rockfall_gangtok.svg',
    ai_detected_anomaly: '45 m³ loose boulder wedge overhang identified',
    anomaly_severity: 'CRITICAL',
    fps: 20,
    latitude: 27.3389,
    longitude: 88.6065,
    elevation_m: 1650,
    detection_box: { top: '28%', left: '35%', width: '45%', height: '45%', label: 'Unstable Joint Scarp #04', confidence: 98.1 },
  },
];

export default function LiveCameraFeedsPage() {
  const [selectedFeed, setSelectedFeed] = useState<CameraFeed>(FEEDS[0]);
  const [viewMode, setViewMode] = useState<'rgb' | 'thermal' | 'lidar'>('rgb');
  const [timestamp, setTimestamp] = useState<string>('');
  const [showAiBoxes, setShowAiBoxes] = useState<boolean>(true);
  const [zoomed, setZoomed] = useState<boolean>(false);

  // Live timestamp clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimestamp(now.toTimeString().split(' ')[0] + '.' + String(Math.floor(now.getMilliseconds() / 100)));
    };
    const interval = setInterval(updateTime, 100);
    updateTime();
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-widest text-rose-400">
              High-Speed Optical & UAV Surveillance Network
            </span>
          </div>
          <h1 className="text-2xl font-black">Live Highway & Slope CCTV Monitoring</h1>
          <p className="text-xs text-slate-400">
            Real-time automated computer vision detecting roadside scarp cracks, debris flows, and boulder runout zones.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center rounded-2xl bg-slate-800 p-1.5 border border-slate-700 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('rgb')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'rgb' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            Optical RGB
          </button>
          <button
            type="button"
            onClick={() => setViewMode('thermal')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'thermal' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Thermometer className="h-3.5 w-3.5" />
            Thermal Moisture
          </button>
          <button
            type="button"
            onClick={() => setViewMode('lidar')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'lidar' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            LiDAR Point Cloud
          </button>
        </div>
      </div>

      {/* Main Video Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Stream Viewport */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-slate-800 shadow-2xl aspect-video group">
            {/* Feed Image with dynamic filters based on ViewMode */}
            <img
              src={selectedFeed.stream_image.startsWith('/') ? `${API_BASE_URL}${selectedFeed.stream_image}` : selectedFeed.stream_image}
              alt={selectedFeed.name}
              className={`w-full h-full object-cover transition-all duration-300 ${
                viewMode === 'thermal'
                  ? 'invert hue-rotate-180 contrast-150 saturate-200'
                  : viewMode === 'lidar'
                  ? 'brightness-90 contrast-200 hue-rotate-90 sepia'
                  : ''
              }`}
            />

            {/* Simulated Animated Scanline */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-20 w-full animate-scanline" />

            {/* Dark Vignette Overlay */}
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />

            {/* AI Bounding Box Overlay */}
            {showAiBoxes && (
              <div
                className="absolute border-2 border-rose-500 rounded-lg pointer-events-none transition-all duration-300 animate-pulse bg-rose-500/10"
                style={{
                  top: selectedFeed.detection_box.top,
                  left: selectedFeed.detection_box.left,
                  width: selectedFeed.detection_box.width,
                  height: selectedFeed.detection_box.height,
                }}
              >
                {/* Crosshairs at box corners */}
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-rose-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-rose-400" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-rose-400" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-rose-400" />

                {/* AI Detection Pill */}
                <div className="absolute -top-7 left-0 bg-rose-600 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded shadow flex items-center gap-1 uppercase">
                  <Scan className="h-3 w-3" />
                  {selectedFeed.detection_box.label} ({selectedFeed.detection_box.confidence}%)
                </div>
              </div>
            )}

            {/* Top OSD HUD */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white font-mono text-xs pointer-events-none">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold text-rose-400">REC</span>
                <span className="text-slate-400">|</span>
                <span>{selectedFeed.id.toUpperCase()}</span>
                <span className="text-slate-400">|</span>
                <span>{selectedFeed.fps} FPS</span>
              </div>

              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <Compass className="h-3.5 w-3.5 text-cyan-400" />
                <span>{selectedFeed.latitude.toFixed(4)}°N, {selectedFeed.longitude.toFixed(4)}°E</span>
                <span className="text-slate-400">|</span>
                <span>ALT {selectedFeed.elevation_m}m</span>
              </div>
            </div>

            {/* Bottom OSD HUD */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white font-mono text-xs pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 space-y-1">
                <div className="text-[11px] text-slate-300 font-bold">{selectedFeed.name}</div>
                <div className="text-[10px] text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-3 w-3" />
                  {selectedFeed.ai_detected_anomaly}
                </div>
              </div>

              <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-right">
                <div className="text-cyan-400 font-bold">{timestamp}</div>
                <div className="text-[10px] text-slate-400">NDRF COMMAND LINK #1</div>
              </div>
            </div>
          </div>

          {/* Camera Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAiBoxes((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  showAiBoxes ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                {showAiBoxes ? 'AI Bounding Boxes: ON' : 'AI Overlays: OFF'}
              </button>

              <button
                type="button"
                onClick={() => setZoomed((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                {zoomed ? 'Normal Angle' : 'Optical Zoom (2.4x)'}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <BatteryCharging className="h-4 w-4 text-emerald-600" />
              <span>Solar Backup: 98%</span>
              <span className="text-slate-300">|</span>
              <Radio className="h-4 w-4 text-blue-600 animate-pulse" />
              <span>Low-Latency WebRTC</span>
            </div>
          </div>
        </div>

        {/* Camera Selector List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Select Active Station</span>
            <span className="text-blue-700">{FEEDS.length} Active Feeds</span>
          </div>

          {FEEDS.map((feed) => (
            <div
              key={feed.id}
              onClick={() => setSelectedFeed(feed)}
              className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                selectedFeed.id === feed.id
                  ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Video className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">{feed.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{feed.location}</p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    feed.anomaly_severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {feed.anomaly_severity}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">{feed.hazard_type}</span>
                <span className="font-mono font-bold text-slate-700">{feed.fps} FPS</span>
              </div>
            </div>
          ))}

          {/* Quick Patrol Guide */}
          <div className="rounded-2xl bg-amber-50/80 p-4 border border-amber-200 text-xs text-amber-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              NDRF Optical Monitoring Protocol
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Highway camera feeds refresh at 24 FPS with sub-centimeter optical flow deformation tracking.
              Thermal imaging detects early ground saturation before visible failure occurs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
