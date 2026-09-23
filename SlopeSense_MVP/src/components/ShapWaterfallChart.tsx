import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Info, ShieldAlert, Sparkles } from 'lucide-react';

export interface ShapFactor {
  key: string;
  label: string;
  value: number; // positive = risk increasing, negative = stabilizing
  source?: string;
  description?: string;
}

interface ShapWaterfallChartProps {
  factors?: ShapFactor[];
  baseRisk?: number;
  finalRisk?: number;
}

const DEFAULT_FACTORS: ShapFactor[] = [
  { key: 'rainfall', label: 'Monsoon Rainfall Intensity', value: 16.4, description: 'Sustained precipitation increases pore water pressure' },
  { key: 'soil_moisture', label: 'Volumetric Soil Saturation', value: 12.8, description: 'High saturation reduces effective soil shear strength' },
  { key: 'slope_angle', label: 'Steep Terrain Gradient (42°)', value: 9.6, description: 'Steep gravitational shear stress exceeding friction angle' },
  { key: 'displacement', label: 'InSAR Ground Creep Rate', value: 6.2, description: 'Micro-displacements indicate active slip plane shearing' },
  { key: 'vegetation', label: 'Root Cohesion & Forest Cover', value: -14.8, description: 'Dense root network mechanically binds soil mantle' },
  { key: 'bedrock', label: 'Granite Crystalline Bedrock', value: -7.5, description: 'High internal friction angle resists deep failure' },
];

export default function ShapWaterfallChart({
  factors = DEFAULT_FACTORS,
  baseRisk = 38.0,
  finalRisk = 70.7,
}: ShapWaterfallChartProps) {
  const chartData = useMemo(() => {
    return factors.map((f) => ({
      name: f.label,
      impact: f.value,
      absImpact: Math.abs(f.value),
      isRiskIncreasing: f.value > 0,
      description: f.description || (f.value > 0 ? 'Drives hazard escalation' : 'Imparts slope stability'),
    }));
  }, [factors]);

  return (
    <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Explainable AI (Lundberg TreeExplainer SHAP)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Exact mathematical feature attributions explaining why this slope is flagged as hazardous.
          </p>
        </div>

        {/* Risk Delta Summary */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-200">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Baseline vs Predicted</div>
            <div className="text-sm font-extrabold text-slate-800">
              {baseRisk}% <span className="text-rose-600 font-black">→ {finalRisk}%</span>
            </div>
          </div>
          <ShieldAlert className="h-5 w-5 text-rose-600" />
        </div>
      </div>

      {/* Legend & Guidance */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-rose-600 inline-block" />
          <span>Destabilizing Factors (+ Risk)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-600 inline-block" />
          <span>Protective / Stabilizing Factors (- Risk)</span>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[-20, 20]}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 11, fill: '#334155' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-2xl bg-slate-900/95 p-3 text-white shadow-xl backdrop-blur-md border border-slate-700 max-w-xs">
                    <div className="text-xs font-bold">{data.name}</div>
                    <div className="mt-1 text-sm font-extrabold flex items-center gap-1">
                      <span className={data.impact > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {data.impact > 0 ? `+${data.impact}% Hazard Impact` : `${data.impact}% Stabilizing Effect`}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">{data.description}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Bar dataKey="impact" radius={[6, 6, 6, 6]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.impact > 0 ? '#e11d48' : '#059669'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Technical Footer */}
      <div className="flex items-start gap-2 rounded-2xl bg-blue-50/70 p-3 text-[11px] text-blue-900 border border-blue-100">
        <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
        <span>
          <strong>SHAP (Shapley Additive Explanations)</strong> calculates the exact game-theoretic marginal contribution
          of each geotechnical input into the XGBoost decision trees, eliminating black-box opacity for disaster response teams.
        </span>
      </div>
    </div>
  );
}
