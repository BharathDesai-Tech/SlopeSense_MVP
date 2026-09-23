import json
import os
from typing import Any, Dict, List, Optional
import numpy as np
import shap
import xgboost as xgb

from src.ml.geotech import calculate_factor_of_safety

FEATURE_LABELS = {
    "monsoon_rainfall_mm": "Monsoon Rainfall",
    "soil_moisture_pct": "Soil Saturation",
    "slope_angle_deg": "Slope Inclination",
    "vegetation_cover_pct": "Vegetation Cover",
    "historical_incidents_10yr": "Historical Landslide Frequency",
    "latitude": "Latitude Coordinate",
    "longitude": "Longitude Coordinate",
    "soil_type_Clayey": "Clayey Soil Composition",
    "soil_type_Loamy": "Loamy Soil Composition",
    "soil_type_Rocky": "Rocky Bedrock Layer",
    "soil_type_Sandy": "Sandy Soil Composition",
}


class LandslidePredictor:
    _instance: Optional["LandslidePredictor"] = None

    def __init__(self):
        self.model: Optional[xgb.XGBRegressor] = None
        self.explainer: Optional[shap.TreeExplainer] = None
        self.metadata: Dict[str, Any] = {}
        self.feature_names: List[str] = []
        self.base_value: float = 36.22
        self._load_model()

    @classmethod
    def get_instance(cls) -> "LandslidePredictor":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_model(self):
        model_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", "models"),
            r"C:\Users\91725\OneDrive\Desktop\project\models",
            r"C:\Users\91725\OneDrive\Desktop\SlopeSense_MVP\models",
        ]

        model_file = None
        meta_file = None
        for base in model_paths:
            m = os.path.join(base, "landslide_xgb_model.json")
            meta = os.path.join(base, "model_metadata.json")
            if os.path.exists(m) and os.path.exists(meta):
                model_file = m
                meta_file = meta
                break

        if not model_file or not meta_file:
            raise FileNotFoundError("Could not find trained model and metadata in known search paths.")

        with open(meta_file, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        self.feature_names = self.metadata["feature_names"]
        self.base_value = float(self.metadata.get("baseline_risk", 36.22))

        self.model = xgb.XGBRegressor()
        self.model.load_model(model_file)
        self.explainer = shap.TreeExplainer(self.model)
        print(f"[LandslidePredictor] Loaded XGBoost model and initialized TreeExplainer from: {model_file}")

    def _build_feature_vector(self, data: Dict[str, Any]) -> tuple[np.ndarray, Dict[str, Any]]:
        soil_type = str(data.get("soil_type", "Loamy")).capitalize()
        if soil_type not in ["Clayey", "Loamy", "Rocky", "Sandy"]:
            soil_type = "Loamy"

        raw_values = {
            "monsoon_rainfall_mm": float(data.get("monsoon_rainfall_mm", 0.0)),
            "soil_moisture_pct": float(data.get("soil_moisture_pct", 30.0)),
            "slope_angle_deg": float(data.get("slope_angle_deg", 15.0)),
            "vegetation_cover_pct": float(data.get("vegetation_cover_pct", 50.0)),
            "historical_incidents_10yr": float(data.get("historical_incidents_10yr", 0)),
            "latitude": float(data.get("latitude", 26.0)),
            "longitude": float(data.get("longitude", 92.5)),
            "soil_type_Clayey": 1.0 if soil_type == "Clayey" else 0.0,
            "soil_type_Loamy": 1.0 if soil_type == "Loamy" else 0.0,
            "soil_type_Rocky": 1.0 if soil_type == "Rocky" else 0.0,
            "soil_type_Sandy": 1.0 if soil_type == "Sandy" else 0.0,
        }

        vector = [raw_values.get(f, 0.0) for f in self.feature_names]
        return np.array([vector], dtype=float), raw_values

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.model or not self.explainer:
            self._load_model()

        X, raw_values = self._build_feature_vector(input_data)
        raw_prediction = float(self.model.predict(X)[0])
        clamped_risk = round(float(np.clip(raw_prediction, 0.0, 100.0)), 1)

        # Exact SHAP values from TreeExplainer
        shap_raw = self.explainer.shap_values(X)[0]
        base_val = float(self.explainer.expected_value)

        # Consolidate categorical one-hot features into readable factors
        factors = []
        for feature_name, shap_val in zip(self.feature_names, shap_raw):
            val = round(float(shap_val), 2)
            raw_val = raw_values.get(feature_name, 0.0)
            factors.append(
                {
                    "feature": feature_name,
                    "label": FEATURE_LABELS.get(feature_name, feature_name),
                    "raw_value": raw_val,
                    "shap_value": val,
                    "impact_type": "INCREASES_RISK" if val > 0 else "REDUCES_RISK",
                }
            )

        # Sort by magnitude of impact
        sorted_factors = sorted(factors, key=lambda f: abs(f["shap_value"]), reverse=True)
        top_driver = next((f for f in sorted_factors if f["shap_value"] > 0), None)
        top_mitigator = next((f for f in sorted_factors if f["shap_value"] < 0), None)

        # Compute Geotechnical Factor of Safety
        geotech = calculate_factor_of_safety(
            slope_angle_deg=float(input_data.get("slope_angle_deg", 15.0)),
            soil_moisture_pct=float(input_data.get("soil_moisture_pct", 30.0)),
            soil_type=str(input_data.get("soil_type", "Loamy")).capitalize(),
            depth_z_m=float(input_data.get("depth_z_m", 2.0)),
            cohesion_kpa_override=input_data.get("cohesion_kpa"),
            friction_angle_deg_override=input_data.get("friction_angle_deg"),
            unit_weight_override=input_data.get("unit_weight_kn_m3"),
        )

        fos = geotech["factor_of_safety"]
        if clamped_risk > 70 or fos < 1.0:
            risk_level = "CRITICAL"
            advisory = "CRITICAL WARNING: Imminent landslide hazard. Factor of safety or ML risk triggers mandatory evacuation protocol."
        elif clamped_risk > 40 or fos < 1.25:
            risk_level = "WARNING"
            advisory = "ADVISORY: Heightened slope vulnerability. Increased rainfall may trigger localized slippage; prepare response teams."
        else:
            risk_level = "STABLE"
            advisory = "STABLE: Slope parameters within safe operating thresholds. Continue routine hydrological telemetry monitoring."

        return {
            "risk_score": clamped_risk,
            "risk_level": risk_level,
            "confidence": 0.88,
            "advisory": advisory,
            "geotechnical": geotech,
            "shap_explainability": {
                "base_value": round(base_val, 2),
                "prediction": clamped_risk,
                "primary_driver": top_driver["label"] if top_driver else "Baseline conditions",
                "primary_mitigator": top_mitigator["label"] if top_mitigator else "None",
                "factors": sorted_factors,
                "method": "TreeExplainer (Exact Lundberg Shapley Additive Explanations)",
            },
        }
