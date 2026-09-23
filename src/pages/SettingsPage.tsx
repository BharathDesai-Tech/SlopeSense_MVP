import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Globe,
  Shield,
  HelpCircle,
  LogOut,
  Check,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Radio,
  MapPin,
  RefreshCw,
  PhoneCall,
  Compass,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { OFFLINE_SAFE_SHELTERS } from '@/services/offlineEmergency';

interface SettingsPageProps {
  onAuthClick: () => void;
}

export default function SettingsPage({ onAuthClick }: SettingsPageProps) {
  const {
    user,
    logout,
    settings,
    updateSettings,
    isOnline,
    isSirenActive,
    toggleSiren,
    triggerVoiceAlert,
    offlineQueueCount,
    syncOfflineQueue,
  } = useApp();
  const { showToast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिन्दी' },
    { value: 'as', label: 'অসমীয়া' },
  ];

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const count = await syncOfflineQueue();
      showToast(count > 0 ? `Synchronized ${count} pending offline reports.` : 'All local reports are up to date.');
    } catch {
      showToast('Sync failed. Please check network connectivity.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 px-4 py-5 text-slate-900 sm:px-6 animate-fade-in max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">System Configuration & Safe Shelters</h1>
          <p className="text-xs text-slate-500">
            Offline civil defense protocols, acoustic alerts, and regional high-ground relief centers.
          </p>
        </div>
      </div>

      {/* User Account Status */}
      {user ? (
        <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-xl shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold">{user.name}</p>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-blue-300 border border-blue-500/30">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
              {user.organization && (
                <p className="text-xs text-amber-300 font-semibold mt-1">
                  {user.organization} {user.badge_id ? `• Badge: ${user.badge_id}` : ''}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition-all self-start sm:self-auto"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">You are browsing as Guest</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sign in to unlock NDRF responder triage permissions or synchronize personal crowd-sourced hazard submissions.
            </p>
          </div>
          <button
            onClick={onAuthClick}
            className="rounded-2xl bg-blue-700 px-5 py-3 text-xs font-black text-white shadow-md hover:bg-blue-800 active:scale-95 transition-all"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {/* Offline Status & Cloud Sync Management */}
      <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            {isOnline ? <Wifi className="h-5 w-5 text-emerald-600" /> : <WifiOff className="h-5 w-5 text-amber-600" />}
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Network Connectivity & Offline Storage Engine
              </h3>
              <p className="text-xs text-slate-500">
                {isOnline
                  ? 'Connected to SlopeSense enterprise cloud backend. Real-time telemetry streaming.'
                  : 'Disconnected. Operating in autonomous offline emergency mode with local sirens and cached safe zones.'}
              </p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
            isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-800">
              Pending Offline Reports Queue: <span className="text-blue-700">{offlineQueueCount} queued</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Reports filed without internet are securely stored in Indexed storage and synchronized upon reconnection.
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={!isOnline || syncing}
            className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 transition-all self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Force Sync Now'}
          </button>
        </div>
      </div>

      {/* Emergency Siren & Audio Test Studio */}
      <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-rose-600" />
            Civil Defense Acoustic Siren & Vocal Evacuation Alerts
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Uses HTML5 Web Audio API dual-oscillator sweep (580 Hz - 1020 Hz) that operates 100% offline without cellular network.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-rose-900">Acoustic Siren Simulator</span>
              <span className="text-[10px] font-mono text-rose-600">780Hz Dual Tone</span>
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              Test the acoustic piercing alarm designed to alert local residents during rapid slope deformation.
            </p>
            <button
              type="button"
              onClick={toggleSiren}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black text-white transition-all shadow-md active:scale-95 ${
                isSirenActive ? 'bg-slate-900 hover:bg-slate-800' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSirenActive ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {isSirenActive ? 'Silence Acoustic Siren' : 'Test Acoustic Siren Tone'}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-blue-900">Multilingual Speech Synthesis</span>
              <span className="text-[10px] font-mono text-blue-600">Client-Side TTS</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Broadcast vocal directives in English, Hindi, or Assamese even when cellular networks fail.
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => triggerVoiceAlert('en')}
                className="rounded-lg bg-blue-600 text-white py-1.5 text-[11px] font-bold hover:bg-blue-700"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => triggerVoiceAlert('hi')}
                className="rounded-lg bg-blue-600 text-white py-1.5 text-[11px] font-bold hover:bg-blue-700"
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => triggerVoiceAlert('as')}
                className="rounded-lg bg-blue-600 text-white py-1.5 text-[11px] font-bold hover:bg-blue-700"
              >
                অসমীয়া
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Safe Relief Shelters Directory */}
      <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Offline Regional Evacuation & High-Ground Shelters
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Designated safe assembly locations pre-cached on device for emergency evacuation during flash landslides.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {OFFLINE_SAFE_SHELTERS.map((shelter) => (
            <div
              key={shelter.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-slate-900">{shelter.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{shelter.district}, {shelter.state}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  {shelter.type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div className="flex items-center gap-1">
                  <Compass className="h-3 w-3 text-slate-400" />
                  <span>Elevation: <strong>{shelter.elevation_m}m</strong></span>
                </div>
                <div>Capacity: <strong>{shelter.capacity_persons} pax</strong></div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-white p-2 rounded-xl border border-slate-200">
                <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
                <span>Control Helpline: {shelter.contact_helpline}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences & Language */}
      <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Application Preferences</h3>

        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <Globe className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">System Interface Language</p>
              <p className="text-[11px] text-slate-400">English, Hindi, Assamese</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {languageOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSettings({ language: opt.value as 'en' | 'hi' | 'as' })}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  settings.language === opt.value
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <Bell className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Critical Threat Audio Sirens</p>
              <p className="text-[11px] text-slate-400">Autoplay siren when entering high-risk sectors</p>
            </div>
          </div>
          <button
            onClick={() => updateSettings({ audioAlertsEnabled: !settings.audioAlertsEnabled })}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.audioAlertsEnabled ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                settings.audioAlertsEnabled ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
