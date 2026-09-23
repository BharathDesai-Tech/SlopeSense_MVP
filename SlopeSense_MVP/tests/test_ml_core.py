import unittest
import numpy as np
from fastapi.testclient import TestClient

from src.main import app
from src.ml.geotech import calculate_factor_of_safety
from src.ml.predictor import LandslidePredictor


class TestGeotechnicalFoS(unittest.TestCase):
    def test_flat_slope_is_stable(self):
        result = calculate_factor_of_safety(slope_angle_deg=0.5, soil_moisture_pct=50.0, soil_type="Loamy")
        self.assertEqual(result["stability_state"], "STABLE")
        self.assertGreaterEqual(result["factor_of_safety"], 5.0)

    def test_steep_saturated_clay_fails(self):
        result = calculate_factor_of_safety(
            slope_angle_deg=55.0,
            soil_moisture_pct=95.0,
            soil_type="Clayey",
        )
        self.assertEqual(result["stability_state"], "CRITICAL_FAILURE")
        self.assertLess(result["factor_of_safety"], 1.0)
        self.assertGreater(result["pore_water_pressure_kpa"], 10.0)

    def test_gentle_dry_slope_is_moderately_stable(self):
        result = calculate_factor_of_safety(
            slope_angle_deg=18.0,
            soil_moisture_pct=20.0,
            soil_type="Rocky",
        )
        self.assertIn(result["stability_state"], ["MODERATELY_STABLE", "STABLE"])
        self.assertGreater(result["factor_of_safety"], 1.25)


class TestMLPredictorAndSHAP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = LandslidePredictor.get_instance()

    def test_model_loaded(self):
        self.assertIsNotNone(self.predictor.model)
        self.assertIsNotNone(self.predictor.explainer)
        self.assertGreaterEqual(len(self.predictor.feature_names), 10)

    def test_prediction_bounds(self):
        sample = {
            "monsoon_rainfall_mm": 500.0,
            "soil_moisture_pct": 55.0,
            "slope_angle_deg": 35.0,
            "vegetation_cover_pct": 40.0,
            "historical_incidents_10yr": 5,
            "soil_type": "Loamy",
            "latitude": 26.1,
            "longitude": 91.7,
        }
        res = self.predictor.predict(sample)
        self.assertIn("risk_score", res)
        self.assertTrue(0.0 <= res["risk_score"] <= 100.0)
        self.assertIn(res["risk_level"], ["CRITICAL", "WARNING", "STABLE"])

    def test_shap_additivity_property(self):
        """
        Verifies Lundberg local accuracy: Base_Value + Sum(SHAP) == Raw_Model_Prediction
        """
        sample = {
            "monsoon_rainfall_mm": 750.0,
            "soil_moisture_pct": 80.0,
            "slope_angle_deg": 45.0,
            "vegetation_cover_pct": 20.0,
            "historical_incidents_10yr": 8,
            "soil_type": "Clayey",
            "latitude": 27.2,
            "longitude": 94.1,
        }
        res = self.predictor.predict(sample)
        shap_info = res["shap_explainability"]
        base_val = shap_info["base_value"]
        shap_sum = sum(f["shap_value"] for f in shap_info["factors"])
        reconstructed = base_val + shap_sum

        X, _ = self.predictor._build_feature_vector(sample)
        raw_pred = float(self.predictor.model.predict(X)[0])

        self.assertAlmostEqual(reconstructed, raw_pred, delta=0.08)

    def test_vegetation_reduces_risk(self):
        base_sample = {
            "monsoon_rainfall_mm": 600.0,
            "soil_moisture_pct": 60.0,
            "slope_angle_deg": 40.0,
            "historical_incidents_10yr": 4,
            "soil_type": "Loamy",
        }
        low_veg = self.predictor.predict({**base_sample, "vegetation_cover_pct": 10.0})
        high_veg = self.predictor.predict({**base_sample, "vegetation_cover_pct": 90.0})
        self.assertGreater(low_veg["risk_score"], high_veg["risk_score"])


class TestPredictionAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_predict_endpoint_success(self):
        payload = {
            "monsoon_rainfall_mm": 620.0,
            "soil_moisture_pct": 68.0,
            "slope_angle_deg": 42.0,
            "vegetation_cover_pct": 25.0,
            "historical_incidents_10yr": 6,
            "soil_type": "Clayey",
            "latitude": 27.1,
            "longitude": 93.6,
        }
        resp = self.client.post("/api/v1/predict", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "Success")
        self.assertIn("risk_score", data)
        self.assertIn("geotechnical", data)
        self.assertIn("factor_of_safety", data["geotechnical"])
        self.assertIn("shap_explainability", data)
        self.assertGreater(len(data["shap_explainability"]["factors"]), 5)

    def test_model_info_endpoint(self):
        resp = self.client.get("/api/v1/model-info")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "Success")
        self.assertEqual(data["model_name"], "LandslideRiskXGBoost")
        self.assertIn("r2_score", data["metrics"])

    def test_batch_predict_endpoint(self):
        batch = [
            {
                "monsoon_rainfall_mm": 300.0,
                "soil_moisture_pct": 35.0,
                "slope_angle_deg": 15.0,
                "vegetation_cover_pct": 70.0,
                "historical_incidents_10yr": 1,
                "soil_type": "Sandy",
            },
            {
                "monsoon_rainfall_mm": 900.0,
                "soil_moisture_pct": 85.0,
                "slope_angle_deg": 52.0,
                "vegetation_cover_pct": 15.0,
                "historical_incidents_10yr": 9,
                "soil_type": "Clayey",
            },
        ]
        resp = self.client.post("/api/v1/batch-predict", json=batch)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["count"], 2)


if __name__ == "__main__":
    unittest.main()
