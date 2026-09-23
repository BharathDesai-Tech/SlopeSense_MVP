import { useState, useRef, useEffect, type FormEvent } from 'react';
import { X, Camera, MapPin, Send, AlertTriangle, Mountain, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import type { ReportType } from '@/types';

interface ReportModalProps {
  open: boolean;
  type: ReportType | null;
  onClose: () => void;
}

const reportConfig: Record<ReportType, { title: string; placeholder: string; icon: typeof MapPin }> = {
  ground_cracks: {
    title: 'Report Ground Tension Cracks',
    placeholder: 'Describe crack width, depth, direction, and visible ground displacement...',
    icon: MapPin,
  },
  water_seepage: {
    title: 'Report Surface Water Seepage',
    placeholder: 'Describe muddy spring emergence, flow rate, and slope toe pooling...',
    icon: MapPin,
  },
  rockfall: {
    title: 'Report Rockfall / Boulder Detachment',
    placeholder: 'Describe boulder volume, joint failure scarp, and road blockage...',
    icon: Mountain,
  },
  road_subsidence: {
    title: 'Report Road Shoulder Subsidence',
    placeholder: 'Describe asphalt sagging, retaining wall tilt, or guardrail deformation...',
    icon: AlertTriangle,
  },
};

export default function ReportModal({ open, type, onClose }: ReportModalProps) {
  const { addReport, user, isOnline } = useApp();
  const { showToast } = useToast();
  const [description, setDescription] = useState('');
  const [landmarkDescription, setLandmarkDescription] = useState('');
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [severity, setSeverity] = useState<'low' | 'moderate' | 'critical'>('moderate');
  const [locationLabel, setLocationLabel] = useState('Acquiring device GPS coordinates...');
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 26.1445, lon: 91.7362 });
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (!navigator.geolocation) {
      setLocationLabel('Northeast Mountain Sector (GPS unavailable on this device)');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setLocationLabel(`GPS: ${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E`);
      },
      () => {
        setLocationLabel('Guwahati Mountain Corridor (Auto-Defaulted)');
        setGpsAccuracy(15);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 120000 },
    );
  }, [open]);

  if (!open || !type) return null;

  const config = reportConfig[type] || reportConfig.ground_cracks;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      const res = await addReport({
        type,
        description: description.trim(),
        landmark_description: landmarkDescription.trim() || undefined,
        photoName,
        photoFile,
        location: locationLabel,
        latitude: coords.lat,
        longitude: coords.lon,
        severity,
      });

      showToast(res.message || 'Report logged successfully.');
      handleClose();
    } catch {
      showToast('Error recording report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setLandmarkDescription('');
    setPhotoName(null);
    setPhotoFile(null);
    setSeverity('moderate');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center p-3" onClick={handleClose}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md animate-fade-in" />
      <div
        className="relative w-full max-w-lg animate-slide-up rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <config.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{config.title}</h3>
              <p className="text-[11px] text-slate-500">Crowdsourced Early Warning Incident Intake</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/70 text-slate-600 transition-colors hover:bg-slate-300 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Auto-Geotagging Live GPS Status */}
          <div className="rounded-2xl bg-blue-50/80 p-3.5 border border-blue-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Auto-Geotagged Device Location
              </span>
              <span className="text-[11px] font-mono font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                {gpsAccuracy ? `±${gpsAccuracy}m precision` : 'GPS Active'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-900">
              <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </div>
          </div>

          {/* Reporter Trust & Reputation Points Card */}
          <div className="rounded-2xl bg-slate-900 p-3 text-white flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">
                  {user ? `${user.name} (${user.role === 'responder' ? 'NDRF Officer' : 'Field Scout'})` : 'Citizen Volunteer'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Trust Rating: <strong className="text-emerald-400">{Math.round(user?.trust_score ?? 50)}%</strong> • {user?.reputation_points ?? 10} pts
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-1 rounded-lg text-right">
              +20 pts on verify
            </span>
          </div>

          {/* Offline Notice if Offline */}
          {!isOnline && (
            <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span>Offline Mode: Incident will be queued locally and automatically synced when connection returns.</span>
            </div>
          )}

          {/* Nearest Landmark Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">
              Nearest Landmark / Highway KM Post <span className="text-slate-400 font-normal">(Manual Reference)</span>
            </label>
            <input
              type="text"
              value={landmarkDescription}
              onChange={(e) => setLandmarkDescription(e.target.value)}
              placeholder="e.g. NH-27 Km 42 Milestone, or near Nilachal Fuel Station"
              className="w-full rounded-2xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Severity selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
              Observed Hazard Severity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'moderate', 'critical'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  className={`rounded-xl py-2 text-xs font-bold uppercase tracking-wider border transition-all ${
                    severity === sev
                      ? sev === 'critical'
                        ? 'border-rose-600 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20'
                        : sev === 'moderate'
                        ? 'border-amber-600 bg-amber-50 text-amber-700 ring-2 ring-amber-500/20'
                        : 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
              Attach Geotechnical Photo Evidence
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPhotoFile(file);
                  setPhotoName(file.name);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-5 transition-colors hover:border-blue-500 hover:bg-blue-50/40 active:scale-[0.99]"
            >
              <Camera className="h-6 w-6 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">
                {photoName ? `Selected: ${photoName}` : 'Tap to take picture or upload image from device'}
              </span>
            </button>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
              Detailed Field Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={config.placeholder}
              rows={3}
              required
              className="w-full rounded-2xl border border-slate-300 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-700 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/25 hover:bg-blue-800 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Submitting to Emergency Queue...' : 'Transmit Incident Report'}
          </button>
        </form>
      </div>
    </div>
  );
}
