import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { CloudRain, Droplets, AlertTriangle } from 'lucide-react';

interface HydrologyDataPoint {
  time: string;
  rainfall_mm: number;
  soil_moisture_pct: number;
  pore_pressure_kpa: number;
}

const HOURLY_24H_DATA: HydrologyDataPoint[] = [
  { time: '00:00', rainfall_mm: 4.2, soil_moisture_pct: 62.0, pore_pressure_kpa: 14.2 },
  { time: '02:00', rainfall_mm: 6.8, soil_moisture_pct: 64.5, pore_pressure_kpa: 15.1 },
  { time: '04:00', rainfall_mm: 12.4, soil_moisture_pct: 69.0, pore_pressure_kpa: 17.8 },
  { time: '06:00', rainfall_mm: 22.1, soil_moisture_pct: 74.2, pore_pressure_kpa: 21.4 },
  { time: '08:00', rainfall_mm: 38.6, soil_moisture_pct: 81.5, pore_pressure_kpa: 28.6 },
  { time: '10:00', rainfall_mm: 46.2, soil_moisture_pct: 88.0, pore_pressure_kpa: 36.2 },
  { time: '12:00', rainfall_mm: 58.4, soil_moisture_pct: 93.4, pore_pressure_kpa: 44.8 },
  { time: '14:00', rainfall_mm: 42.0, soil_moisture_pct: 95.8, pore_pressure_kpa: 48.2 },
  { time: '16:00', rainfall_mm: 31.5, soil_moisture_pct: 94.2, pore_pressure_kpa: 46.1 },
  { time: '18:00', rainfall_mm: 24.8, soil_moisture_pct: 92.0, pore_pressure_kpa: 41.5 },
  { time: '20:00', rainfall_mm: 18.2, soil_moisture_pct: 89.5, pore_pressure_kpa: 37.0 },
  { time: '22:00', rainfall_mm: 14.0, soil_moisture_pct: 86.8, pore_pressure_kpa: 33.4 },
];

const DAILY_7D_DATA: HydrologyDataPoint[] = [
  { time: 'Day 1', rainfall_mm: 35.0, soil_moisture_pct: 58.0, pore_pressure_kpa: 12.0 },
  { time: 'Day 2', rainfall_mm: 48.0, soil_moisture_pct: 64.0, pore_pressure_kpa: 16.5 },
  { time: 'Day 3', rainfall_mm: 82.0, soil_moisture_pct: 73.0, pore_pressure_kpa: 22.0 },
  { time: 'Day 4', rainfall_mm: 140.0, soil_moisture_pct: 85.0, pore_pressure_kpa: 34.0 },
  { time: 'Day 5', rainfall_mm: 195.0, soil_moisture_pct: 94.0, pore_pressure_kpa: 48.0 },
  { time: 'Day 6', rainfall_mm: 162.0, soil_moisture_pct: 96.5, pore_pressure_kpa: 52.0 },
  { time: 'Day 7 (Today)', rainfall_mm: 118.0, soil_moisture_pct: 93.0, pore_pressure_kpa: 45.0 },
];

export default function HydrologyTrendChart() {
  const [timeframe, setTimeframe] = useState<'24h' | '7d'>('24h');

  const data = useMemo(() => (timeframe === '24h' ? HOURLY_24H_DATA : DAILY_7D_DATA), [timeframe]);

  const maxRainfall = useMemo(() => Math.max(...data.map((d) => d.rainfall_mm)), [data]);
  const currentMoisture = data[data.length - 1].soil_moisture_pct;

  return (
    <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
              <Droplets className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Hydrological Surcharge & Pore Water Dynamics
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Correlation between precipitation spikes, volumetric soil saturation, and destabilizing pore pressure.
          </p>
        </div>

        {/* Timeframe switch */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTimeframe('24h')}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
              timeframe === '24h' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            24-Hour Cycle
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('7d')}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
              timeframe === '7d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            7-Day Monsoon Trend
          </button>
        </div>
      </div>

      {/* KPI Ticker Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-400">Peak Precipitation</div>
          <div className="text-base font-extrabold text-blue-700 flex items-center gap-1 mt-0.5">
            <CloudRain className="h-4 w-4" />
            {maxRainfall} mm
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-400">Soil Saturation</div>
          <div className={`text-base font-extrabold flex items-center gap-1 mt-0.5 ${
            currentMoisture > 85 ? 'text-rose-600' : 'text-emerald-600'
          }`}>
            <Droplets className="h-4 w-4" />
            {currentMoisture}%
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-400">Pore Pressure (u)</div>
          <div className="text-base font-extrabold text-amber-700 mt-0.5">
            {data[data.length - 1].pore_pressure_kpa} kPa
          </div>
        </div>
        <div className="rounded-2xl bg-rose-50/70 p-3 border border-rose-200">
          <div className="text-[10px] uppercase font-bold text-rose-700 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Hazard Threshold
          </div>
          <div className="text-xs font-bold text-rose-900 mt-1">
            CRITICAL TRIGGER EXCEEDED
          </div>
        </div>
      </div>

      {/* Dual Axis Composed Chart */}
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis
              yAxisId="rain"
              orientation="left"
              tick={{ fontSize: 11, fill: '#2563eb' }}
              label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft', fill: '#2563eb', fontSize: 11 }}
            />
            <YAxis
              yAxisId="moist"
              orientation="right"
              domain={[40, 100]}
              tick={{ fontSize: 11, fill: '#059669' }}
              label={{ value: 'Soil Moisture (%)', angle: 90, position: 'insideRight', fill: '#059669', fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="rounded-2xl bg-slate-900/95 p-3 text-white shadow-xl backdrop-blur-md border border-slate-700 text-xs">
                    <div className="font-bold border-b border-slate-700 pb-1 mb-1.5">{label}</div>
                    <div className="flex items-center justify-between gap-4 text-blue-300">
                      <span>Rainfall:</span>
                      <span className="font-bold">{payload[0]?.value} mm</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-emerald-300 mt-0.5">
                      <span>Soil Moisture:</span>
                      <span className="font-bold">{payload[1]?.value}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-amber-300 mt-0.5">
                      <span>Pore Water Pressure:</span>
                      <span className="font-bold">{payload[0]?.payload?.pore_pressure_kpa} kPa</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend verticalAlign="top" height={32} iconType="circle" />
            <ReferenceLine
              yAxisId="moist"
              y={85}
              label={{ value: 'Critical Saturation Trigger (85%)', fill: '#e11d48', fontSize: 10 }}
              stroke="#e11d48"
              strokeDasharray="4 4"
            />
            <Bar yAxisId="rain" dataKey="rainfall_mm" name="Precipitation (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
            <Line
              yAxisId="moist"
              type="monotone"
              dataKey="soil_moisture_pct"
              name="Soil Moisture (%)"
              stroke="#059669"
              strokeWidth={3}
              dot={{ r: 4, fill: '#059669' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
