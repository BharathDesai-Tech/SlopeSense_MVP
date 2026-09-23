import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Microscope, Activity, Sliders, Droplets, BookOpen, Lock, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import ShapWaterfallChart from '@/components/ShapWaterfallChart';
import HydrologyTrendChart from '@/components/HydrologyTrendChart';
import SlopeFailureSimulator from '@/components/SlopeFailureSimulator';
import { useApp } from '@/context/AppContext';

interface GeotechLabPageProps {
  onAuthClick?: () => void;
}

export default function GeotechLabPage({ onAuthClick }: GeotechLabPageProps) {
  const { user, settings, setPersona, login } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'simulator' | 'shap' | 'hydrology'>('all');
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthority = settings.persona === 'authority' || user?.role === 'responder' || user?.role === 'admin' || Boolean(user?.organization);

  const handleQuickDemoLogin = async () => {
    setAuthError(null);
    try {
      await login('commander@ndrf.gov.in', 'ndrf2026');
      setPersona('authority');
    } catch {
      setPersona('authority');
    }
  };

  if (!isAuthority) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in">
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-12 text-white shadow-2xl space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Lock className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-400 border border-amber-500/20">
              <ShieldAlert className="h-3.5 w-3.5" />
              Restricted Authority Laboratory
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">NDRF / SDMA Clearance Required</h1>
            <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              The Geotechnical Simulation & Machine Learning Explainability (XAI) Lab contains interactive Mohr-Coulomb slope stability solvers, pore-water pressure stress simulators, and game-theoretic XGBoost SHAP TreeExplainer factor attributions.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/80 text-left text-xs text-slate-300 space-y-2 max-w-lg mx-auto">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-blue-400" />
              Access Policy (SIH 2026 NDMA Guidelines)
            </div>
            <p className="text-slate-400 leading-relaxed">
              Citizen access is restricted to the <strong className="text-slate-200">Public Citizen Safety Portal</strong> to prevent misinformation from speculative slope physics parameter overrides. Scientific modules are reserved for certified geotechnical officers and NDRF command personnel.
            </p>
          </div>

          {authError && (
            <div className="rounded-xl bg-rose-950/60 border border-rose-800 p-3 text-xs text-rose-300">
              {authError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPersona('authority')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-6 py-3.5 text-xs font-black text-white hover:bg-amber-500 shadow-lg shadow-amber-600/30 transition-all active:scale-95"
            >
              <span>Switch to Authority Mode</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-xs font-black text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              <UserCheck className="h-4 w-4" />
              <span>Officer Demo Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto rounded-2xl bg-slate-800 px-5 py-3.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-all"
            >
              Back to Citizen Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <Microscope className="h-4 w-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-purple-400">
              Scientific Simulation & Explainability Hub
            </span>
          </div>
          <h1 className="text-2xl font-black">Geotechnical Lab & Machine Learning Explainability</h1>
          <p className="text-xs text-slate-400">
            Combine physics-based Mohr-Coulomb slope stability models with game-theoretic XGBoost SHAP factor attributions.
          </p>
        </div>

        {/* Tab Filter */}
        <div className="flex items-center rounded-2xl bg-slate-800 p-1.5 border border-slate-700 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Unified Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'simulator' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            2D Physics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shap')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'shap' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            SHAP Waterfall
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hydrology')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'hydrology' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hydrology Trend
          </button>
        </div>
      </div>

      {/* 2D Physics Simulator */}
      {(activeTab === 'all' || activeTab === 'simulator') && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            <Sliders className="h-4 w-4 text-blue-600" />
            <span>Interactive Geotechnical Slope Failure Physics</span>
          </div>
          <SlopeFailureSimulator />
        </section>
      )}

      {/* SHAP Waterfall Chart */}
      {(activeTab === 'all' || activeTab === 'shap') && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            <Activity className="h-4 w-4 text-purple-600" />
            <span>Machine Learning Explainability (XGBoost + SHAP TreeExplainer)</span>
          </div>
          <ShapWaterfallChart />
        </section>
      )}

      {/* Hydrology Trend Chart */}
      {(activeTab === 'all' || activeTab === 'hydrology') && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            <Droplets className="h-4 w-4 text-cyan-600" />
            <span>Precipitation Infiltration & Pore Water Dynamics</span>
          </div>
          <HydrologyTrendChart />
        </section>
      )}

      {/* Theoretical Grounding Card */}
      <div className="rounded-3xl bg-slate-50 p-6 border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <span>Geotechnical Theoretical Grounding</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-1">1. Effective Stress Law (Terzaghi)</h4>
            <p>
              Shear strength relies on effective stress <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">σ&apos; = σ - u</code>.
              When intense monsoon rain infiltrates the colluvium, pore water pressure (<code className="font-mono">u</code>) surges,
              drastically neutralizing frictional interlocking between soil particles.
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-1">2. Mohr-Coulomb Failure Envelope</h4>
            <p>
              Available shear resistance is governed by <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">τ_f = c&apos; + σ&apos; tan(φ&apos;)</code>.
              Root networks provide additional apparent cohesion (<code className="font-mono">c&apos;</code>), while deforestation and steep slope grading degrade resisting forces.
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-1">3. Factor of Safety Criterion</h4>
            <p>
              Slope is dynamically stable when <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">FoS &ge; 1.5</code>.
              When prolonged saturation pushes <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">FoS &lt; 1.0</code>,
              gravitational shear stress overcomes resisting shear strength, initiating translational or rotational slip plane shear failure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
