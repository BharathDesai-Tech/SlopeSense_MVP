import math
from typing import Any, Dict, Optional

GAMMA_WATER = 9.81  # kN/m^3

# Standard geotechnical parameters by soil classification (IS 14458 / GSI standards)
SOIL_GEOTECH_PROPERTIES = {
    "Clayey": {
        "cohesion_kpa": 22.0,
        "friction_angle_deg": 22.0,
        "unit_weight_kn_m3": 17.5,
    },
    "Loamy": {
        "cohesion_kpa": 14.0,
        "friction_angle_deg": 28.0,
        "unit_weight_kn_m3": 18.0,
    },
    "Sandy": {
        "cohesion_kpa": 4.0,
        "friction_angle_deg": 34.0,
        "unit_weight_kn_m3": 19.0,
    },
    "Rocky": {
        "cohesion_kpa": 45.0,
        "friction_angle_deg": 38.0,
        "unit_weight_kn_m3": 22.0,
    },
}


def calculate_factor_of_safety(
    slope_angle_deg: float,
    soil_moisture_pct: float,
    soil_type: str = "Loamy",
    depth_z_m: float = 2.0,
    cohesion_kpa_override: Optional[float] = None,
    friction_angle_deg_override: Optional[float] = None,
    unit_weight_override: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Computes the Geotechnical Factor of Safety (FoS) for an infinite slope model:
      FoS = (c' + (gamma * z - gamma_w * h_w) * cos^2(beta) * tan(phi')) / (gamma * z * sin(beta) * cos(beta))
    """
    props = SOIL_GEOTECH_PROPERTIES.get(soil_type, SOIL_GEOTECH_PROPERTIES["Loamy"])
    c_prime = float(cohesion_kpa_override if cohesion_kpa_override is not None else props["cohesion_kpa"])
    phi_deg = float(friction_angle_deg_override if friction_angle_deg_override is not None else props["friction_angle_deg"])
    gamma = float(unit_weight_override if unit_weight_override is not None else props["unit_weight_kn_m3"])

    # Near flat terrain: mathematically infinite FoS (zero driving stress)
    if slope_angle_deg <= 1.0:
        return {
            "factor_of_safety": 9.99,
            "stability_state": "STABLE",
            "pore_water_pressure_kpa": 0.0,
            "shear_strength_kpa": round(c_prime, 2),
            "mobilized_shear_kpa": 0.0,
            "water_table_height_m": 0.0,
            "geotechnical_advisory": "Flat slope with negligible gravitational shear driving stress.",
        }

    beta_rad = math.radians(min(89.0, max(1.0, slope_angle_deg)))
    phi_rad = math.radians(min(60.0, max(5.0, phi_deg)))

    # Phreatic water level above slip surface derived from saturation
    # Below 25% moisture, matric suction prevents positive pore pressure
    saturation_ratio = max(0.0, min(1.0, (soil_moisture_pct - 25.0) / 75.0))
    h_w = depth_z_m * saturation_ratio

    # Saturation softening of cohesion (standard hillslope geotechnical practice)
    c_effective = c_prime * (1.0 - 0.55 * saturation_ratio) if cohesion_kpa_override is None else c_prime

    pore_pressure_u = GAMMA_WATER * h_w  # u = gamma_w * h_w (kPa)

    cos_beta = math.cos(beta_rad)
    sin_beta = math.sin(beta_rad)
    cos2_beta = cos_beta * cos_beta

    # Effective normal stress sigma' = (gamma * z - u) * cos^2(beta)
    effective_vertical_stress = max(0.0, (gamma * depth_z_m) - pore_pressure_u)
    effective_normal_stress = effective_vertical_stress * cos2_beta

    # Resisting shear strength tau_f = c' + sigma' * tan(phi')
    resisting_shear = c_effective + (effective_normal_stress * math.tan(phi_rad))

    # Mobilized driving shear stress tau_m = gamma * z * sin(beta) * cos(beta)
    mobilized_shear = gamma * depth_z_m * sin_beta * cos_beta

    if mobilized_shear <= 1e-4:
        fos = 9.99
    else:
        fos = round(resisting_shear / mobilized_shear, 2)

    # Classification per GSI / NDMA slope stability categories
    if fos < 1.0:
        stability_state = "CRITICAL_FAILURE"
        advisory = "Factor of Safety < 1.0: Driving shear stress exceeds resisting strength. Slope is in active failure."
    elif fos < 1.25:
        stability_state = "MARGINALLY_STABLE"
        advisory = "Factor of Safety 1.0 - 1.25: Marginally stable; highly susceptible to rapid failure if pore pressure rises."
    elif fos < 1.50:
        stability_state = "MODERATELY_STABLE"
        advisory = "Factor of Safety 1.25 - 1.50: Moderately stable; continuous drainage monitoring advised."
    else:
        stability_state = "STABLE"
        advisory = "Factor of Safety >= 1.50: Mechanically stable under current geotechnical parameters."

    return {
        "factor_of_safety": min(9.99, fos),
        "stability_state": stability_state,
        "pore_water_pressure_kpa": round(pore_pressure_u, 2),
        "shear_strength_kpa": round(resisting_shear, 2),
        "mobilized_shear_kpa": round(mobilized_shear, 2),
        "water_table_height_m": round(h_w, 2),
        "geotechnical_advisory": advisory,
    }
