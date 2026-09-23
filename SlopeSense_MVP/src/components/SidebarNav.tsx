import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Microscope,
  Video,
  AlertOctagon,
  Settings,
  Shield,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface SidebarNavProps {
  onReportClick: () => void;
  onAuthClick: () => void;
}

export default function SidebarNav({ onReportClick, onAuthClick }: SidebarNavProps) {
  const {
    isOnline,
    user,
    settings,
    isSirenActive,
    toggleSiren,
    offlineQueueCount,
    syncOfflineQueue,
  } = useApp();

  const isAuthority = settings.persona === 'authority' || user?.role === 'responder' || user?.role === 'admin';

  const navLinks = isAuthority
    ? [
        { to: '/authority', label: 'Command Operations Desk', icon: Shield, badge: 'HQ' },
        { to: '/map', label: 'GIS Tactical Map (9 Layers)', icon: MapPin },
        { to: '/lab', label: 'Geotech & XAI Lab', icon: Microscope, badge: 'Scientific' },
        { to: '/feeds', label: 'Highway CCTV Feeds', icon: Video, badge: 'LIVE' },
        { to: '/reports', label: 'Incident Triage & Queue', icon: AlertOctagon },
        { to: '/', label: 'Public Citizen Portal', icon: LayoutDashboard },
        { to: '/settings', label: 'Emergency Shelters & Config', icon: Settings },
      ]
    : [
        { to: '/', label: 'Public Safety Portal', icon: LayoutDashboard },
        { to: '/map', label: 'GIS Hazard Map (9 Layers)', icon: MapPin },
        { to: '/reports', label: 'Hazard Reports & Points', icon: AlertOctagon, badge: '+Pts' },
        { to: '/settings', label: 'Offline Safe Shelters', icon: Settings },
        { to: '/authority', label: 'Authority Command Desk', icon: Shield, badge: 'Restricted' },
        { to: '/lab', label: 'Geotech & XAI Lab', icon: Microscope, badge: 'Restricted' },
      ];

  return (
    <aside className="hidden lg:flex w-72 flex-col justify-between border-r border-slate-200 bg-white p-5 h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-lg shadow-blue-700/25">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-slate-900 tracking-tight">SlopeSense</span>
              <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-blue-700">AI</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Northeast Landslide EWS</p>
          </div>
        </div>

        {/* User Persona Card */}
        <div className={`rounded-2xl p-3.5 border transition-all ${
          isAuthority
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-wider">
            <span className={isAuthority ? 'text-amber-800' : 'text-slate-500'}>
              {isAuthority ? 'Disaster Authority Mode' : 'Public Citizen Mode'}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
              isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {isOnline ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="truncate">
              <div className="font-extrabold text-sm truncate">{user ? user.name : 'Guest User'}</div>
              <div className="text-[11px] text-slate-500 truncate">
                {user?.organization || (user ? user.email : 'Click to sign in')}
              </div>
            </div>
            {!user && (
              <button
                type="button"
                onClick={onAuthClick}
                className="shrink-0 rounded-xl bg-blue-700 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-blue-800"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-extrabold transition-all ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-black text-white animate-pulse">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Emergency Controls & Siren */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        {/* Offline Queue Counter (if pending) */}
        {offlineQueueCount > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-xs">
            <span className="font-bold text-amber-900">{offlineQueueCount} Offline Reports</span>
            <button
              type="button"
              onClick={() => syncOfflineQueue()}
              disabled={!isOnline}
              className="flex items-center gap-1 rounded-lg bg-amber-600 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" />
              Sync
            </button>
          </div>
        )}

        {/* Emergency Siren Quick Toggle */}
        <button
          type="button"
          onClick={toggleSiren}
          className={`w-full flex items-center justify-between rounded-2xl p-3 text-xs font-black transition-all ${
            isSirenActive
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {isSirenActive ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-rose-600" />}
            <span>{isSirenActive ? 'SILENCE EMERGENCY SIREN' : 'TEST ACOUSTIC SIREN'}</span>
          </div>
          <span className="text-[10px] uppercase opacity-75">Web Audio</span>
        </button>

        {/* Quick Report Button */}
        <button
          type="button"
          onClick={onReportClick}
          className="w-full rounded-2xl bg-slate-900 py-3 text-xs font-black text-white shadow-md hover:bg-slate-800 active:scale-95 transition-all"
        >
          + Report Ground Anomaly
        </button>
      </div>
    </aside>
  );
}
