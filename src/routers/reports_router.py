import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from src.auth.dependencies import get_current_user, get_optional_user, require_roles
from src.db.models import IncidentReport, User
from src.db.session import get_db
from src.schemas.report import ReportListResponse, ReportResponse, ReportStatusUpdate

router = APIRouter(prefix="/api/v1/reports", tags=["incident-reports"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "reports")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".svg"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_incident_report(
    report_type: str = Form(..., description="ground_cracks, water_seepage, rockfall, road_subsidence"),
    description: str = Form(..., min_length=5, description="Citizen incident description"),
    latitude: float = Form(..., ge=-90.0, le=90.0),
    longitude: float = Form(..., ge=-180.0, le=180.0),
    location_name: Optional[str] = Form(None),
    landmark_description: Optional[str] = Form(None),
    severity: str = Form("moderate", description="low, moderate, critical"),
    photo: Optional[UploadFile] = File(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Submits an incident report with auto-geotag coordinates, manual landmark description,
    and optional photo evidence. Sets reporter trust rating.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    photo_url = None
    saved_filename = None

    if photo and photo.filename:
        ext = os.path.splitext(photo.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '{ext}'. Allowed formats: {list(ALLOWED_EXTENSIONS)}",
            )

        saved_filename = f"{uuid.uuid4().hex[:16]}{ext}"
        destination = os.path.join(UPLOAD_DIR, saved_filename)

        with open(destination, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

        photo_url = f"/uploads/reports/{saved_filename}"

    reporter_trust = current_user.trust_score if current_user else 50.0

    report = IncidentReport(
        user_id=current_user.id if current_user else None,
        report_type=report_type,
        description=description.strip(),
        latitude=latitude,
        longitude=longitude,
        location_name=location_name.strip() if location_name else "Northeast Landslide Sector",
        landmark_description=landmark_description.strip() if landmark_description else None,
        photo_url=photo_url,
        photo_filename=photo.filename if photo else None,
        status="pending",
        severity=severity if severity in ["low", "moderate", "critical"] else "moderate",
        reporter_trust_score=reporter_trust,
        points_awarded=0,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return report


@router.get("", response_model=ReportListResponse)
def list_incident_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity_filter: Optional[str] = Query(None, alias="severity"),
    report_type: Optional[str] = Query(None, alias="type"),
    user_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    List reports with filters and reporter trust scores.
    """
    query = db.query(IncidentReport)

    if status_filter:
        query = query.filter(IncidentReport.status == status_filter)
    if severity_filter:
        query = query.filter(IncidentReport.severity == severity_filter)
    if report_type:
        query = query.filter(IncidentReport.report_type == report_type)
    if user_only and current_user:
        query = query.filter(IncidentReport.user_id == current_user.id)

    total_count = query.count()
    reports = query.order_by(IncidentReport.created_at.desc()).offset(offset).limit(limit).all()

    return {"status": "Success", "count": total_count, "reports": reports}


@router.get("/{report_id}", response_model=ReportResponse)
def get_incident_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(IncidentReport).filter(IncidentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident report not found.")
    return report


def apply_status_update(report: IncidentReport, update_data: ReportStatusUpdate, db: Session) -> IncidentReport:
    previous_status = report.status
    new_status = update_data.status
    report.status = new_status

    if update_data.admin_notes is not None:
        report.admin_notes = update_data.admin_notes
    if update_data.severity is not None:
        report.severity = update_data.severity

    # Reward or penalize reporter based on validation
    if report.user_id:
        reporter = db.query(User).filter(User.id == report.user_id).first()
        if reporter:
            if new_status == "verified" and previous_status != "verified":
                # Award points: +20 for verification, +5 if valid photo attached
                points = 25 if report.photo_url else 20
                if report.points_awarded == 0:
                    reporter.reputation_points += points
                    reporter.trust_score = min(100.0, reporter.trust_score + 4.0)
                    reporter.verified_reports_count += 1
                    report.points_awarded = points
            elif new_status == "rejected" and previous_status != "rejected":
                # Penalty for false report
                reporter.trust_score = max(10.0, reporter.trust_score - 8.0)
                reporter.reputation_points = max(0, reporter.reputation_points - 10)

    db.commit()
    db.refresh(report)
    return report


@router.patch("/{report_id}", response_model=ReportResponse)
def update_report_status(
    report_id: str,
    update_data: ReportStatusUpdate,
    current_user: User = Depends(require_roles(["responder", "admin"])),
    db: Session = Depends(get_db),
):
    report = db.query(IncidentReport).filter(IncidentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident report not found.")
    return apply_status_update(report, update_data, db)


@router.patch("/{report_id}/status", response_model=ReportResponse)
def update_report_status_alias(
    report_id: str,
    update_data: ReportStatusUpdate,
    current_user: User = Depends(require_roles(["responder", "admin"])),
    db: Session = Depends(get_db),
):
    report = db.query(IncidentReport).filter(IncidentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident report not found.")
    return apply_status_update(report, update_data, db)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_incident_report(
    report_id: str,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    report = db.query(IncidentReport).filter(IncidentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident report not found.")

    if report.photo_url:
        filename = os.path.basename(report.photo_url)
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass

    db.delete(report)
    db.commit()
    return None
