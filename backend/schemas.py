from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .models import UserRole, AchievementType, RRIBand, MedicalCategory

# User Schemas
class UserBase(BaseModel):
    username: str
    role: UserRole

class UserCreate(UserBase):
    password: str
    agniveer_id: Optional[int] = None
    full_name: Optional[str] = None
    rank: Optional[str] = None
    assigned_company: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    user_id: int
    agniveer_id: Optional[int]
    full_name: Optional[str] = None
    rank: Optional[str] = None
    assigned_company: Optional[str] = None

    class Config:
        from_attributes = True

# Agniveer Schemas
class AgniveerBase(BaseModel):
    service_id: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    rank: Optional[str] = None
    unit: Optional[str] = None
    joining_date: Optional[datetime] = None

class AgniveerCreate(AgniveerBase):
    pass

class AgniveerUpdate(BaseModel):
    service_id: Optional[str] = None
    name: Optional[str] = None
    batch_no: Optional[str] = None
    rank: Optional[str] = None
    company: Optional[str] = None
    unit: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    dob: Optional[str] = None
    reporting_date: Optional[str] = None
    nok_name: Optional[str] = None
    nok_name: Optional[str] = None
    nok_phone: Optional[str] = None
    hometown_address: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account: Optional[str] = None
    pan_card: Optional[str] = None
    adhaar_card: Optional[str] = None
    higher_qualification: Optional[str] = None

class AgniveerResponse(AgniveerBase):
    id: int
    batch_no: Optional[str] = None
    company: Optional[str] = None
    company: Optional[str] = None
    photo_url: Optional[str] = None
    dob: Optional[datetime] = None
    reporting_date: Optional[datetime] = None
    nok_name: Optional[str] = None
    nok_name: Optional[str] = None
    nok_phone: Optional[str] = None
    hometown_address: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account: Optional[str] = None
    pan_card: Optional[str] = None
    adhaar_card: Optional[str] = None
    higher_qualification: Optional[str] = None
    upcoming_tests: Optional[List['ScheduledTestResponse']] = []
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    full_name: Optional[str] = None
    rank: Optional[str] = None
    assigned_company: Optional[str] = None
    agniveer_id: Optional[int] = None
    user_id: int

class TokenData(BaseModel):
    username: Optional[str] = None

# Technical Assessment Schemas
class TechnicalAssessmentCreate(BaseModel):
    agniveer_id: int
    firing_score: Optional[float] = None
    weapon_handling_score: Optional[float] = None
    tactical_score: Optional[float] = None
    cognitive_score: Optional[float] = None
    assessment_date: Optional[datetime] = None

class TechnicalAssessmentResponse(TechnicalAssessmentCreate):
    id: int
    class Config:
        from_attributes = True

# Behavioral Assessment Schemas
class BehavioralAssessmentCreate(BaseModel):
    agniveer_id: int
    quarter: str
    initiative: float
    dedication: float
    team_spirit: float
    courage: float
    motivation: float
    adaptability: float
    communication: float
    assessment_date: Optional[datetime] = None

class BehavioralAssessmentResponse(BehavioralAssessmentCreate):
    id: int
    class Config:
        from_attributes = True

# Achievement Schemas
class AchievementCreate(BaseModel):
    agniveer_id: int
    title: str
    type: AchievementType
    points: float
    date_earned: datetime
    validity_months: Optional[int] = 24

class AchievementResponse(AchievementCreate):
    id: int
    class Config:
        from_attributes = True

# RRI Schemas (Nested for Dashboard)
class TechnicalBreakdown(BaseModel):
    firing: float = 0
    weapon: float = 0
    tactical: float = 0
    cognitive: float = 0

class TechnicalData(BaseModel):
    breakdown: TechnicalBreakdown
    total_score: float

class BehavioralData(BaseModel):
    total_score: float

class RRIResponse(BaseModel):
    id: int
    agniveer_id: int
    calculation_date: datetime
    rri_score: float
    retention_band: RRIBand
    
    technical: TechnicalData
    behavioral: BehavioralData
    achievement: Optional[dict] = None
    
    audit_notes: Optional[str] = None
    
    class Config:
        from_attributes = True

# Message Schemas


# Admin / System Schemas
class PolicyCreate(BaseModel):
    title: str

class PolicyResponse(PolicyCreate):
    id: int
    filename: str
    upload_date: datetime
    uploaded_by: Optional[int]
    
    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    details: Optional[str]
    timestamp: datetime
    ip_address: Optional[str]
    
    class Config:
        from_attributes = True

class PasswordChange(BaseModel):
    current_password: str
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserPasswordReset(BaseModel):
    new_password: str

class BulkUploadResult(BaseModel):
    total_processed: int
    successful: int
    failed: int
    errors: List[str]

# Internal Mail Schemas (New)
class EmailRecipientCreate(BaseModel):
    recipient_id: int # User ID

class EmailCreate(BaseModel):
    subject: str
    body: str
    priority: Optional[str] = "Normal"
    # Recipients logic handled dynamically (batch_id, company_id, or list of user_ids)
    recipient_ids: Optional[List[int]] = []
    target_batch: Optional[str] = None
    target_batch: Optional[str] = None
    target_company: Optional[str] = None
    target_role: Optional[str] = None # 'co' or 'coy_cdr' for role-based routing

class InboxItem(BaseModel):
    id: int # EmailRecipient ID
    email_id: int
    subject: str
    sender_id: int # To enable reply
    sender_name: str
    sender_role: str
    timestamp: datetime
    is_read: bool
    priority: str
    is_starred: bool = False
    
    class Config:
        from_attributes = True

class EmailDetail(InboxItem):
    body: str
class LeaveCreate(BaseModel):
    agniveer_id: int
    leave_type: str
    start_date: datetime
    end_date: datetime
    reason: Optional[str] = None
    start_date: datetime
    end_date: datetime

class LeaveStatusUpdate(BaseModel):
    status: str

class GrievanceResolution(BaseModel):
    status: str
    resolution_notes: str

class GrievanceCreate(BaseModel):
    agniveer_id: int
    type: str # ADMIN, MEDICAL, PERSONAL
    description: str
    addressed_to: str # CO, COMMANDER

class MedicalRecordCreate(BaseModel):
    agniveer_id: int
    diagnosis: str
    hospital_name: str
    admission_date: datetime
    discharge_date: Optional[datetime] = None
    category: Optional[MedicalCategory] = MedicalCategory.SHAPE_1
    remarks: Optional[str] = None

class MedicalRecordResponse(MedicalRecordCreate):
    id: int
    class Config:
        from_attributes = True

# ============================================================
# TRAINING OFFICER SCHEMAS
# ============================================================
from .models import TestType

class ScheduledTestCreate(BaseModel):
    name: str
    test_type: str
    description: Optional[str] = None
    scheduled_date: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    target_type: str  # "BATCH", "COMPANY", "ALL"
    target_value: Optional[str] = None
    instructor: Optional[str] = None
    max_marks: Optional[float] = 100
    passing_marks: Optional[float] = 50

class ScheduledTestUpdate(BaseModel):
    name: Optional[str] = None
    test_type: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    target_type: Optional[str] = None
    target_value: Optional[str] = None
    instructor: Optional[str] = None
    max_marks: Optional[float] = None
    passing_marks: Optional[float] = None
    status: Optional[str] = None

class ScheduledTestResponse(ScheduledTestCreate):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    status: str
    results_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

class TestResultCreate(BaseModel):
    agniveer_id: int
    score: Optional[float] = None
    remarks: Optional[str] = None
    is_absent: bool = False

class TestResultResponse(TestResultCreate):
    id: int
    test_id: int
    recorded_at: datetime
    recorded_by: Optional[int] = None
    agniveer_name: Optional[str] = None
    agniveer_service_id: Optional[str] = None
    
    class Config:
        from_attributes = True

# ============================================================
# COUNSELLING SCHEMAS
# ============================================================
from .models import CounsellingStatus

class CounsellingSessionCreate(BaseModel):
    agniveer_id: Optional[int] = None  # Optional if scheduling by batch
    batch_name: Optional[str] = None   # For batch scheduling
    scheduled_date: datetime
    topic: Optional[str] = None

class CounsellingSessionUpdate(BaseModel):
    notes: Optional[str] = None
    action_items: Optional[str] = None
    status: Optional[CounsellingStatus] = None

class CounsellingSessionResponse(BaseModel):
    id: int
    agniveer_id: int
    officer_id: int
    scheduled_date: datetime
    batch_group: Optional[str] = None
    topic: Optional[str] = None
    status: CounsellingStatus
    notes: Optional[str] = None
    action_items: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    agniveer_name: Optional[str] = None
    agniveer_service_id: Optional[str] = None
    
    class Config:
        from_attributes = True
