import json
import os
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
import xgboost as xgb

KNOWN_SOIL_TYPES = ["Clayey", "Loamy", "Rocky", "Sandy"]
NUMERICAL_FEATURES = [
    "monsoon_rainfall_mm",
    "soil_moisture_pct",
    "slope_angle_deg",
    "vegetation_cover_pct",
    "historical_incidents_10yr",
    "latitude",
    "longitude",
]


def prepare_features(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    df_clean = df.copy()
    for col in NUMERICAL_FEATURES:
        df_clean[col] = pd.to_numeric(df_clean[col], errors="coerce").fillna(0.0)

    # One-hot encode soil_type with fixed columns
    for st in KNOWN_SOIL_TYPES:
        df_clean[f"soil_type_{st}"] = (df_clean["soil_type"] == st).astype(float)

    feature_cols = NUMERICAL_FEATURES + [f"soil_type_{st}" for st in KNOWN_SOIL_TYPES]
    return df_clean[feature_cols], feature_cols


def train_and_export():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, ".."))
    csv_candidates = [
        os.path.join(project_root, "slope_data.csv"),
        os.path.join(r"C:\Users\91725\OneDrive\Desktop\SlopeSense_MVP", "slope_data.csv"),
        os.path.join(r"C:\Users\91725\OneDrive\Desktop\project", "slope_data.csv"),
    ]

    csv_path = next((p for p in csv_candidates if os.path.exists(p)), None)
    if not csv_path:
        raise FileNotFoundError(f"Could not locate slope_data.csv in candidates: {csv_candidates}")

    print(f"Loading training data from: {csv_path}")
    df = pd.read_csv(csv_path)
    X, feature_names = prepare_features(df)
    y = df["risk_percentage"].astype(float)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = xgb.XGBRegressor(
        n_estimators=180,
        max_depth=4,
        learning_rate=0.06,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
    )

    print("Fitting XGBoost Regressor...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    r2 = float(r2_score(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae = float(mean_absolute_error(y_test, y_pred))
    baseline_risk = float(y_train.mean())

    print(f"Test Set Evaluation:")
    print(f"  R² Score : {r2:.4f}")
    print(f"  RMSE     : {rmse:.4f}")
    print(f"  MAE      : {mae:.4f}")
    print(f"  Baseline : {baseline_risk:.2f}%")

    output_dirs = [
        os.path.join(project_root, "models"),
        r"C:\Users\91725\OneDrive\Desktop\project\models",
    ]

    metadata = {
        "model_name": "LandslideRiskXGBoost",
        "version": "1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "feature_names": feature_names,
        "numerical_features": NUMERICAL_FEATURES,
        "soil_types": KNOWN_SOIL_TYPES,
        "metrics": {
            "r2_score": round(r2, 4),
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
        },
        "baseline_risk": round(baseline_risk, 2),
        "hyperparameters": model.get_params(),
    }

    for out_dir in output_dirs:
        os.makedirs(out_dir, exist_ok=True)
        model_file = os.path.join(out_dir, "landslide_xgb_model.json")
        meta_file = os.path.join(out_dir, "model_metadata.json")

        model.save_model(model_file)
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        print(f"Saved artifacts to: {out_dir}")

    return metadata


if __name__ == "__main__":
    train_and_export()
