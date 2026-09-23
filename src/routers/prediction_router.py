from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException

from src.ml.predictor import LandslidePredictor
from src.schemas.prediction import ModelInfoResponse, PredictionRequest, PredictionResponse

router = APIRouter(prefix="/api/v1", tags=["prediction"])


@router.post("/predict", response_model=PredictionResponse)
def predict_landslide_risk(request: PredictionRequest):
    """
    Unified Landslide Early Warning & Explainable AI endpoint.
    Computes:
      1. XGBoost continuous risk score (0-100)
      2. Exact TreeExplainer SHAP attribution vector
      3. Geotechnical Factor of Safety (FoS) infinite slope stability
    """
    try:
        predictor = LandslidePredictor.get_instance()
        result = predictor.predict(request.model_dump())
        return {"status": "Success", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction pipeline error: {str(e)}")


@router.get("/model-info", response_model=ModelInfoResponse)
def get_model_metadata():
    """
    Returns the trained XGBoost model specifications, feature lists, baseline value, and test metrics.
    """
    try:
        predictor = LandslidePredictor.get_instance()
        meta = predictor.metadata
        return {
            "status": "Success",
            "model_name": meta.get("model_name", "LandslideRiskXGBoost"),
            "version": meta.get("version", "1.0.0"),
            "trained_at": meta.get("trained_at", "Unknown"),
            "baseline_risk": meta.get("baseline_risk", 36.22),
            "metrics": meta.get("metrics", {}),
            "feature_names": meta.get("feature_names", []),
            "soil_types": meta.get("soil_types", []),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read model metadata: {str(e)}")


@router.post("/batch-predict")
def batch_predict_landslide_risk(requests: List[PredictionRequest]):
    """
    Batch scoring endpoint for multiple slope sensors or regional telemetry stations.
    """
    try:
        predictor = LandslidePredictor.get_instance()
        results = [predictor.predict(req.model_dump()) for req in requests]
        return {"status": "Success", "count": len(results), "predictions": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction error: {str(e)}")
