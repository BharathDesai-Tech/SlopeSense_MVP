from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    monsoon_rainfall_mm: float = Field(..., ge=0.0, le=3000.0, description="Cumulative or seasonal rainfall in mm")
    soil_moisture_pct: float = Field(..., ge=0.0, le=100.0, description="Volumetric or relative soil moisture percentage")
    slope_angle_deg: float = Field(..., ge=0.0, le=89.0, description="Terrain slope angle in degrees")
    vegetation_cover_pct: float = Field(..., ge=0.0, le=100.0, description="Vegetation cover percentage")
    soil_type: Literal["Clayey", "Loamy", "Rocky", "Sandy"] = Field("Loamy", description="Primary soil classification")
    historical_incidents_10yr: int = Field(0, ge=0, le=100, description="Recorded landslide incidents in past 10 years")
    latitude: Optional[float] = Field(26.1445, ge=20.0, le=32.0, description="Latitude coordinate")
    longitude: Optional[float] = Field(92.8000, ge=85.0, le=100.0, description="Longitude coordinate")
    depth_z_m: Optional[float] = Field(2.0, ge=0.5, le=20.0, description="Depth to failure slip plane in meters")
    cohesion_kpa: Optional[float] = Field(None, ge=0.0, le=200.0, description="Effective soil cohesion c' in kPa")
    friction_angle_deg: Optional[float] = Field(None, ge=0.0, le=60.0, description="Internal friction angle phi' in degrees")
    unit_weight_kn_m3: Optional[float] = Field(None, ge=10.0, le=30.0, description="Soil unit weight gamma in kN/m^3")


class ShapFactor(BaseModel):
    feature: str
    label: str
    raw_value: float
    shap_value: float
    impact_type: Literal["INCREASES_RISK", "REDUCES_RISK"]


class ShapExplainability(BaseModel):
    base_value: float
    prediction: float
    primary_driver: str
    primary_mitigator: str
    factors: List[ShapFactor]
    method: str


class GeotechnicalResult(BaseModel):
    factor_of_safety: float
    stability_state: Literal["CRITICAL_FAILURE", "MARGINALLY_STABLE", "MODERATELY_STABLE", "STABLE"]
    pore_water_pressure_kpa: float
    shear_strength_kpa: float
    mobilized_shear_kpa: float
    water_table_height_m: float
    geotechnical_advisory: str


class PredictionResponse(BaseModel):
    status: str = "Success"
    risk_score: float
    risk_level: Literal["CRITICAL", "WARNING", "STABLE"]
    confidence: float
    advisory: str
    geotechnical: GeotechnicalResult
    shap_explainability: ShapExplainability


class ModelInfoResponse(BaseModel):
    status: str = "Success"
    model_name: str
    version: str
    trained_at: str
    baseline_risk: float
    metrics: Dict[str, float]
    feature_names: List[str]
    soil_types: List[str]
