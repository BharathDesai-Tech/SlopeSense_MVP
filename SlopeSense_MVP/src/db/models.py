import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from src.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="citizen", nullable=False)  # citizen, responder, admin
    organization = Column(String(100), nullable=True)  # NDRF, SDMA, GSI, PWD
    badge_id = Column(String(50), nullable=True)  # Official officer/responder ID
    district = Column(String(100), nullable=True)  # Assigned monitoring district
    phone = Column(String(20), nullable=True)
    preferred_language = Column(String(10), default="en", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_otp = Column(String(10), nullable=True)
    verification_otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    trust_score = Column(Float, default=50.0, nullable=False)  # 0 to 100
    reputation_points = Column(Integer, default=10, nullable=False)  # Gained on verified reports
    verified_reports_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    reports = relationship("IncidentReport", back_populates="user", cascade="all, delete-orphan")


class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    report_type = Column(String(50), nullable=False)  # ground_cracks, water_seepage, rockfall, road_subsidence
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String(200), nullable=True)
    landmark_description = Column(String(300), nullable=True)
    photo_url = Column(String(500), nullable=True)
    photo_filename = Column(String(255), nullable=True)
    status = Column(String(20), default="pending", nullable=False)  # pending, verified, investigating, resolved, rejected
    severity = Column(String(20), default="moderate", nullable=False)  # low, moderate, critical
    reporter_trust_score = Column(Float, default=50.0, nullable=True)
    points_awarded = Column(Integer, default=0, nullable=False)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="reports")


class EmergencyAlert(Base):
    __tablename__ = "emergency_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    level = Column(String(20), default="warning", nullable=False)  # critical, warning, info
    region_name = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius_km = Column(Float, default=15.0, nullable=False)
    languages_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
