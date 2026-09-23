from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

EMAIL_REGEX = r"^[\w\.\+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,}$"


class UserRegister(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX, description="User email address")
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    role: Literal["citizen", "responder", "admin"] = "citizen"
    organization: Optional[str] = Field(None, max_length=100)
    badge_id: Optional[str] = Field(None, max_length=50)
    district: Optional[str] = Field(None, max_length=100)
    department_code: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    preferred_language: str = Field("en", max_length=10)


class VerifyEmailRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    otp: str = Field(..., min_length=6, max_length=6)


class ResendOtpRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)


class UserLogin(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str


class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_verified: bool = False
    trust_score: float = 50.0
    reputation_points: int = 10
    verified_reports_count: int = 0
    organization: Optional[str] = None
    badge_id: Optional[str] = None
    district: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: str = "en"
    created_at: datetime

    class Config:
        from_attributes = True


class RegisterResponse(BaseModel):
    status: str = "pending_verification"
    message: str
    email: str
    demo_otp: str
    user: UserProfile


class TokenResponse(BaseModel):
    status: str = "Success"
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6, max_length=100)

