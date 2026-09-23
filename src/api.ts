import type { NortheastLocation } from '@/data/neLocations';

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string) ||
  (typeof window !== 'undefined' && window.location.port !== '5173'
    ? window.location.origin
    : 'http://127.0.0.1:8002');

export interface RiskFactor {
  key: string;
  label: string;
  value: number;
  source: string;
}

export interface RiskAnalysis {
  overall_risk_score: number;
  risk_level: 'CRITICAL' | 'WARNING' | 'STABLE';
  confidence: number;
  advisory: string;
  geotechnical?: {
    factor_of_safety: number;
    stability_status: string;
    driving_shear_stress_kpa: number;
    resisting_shear_strength_kpa: number;
    pore_pressure_u_kpa?: number;
    effective_friction_angle_deg?: number;
    effective_cohesion_kpa?: number;
  };
  explainability: {
    factors: RiskFactor[];
    normalised_total: number;
    method: string;
  };
  shap_breakdown: Record<string, number>;
}

export interface RiskMetrics {
  live_rainfall_mm: number;
  cumulative_rainfall_24h_mm?: number;
  current_temperature_c: number;
  soil_moisture_pct: number;
  slope_deg?: number;
  pore_pressure_kpa?: number;
  ground_displacement_mm: number;
  displacement_rate_mm_day?: number;
  insar_los_velocity_mm_yr?: number;
  seismic_pga_g?: number;
  microtremor_magnitude?: number;
  fault_zone?: string;
}

export interface GeotechnicalData {
  factor_of_safety: number;
  stability_status: string;
  driving_shear_stress_kpa: number;
  resisting_shear_strength_kpa: number;
  slope_angle_deg?: number;
  pore_pressure_u_kpa?: number;
  effective_friction_angle_deg?: number;
  effective_cohesion_kpa?: number;
}

export interface RemoteSensingData {
  satellite_platform: string;
  insar_velocity_los_mm_yr: number;
  lidar_elevation_m: number;
  lidar_curvature: string;
}

export interface SeismicData {
  fault_zone: string;
  seismic_zone: string;
  recent_microtremor_mag: string;
  peak_ground_acceleration_pga: string;
}

export interface HistoricalInventoryData {
  gsi_past_landslides_10yr: number;
  last_major_failure_year: number;
  susceptibility_class: string;
}

export interface RiskLocation extends NortheastLocation {
  metrics: RiskMetrics;
  geotechnical?: GeotechnicalData;
  remote_sensing?: RemoteSensingData;
  seismic?: SeismicData;
  historical_inventory?: HistoricalInventoryData;
  risk_analysis: RiskAnalysis;
}

export interface FaultLine {
  name: string;
  type: string;
  hazard_rating: string;
  coordinates: [number, number][];
}

export interface HistoricalLandslide {
  id: string;
  name: string;
  year: number;
  latitude: number;
  longitude: number;
  failure_mode: string;
  rainfall_trigger_mm: number;
  volume_m3: number;
  source: string;
}

export interface MapLayersResponse {
  status: string;
  fault_lines: FaultLine[];
  historical_landslides: HistoricalLandslide[];
}

export interface RegionalRiskResponse {
  status: string;
  generated_at: string;
  locations: RiskLocation[];
}

export async function fetchRegionalRisk(signal?: AbortSignal): Promise<RiskLocation[]> {
  const response = await fetch(`${API_BASE_URL}/api/northeast-risk`, { signal });
  if (!response.ok) throw new Error(`Risk feed returned ${response.status}`);
  const payload = (await response.json()) as RegionalRiskResponse;
  if (!Array.isArray(payload.locations)) throw new Error('Risk feed returned no locations');
  return payload.locations;
}

export async function fetchMapLayers(signal?: AbortSignal): Promise<MapLayersResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/map-layers`, { signal });
  if (!response.ok) throw new Error(`Map layers feed returned ${response.status}`);
  return (await response.json()) as MapLayersResponse;
}

export async function fetchLocationRisk(location: NortheastLocation, signal?: AbortSignal): Promise<RiskLocation> {
  const response = await fetch(
    `${API_BASE_URL}/api/realtime-monitoring?lat=${location.latitude}&lon=${location.longitude}`,
    { signal },
  );
  if (!response.ok) throw new Error(`Location feed returned ${response.status}`);
  const payload = await response.json();
  return { ...location, ...payload } as RiskLocation;
}
