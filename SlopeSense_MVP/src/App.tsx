import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from '@/context/AppContext';
import { ToastProvider } from '@/context/ToastContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import Header from '@/components/Header';
import SidebarNav from '@/components/SidebarNav';
import BottomNav from '@/components/BottomNav';
import ReportModal from '@/components/ReportModal';
import AuthModal from '@/components/AuthModal';
import CitizenPortalPage from '@/pages/CitizenPortalPage';
import AuthorityCommandPage from '@/pages/AuthorityCommandPage';
import RiskMapPage from '@/pages/RiskMapPage';
import GeotechLabPage from '@/pages/GeotechLabPage';
import LiveCameraFeedsPage from '@/pages/LiveCameraFeedsPage';
import MyReportsPage from '@/pages/MyReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import type { ReportType } from '@/types';
import { WifiOff, Volume2, X } from 'lucide-react';

function AppShell() {
  const { settings, isOnline, isSirenActive, toggleSiren } = useApp();
  const [reportModal, setReportModal] = useState<{ open: boolean; type: ReportType | null }>({
    open: false,
    type: null,
  });
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const handleReportClick = (type?: ReportType) => {
    setReportModal({ open: true, type: type || 'ground_cracks' });
  };

  return (
    <div className={`${settings.darkMode ? 'dark' : ''} min-h-screen bg-slate-100 flex text-slate-900 antialiased`}>
      {/* Desktop Left Navigation Drawer */}
      <SidebarNav
        onReportClick={() => handleReportClick()}
        onAuthClick={() => setAuthOpen(true)}
      />

      {/* Mobile Slide-Out Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 bg-white h-full shadow-2xl animate-slide-right flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="font-black text-sm text-slate-900">Navigation Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav
              onReportClick={() => {
                setMobileMenuOpen(false);
                handleReportClick();
              }}
              onAuthClick={() => {
                setMobileMenuOpen(false);
                setAuthOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Command Center Stage */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-20 lg:pb-8">
        <Header
          onAuthClick={() => setAuthOpen(true)}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />

        {/* Offline Emergency Status Ticker */}
        {!isOnline && (
          <div className="bg-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 animate-bounce" />
              <span>Offline Civil Defense Mode Active — Local acoustic siren & safe shelter guidance functional.</span>
            </div>
            <button
              type="button"
              onClick={toggleSiren}
              className="flex items-center gap-1 rounded bg-amber-800 px-2 py-0.5 text-[10px] uppercase font-black hover:bg-amber-900"
            >
              <Volume2 className="h-3 w-3" />
              {isSirenActive ? 'Silence Siren' : 'Test Siren'}
            </button>
          </div>
        )}

        {/* Dynamic Route Container */}
        <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto">
          <div key={location.pathname} className="animate-fade-in">
            <Routes>
              {/* Public Citizen Safety Portal */}
              <Route path="/" element={<CitizenPortalPage onReportClick={handleReportClick} onAuthClick={() => setAuthOpen(true)} />} />

              {/* Dedicated Disaster Authority & NDRF Operations Desk */}
              <Route path="/authority" element={<AuthorityCommandPage onAuthClick={() => setAuthOpen(true)} />} />

              {/* GIS Multi-Layer Hazard Map */}
              <Route path="/map" element={<RiskMapPage />} />

              {/* Geotech Physics & XAI Lab (Authority Only) */}
              <Route path="/lab" element={<GeotechLabPage onAuthClick={() => setAuthOpen(true)} />} />
              <Route path="/authority/lab" element={<GeotechLabPage onAuthClick={() => setAuthOpen(true)} />} />

              {/* Highway Monitoring CCTV Feeds */}
              <Route path="/feeds" element={<LiveCameraFeedsPage />} />

              {/* Citizen Incident Reports & Triage */}
              <Route path="/reports" element={<MyReportsPage />} />

              {/* Offline Shelters & Disaster Resilience Settings */}
              <Route path="/settings" element={<SettingsPage onAuthClick={() => setAuthOpen(true)} />} />
            </Routes>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />

        {/* Global Modals */}
        <ReportModal
          open={reportModal.open}
          type={reportModal.type}
          onClose={() => setReportModal({ open: false, type: null })}
        />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}