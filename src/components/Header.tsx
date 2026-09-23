import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  User as UserIcon,
  ShieldAlert,
  X,
  LogOut,
  ChevronDown,
  Volume2,
  VolumeX,
  Radio,
  Wifi,
  WifiOff,
  UserCheck,
  Shield,
  Menu,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface HeaderProps {
  onAuthClick: () => void;
  onMobileMenuToggle?: () => void;
}

export default function Header({ onAuthClick, onMobileMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const {
    user,
    logout,
    alerts,
    dismissAlert,
    settings,
    setPersona,
    isOnline,
    isSirenActive,
    toggleSiren,
    triggerVoiceAlert,
  } = useApp();

  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const isAuthority = settings.persona === 'authority';

  const handleSelectPersona = (persona: 'citizen' | 'authority') => {
    setPersona(persona);
    if (persona === 'authority') {
      if (window.location.pathname === '/') {
        navigate('/authority');
      }
    } else {
      if (window.location.pathname.startsWith('/authority') || window.location.pathname.startsWith('/lab')) {
        navigate('/');
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 py-3 sm:px-6 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Brand & Mobile Menu */}
        <div className="flex items-center gap-3">
          {onMobileMenuToggle && (
            <button
              type="button"
              onClick={onMobileMenuToggle}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-white tracking-tight">SlopeSense AI</span>
                <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-blue-400 border border-blue-500/30">
                  Command Hub
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Northeast India Early Warning & Geotechnical XAI
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Persona Switcher Toggle */}
          <div className="flex items-center rounded-2xl bg-slate-800/90 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => handleSelectPersona('citizen')}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all ${
                !isAuthority
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Citizen Mode</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPersona('authority')}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all ${
                isAuthority
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden md:inline">NDRF Authority</span>
            </button>
          </div>

          {/* Offline/Online Badge */}
          <div className={`hidden sm:flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold border ${
            isOnline
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
              : 'bg-amber-950/60 border-amber-700 text-amber-300 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            <span>{isOnline ? 'Cloud Synced' : 'Offline Mode Active'}</span>
          </div>

          {/* Multilingual Voice Broadcast Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setVoiceOpen(!voiceOpen)}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-xs font-bold text-slate-200 border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all"
              title="Broadcast Offline Voice Evacuation Warning"
            >
              <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span className="hidden lg:inline">Voice Alert</span>
            </button>

            {voiceOpen && (
              <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl bg-slate-900 p-3 text-white shadow-2xl border border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Offline Voice Broadcast</span>
                  <button onClick={() => setVoiceOpen(false)} className="text-slate-500 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => { triggerVoiceAlert('en'); setVoiceOpen(false); }}
                    className="w-full text-left rounded-xl p-2 text-xs font-semibold hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span>English Broadcast</span>
                    <span className="text-[10px] text-slate-400 font-mono">en-IN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { triggerVoiceAlert('hi'); setVoiceOpen(false); }}
                    className="w-full text-left rounded-xl p-2 text-xs font-semibold hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span>हिंदी उद्घोषणा (Hindi)</span>
                    <span className="text-[10px] text-slate-400 font-mono">hi-IN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { triggerVoiceAlert('as'); setVoiceOpen(false); }}
                    className="w-full text-left rounded-xl p-2 text-xs font-semibold hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span>অসমীয়া সতৰ্কবাণী (Assamese)</span>
                    <span className="text-[10px] text-slate-400 font-mono">as-IN</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Siren Quick Toggle */}
          <button
            type="button"
            onClick={toggleSiren}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all active:scale-95 ${
              isSirenActive
                ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/40 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title={isSirenActive ? 'Stop Emergency Siren' : 'Test Acoustic Siren (Offline Web Audio)'}
          >
            {isSirenActive ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-slate-900">
                  {Math.min(alerts.length, 9)}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Active Sector Alerts</span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      {alerts.length} Warnings
                    </span>
                  </div>
                  <button onClick={() => setNotifOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {alerts.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-slate-500">No active hazard alerts at this moment.</div>
                  ) : (
                    alerts.map((n) => (
                      <div key={n.id} className="flex items-start gap-3 p-3.5 hover:bg-slate-50 transition-colors">
                        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          n.level === 'critical' ? 'bg-rose-500 animate-ping' : 'bg-amber-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-bold text-slate-900">{n.title}</p>
                            <button onClick={() => dismissAlert(n.id)} className="text-slate-400 hover:text-slate-600">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                            <span>{n.region_name || 'Northeast India'}</span>
                            <span>{n.time}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Account Button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setAccountOpen((open) => !open)}
                className="flex h-10 items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-2.5 text-white hover:bg-slate-700 active:scale-95 transition-all"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500 text-xs font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold truncate max-w-24">{user.name}</div>
                  <div className="text-[9px] text-slate-400 uppercase font-semibold">{user.role}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl bg-white p-2 text-slate-800 shadow-2xl border border-slate-200 animate-slide-up">
                  <div className="border-b border-slate-100 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      {user.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{user.email}</div>
                    {user.organization && (
                      <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 rounded-lg px-2 py-1 mt-1 border border-amber-200">
                        {user.organization} {user.badge_id ? `(${user.badge_id})` : ''}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setAccountOpen(false);
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onAuthClick}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
            >
              <UserIcon className="h-4 w-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
