from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class ReportResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    report_type: str
    description: str
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    landmark_description: Optional[str] = None
    photo_url: Optional[str] = None
    photo_filename: Optional[str] = None
    status: Literal["pending", "verified", "investigating", "resolved", "rejected"]
    severity: Literal["low", "moderate", "critical"]
    reporter_trust_score: Optional[float] = 50.0
    points_awarded: int = 0
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportStatusUpdate(BaseModel):
    status: Literal["pending", "verified", "investigating", "resolved", "rejected"]
    admin_notes: Optional[str] = Field(None, max_length=1000)
    severity: Optional[Literal["low", "moderate", "critical"]] = None


class ReportListResponse(BaseModel):
    status: str = "Success"
    count: int
    reports: List[ReportResponse]
