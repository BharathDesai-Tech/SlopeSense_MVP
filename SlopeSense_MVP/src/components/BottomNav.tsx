import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Map, FileText, Settings, Microscope, Video, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, user } = useApp();

  const isAuthority = settings.persona === 'authority' || user?.role === 'responder' || user?.role === 'admin';

  const navItems = isAuthority
    ? [
        { path: '/authority', label: 'Command', icon: Shield },
        { path: '/map', label: 'GIS Map', icon: Map },
        { path: '/lab', label: 'XAI Lab', icon: Microscope },
        { path: '/feeds', label: 'CCTV', icon: Video },
        { path: '/reports', label: 'Triage', icon: FileText },
        { path: '/settings', label: 'Shelters', icon: Settings },
      ]
    : [
        { path: '/', label: 'Citizen', icon: Home },
        { path: '/map', label: 'GIS Map', icon: Map },
        { path: '/reports', label: 'Reports', icon: FileText },
        { path: '/settings', label: 'Shelters', icon: Settings },
        { path: '/authority', label: 'Authority', icon: Shield },
      ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md shadow-lg">
      <div className={`grid ${isAuthority ? 'grid-cols-6' : 'grid-cols-5'} max-w-lg mx-auto`}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-all active:scale-90 ${
                isActive ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 h-1 w-6 rounded-b-full bg-blue-700" />
              )}
              <item.icon
                className="h-4 w-4"
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
