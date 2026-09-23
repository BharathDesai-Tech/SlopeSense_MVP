from datetime import datetime, timezone
from src.auth.security import hash_password
from src.db.models import EmergencyAlert, IncidentReport, User
from src.db.session import SessionLocal


def seed_database():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            return

        print("[Seed] Seeding initial disaster management responders and field incidents...")

        # Create Admin / NDRF Authority User
        admin_user = User(
            email="ndrf.control@slopesense.in",
            name="Commander S. K. Barua",
            hashed_password=hash_password("responder123"),
            role="admin",
            organization="NDRF (National Disaster Response Force)",
            badge_id="NDRF-BN1-094",
            district="Kamrup Metropolitan",
            phone="+91-361-2840123",
            preferred_language="en",
            is_verified=True,
            trust_score=98.0,
            reputation_points=450,
            verified_reports_count=18,
        )
        db.add(admin_user)

        # Create Primary NDRF Commander User (SIH 2026 Demo)
        ndrf_demo_user = User(
            email="commander@ndrf.gov.in",
            name="Commander Rajesh Sharma (NDRF)",
            hashed_password=hash_password("ndrf2026"),
            role="admin",
            organization="NDRF (National Disaster Response Force)",
            badge_id="NDRF-HQ-001",
            district="Kamrup Metropolitan",
            phone="+91-361-2840999",
            preferred_language="en",
            is_verified=True,
            trust_score=99.0,
            reputation_points=500,
            verified_reports_count=25,
        )
        db.add(ndrf_demo_user)

        # Create Field Responder User
        responder_user = User(
            email="field.officer@slopesense.in",
            name="Inspector T. Jamir",
            hashed_password=hash_password("responder123"),
            role="responder",
            organization="ASDMA (Assam State Disaster Management)",
            badge_id="ASDMA-KAM-412",
            district="Kamrup Metropolitan",
            phone="+91-94360-12345",
            preferred_language="as",
            is_verified=True,
            trust_score=92.0,
            reputation_points=320,
            verified_reports_count=14,
        )
        db.add(responder_user)

        # Create Verified Citizen Reporter
        citizen_user = User(
            email="citizen@slopesense.in",
            name="Bipin Gogoi (Community Scout)",
            hashed_password=hash_password("citizen123"),
            role="citizen",
            phone="+91-98640-54321",
            preferred_language="en",
            is_verified=True,
            trust_score=85.0,
            reputation_points=85,
            verified_reports_count=4,
        )
        db.add(citizen_user)
        db.commit()
        db.refresh(admin_user)
        db.refresh(responder_user)
        db.refresh(citizen_user)

        # Create realistic pre-loaded incident reports
        sample_reports = [
            IncidentReport(
                user_id=responder_user.id,
                report_type="ground_cracks",
                description="Longitudinal tension crack measuring 8.4cm aperture opened across the south-bound asphalt lane. Inclinometer telemetry confirms continuous creep of 14.2mm over past 24h.",
                latitude=26.1445,
                longitude=91.7362,
                location_name="Guwahati NH-27 Mountain Cut Slope #4B",
                photo_url="/uploads/reports/crack_nh27.svg",
                photo_filename="crack_nh27.svg",
                status="verified",
                severity="critical",
                admin_notes="Verified by SDMA rapid inspection unit. Traffic diverted to single lane; barrier erection in progress.",
            ),
            IncidentReport(
                user_id=None,
                report_type="water_seepage",
                description="Heavy turbid water seepage observed gushing from the lower slope toe. Soil saturation above 94% with localized slumping.",
                latitude=25.2986,
                longitude=91.7289,
                location_name="Cherrapunji High-Precipitation Escarpment Sector 12",
                photo_url="/uploads/reports/seepage_cherra.svg",
                photo_filename="seepage_cherra.svg",
                status="investigating",
                severity="moderate",
                admin_notes="Hydrological drainage crew dispatched to clear blocked weep holes.",
            ),
            IncidentReport(
                user_id=admin_user.id,
                report_type="rockfall",
                description="Rockfall failure triggered by prolonged antecedent monsoon precipitation. Dislodged quartzite boulders (approx 45 m³) blocking highway corridor.",
                latitude=27.3389,
                longitude=88.6065,
                location_name="NH-10 Teesta River Cut Corridor (Gangtok)",
                photo_url="/uploads/reports/rockfall_gangtok.svg",
                photo_filename="rockfall_gangtok.svg",
                status="pending",
                severity="critical",
                admin_notes="BRO clearing team mobilized with heavy earthmovers.",
            ),
        ]

        for r in sample_reports:
            db.add(r)

        # Create initial emergency alerts
        sample_alerts = [
            EmergencyAlert(
                title="Immediate Evacuation Warning: Sector 4B",
                message="Deep tension cracking detected on NH-27 slope shoulder. High probability of translational slide within 12-24 hours. Follow designated evacuation paths to Sonapur Community Relief Camp.",
                level="critical",
                region_name="Kamrup Metropolitan / Guwahati",
                latitude=26.1445,
                longitude=91.7362,
                radius_km=12.0,
                languages_json='{"en": "Immediate Evacuation Warning: Sector 4B", "hi": "तत्काल निकासी चेतावनी: सेक्टर 4बी", "as": "স্থানান্তৰৰ জৰুৰীকালীন সতৰ্কবাণী: ৪বি খণ্ড"}',
            ),
            EmergencyAlert(
                title="Heavy Monsoon Flash Precipitation Advisory",
                message="Precipitation rate exceeding 45mm/hour in East Khasi Hills. Soil moisture approaching full saturation. Exercise extreme caution along escarpment roadways.",
                level="warning",
                region_name="East Khasi Hills / Cherrapunji",
                latitude=25.2986,
                longitude=91.7289,
                radius_km=25.0,
                languages_json='{"en": "Heavy Monsoon Precipitation Advisory", "hi": "भारी मानसून वर्षा परामर्श", "as": "প্ৰবল বাৰিষা বৰষুণৰ সতৰ্কবাণী"}',
            ),
        ]

        for a in sample_alerts:
            db.add(a)

        db.commit()
        print("[Seed] Successfully seeded initial users, incident reports, and emergency alerts.")
    finally:
        db.close()
