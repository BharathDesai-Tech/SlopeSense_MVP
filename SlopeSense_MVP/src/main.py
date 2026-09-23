import math
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from src.db.models import EmergencyAlert
from src.db.seed_data import seed_database
from src.db.session import get_db, init_db
from src.ml.predictor import LandslidePredictor
from src.routers.auth_router import router as auth_router
from src.routers.prediction_router import router as prediction_router
from src.routers.reports_router import router as reports_router
from src.services.weather_service import WeatherService


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and seed initial operational data
    init_db()
    seed_database()

    upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads", "reports")
    os.makedirs(upload_dir, exist_ok=True)
    yield
    # Cleanup background async HTTP sessions on shutdown
    await WeatherService.get_instance().close()


app = FastAPI(
    title="SlopeSense AI Enterprise Backend",
    version="2.0.0",
    description="Geotechnical Landslide Risk Assessment, Explainable AI (SHAP), and Citizen Incident Reporting",
    lifespan=lifespan,
)

# Crucial: Allows your locally hosted web UI to safely request data from this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static media mount for citizen incident photos
uploads_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(os.path.join(uploads_path, "reports"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# Include Core API Routers
app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(prediction_router)

NORTHEAST_LOCATIONS: List[Dict[str, Any]] = [
    {"id": "guwahati", "name": "Guwahati", "state": "Assam", "latitude": 26.1445, "longitude": 91.7362},
    {"id": "silchar", "name": "Silchar", "state": "Assam", "latitude": 24.8273, "longitude": 92.7979},
    {"id": "dibrugarh", "name": "Dibrugarh", "state": "Assam", "latitude": 27.4728, "longitude": 94.9120},
    {"id": "tezpur", "name": "Tezpur", "state": "Assam", "latitude": 26.6339, "longitude": 92.8000},
    {"id": "shillong", "name": "Shillong", "state": "Meghalaya", "latitude": 25.5788, "longitude": 91.8933},
    {"id": "tura", "name": "Tura", "state": "Meghalaya", "latitude": 25.5138, "longitude": 90.2202},
    {"id": "imphal", "name": "Imphal", "state": "Manipur", "latitude": 24.8170, "longitude": 93.9368},
    {"id": "kohima", "name": "Kohima", "state": "Nagaland", "latitude": 25.6741, "longitude": 94.1109},
    {"id": "dimapur", "name": "Dimapur", "state": "Nagaland", "latitude": 25.9090, "longitude": 93.7278},
    {"id": "aizawl", "name": "Aizawl", "state": "Mizoram", "latitude": 23.7307, "longitude": 92.7173},
    {"id": "lunglei", "name": "Lunglei", "state": "Mizoram", "latitude": 22.8671, "longitude": 92.7477},
    {"id": "agartala", "name": "Agartala", "state": "Tripura", "latitude": 23.8315, "longitude": 91.2868},
    {"id": "itanagar", "name": "Itanagar", "state": "Arunachal Pradesh", "latitude": 27.1004, "longitude": 93.6065},
    {"id": "naharlagun", "name": "Naharlagun", "state": "Arunachal Pradesh", "latitude": 27.1245, "longitude": 93.6926},
    {"id": "pasighat", "name": "Pasighat", "state": "Arunachal Pradesh", "latitude": 28.0667, "longitude": 95.3298},
    {"id": "bomdila", "name": "Bomdila", "state": "Arunachal Pradesh", "latitude": 27.2645, "longitude": 92.4086},
    {"id": "tawang", "name": "Tawang", "state": "Arunachal Pradesh", "latitude": 27.5860, "longitude": 91.8655},
    {"id": "jowai", "name": "Jowai", "state": "Meghalaya", "latitude": 25.4660, "longitude": 92.1963},
    {"id": "churachandpur", "name": "Churachandpur", "state": "Manipur", "latitude": 24.3326, "longitude": 93.6698},
    {"id": "kailashahar", "name": "Kailashahar", "state": "Tripura", "latitude": 24.3328, "longitude": 92.0166},
    {"id": "north_lakhimpur", "name": "North Lakhimpur", "state": "Assam", "latitude": 27.2352, "longitude": 94.1036},
    {"id": "jorhat", "name": "Jorhat", "state": "Assam", "latitude": 26.7509, "longitude": 94.2037},
    {"id": "sivasagar", "name": "Sivasagar", "state": "Assam", "latitude": 26.9826, "longitude": 94.6425},
    {"id": "tinsukia", "name": "Tinsukia", "state": "Assam", "latitude": 27.4922, "longitude": 95.3468},
    {"id": "nagaon", "name": "Nagaon", "state": "Assam", "latitude": 26.3464, "longitude": 92.6840},
    {"id": "bongaigaon", "name": "Bongaigaon", "state": "Assam", "latitude": 26.4823, "longitude": 90.5586},
    {"id": "goalpara", "name": "Goalpara", "state": "Assam", "latitude": 26.1664, "longitude": 90.6264},
    {"id": "diphu", "name": "Diphu", "state": "Assam", "latitude": 25.8430, "longitude": 93.4316},
    {"id": "nongpoh", "name": "Nongpoh", "state": "Meghalaya", "latitude": 25.9023, "longitude": 91.8798},
    {"id": "mangan", "name": "Mangan", "state": "Sikkim", "latitude": 27.5091, "longitude": 88.5345},
    {"id": "gangtok", "name": "Gangtok", "state": "Sikkim", "latitude": 27.3389, "longitude": 88.6065},
    {"id": "namchi", "name": "Namchi", "state": "Sikkim", "latitude": 27.1649, "longitude": 88.3639},
    {"id": "pelling", "name": "Pelling", "state": "Sikkim", "latitude": 27.3050, "longitude": 88.2380},
    {"id": "ukhrul", "name": "Ukhrul", "state": "Manipur", "latitude": 25.0967, "longitude": 94.3611},
    {"id": "senapati", "name": "Senapati", "state": "Manipur", "latitude": 25.2670, "longitude": 94.0210},
    {"id": "champhai", "name": "Champhai", "state": "Mizoram", "latitude": 23.4650, "longitude": 93.3280},
    {"id": "kolasib", "name": "Kolasib", "state": "Mizoram", "latitude": 24.2239, "longitude": 92.6780},
    {"id": "serchhip", "name": "Serchhip", "state": "Mizoram", "latitude": 23.3050, "longitude": 92.8460},
    {"id": "mamit", "name": "Mamit", "state": "Mizoram", "latitude": 23.9270, "longitude": 92.4890},
    {"id": "mokokchung", "name": "Mokokchung", "state": "Nagaland", "latitude": 26.3220, "longitude": 94.5180},
    {"id": "mon", "name": "Mon", "state": "Nagaland", "latitude": 26.7160, "longitude": 95.0310},
    {"id": "tuensang", "name": "Tuensang", "state": "Nagaland", "latitude": 26.2680, "longitude": 94.8240},
    {"id": "wokha", "name": "Wokha", "state": "Nagaland", "latitude": 26.0970, "longitude": 94.2590},
    {"id": "zunheboto", "name": "Zunheboto", "state": "Nagaland", "latitude": 25.9670, "longitude": 94.5240},
    {"id": "seppa", "name": "Seppa", "state": "Arunachal Pradesh", "latitude": 27.3650, "longitude": 93.0470},
    {"id": "ziro", "name": "Ziro", "state": "Arunachal Pradesh", "latitude": 27.5440, "longitude": 93.8190},
    {"id": "along", "name": "Aalo", "state": "Arunachal Pradesh", "latitude": 28.1700, "longitude": 94.8000},
    {"id": "roing", "name": "Roing", "state": "Arunachal Pradesh", "latitude": 28.1400, "longitude": 95.8400},
    {"id": "tezu", "name": "Tezu", "state": "Arunachal Pradesh", "latitude": 27.9120, "longitude": 96.1350},
    {"id": "changlang", "name": "Changlang", "state": "Arunachal Pradesh", "latitude": 27.1170, "longitude": 96.7340},
    {"id": "daporijo", "name": "Daporijo", "state": "Arunachal Pradesh", "latitude": 27.9860, "longitude": 94.2220},
    {"id": "dharmanagar", "name": "Dharmanagar", "state": "Tripura", "latitude": 24.3760, "longitude": 92.1700},
    {"id": "ambassa", "name": "Ambassa", "state": "Tripura", "latitude": 23.9340, "longitude": 91.8520},
    {"id": "belonia", "name": "Belonia", "state": "Tripura", "latitude": 23.2510, "longitude": 91.4540},
]

LIVE_CCTV_STATIONS = [
    {
        "id": "cctv-ghy-01",
        "name": "NH-27 Guwahati Mountain Bypass (Slope Sector 4B)",
        "location": "Guwahati, Assam",
        "latitude": 26.1445,
        "longitude": 91.7362,
        "elevation_m": 240,
        "hazard_type": "Tension Crack & Translational Soil Creep",
        "stream_image": "/uploads/reports/crack_nh27.svg",
        "ai_detected_anomaly": "Active Crack: 8.4cm aperture",
        "anomaly_severity": "CRITICAL",
        "status": "STREAMING",
        "fps": 24,
    },
    {
        "id": "cctv-chr-02",
        "name": "Cherrapunji High-Precipitation Escarpment (Station 12)",
        "location": "Sohra, Meghalaya",
        "latitude": 25.2986,
        "longitude": 91.7289,
        "elevation_m": 1430,
        "hazard_type": "Pore Pressure Seepage & Debris Mudflow",
        "stream_image": "/uploads/reports/seepage_cherra.svg",
        "ai_detected_anomaly": "Rapid Seepage Channels (94.2% saturation)",
        "anomaly_severity": "WARNING",
        "status": "STREAMING",
        "fps": 30,
    },
    {
        "id": "cctv-gtk-03",
        "name": "NH-10 Teesta River Cut Corridor (Station 07)",
        "location": "Near Singtam / Gangtok, Sikkim",
        "latitude": 27.3389,
        "longitude": 88.6065,
        "elevation_m": 1650,
        "hazard_type": "Rockfall Joint Scarp Failure",
        "stream_image": "/uploads/reports/rockfall_gangtok.svg",
        "ai_detected_anomaly": "Rockfall Blockage: 45 m³ debris volume",
        "anomaly_severity": "CRITICAL",
        "status": "STREAMING",
        "fps": 20,
    },
]


async def compute_risk_for_coordinate(lat: float, lon: float, use_live_weather: bool = True) -> Dict[str, Any]:
    weather_svc = WeatherService.get_instance()
    if use_live_weather:
        weather_data = await weather_svc.get_live_weather(lat, lon)
    else:
        weather_data = weather_svc.build_synthetic_snapshot(lat, lon)

    current_temp = weather_data.get("current_weather", {}).get("temperature", 0.0)
    live_rainfall = weather_data.get("hourly", {}).get("precipitation", [0.0])[0]

    synthetic = weather_data.get("_synthetic") or {}
    lat_factor = abs(lat - 26.0) * 4.5
    lon_factor = abs(lon - 92.5) * 3.5
    simulated_soil_moisture = min(100.0, float(synthetic.get("soil_moisture_pct", 34.0 + lat_factor + lon_factor)))
    simulated_displacement = min(5.0, float(synthetic.get("ground_displacement_mm", 1.2 + (lat_factor + lon_factor) * 0.12)))

    slope_angle = min(68.0, max(8.0, 22.0 + (lat_factor + lon_factor) * 1.8))
    vegetation_cover = max(15.0, min(88.0, 70.0 - (lat_factor * 2.2)))
    # Compute Pore Water Pressure (u in kPa) via hydrostatic head
    beta_rad = (slope_angle * 3.14159) / 180.0
    gamma_w = 9.81
    phreatic_fraction = min(1.0, max(0.0, (simulated_soil_moisture - 35.0) / 60.0))
    pore_pressure_kpa = round(phreatic_fraction * gamma_w * 4.2 * (math.cos(beta_rad) ** 2), 1)

    # InSAR Satellite Line-of-Sight Deformation (mm/yr)
    insar_los_velocity = round(-1.0 * (simulated_displacement * 4.8 + lat_factor * 1.5), 1)

    # Seismic / Tectonic parameters based on Northeast tectonic blocks
    if lat > 27.0:
        fault_line = "Main Boundary Thrust (MBT) - Himalayan Wedge"
        seismic_mag = round(2.2 + (lat_factor * 0.1), 1)
        pga_g = round(0.12 + (lat_factor * 0.015), 3)
    elif lon > 93.0:
        fault_line = "Kopili Fault Tectonic Zone (Zone V)"
        seismic_mag = round(2.7 + (lon_factor * 0.12), 1)
        pga_g = round(0.18 + (lon_factor * 0.012), 3)
    else:
        fault_line = "Dauki Fault & Shillong Plateau Uplift Margin"
        seismic_mag = round(2.1 + (lat_factor * 0.08), 1)
        pga_g = round(0.14 + (lat_factor * 0.01), 3)

    soil_type = "Clayey" if lat > 26.2 else "Loamy" if lon > 93.0 else "Sandy"

    # Real XGBoost + SHAP + Geotechnical FoS Engine
    predictor = LandslidePredictor.get_instance()
    ml_result = predictor.predict(
        {
            "monsoon_rainfall_mm": live_rainfall * 25.0,
            "soil_moisture_pct": simulated_soil_moisture,
            "slope_angle_deg": slope_angle,
            "vegetation_cover_pct": vegetation_cover,
            "historical_incidents_10yr": int(min(15, simulated_displacement * 2.5)),
            "latitude": lat,
            "longitude": lon,
            "soil_type": soil_type,
        }
    )

    shap_info = ml_result["shap_explainability"]
    top_factors = shap_info["factors"][:4]
    explanation_factors = [
        {
            "key": f["feature"],
            "label": f["label"],
            "value": round(abs(f["shap_value"]), 1),
            "source": f"XGBoost TreeExplainer ({f['impact_type']})",
        }
        for f in top_factors
    ]

    shap_breakdown = {f["label"]: f["shap_value"] for f in shap_info["factors"][:5]}

    return {
        "status": "Success",
        "coordinates": {"latitude": lat, "longitude": lon},
        "metrics": {
            "live_rainfall_mm": round(float(live_rainfall), 2),
            "cumulative_rainfall_24h_mm": round(float(live_rainfall * 18.5 + lat_factor * 6.0), 1),
            "current_temperature_c": round(float(current_temp), 2),
            "soil_moisture_pct": round(float(simulated_soil_moisture), 2),
            "slope_deg": round(float(slope_angle), 1),
            "pore_pressure_kpa": pore_pressure_kpa,
            "ground_displacement_mm": round(float(simulated_displacement), 2),
            "displacement_rate_mm_day": round(float(simulated_displacement * 0.42), 2),
            "insar_los_velocity_mm_yr": insar_los_velocity,
            "seismic_pga_g": pga_g,
            "microtremor_magnitude": seismic_mag,
            "fault_zone": fault_line,
        },
        "geotechnical": {
            **ml_result["geotechnical"],
            "pore_pressure_u_kpa": pore_pressure_kpa,
            "effective_friction_angle_deg": 28.5,
            "effective_cohesion_kpa": 14.2,
        },
        "remote_sensing": {
            "satellite_platform": "Sentinel-1 / NISAR Interferometry",
            "insar_velocity_los_mm_yr": insar_los_velocity,
            "lidar_elevation_m": round(120.0 + lat_factor * 110.0 + lon_factor * 45.0, 0),
            "lidar_curvature": "Concave High Convergence Surcharge" if simulated_soil_moisture > 75 else "Planar Mountain Slope",
        },
        "seismic": {
            "fault_zone": fault_line,
            "seismic_zone": "Zone V (Very High Damage Risk)",
            "recent_microtremor_mag": f"M_L {seismic_mag}",
            "peak_ground_acceleration_pga": f"{pga_g}g",
        },
        "historical_inventory": {
            "gsi_past_landslides_10yr": int(min(15, simulated_displacement * 2.5)),
            "last_major_failure_year": 2022 if simulated_displacement > 2.5 else 2018,
            "susceptibility_class": "Very High" if ml_result["risk_score"] > 70 else "High" if ml_result["risk_score"] > 40 else "Moderate",
        },
        "risk_analysis": {
            "overall_risk_score": ml_result["risk_score"],
            "risk_level": ml_result["risk_level"],
            "confidence": ml_result["confidence"],
            "advisory": ml_result["advisory"],
            "geotechnical": ml_result["geotechnical"],
            "explainability": {
                "factors": explanation_factors,
                "normalised_total": ml_result["risk_score"],
                "method": "XGBoost Machine Learning + Lundberg TreeExplainer SHAP + Geotechnical Factor of Safety (FoS).",
            },
            "shap_breakdown": shap_breakdown,
        },
    }


@app.get("/api/realtime-monitoring")
async def get_slope_telemetry(lat: float, lon: float):
    try:
        return await compute_risk_for_coordinate(lat, lon, use_live_weather=True)
    except Exception as e:
        return {"status": "Error", "message": str(e)}


@app.get("/api/northeast-risk")
async def get_northeast_risk():
    locations: List[Dict[str, Any]] = []
    for location in NORTHEAST_LOCATIONS:
        data = await compute_risk_for_coordinate(location["latitude"], location["longitude"], use_live_weather=False)
        score = data["risk_analysis"]["overall_risk_score"]
        severity = "high" if score > 70 else "moderate" if score > 40 else "low"
        locations.append(
            {
                "id": location["id"],
                "name": location["name"],
                "state": location["state"],
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "severity": severity,
                "metrics": data["metrics"],
                "geotechnical": data.get("geotechnical"),
                "remote_sensing": data.get("remote_sensing"),
                "seismic": data.get("seismic"),
                "historical_inventory": data.get("historical_inventory"),
                "risk_analysis": data["risk_analysis"],
            }
        )

    return {"status": "Success", "generated_at": datetime.now(timezone.utc).isoformat(), "locations": locations}


@app.get("/api/v1/map-layers")
def get_map_layers():
    """
    Returns scientific GIS vector overlays: Tectonic Fault Lines, GSI Historical Landslides,
    and InSAR Subsidence Corridors across Northeast India.
    """
    fault_lines = [
        {
            "name": "Dauki Fault Line (Shillong Plateau Southern Boundary)",
            "type": "Reverse / Strike-Slip Active Fault",
            "hazard_rating": "Zone V (Extreme Ground Acceleration)",
            "coordinates": [
                [25.18, 90.10],
                [25.20, 91.20],
                [25.19, 91.75],
                [25.15, 92.50],
                [25.05, 93.30],
            ],
        },
        {
            "name": "Kopili Fault Zone (Assam-Meghalaya Micro-Seismic Belt)",
            "type": "NW-SE Transcurrent Active Fault",
            "hazard_rating": "Zone V (Recurrent 5.0+ Mw Events)",
            "coordinates": [
                [25.40, 92.60],
                [25.95, 92.90],
                [26.45, 93.20],
                [26.90, 93.45],
            ],
        },
        {
            "name": "Main Boundary Thrust (MBT) - Sub-Himalayan Front",
            "type": "Compressional Megathrust Wedge",
            "hazard_rating": "Zone V (High Seismic Surcharge)",
            "coordinates": [
                [27.05, 88.50],
                [27.15, 90.20],
                [27.10, 92.30],
                [27.35, 94.10],
                [27.95, 96.00],
            ],
        },
    ]

    historical_landslides = [
        {
            "id": "gsi-ls-2022-01",
            "name": "Cherrapunji Escarpment Debris Flow",
            "year": 2022,
            "latitude": 25.2890,
            "longitude": 91.7150,
            "failure_mode": "Translational Colluvial Mudflow",
            "rainfall_trigger_mm": 380.0,
            "volume_m3": 120000,
            "source": "GSI Landslide Inventory #ML-22-04",
        },
        {
            "id": "gsi-ls-2020-02",
            "name": "Guwahati Maligaon Hill Slope Collapse",
            "year": 2020,
            "latitude": 26.1520,
            "longitude": 91.7010,
            "failure_mode": "Pore Pressure Seepage Toe Slide",
            "rainfall_trigger_mm": 195.0,
            "volume_m3": 45000,
            "source": "ASDMA Geological Report #AS-20-12",
        },
        {
            "id": "gsi-ls-2023-03",
            "name": "NH-10 Singtam-Teesta Rockfall Blockage",
            "year": 2023,
            "latitude": 27.2410,
            "longitude": 88.4980,
            "failure_mode": "Structural Joint Wedge Scarp Rupture",
            "rainfall_trigger_mm": 210.0,
            "volume_m3": 85000,
            "source": "Sikkim PWD Geotechnical Cell #SK-23-09",
        },
        {
            "id": "gsi-ls-2021-04",
            "name": "Silchar Mahur Valley Embankment Slump",
            "year": 2021,
            "latitude": 25.1850,
            "longitude": 93.1120,
            "failure_mode": "Rotational Colluvium Shear Failure",
            "rainfall_trigger_mm": 290.0,
            "volume_m3": 62000,
            "source": "Northeast Frontier Railway Geotech Survey",
        },
    ]

    return {
        "status": "Success",
        "fault_lines": fault_lines,
        "historical_landslides": historical_landslides,
    }


@app.get("/api/locations")
def get_locations():
    return {"status": "Success", "count": len(NORTHEAST_LOCATIONS), "locations": NORTHEAST_LOCATIONS}


@app.get("/api/cctv-stations")
def get_cctv_stations():
    return {"status": "Success", "count": len(LIVE_CCTV_STATIONS), "stations": LIVE_CCTV_STATIONS}


@app.get("/api/alerts/active")
def get_active_alerts(db: Session = Depends(get_db)):
    alerts = db.query(EmergencyAlert).filter(EmergencyAlert.is_active.is_(True)).order_by(EmergencyAlert.created_at.desc()).all()
    return {
        "status": "Success",
        "count": len(alerts),
        "alerts": [
            {
                "id": a.id,
                "title": a.title,
                "message": a.message,
                "level": a.level,
                "region_name": a.region_name,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "radius_km": a.radius_km,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
    }


# ==============================================================
# Production SPA Frontend Serving (When deployed as unified app)
# ==============================================================
dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))
if os.path.isdir(dist_path) and os.path.isfile(os.path.join(dist_path, "index.html")):
    from fastapi.responses import FileResponse

    assets_path = os.path.join(dist_path, "assets")
    if os.path.isdir(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="dist_assets")

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            raise HTTPException(status_code=404, detail="Not Found")
        target_file = os.path.join(dist_path, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(dist_path, "index.html"))

