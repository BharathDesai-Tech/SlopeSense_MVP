import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.auth.dependencies import get_current_user
from src.auth.security import create_access_token, hash_password, verify_password
from src.db.models import User
from src.db.session import get_db
from src.services.email_service import send_otp_email
from src.schemas.auth import (
    ForgotPasswordRequest,
    RegisterResponse,
    ResendOtpRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserProfile,
    UserRegister,
    VerifyEmailRequest,
)

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])

VALID_AUTHORITY_CODES = {
    "NDRF-SECURE-2026",
    "SDMA-2026",
    "GSI-OFFICER",
    "PWD-ASSAM-2026",
    "DISASTER-ADMIN",
}


def generate_six_digit_otp() -> str:
    return f"{random.randint(100000, 999999)}"


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    normalized_email = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please log in or verify.",
        )

    # Validate official department code for authority/responder registration
    if payload.role in ["responder", "admin"]:
        provided_code = (payload.department_code or "").strip().upper()
        if provided_code not in VALID_AUTHORITY_CODES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Department Authorization Code. First responder credentials require official clearance (e.g. NDRF-SECURE-2026 or SDMA-2026).",
            )

    otp = generate_six_digit_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=15)

    new_user = User(
        email=normalized_email,
        name=payload.name.strip(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        organization=payload.organization,
        badge_id=payload.badge_id,
        district=payload.district,
        phone=payload.phone,
        preferred_language=payload.preferred_language,
        is_verified=False,
        verification_otp=otp,
        verification_otp_expires_at=expiry,
        trust_score=50.0,
        reputation_points=10,
        verified_reports_count=0,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Dispatch OTP via email service (or log to terminal in demo mode)
    send_otp_email(new_user.email, otp, purpose="verify_email")

    return {
        "status": "pending_verification",
        "message": f"Verification code transmitted to {new_user.email}. Enter the 6-digit code to activate your account.",
        "email": new_user.email,
        "demo_otp": otp,  # Exposed for SIH evaluation/demonstration
        "user": new_user,
    }


@router.post("/verify-email", response_model=TokenResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    if user.is_verified:
        token = create_access_token(
            {
                "sub": user.id,
                "email": user.email,
                "role": user.role,
                "organization": user.organization,
                "badge_id": user.badge_id,
            }
        )
        return {"status": "Success", "access_token": token, "token_type": "bearer", "user": user}

    if not user.verification_otp or user.verification_otp != payload.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect 6-digit verification code. Please check your email and try again.",
        )

    # Validate expiration
    if user.verification_otp_expires_at:
        exp = user.verification_otp_expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new code.",
            )

    user.is_verified = True
    user.verification_otp = None
    user.verification_otp_expires_at = None
    db.commit()
    db.refresh(user)

    token = create_access_token(
        {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "organization": user.organization,
            "badge_id": user.badge_id,
        }
    )
    return {
        "status": "Success",
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/resend-otp")
def resend_verification_otp(payload: ResendOtpRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.is_verified:
        return {"status": "Success", "message": "Account is already verified. Please sign in."}

    otp = generate_six_digit_otp()
    user.verification_otp = otp
    user.verification_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.commit()

    send_otp_email(user.email, otp, purpose="verify_email")

    return {
        "status": "Success",
        "message": f"New verification code transmitted to {user.email}.",
        "demo_otp": otp,
    }


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address.",
        )

    otp = generate_six_digit_otp()
    user.verification_otp = otp
    user.verification_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.commit()

    send_otp_email(user.email, otp, purpose="password_reset")

    return {
        "status": "Success",
        "message": f"Password reset code dispatched to {user.email}.",
        "email": user.email,
        "demo_otp": otp,
    }


@router.post("/reset-password", response_model=TokenResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    normalized_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    if not user.verification_otp or user.verification_otp != payload.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect 6-digit password reset code. Please check your email.",
        )

    # Check expiration
    if user.verification_otp_expires_at:
        exp = user.verification_otp_expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset code has expired. Please request a new code.",
            )

    user.hashed_password = hash_password(payload.new_password)
    user.is_verified = True  # Verifying password reset also verifies email if pending
    user.verification_otp = None
    user.verification_otp_expires_at = None
    db.commit()
    db.refresh(user)

    token = create_access_token(
        {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "organization": user.organization,
            "badge_id": user.badge_id,
        }
    )

    return {
        "status": "Success",
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }



@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    normalized_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact emergency administration.",
        )

    if not user.is_verified:
        # Generate fresh OTP if needed
        if not user.verification_otp:
            user.verification_otp = generate_six_digit_otp()
            user.verification_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Email not verified. Enter the verification code sent to your email. (Demo Code: {user.verification_otp})",
        )

    token = create_access_token(
        {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "organization": user.organization,
            "badge_id": user.badge_id,
        }
    )
    return {
        "status": "Success",
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me", response_model=UserProfile)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
