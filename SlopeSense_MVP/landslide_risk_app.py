# ==============================================================
# Landslide Risk Explorer — Interactive Map + Simulated SHAP
# ==============================================================
# A Streamlit app that:
#   1. Loads your mock landslide dataset (slope_data.csv)
#   2. Plots every location on a Folium map as a colored marker
#        Red    = high risk   (risk_percentage > 70)
#        Yellow = medium risk (40-70)
#        Green  = low risk    (< 40)
#   3. When you click a marker, the sidebar shows a bar chart
#      breaking down WHY that spot is risky — how much each
#      factor (rainfall, slope, soil moisture, etc.) pushed the
#      risk score up or down compared to the dataset average.
#
# NOTE ON "SIMULATED SHAP": this app does not load a trained
# XGBoost model + real SHAP values. Instead it recreates the same
# style of breakdown using the known weights from the mock data
# generator, so it runs instantly with no model file needed. If
# you want a TRUE SHAP breakdown from your trained model instead,
# see the "swap in real SHAP" note near the bottom of this file.
#
# HOW TO RUN:
#   1. Put this file and slope_data.csv in the same folder.
#   2. In a terminal:  pip install streamlit folium streamlit-folium pandas numpy plotly
#   3. Run:             streamlit run landslide_risk_app.py
# ==============================================================

import numpy as np
import pandas as pd
import streamlit as st
import folium
from streamlit_folium import st_folium
import plotly.graph_objects as go


# --------------------------------------------------------------
# PAGE CONFIG (must be the first Streamlit command)
# --------------------------------------------------------------
st.set_page_config(
    page_title="Landslide Risk Explorer — Northeast India",
    layout="wide",
)


# --------------------------------------------------------------
# STEP 1: Load the dataset
# --------------------------------------------------------------
DATA_PATH = "slope_data.csv"

@st.cache_data
def load_data(path):
    return pd.read_csv(path)

try:
    df = load_data(DATA_PATH)
except FileNotFoundError:
    st.error(
        f"Could not find '{DATA_PATH}'. Make sure it's in the same "
        "folder as this app, or change DATA_PATH near the top of the script."
    )
    st.stop()

# Columns this app expects. Adjust here if your CSV uses different names.
COL_LAT = "latitude"
COL_LON = "longitude"
COL_RISK = "risk_percentage"
COL_RAIN = "monsoon_rainfall_mm"
COL_SOIL_MOISTURE = "soil_moisture_pct"
COL_SLOPE = "slope_angle_deg"
COL_VEGETATION = "vegetation_cover_pct"
COL_SOIL_TYPE = "soil_type"
COL_INCIDENTS = "historical_incidents_10yr"


# --------------------------------------------------------------
# STEP 2: Helper — assign a color based on risk percentage
# --------------------------------------------------------------
def risk_color(risk):
    if risk > 70:
        return "red"
    elif risk >= 40:
        return "orange"  # folium doesn't have a plain "yellow" marker color
    else:
        return "green"


def risk_label(risk):
    if risk > 70:
        return "High Risk"
    elif risk >= 40:
        return "Medium Risk"
    else:
        return "Low Risk"


# --------------------------------------------------------------
# STEP 3: Simulated SHAP-style contribution breakdown
# --------------------------------------------------------------
# Reuses the same weights that generated the mock dataset, so the
# explanation is internally consistent with how risk was built.
# Each factor's contribution = weight x (this row's normalized
# value - the dataset's average normalized value). Positive means
# "pushed risk UP relative to average"; negative means "pushed it DOWN".

FEATURE_WEIGHTS = {
    "Rainfall": 28,
    "Soil Moisture": 22,
    "Slope Angle": 24,
    "Historical Incidents": 14,
    "Soil Type": 12,
    "Vegetation Cover": -15,  # more vegetation LOWERS risk
}

SOIL_TYPE_FACTOR = {"Sandy": 0.5, "Loamy": 0.65, "Clayey": 0.9, "Rocky": 0.3}

# Normalization caps, matching the generator script
NORM_CAPS = {
    "Rainfall": 1200,
    "Soil Moisture": 100,
    "Slope Angle": 70,
    "Historical Incidents": 20,
    "Vegetation Cover": 100,
}

def normalized_row_values(row):
    return {
        "Rainfall": min(row[COL_RAIN] / NORM_CAPS["Rainfall"], 1),
        "Soil Moisture": min(row[COL_SOIL_MOISTURE] / NORM_CAPS["Soil Moisture"], 1),
        "Slope Angle": min(row[COL_SLOPE] / NORM_CAPS["Slope Angle"], 1),
        "Historical Incidents": min(row[COL_INCIDENTS] / NORM_CAPS["Historical Incidents"], 1),
        "Vegetation Cover": min(row[COL_VEGETATION] / NORM_CAPS["Vegetation Cover"], 1),
        "Soil Type": SOIL_TYPE_FACTOR.get(row[COL_SOIL_TYPE], 0.6),
    }

@st.cache_data
def dataset_average_normalized(df):
    """Average normalized value for each feature, across the whole dataset."""
    all_norms = df.apply(normalized_row_values, axis=1, result_type="expand")
    return all_norms.mean()

AVG_NORM = dataset_average_normalized(df)

def compute_contributions(row):
    row_norm = normalized_row_values(row)
    contributions = {}
    for feature, weight in FEATURE_WEIGHTS.items():
        contributions[feature] = weight * (row_norm[feature] - AVG_NORM[feature])
    return contributions


# --------------------------------------------------------------
# STEP 4: Build the Folium map
# --------------------------------------------------------------
def build_map(df):
    center_lat = df[COL_LAT].mean()
    center_lon = df[COL_LON].mean()

    fmap = folium.Map(location=[center_lat, center_lon], zoom_start=6, tiles="CartoDB positron")

    for idx, row in df.iterrows():
        color = risk_color(row[COL_RISK])
        popup_html = f"""
        <div style="font-family: sans-serif; font-size: 13px;">
            <b>{risk_label(row[COL_RISK])} — {row[COL_RISK]:.1f}%</b><br>
            Lat/Lon: {row[COL_LAT]:.4f}, {row[COL_LON]:.4f}<br>
            Rainfall: {row[COL_RAIN]:.0f} mm<br>
            Slope: {row[COL_SLOPE]:.1f}&deg;<br>
            Soil moisture: {row[COL_SOIL_MOISTURE]:.1f}%<br>
            Soil type: {row[COL_SOIL_TYPE]}<br>
            <i>Click marker, then check the sidebar &rarr;</i>
        </div>
        """
        folium.Marker(
            location=[row[COL_LAT], row[COL_LON]],
            popup=folium.Popup(popup_html, max_width=250),
            tooltip=f"Risk: {row[COL_RISK]:.1f}%",
            icon=folium.Icon(color=color, icon="info-sign"),
        ).add_to(fmap)

    return fmap


# --------------------------------------------------------------
# STEP 5: Layout — title, legend, and the map
# --------------------------------------------------------------
st.title("🏔️ Landslide Risk Explorer — Northeast India")
st.caption(
    "Click any marker on the map to see a breakdown of what's driving "
    "the risk score for that specific location."
)

legend_col1, legend_col2, legend_col3, _ = st.columns([1, 1, 1, 3])
legend_col1.markdown("🔴 **High risk** (>70%)")
legend_col2.markdown("🟠 **Medium risk** (40–70%)")
legend_col3.markdown("🟢 **Low risk** (<40%)")

map_col, sidebar_col = st.columns([2, 1])

with map_col:
    fmap = build_map(df)
    map_data = st_folium(fmap, width=None, height=600, returned_objects=["last_object_clicked"])


# --------------------------------------------------------------
# STEP 6: Match the click back to a row, then show the breakdown
# --------------------------------------------------------------
def find_closest_row(df, lat, lon):
    distances = np.sqrt((df[COL_LAT] - lat) ** 2 + (df[COL_LON] - lon) ** 2)
    return df.loc[distances.idxmin()]

with sidebar_col:
    st.subheader("📊 Risk Breakdown")

    clicked = map_data.get("last_object_clicked") if map_data else None

    if not clicked:
        st.info("👈 Click a marker on the map to see why that location is at risk.")
    else:
        row = find_closest_row(df, clicked["lat"], clicked["lng"])

        st.metric(
            label=risk_label(row[COL_RISK]),
            value=f"{row[COL_RISK]:.1f}%",
        )
        st.caption(f"📍 {row[COL_LAT]:.4f}, {row[COL_LON]:.4f}")

        with st.expander("Raw feature values", expanded=False):
            st.write(
                {
                    "Rainfall (mm)": row[COL_RAIN],
                    "Soil moisture (%)": row[COL_SOIL_MOISTURE],
                    "Slope angle (deg)": row[COL_SLOPE],
                    "Vegetation cover (%)": row[COL_VEGETATION],
                    "Soil type": row[COL_SOIL_TYPE],
                    "Historical incidents (10yr)": int(row[COL_INCIDENTS]),
                }
            )

        contributions = compute_contributions(row)
        sorted_items = sorted(contributions.items(), key=lambda kv: kv[1])
        features_sorted = [k for k, _ in sorted_items]
        values_sorted = [v for _, v in sorted_items]
        bar_colors = ["#d62728" if v > 0 else "#2ca02c" for v in values_sorted]

        fig = go.Figure(
            go.Bar(
                x=values_sorted,
                y=features_sorted,
                orientation="h",
                marker_color=bar_colors,
                text=[f"{v:+.1f}" for v in values_sorted],
                textposition="outside",
            )
        )
        fig.update_layout(
            title="Contribution to risk score (vs. dataset average)",
            xaxis_title="Impact on risk (percentage points)",
            height=350,
            margin=dict(l=10, r=10, t=40, b=10),
        )
        fig.add_vline(x=0, line_width=1, line_color="gray")

        st.plotly_chart(fig, use_container_width=True)

        st.caption(
            "🔴 Red bars pushed this location's risk **above** the dataset "
            "average. 🟢 Green bars pulled it **below** average."
        )


# --------------------------------------------------------------
# SWAP IN REAL SHAP (optional, for advanced users)
# --------------------------------------------------------------
# If you've already trained the XGBoost model from the earlier script
# and saved it (e.g. model.save_model("model.json")), you can replace
# `compute_contributions()` above with real SHAP values instead of the
# simulated version:
#
#   import shap
#   from xgboost import XGBRegressor
#   model = XGBRegressor()
#   model.load_model("model.json")
#   explainer = shap.TreeExplainer(model)
#
#   def compute_contributions(row):
#       feature_cols = ["monsoon_rainfall_mm", "soil_moisture_pct",
#                        "slope_angle_deg", "historical_incidents_10yr"]
#       shap_vals = explainer.shap_values(row[feature_cols].to_frame().T)[0]
#       return dict(zip(feature_cols, shap_vals))
#
# This gives you the model's ACTUAL learned reasoning instead of a
# hand-coded approximation — worth doing once you trust your model.
