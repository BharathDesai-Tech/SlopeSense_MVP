import { useEffect, useRef, useState, useMemo } from 'react';
import { Sliders, RotateCcw, AlertTriangle, ShieldCheck, Play, Pause, Flame } from 'lucide-react';

export default function SlopeFailureSimulator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Geotechnical Slider Parameters
  const [slopeAngle, setSlopeAngle] = useState<number>(38); // degrees
  const [rainfallMm, setRainfallMm] = useState<number>(120); // mm/day
  const [soilMoisture, setSoilMoisture] = useState<number>(85); // %
  const [cohesionKpa, setCohesionKpa] = useState<number>(15); // kPa (c')
  const [frictionAngleDeg, setFrictionAngleDeg] = useState<number>(28); // phi' degrees

  // Simulation Animation State
  const [animating, setAnimating] = useState<boolean>(true);
  const [slipDisplacement, setSlipDisplacement] = useState<number>(0);

  // Geotechnical Calculation: Factor of Safety (FoS)
  const geotechCalc = useMemo(() => {
    const betaRad = (slopeAngle * Math.PI) / 180;
    const phiRad = (frictionAngleDeg * Math.PI) / 180;

    // Soil unit weight (increases with moisture saturation)
    const gamma = 17.5 + (soilMoisture / 100) * 4.5; // kN/m³ (17.5 dry to 22.0 saturated)
    const z = 4.2; // depth of failure plane in meters

    // Pore water pressure u = m * gamma_w * z * cos^2(beta)
    const m = Math.max(0, Math.min(1.0, (soilMoisture - 40) / 55 + (rainfallMm / 220) * 0.45));
    const gammaW = 9.81; // kN/m³
    const u = m * gammaW * z * Math.pow(Math.cos(betaRad), 2);

    // Driving shear stress: tau_driving = gamma * z * sin(beta) * cos(beta)
    const tauDriving = gamma * z * Math.sin(betaRad) * Math.cos(betaRad);

    // Resisting shear strength (Mohr-Coulomb with effective stress):
    // sigma'_n = gamma * z * cos^2(beta) - u
    const sigmaEffective = Math.max(0.1, gamma * z * Math.pow(Math.cos(betaRad), 2) - u);
    const tauResisting = cohesionKpa + sigmaEffective * Math.tan(phiRad);

    const fos = Math.max(0.2, tauResisting / Math.max(0.1, tauDriving));

    return {
      fos: parseFloat(fos.toFixed(2)),
      u: parseFloat(u.toFixed(1)),
      tauDriving: parseFloat(tauDriving.toFixed(1)),
      tauResisting: parseFloat(tauResisting.toFixed(1)),
      waterTableFraction: m,
      isFailing: fos < 1.0,
      status: fos >= 1.5 ? 'STABLE' : fos >= 1.0 ? 'MARGINAL' : 'CRITICAL_FAILURE',
    };
  }, [slopeAngle, rainfallMm, soilMoisture, cohesionKpa, frictionAngleDeg]);

  // Update slip displacement when failing
  useEffect(() => {
    let animId: number;
    const loop = () => {
      if (animating) {
        if (geotechCalc.isFailing) {
          setSlipDisplacement((prev) => (prev < 90 ? prev + 1.2 : prev));
        } else {
          // Slowly heal or settle back
          setSlipDisplacement((prev) => (prev > 0 ? Math.max(0, prev - 1.5) : 0));
        }
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [animating, geotechCalc.isFailing]);

  // Canvas 2D Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (geotechCalc.isFailing) {
      skyGrad.addColorStop(0, '#fef2f2');
      skyGrad.addColorStop(1, '#fee2e2');
    } else {
      skyGrad.addColorStop(0, '#f0f9ff');
      skyGrad.addColorStop(1, '#e0f2fe');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Coordinate Anchors
    const slopeStartX = 80;
    const slopeStartY = height - 60;
    const crestX = width - 120;
    const crestY = Math.max(50, slopeStartY - Math.tan((slopeAngle * Math.PI) / 180) * (crestX - slopeStartX) * 0.45);

    // 1. Bedrock Layer (Lower stationary mass)
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(slopeStartX - 30, slopeStartY);
    ctx.lineTo(crestX, crestY + 50);
    ctx.lineTo(width, crestY + 50);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = '#64748b'; // Slate gray bedrock
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bedrock Hatching
    ctx.fillStyle = '#475569';
    for (let x = 20; x < width - 20; x += 35) {
      for (let y = crestY + 70; y < height - 10; y += 30) {
        ctx.fillRect(x, y, 6, 2);
      }
    }

    // 2. Slip Shear Surface (Failure Arc)
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.moveTo(slopeStartX - 10, slopeStartY + 5);
    ctx.quadraticCurveTo((slopeStartX + crestX) / 2 - 20, (slopeStartY + crestY) / 2 + 35, crestX - 10, crestY + 45);
    ctx.strokeStyle = geotechCalc.isFailing ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Sliding Soil Colluvium Block (Upper mass displaced by slipDisplacement)
    ctx.save();
    if (slipDisplacement > 0) {
      // Displace along the slope vector
      const dx = -slipDisplacement * 0.85;
      const dy = slipDisplacement * 0.55;
      ctx.translate(dx, dy);
    }

    // Upper Soil Polygon
    ctx.beginPath();
    ctx.moveTo(slopeStartX - 10, slopeStartY);
    ctx.lineTo(crestX - 10, crestY);
    ctx.lineTo(width, crestY);
    ctx.lineTo(width, crestY + 45);
    ctx.lineTo(crestX - 10, crestY + 45);
    ctx.quadraticCurveTo((slopeStartX + crestX) / 2 - 20, (slopeStartY + crestY) / 2 + 35, slopeStartX - 10, slopeStartY + 5);
    ctx.closePath();

    // Soil gradient based on moisture
    const soilGrad = ctx.createLinearGradient(0, crestY, 0, slopeStartY);
    if (soilMoisture > 80) {
      soilGrad.addColorStop(0, '#78350f'); // Saturated dark mud
      soilGrad.addColorStop(1, '#451a03');
    } else {
      soilGrad.addColorStop(0, '#b45309'); // Loam
      soilGrad.addColorStop(1, '#92400e');
    }
    ctx.fillStyle = soilGrad;
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Surface Vegetation Canopy (Trees on the hillside)
    ctx.fillStyle = geotechCalc.isFailing ? '#84cc16' : '#15803d';
    const numTrees = 7;
    for (let i = 0; i <= numTrees; i++) {
      const t = i / numTrees;
      const tx = slopeStartX + t * (crestX - slopeStartX);
      const ty = slopeStartY - t * (slopeStartY - crestY);

      // Trunk
      ctx.fillStyle = '#78350f';
      ctx.fillRect(tx - 2, ty - 8, 4, 8);
      // Pine foliage
      ctx.beginPath();
      ctx.moveTo(tx - 10, ty - 8);
      ctx.lineTo(tx, ty - 26);
      ctx.lineTo(tx + 10, ty - 8);
      ctx.closePath();
      ctx.fillStyle = geotechCalc.isFailing ? '#65a30d' : '#16a34a';
      ctx.fill();
    }

    ctx.restore(); // restore translation

    // 4. Phreatic Water Table Surface (rising blue dashed wave)
    const wtYOffset = 30 * geotechCalc.waterTableFraction;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(slopeStartX, slopeStartY - wtYOffset + 10);
    ctx.lineTo(crestX, crestY + 45 - wtYOffset);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Water table label
    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Water Table (u = ${geotechCalc.u} kPa)`, slopeStartX + 30, slopeStartY - wtYOffset - 8);

    // 5. Falling Rain Particles (when rainfall > 0)
    if (rainfallMm > 20) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      const drops = Math.floor(rainfallMm / 3);
      for (let i = 0; i < drops; i++) {
        const rx = (i * 37) % width;
        const ry = (i * 29 + (Date.now() / 8) % 150) % (height - 80);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 4, ry + 12);
        ctx.stroke();
      }
    }

    // 6. Shear Failure Rupture Particles (Dust & Rockfall debris when failing)
    if (slipDisplacement > 5) {
      ctx.fillStyle = '#ea580c';
      for (let i = 0; i < 18; i++) {
        const px = slopeStartX - 30 + ((i * 17 + slipDisplacement * 4) % 80);
        const py = slopeStartY + 10 - ((i * 13) % 40);
        ctx.beginPath();
        ctx.arc(px, py, (i % 3) + 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 7. On-Canvas HUD Telemetry
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.roundRect(15, 15, 240, 95, 14);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('PHYSICS ENGINE: INFINITE SLOPE', 26, 36);

    ctx.font = 'bold 18px sans-serif';
    if (geotechCalc.fos >= 1.5) {
      ctx.fillStyle = '#34d399';
      ctx.fillText(`FoS = ${geotechCalc.fos} (STABLE)`, 26, 62);
    } else if (geotechCalc.fos >= 1.0) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`FoS = ${geotechCalc.fos} (MARGINAL)`, 26, 62);
    } else {
      ctx.fillStyle = '#f87171';
      ctx.fillText(`FoS = ${geotechCalc.fos} (FAILURE)`, 26, 62);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Driving: ${geotechCalc.tauDriving} kPa | Resisting: ${geotechCalc.tauResisting} kPa`, 26, 82);
    ctx.fillText(`Slip Displacement: ${slipDisplacement.toFixed(1)} cm`, 26, 98);
  }, [slopeAngle, rainfallMm, soilMoisture, cohesionKpa, frictionAngleDeg, geotechCalc, slipDisplacement]);

  const resetSliders = () => {
    setSlopeAngle(38);
    setRainfallMm(120);
    setSoilMoisture(85);
    setCohesionKpa(15);
    setFrictionAngleDeg(28);
    setSlipDisplacement(0);
  };

  const triggerWorstCaseFailure = () => {
    setSlopeAngle(54);
    setRainfallMm(210);
    setSoilMoisture(96);
    setCohesionKpa(8);
    setFrictionAngleDeg(22);
  };

  return (
    <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Sliders className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Interactive 2D Slope Failure Physics Simulator
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time Mohr-Coulomb shear strength analysis. Adjust rainfall and gradient to trigger or arrest hillside failure.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAnimating((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
          >
            {animating ? <Pause className="h-3.5 w-3.5 text-slate-600" /> : <Play className="h-3.5 w-3.5 text-slate-600" />}
            {animating ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={resetSliders}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={triggerWorstCaseFailure}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 active:scale-95"
          >
            <Flame className="h-3.5 w-3.5" />
            Simulate Rupture
          </button>
        </div>
      </div>

      {/* What-If Simulation vs Live Telemetry Notice */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 text-xs text-amber-950">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>What-If Stress-Testing Simulator:</strong> Allows geotechnical officers and NDMA evaluators to test hypothetical extremes (cloudbursts, road-cutting excavations) and observe slip mechanics. Live un-simulated IoT sensor telemetry is continuously monitored on the <strong className="text-amber-950 font-bold">Authority Command Desk</strong>.
          </span>
        </div>
      </div>

      {/* Real Station Telemetry Presets */}
      <div className="flex items-center flex-wrap gap-2 text-xs">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Load Real Northeast Station Baseline:
        </span>
        <button
          type="button"
          onClick={() => {
            setSlopeAngle(34);
            setRainfallMm(48);
            setSoilMoisture(68);
            setCohesionKpa(16);
            setFrictionAngleDeg(29);
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 font-bold text-slate-700 transition-all text-[11px]"
        >
          📍 Guwahati NH-27 Cut
        </button>
        <button
          type="button"
          onClick={() => {
            setSlopeAngle(46);
            setRainfallMm(210);
            setSoilMoisture(94);
            setCohesionKpa(10);
            setFrictionAngleDeg(24);
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 font-bold text-slate-700 transition-all text-[11px]"
        >
          🌧️ Cherrapunji Ridge (Extreme)
        </button>
        <button
          type="button"
          onClick={() => {
            setSlopeAngle(42);
            setRainfallMm(135);
            setSoilMoisture(82);
            setCohesionKpa(12);
            setFrictionAngleDeg(26);
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border border-slate-200 font-bold text-slate-700 transition-all text-[11px]"
        >
          ⚡ Singtam Teesta Cut (Active Joint)
        </button>
        <button
          type="button"
          onClick={() => {
            setSlopeAngle(22);
            setRainfallMm(12);
            setSoilMoisture(45);
            setCohesionKpa(22);
            setFrictionAngleDeg(32);
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 font-bold text-slate-700 transition-all text-[11px]"
        >
          🛡️ Stable Valley Foothills
        </button>
      </div>

      {/* Simulator 2D Canvas */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
        <canvas
          ref={canvasRef}
          width={720}
          height={320}
          className="w-full h-64 sm:h-80 object-cover block"
        />

        {/* Dynamic Alert Banner over Canvas when failing */}
        {geotechCalc.isFailing && (
          <div className="absolute top-3 right-3 flex items-center gap-2 rounded-2xl bg-rose-600/90 backdrop-blur-md px-3.5 py-2 text-white shadow-lg animate-pulse">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-extrabold uppercase tracking-wide">
              Active Slip Plane Rupture in Progress!
            </span>
          </div>
        )}
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
        {/* Slider 1: Slope Angle */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Slope Gradient (β)</span>
            <span className="text-blue-700">{slopeAngle}°</span>
          </div>
          <input
            type="range"
            min={15}
            max={65}
            value={slopeAngle}
            onChange={(e) => setSlopeAngle(parseInt(e.target.value))}
            className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>15° (Gentle)</span>
            <span>45° (Steep)</span>
            <span>65° (Cliff)</span>
          </div>
        </div>

        {/* Slider 2: Rainfall */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Precipitation Infiltration</span>
            <span className="text-blue-700">{rainfallMm} mm/day</span>
          </div>
          <input
            type="range"
            min={0}
            max={250}
            value={rainfallMm}
            onChange={(e) => setRainfallMm(parseInt(e.target.value))}
            className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0 mm</span>
            <span>120 mm (High)</span>
            <span>250 mm (Monsoon Cloudburst)</span>
          </div>
        </div>

        {/* Slider 3: Soil Moisture */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Soil Saturation Ratio</span>
            <span className={soilMoisture > 85 ? 'text-rose-600 font-extrabold' : 'text-blue-700'}>
              {soilMoisture}%
            </span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            value={soilMoisture}
            onChange={(e) => setSoilMoisture(parseInt(e.target.value))}
            className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>20% (Dry)</span>
            <span>60% (Moist)</span>
            <span>100% (Fully Saturated)</span>
          </div>
        </div>

        {/* Slider 4: Effective Cohesion c' */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Root & Soil Cohesion (c')</span>
            <span className="text-emerald-700">{cohesionKpa} kPa</span>
          </div>
          <input
            type="range"
            min={2}
            max={35}
            value={cohesionKpa}
            onChange={(e) => setCohesionKpa(parseInt(e.target.value))}
            className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>2 kPa (Weathered sand)</span>
            <span>35 kPa (Heavy clay + deep roots)</span>
          </div>
        </div>

        {/* Slider 5: Friction Angle */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Internal Friction Angle (φ')</span>
            <span className="text-emerald-700">{frictionAngleDeg}°</span>
          </div>
          <input
            type="range"
            min={18}
            max={42}
            value={frictionAngleDeg}
            onChange={(e) => setFrictionAngleDeg(parseInt(e.target.value))}
            className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>18° (Slickensided clay)</span>
            <span>42° (Dense angular gravel)</span>
          </div>
        </div>

        {/* Summary Card */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Slope Health</div>
            <div className="text-sm font-extrabold flex items-center gap-1.5">
              {geotechCalc.fos >= 1.5 ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700">Safe Slope</span>
                </>
              ) : geotechCalc.fos >= 1.0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-700">Creeping / Warning</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span className="text-rose-700">Active Landslide</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">FoS Ratio</div>
            <div className={`text-lg font-black ${
              geotechCalc.fos >= 1.5 ? 'text-emerald-700' : geotechCalc.fos >= 1.0 ? 'text-amber-700' : 'text-rose-700'
            }`}>
              {geotechCalc.fos}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
