from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from .database import Base
import enum
from datetime import datetime

class UserRole(str, enum.Enum):
    AGNIVEER = "agniveer"
    COY_CDR = "coy_cdr"
    COY_CLK = "coy_clk" # Company Clerk
    CO = "co"
    OFFICER = "trg_officer"
    ADMIN = "admin"

class AchievementType(str, enum.Enum):
    SPORTS = "SPORTS"
    TECHNICAL = "TECHNICAL"
    LEADERSHIP = "LEADERSHIP"
    BRAVERY = "BRAVERY"
    INNOVATION = "INNOVATION"
    TRAINING = "TRAINING"
    DISCIPLINARY = "DISCIPLINARY"

class RRIBand(str, enum.Enum):
    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"

class User(Base):
    __tablename__ = "users_auth"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False) # Service ID or 'admin'
    password_hash = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)

    agniveer_id = Column(Integer, ForeignKey("agniveers.id"), nullable=True)
    
    # Officer/Commander Fields
    full_name = Column(String, nullable=True)
    rank = Column(String, nullable=True) 
    assigned_company = Column(String, nullable=True) # For COY_CDR access control

    agniveer = relationship("Agniveer", back_populates="user_account")

class Agniveer(Base):
    __tablename__ = "agniveers"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True) # Optional contact email
    phone = Column(String, nullable=True)
    
    # Detailed Bio-Data
    batch_no = Column(String) # e.g. "Jan 2026"
    photo_url = Column(String, nullable=True)

    dob = Column(DateTime, nullable=True)
    reporting_date = Column(DateTime, nullable=True)
    
    nok_name = Column(String, nullable=True)
    nok_phone = Column(String, nullable=True)
    
    hometown_address = Column(String, nullable=True)
    
    bank_name = Column(String, nullable=True)
    bank_branch = Column(String, nullable=True)
    bank_account = Column(String, nullable=True)
    
    pan_card = Column(String, nullable=True)
    adhaar_card = Column(String, nullable=True)
    
    higher_qualification = Column(String, nullable=True) # Blank if none

    rank = Column(String)
    unit = Column(String)
    company = Column(String)
    joining_date = Column(DateTime)
    
    user_account = relationship("User", back_populates="agniveer", uselist=False)
    
    technical_assessments = relationship("TechnicalAssessment", back_populates="agniveer")
    behavioral_assessments = relationship("BehavioralAssessment", back_populates="agniveer")
    achievements = relationship("Achievement", back_populates="agniveer")
    leaves = relationship("LeaveRecord", back_populates="agniveer")
    grievances = relationship("Grievance", back_populates="agniveer")
    medical_records = relationship("MedicalRecord", back_populates="agniveer")
    rri_calculations = relationship("RetentionReadiness", back_populates="agniveer")

class TechnicalAssessment(Base):
    __tablename__ = "technical_assessments"

    id = Column(Integer, primary_key=True, index=True)
    agniveer_id = Column(Integer, ForeignKey("agniveers.id"), nullable=False)
    assessment_date = Column(DateTime, default=datetime.utcnow)
    
    firing_score = Column(Float) # 25%
    weapon_handling_score = Column(Float) # 20%
    tactical_score = Column(Float) # 30%
    cognitive_score = Column(Float) # 25%
    
    agniveer = relationship("Agniveer", back_populates="technical_assessments")

class BehavioralAssessment(Base):
    __tablename__ = "behavioral_assessments"

    id = Column(Integer, primary_key=True, index=True)
    agniveer_id = Column(Integer, ForeignKey("agniveers.id"), nullable=False)
    assessment_date = Column(DateTime, default=datetime.utcnow)
    quarter = Column(String) # e.g., "2025-Q1"
    
    # Scores 1-10
    initiative = Column(Float) # 20%
    dedication = Column(Float) # 20%
    team_spirit = Column(Float) # 18%
    courage = Column(Float) # 18%
    motivation = Column(Float) # 12%
    adaptability = Column(Float) # 12%
    communication = Column(Float) # Tracked only
    
    agniveer = relationship("Agniveer", back_populates="behavioral_assessments")

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    agniveer_id = Column(Integer, ForeignKey("agniveers.id"), nullable=False)
    title = Column(String, nullable=False)
    type = Column(SQLEnum(AchievementType), nullable=False)
    points = Column(Float, nullable=False)
    date_earned = Column(DateTime, nullable=False)
    validity_months = Column(Integer, default=24)
    
    agniveer = relationship("Agniveer", back_populates="achievements")

class RetentionReadiness(Base):
    __tablename__ = "retention_readiness"

    id = Column(Integer, primary_key=True, index=True)
    agniveer_id = Column(Integer, ForeignKey("agniveers.id"), nullable=False)
    calculation_date = Column(DateTime, default=datetime.utcnow)
    
    rri_score = Column(Float, nullable=False)
    retention_band = Column(SQLEnum(RRIBand), nullable=False)
    
    technical_component = Column(Float)
    behavioral_component = Column(Float)
    achievement_component = Column(Float)
    
    technical_completeness = Column(Float)
    behavioral_completeness = Column(Float)
    overall_data_quality = Column(Float)
    
    audit_notes = Column(String)
    
    agniveer = relationship("Agniveer", back_populates="rri_calculations")



class Policy(Base):
    __tablename__ = "policies"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    filename = Column(String, nullable=False) # stored path
    upload_date = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users_auth.user_id"))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users_auth.user_id"))
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String, nullable=True)
class InternalEmail(Base):
    __tablename__ = "internal_emails"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users_auth.user_id"), nullable=False)
    subject = Column(String, nullable=False)
    body = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    priority = Column(String, default="Normal") # Normal, High, Urgent
    is_deleted_by_sender = Column(Boolean, default=False)
    is_encrypted = Column(Boolean, default=False)
    
    sender = relationship("User", foreign_keys=[sender_id])
    recipients = relationship("EmailRecipient", back_populates="email_content")

class EmailRecipient(Base):
    __tablename__ = "email_recipients"
    
    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("internal_emails.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users_auth.user_id"), nullable=False)
    
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    folder = Column(String, default="inbox") # inbox, trash, archived
    is_starred = Column(Boolean, default=False)
    
    email_content = relationship("InternalEmail", back_populates="recipients")
    recipient = relationship("User", foreign_keys=[recipient_id])

class EmailDraft(Base):
    __tablename__ = "email_drafts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users_auth.user_id"), nullable=False)
    subject = Column(String, default="")
    body = Column(String, default="")
    recipient_ids_json = Column(String, default="[]") # JSON array of recipient IDs
    target_type = Column(String, default="individual") # individual, batch, company
    target_value = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", foreign_keys=[user_id])

class RateLimitLog(Base):
    __tablename__ = "rate_limit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users_auth.user_id"), nullable=False)
    action = Column(String, nullable=False) # e.g., "send_mail"
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", foreign_keys=[user_id])

class LeaveStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class LeaveRecord(Base):
    __tablename__ = "leave_records"
    
    id = Column(Integer, primary_key=True, index=True)
    agniveer_id = Column(Integer, ForeignKey("agniveers.id"), nullable=False)
    leave_type = Column(String, nullable=False) # CASUAL, MEDICAL, SPECIAL
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    reason = Column(String, nullable=True)
    status = Column(SQLEnum(LeaveStatus), default=LeaveStatus.PENDING)
    
    agniveer = relationship("Agniveer", back_populates="leaves")

class GrievanceStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_REVIEW = "IN_REVIEW"
    RESOLVED = "RESOLVED"

class Grievance(Base):
    __tablename__ = "grievances"
    
    id = Column(Integer, primary_key=True, index=True)
    agniveer_id = Column(Integer, ForeignKey("agniveers.id"), nullable=False)
    type = Column(String, nullable=False) # ADMIN, MEDICAL, PERSONAL
    description = Column(String, nullable=False)
    addressed_to = Column(String, nullable=False) # CO, COMMANDER
    status = Column(SQLEnum(GrievanceStatus), default=GrievanceStatus.PENDING)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    resolution_notes = Column(String, nullable=True)
    
    agniveer = relationship("Agniveer", back_populates="grievances")

class MedicalCategory(str, enum.Enum):
    SHAPE_1 = "SHAPE 1"
    SHAPE_2 = "SHAPE 2"
    SHAPE_3 = "SHAPE 3"
    SHAPE_4 = "SHAPE 4"
    SHAPE_5 = "SHAPE 5"

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    
    id = Column(Integer, primary_key=True, index=True)
    agniveer_id = Column(Integer, ForeignKey("agniveers.id"), nullable=False)
    diagnosis = Column(String, nullable=False)
    hospital_name = Column(String, nullable=False)
    admission_date = Column(DateTime, nullable=False)
    discharge_date = Column(DateTime, nullable=True)
    category = Column(SQLEnum(MedicalCategory), default=MedicalCategory.SHAPE_1)
    remarks = Column(String, nullable=True)
    
    agniveer = relationship("Agniveer", back_populates="medical_records")

# ============================================================
# TRAINING OFFICER MODULE
# ============================================================

class TestType(str, enum.Enum):
    PFT = "PFT"              # Physical Fitness Test
    FIRING = "FIRING"        # Firing Range
    WEAPONS = "WEAPONS"      # Weapon Handling
    TACTICAL = "TACTICAL"    # Tactical Drills
    COGNITIVE = "COGNITIVE"  # Written/Mental Tests
    CLASSROOM = "CLASSROOM"  # Theory Sessions
    CUSTOM = "CUSTOM"        # User-defined tests

class ScheduledTest(Base):
    __tablename__ = "scheduled_tests"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Test Identity
    name = Column(String, nullable=False)
    test_type = Column(SQLEnum(TestType), nullable=False)
    description = Column(String, nullable=True)
    
    # Scheduling
    scheduled_date = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    location = Column(String, nullable=True)
    
    # Assignment (Flexible)
    target_type = Column(String, nullable=False)  # "BATCH", "COMPANY", "ALL"
    target_value = Column(String, nullable=True)  # Batch number or Company name
    
    # Metadata
    instructor = Column(String, nullable=True)
    max_marks = Column(Float, default=100)
    passing_marks = Column(Float, default=50)
    created_by = Column(Integer, ForeignKey("users_auth.user_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="SCHEDULED")  # SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    
    # Relationships
    results = relationship("TestResult", back_populates="test", cascade="all, delete-orphan")

class TestResult(Base):
    __tablename__ = "test_results"
    
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("scheduled_tests.id"), nullable=False)
    agniveer_id = Column(Integer, ForeignKey("agniveers.id"), nullable=False)
    
    score = Column(Float, nullable=True)
    remarks = Column(String, nullable=True)
    is_absent = Column(Boolean, default=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    recorded_by = Column(Integer, ForeignKey("users_auth.user_id"), nullable=True)
    
    # Relationships
    test = relationship("ScheduledTest", back_populates="results")
    agniveer = relationship("Agniveer")
