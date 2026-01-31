from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, WebSocket, WebSocketDisconnect, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List, Optional
from dotenv import load_dotenv
import shutil
import os

# Load environment variables
load_dotenv()

from . import models, schemas, database, rri_engine, analytics, ai_service, admin_service
from .seed_admin import seed_admin

# Create Database Tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="KAUSHAL-SETU API", version="1.0.0")

@app.on_event("startup")
def startup_event():
    seed_admin()

# HTTPS Enforcement (enable in production via FORCE_HTTPS=true)
if os.getenv("FORCE_HTTPS", "false").lower() == "true":
    app.add_middleware(HTTPSRedirectMiddleware)

# CORS Setup - Read from environment or use defaults
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://192.168.1.7:3000")
origins = [origin.strip() for origin in cors_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()



from .auth_utils import verify_password, get_password_hash, create_access_token, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Routes
@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        password_hash=hashed_password,
        role=user.role,
        agniveer_id=user.agniveer_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login_for_access_token(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_credentials.username).first()
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "agniveer_id": user.agniveer_id}, expires_delta=access_token_expires
    )
    
    # Determine display details
    full_name = user.full_name
    rank = user.rank
    assigned_company = user.assigned_company
    
    if user.agniveer:
        full_name = user.agniveer.name
        rank = user.agniveer.rank
        assigned_company = user.agniveer.company
        
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
        "full_name": full_name or user.username,
        "rank": rank,
        "assigned_company": assigned_company,
        "agniveer_id": user.agniveer_id,
        "user_id": user.user_id
    }

# Dependency to get full current user object
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# User Management Endpoints (Admin Only)
@app.post("/api/admin/users", response_model=schemas.UserResponse)
def create_user_admin(user: schemas.UserCreate, db: Session = Depends(get_db)): # Add Admin Check later
    # Check if exists
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        password_hash=hashed_password,
        role=user.role,
        agniveer_id=user.agniveer_id,
        full_name=user.full_name,
        rank=user.rank,
        assigned_company=user.assigned_company
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/api/admin/users", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    # Should restrict to Admin really
    return db.query(models.User).all()

@app.delete("/api/admin/users/{user_id}")
def delete_user_admin(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.username == 'admin':
        raise HTTPException(status_code=400, detail="Cannot delete super admin")
        
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

@app.put("/api/admin/users/{user_id}/password")
def reset_user_password(user_id: int, data: schemas.UserPasswordReset, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    hashed_password = get_password_hash(data.new_password)
    user.password_hash = hashed_password
    db.commit()
    return {"message": "Password updated successfully"}

@app.get("/api/users/search", response_model=List[schemas.UserResponse])
def search_users(q: str, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    if not q or len(q) < 2:
        return []
    # Search by username (Service ID) or Full Name
    # Search by username (Service ID), Full Name, or Rank (User or Agniveer)
    users = db.query(models.User).outerjoin(models.Agniveer).filter(
        (models.User.username.contains(q)) | 
        (models.User.full_name.contains(q)) |
        (models.User.rank.contains(q)) |
        (models.Agniveer.rank.contains(q))
    ).limit(20).all()
    return users

@app.get("/api/admin/broadcast-lists")
def get_broadcast_lists(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    # Fetch distinct companies
    companies = db.query(models.Agniveer.company).distinct().filter(models.Agniveer.company != None).all()
    companies_list = [c[0] for c in companies]
    
    # Fetch distinct batches
    batches = db.query(models.Agniveer.batch_no).distinct().filter(models.Agniveer.batch_no != None).all()
    batches_list = [b[0] for b in batches]
    
    return {"companies": companies_list, "batches": batches_list}

@app.post("/api/auth/change-password")
def change_password(data: schemas.PasswordChange, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    # Verify Token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
    except JWTError:
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
         
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.post("/api/agniveers/", response_model=schemas.AgniveerResponse)
def create_agniveer_profile(agniveer: schemas.AgniveerCreate, db: Session = Depends(get_db)):
    db_agniveer = models.Agniveer(**agniveer.dict())
    db.add(db_agniveer)
    db.commit()
    db.refresh(db_agniveer)
    return db_agniveer

@app.get("/api/agniveers/{agniveer_id}", response_model=schemas.AgniveerResponse)
def read_agniveer_profile(agniveer_id: int, db: Session = Depends(get_db)):
    agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == agniveer_id).first()
    if agniveer is None:
        raise HTTPException(status_code=404, detail="Agniveer not found")
        
    # Fetch upcoming scheduled tests
    upcoming_tests = db.query(models.ScheduledTest).filter(
        models.ScheduledTest.status == 'SCHEDULED',
        (models.ScheduledTest.target_type == 'ALL') |
        ((models.ScheduledTest.target_type == 'BATCH') & (models.ScheduledTest.target_value == agniveer.batch_no)) |
        ((models.ScheduledTest.target_type == 'COMPANY') & (models.ScheduledTest.target_value == agniveer.company))
    ).order_by(models.ScheduledTest.scheduled_date).all()
    
    agniveer.upcoming_tests = upcoming_tests
    return agniveer

# --- Assessment Endpoints ---

@app.post("/api/assessments/technical", response_model=schemas.TechnicalAssessmentResponse)
def create_technical_assessment(assessment: schemas.TechnicalAssessmentCreate, db: Session = Depends(get_db)):
    # Check if agniveer exists
    agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == assessment.agniveer_id).first()
    if not agniveer:
        raise HTTPException(status_code=404, detail="Agniveer not found")
        
    db_assessment = models.TechnicalAssessment(**assessment.dict())
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return db_assessment

@app.post("/api/assessments/behavioral", response_model=schemas.BehavioralAssessmentResponse)
def create_behavioral_assessment(assessment: schemas.BehavioralAssessmentCreate, db: Session = Depends(get_db)):
    agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == assessment.agniveer_id).first()
    if not agniveer:
        raise HTTPException(status_code=404, detail="Agniveer not found")
        
    db_assessment = models.BehavioralAssessment(**assessment.dict())
    db.add(db_assessment)
    db.commit()
    db.refresh(db_assessment)
    return db_assessment

@app.post("/api/achievements", response_model=schemas.AchievementResponse)
def create_achievement(achievement: schemas.AchievementCreate, db: Session = Depends(get_db)):
    agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == achievement.agniveer_id).first()
    if not agniveer:
        raise HTTPException(status_code=404, detail="Agniveer not found")
        
    db_achievement = models.Achievement(**achievement.dict())
    db.add(db_achievement)
    db.commit()
    db.refresh(db_achievement)
    return db_achievement

# --- RRI Endpoints ---

@app.post("/api/rri/calculate/{agniveer_id}", response_model=schemas.RRIResponse)
def calculate_agniveer_rri(agniveer_id: int, db: Session = Depends(get_db)):
    agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == agniveer_id).first()
    if not agniveer:
        raise HTTPException(status_code=404, detail="Agniveer not found")
    
    # Run Calculation Engine
    try:
        rri_record = rri_engine.calculate_rri(db, agniveer_id)
        return rri_record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rri/{agniveer_id}", response_model=schemas.RRIResponse)
def get_latest_rri(agniveer_id: int, db: Session = Depends(get_db)):
    agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == agniveer_id).first()
    if not agniveer:
        raise HTTPException(status_code=404, detail="Agniveer not found")

    rri = db.query(models.RetentionReadiness).filter(
        models.RetentionReadiness.agniveer_id == agniveer_id
    ).order_by(models.RetentionReadiness.calculation_date.desc()).first()
    
    if not rri:
        # Try calculating on the fly
        try:
             rri = rri_engine.calculate_rri(db, agniveer_id)
        except:
             raise HTTPException(status_code=404, detail="RRI data unavailable")
             
    # Fetch details for the dashboard
    tech = db.query(models.TechnicalAssessment).filter(models.TechnicalAssessment.agniveer_id == agniveer_id).order_by(models.TechnicalAssessment.assessment_date.desc()).first()
    behav = db.query(models.BehavioralAssessment).filter(models.BehavioralAssessment.agniveer_id == agniveer_id).order_by(models.BehavioralAssessment.assessment_date.desc()).first()
    
    # Construct Response
    return {
        "id": rri.id,
        "agniveer_id": rri.agniveer_id,
        "calculation_date": rri.calculation_date,
        "rri_score": rri.rri_score,
        "retention_band": rri.retention_band,
        "technical": {
            "total_score": rri.technical_component or 0,
            "breakdown": {
                "firing": tech.firing_score if tech else 0,
                "weapon": tech.weapon_handling_score if tech else 0,
                "tactical": tech.tactical_score if tech else 0,
                "cognitive": tech.cognitive_score if tech else 0
            }
        },
        "behavioral": {
            "total_score": rri.behavioral_component or 0
        },
        "achievement": {
             "total_score": rri.achievement_component or 0
        },
        "audit_notes": rri.audit_notes
    }

# --- Analytics Endpoints ---

@app.get("/api/analytics/company/{unit_id}/overview")
def get_company_overview(unit_id: str, db: Session = Depends(get_db)):
    # unit_id here basically refers to 'unit' string column in Agniveer table
    return analytics.get_company_overview(db, unit_id)

@app.get("/api/analytics/company/{unit_id}/technical-gaps")
def get_technical_gaps(unit_id: str, db: Session = Depends(get_db)):
    return analytics.get_technical_gaps(db, unit_id)

@app.get("/api/analytics/company/{unit_id}/retention-risk")
def get_retention_risk_list(unit_id: str, db: Session = Depends(get_db)):
    return analytics.get_retention_risk(db, unit_id)

@app.get("/api/analytics/company/{unit_id}/pending")
def get_pending_assessments(unit_id: str, db: Session = Depends(get_db)):
    return analytics.get_pending_assessments(db, unit_id)

@app.get("/api/analytics/company/{unit_id}/rri-trend")
def get_rri_trend(unit_id: str, db: Session = Depends(get_db)):
    return analytics.get_rri_trend(db, unit_id)

@app.get("/api/analytics/company/{unit_id}/technical-trend")
def get_technical_trend(unit_id: str, db: Session = Depends(get_db)):
    return analytics.get_technical_trend(db, unit_id)

@app.get("/api/analytics/company/{unit_id}/behavioral-trend")
def get_behavioral_trend(unit_id: str, db: Session = Depends(get_db)):
    return analytics.get_behavioral_trend(db, unit_id)

@app.get("/api/analytics/company/{unit_id}/competency-insights")
def get_competency_insights(unit_id: str, db: Session = Depends(get_db)):
    return analytics.get_competency_insights(db, unit_id)

@app.get("/api/analytics/company/{unit_id}/honor-board")
def get_honor_board(unit_id: str, db: Session = Depends(get_db)):
    return analytics.get_honor_board(db, unit_id)

@app.get("/api/analytics/company/{unit_id}/command-hub")
def get_command_hub(unit_id: str, db: Session = Depends(get_db)):
    return analytics.get_command_hub_data(db, unit_id)

@app.get("/api/analytics/company/{unit_id}/action-center")
def get_action_center(unit_id: str, db: Session = Depends(get_db)):
    return analytics.get_action_center_items(db, unit_id)

from . import models, schemas, database, rri_engine, analytics, ai_service

# ... (Existing code) ...

# --- AI Endpoints ---

@app.post("/api/ai/report/{agniveer_id}")
def generate_ai_report(agniveer_id: int, db: Session = Depends(get_db)):
    # 1. Fetch Agniveer
    agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == agniveer_id).first()
    if not agniveer:
        raise HTTPException(status_code=404, detail="Agniveer not found")
        
    # 2. Fetch/Calculate RRI Data
    # We use the latest calculation for context
    rri = db.query(models.RetentionReadiness).filter(
        models.RetentionReadiness.agniveer_id == agniveer_id
    ).order_by(models.RetentionReadiness.calculation_date.desc()).first()
    
    if not rri:
        # Try calculating on the fly
        try:
             rri = rri_engine.calculate_rri(db, agniveer_id)
        except:
             raise HTTPException(status_code=400, detail="Data insufficient for AI analysis")

    # 3. Fetch component details for richer context
    # Technical breakdown is not stored in RRI table directly as JSON (it's in the TechnicalAssessment)
    # But RRI result object has it. We'll just use the RRI aggregate scores for now to keep it fast.
    # To get breakdown, we re-fetch the TechnicalAssessment associated?
    # Actually, let's just use what's in the RRI DB record + some implied data.
    
    # Construct Context Dict
    context = {
        "rri_score": rri.rri_score,
        "retention_band": rri.retention_band.value,
        "technical_component": rri.technical_component,
        "technical_breakdown": f"Completeness: {rri.technical_completeness*100}%", # Simplified for now
        "behavioral_component": rri.behavioral_component,
        "behavioral_status": f"Completeness: {rri.behavioral_completeness*100}%",
        "behavioral_trend": "N/A", # Not stored in DB model yet, need to re-calc or add col
        "achievement_component": rri.achievement_component,
        "achievement_count": "N/A"
    }
    
    # 4. Generate
    report = ai_service.generate_rri_report(agniveer.name, context)
    return {"report": report}


# --- Leave Management Endpoints ---

@app.post("/api/leave/apply")
def apply_leave(leave: schemas.LeaveCreate, db: Session = Depends(get_db)):
    db_leave = models.LeaveRecord(
        agniveer_id=leave.agniveer_id,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason
    )
    db.add(db_leave)
    db.commit()
    db.refresh(db_leave)
    return db_leave

@app.get("/api/leave/{agniveer_id}")
def get_leaves(agniveer_id: int, db: Session = Depends(get_db)):
    return db.query(models.LeaveRecord).filter(models.LeaveRecord.agniveer_id == agniveer_id).order_by(models.LeaveRecord.start_date.desc()).all()

@app.delete("/api/leave/cancel/{leave_id}")
def cancel_leave(leave_id: int, db: Session = Depends(get_db)):
    leave = db.query(models.LeaveRecord).filter(models.LeaveRecord.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave record not found")
    
    if leave.status != models.LeaveStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only PENDING leave requests can be cancelled")
        
    db.delete(leave)
    db.commit()
    return {"message": "Leave request cancelled"}


@app.get("/api/company/{company_name}/leaves")
def get_company_leaves(company_name: str, db: Session = Depends(get_db)):
    # Join with Agniveer to filter by company (or user.assigned_company logic if strict)
    # Assuming 'company_name' corresponds to Agniveer.company
    # Fetch PENDING requests only for action items, or all for history. Let's fetch PENDING for now.
    return db.query(models.LeaveRecord).join(models.Agniveer).filter(
        models.Agniveer.company == company_name,
        models.LeaveRecord.status == models.LeaveStatus.PENDING
    ).all()

@app.put("/api/leave/{leave_id}/status")
def update_leave_status(leave_id: int, status_update: schemas.LeaveStatusUpdate, db: Session = Depends(get_db)):
    leave = db.query(models.LeaveRecord).filter(models.LeaveRecord.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave record not found")
    
    leave.status = status_update.status
    db.commit()
    return {"message": "Status updated"}

# --- Grievance Endpoints ---

@app.post("/api/grievance/submit")
def submit_grievance(grievance: schemas.GrievanceCreate, db: Session = Depends(get_db)):
    try:
        db_grievance = models.Grievance(
            agniveer_id=grievance.agniveer_id,
            type=grievance.type,
            description=grievance.description,
            addressed_to=grievance.addressed_to
        )
        db.add(db_grievance)
        db.commit()
        db.refresh(db_grievance)
        return db_grievance
    except Exception as e:
        print(f"Error submitting grievance: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")

@app.get("/api/grievance/{agniveer_id}")
def get_grievances(agniveer_id: int, db: Session = Depends(get_db)):
    return db.query(models.Grievance).filter(models.Grievance.agniveer_id == agniveer_id).order_by(models.Grievance.submitted_at.desc()).all()

@app.get("/api/company/{company_name}/grievances")
def get_company_grievances(company_name: str, db: Session = Depends(get_db)):
    # Fetch PENDING or IN_REVIEW grievances for the company
    return db.query(models.Grievance).join(models.Agniveer).filter(
        models.Agniveer.company == company_name
    ).order_by(models.Grievance.submitted_at.desc()).all()

@app.put("/api/grievance/{grievance_id}/resolve")
def resolve_grievance(grievance_id: int, resolution: schemas.GrievanceResolution, db: Session = Depends(get_db)):
    grievance = db.query(models.Grievance).filter(models.Grievance.id == grievance_id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")
    
    grievance.status = resolution.status
    grievance.resolution_notes = resolution.resolution_notes
    db.commit()
    return {"message": "Grievance resolved"}


# --- Medical Record Endpoints (Clerk Dashboard V2) ---

@app.post("/api/medical/add")
def add_medical_record(record: schemas.MedicalRecordCreate, db: Session = Depends(get_db)):
    db_record = models.MedicalRecord(
        agniveer_id=record.agniveer_id,
        diagnosis=record.diagnosis,
        hospital_name=record.hospital_name,
        admission_date=record.admission_date,
        discharge_date=record.discharge_date,
        category=record.category,
        remarks=record.remarks
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

@app.get("/api/medical/{agniveer_id}")
def get_medical_records(agniveer_id: int, db: Session = Depends(get_db)):
    return db.query(models.MedicalRecord).filter(models.MedicalRecord.agniveer_id == agniveer_id).order_by(models.MedicalRecord.admission_date.desc()).all()


# --- Admin & System Endpoints ---

def get_current_user_id(token: str = Depends(oauth2_scheme)):
    # Simple dependency stub - normally we verify token here
    # Since we are using login_for_access_token separately, we need to decode here or build a robust dependency
    # For now, let's just decode manually or trust dependency injection if we had full OAuth2
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        # Would fetch ID from DB
        return 1 # Mock ID for now as we haven't implemented full current_user dependency in this snippet
    except:
        return 1

@app.post("/api/admin/bulk-upload", response_model=schemas.BulkUploadResult)
async def bulk_upload_agniveers(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    decoded_content = content.decode('utf-8')
    # Assuming Admin ID 1 for now or we update dependency to get current user
    return admin_service.process_bulk_upload_agniveers(db, decoded_content, admin_id=1)

@app.post("/api/policies", response_model=schemas.PolicyResponse)
async def upload_policy(title: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_location = f"uploads/policies/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    
    new_policy = models.Policy(title=title, filename=file.filename, uploaded_by=1)
    db.add(new_policy)
    db.commit()
    db.refresh(new_policy)
    return new_policy

@app.get("/api/policies", response_model=List[schemas.PolicyResponse])
def get_policies(db: Session = Depends(get_db)):
    return db.query(models.Policy).order_by(models.Policy.upload_date.desc()).all()

@app.get("/api/admin/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(limit).all()

@app.get("/api/admin/stats")
def get_admin_dashboard_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Base Filters
    filters = []
    if current_user.role in [models.UserRole.COY_CDR, models.UserRole.COY_CLK]:
        if current_user.assigned_company:
            filters.append(models.Agniveer.company == current_user.assigned_company)
        else:
             # Restricted role with no company assigned -> See nothing
             return {"total_agniveers": 0, "by_batch": {}, "by_company": {}}

    # Queries using filters
    base_query = db.query(models.Agniveer)
    for f in filters:
        base_query = base_query.filter(f)
        
    total_agniveers = base_query.count()
    
    # Batch Breakdown
    # Note: We need to apply filters to the group_by query as well
    batch_query = db.query(models.Agniveer.batch_no, func.count(models.Agniveer.id))
    for f in filters:
        batch_query = batch_query.filter(f)
    batches = batch_query.group_by(models.Agniveer.batch_no).all()
    batch_stats = {b[0]: b[1] for b in batches if b[0]}
    
    # Company Breakdown
    company_query = db.query(models.Agniveer.company, func.count(models.Agniveer.id))
    for f in filters:
        company_query = company_query.filter(f)
    companies = company_query.group_by(models.Agniveer.company).all()
    company_stats = {c[0]: c[1] for c in companies if c[0]}
    
    return {
        "total_agniveers": total_agniveers,
        "by_batch": batch_stats,
        "by_company": company_stats
    }

@app.get("/api/admin/agniveers", response_model=List[schemas.AgniveerResponse])
def get_all_agniveers(
    batch: Optional[str] = None, 
    company: Optional[str] = None, 
    q: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # Inject User Context
):
    query = db.query(models.Agniveer)
    
    # Access Control Logic
    if current_user.role in [models.UserRole.COY_CDR, models.UserRole.COY_CLK]:
        if current_user.assigned_company:
            query = query.filter(models.Agniveer.company == current_user.assigned_company)
        else:
             # Safe default: Return NOTHING if role requires company but none assigned
             query = query.filter(models.Agniveer.id == -1) 

    if batch:
        query = query.filter(models.Agniveer.batch_no == batch)
    if company:
        query = query.filter(models.Agniveer.company == company)
    if q:
        search = f"%{q}%"
        query = query.filter(
            (models.Agniveer.name.ilike(search)) | 
            (models.Agniveer.service_id.ilike(search))
        )
    return query.all()

@app.get("/api/agniveers/{agniveer_id}", response_model=schemas.AgniveerResponse)
def get_agniveer_profile(agniveer_id: int, db: Session = Depends(get_db)):
    agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == agniveer_id).first()
    if not agniveer:
        raise HTTPException(status_code=404, detail="Agniveer not found")
    return agniveer

@app.put("/api/admin/agniveers/{agniveer_id}", response_model=schemas.AgniveerResponse)
def update_agniveer(agniveer_id: int, agniveer_data: schemas.AgniveerUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == agniveer_id).first()
    if not db_agniveer:
        raise HTTPException(status_code=404, detail="Agniveer not found")
        
    # Access Control: Check if user is authorized to edit this specific Agniveer
    if current_user.role != models.UserRole.ADMIN:
        # COY_CDR and COY_CLK can only edit their own company
        if current_user.role in [models.UserRole.COY_CDR, models.UserRole.COY_CLK]:
            if db_agniveer.company != current_user.assigned_company:
                 raise HTTPException(status_code=403, detail="Unauthorized: Cannot edit Agniveer from another company")
        else:
            # Other roles (like OFFICER/CO? maybe not allowed to edit bio-data)
            # Assuming strictly Admin + Company Staff for bio-data edits
             raise HTTPException(status_code=403, detail="Unauthorized to edit Agniveer data")
    
    # Update fields provided
    update_data = agniveer_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        # Handle Date fields manually if they come as strings
        if key in ['dob', 'reporting_date'] and isinstance(value, str):
            try:
                # Try ISO format
                value = datetime.strptime(value, "%Y-%m-%d")
            except ValueError:
                pass # Leave as string or handle error? SQLAlchemy might complain later.
                
        setattr(db_agniveer, key, value)
        
    db.commit()
    db.refresh(db_agniveer)
    return db_agniveer

@app.delete("/api/admin/agniveers/{agniveer_id}")
def delete_agniveer(agniveer_id: int, db: Session = Depends(get_db)):
    db_agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == agniveer_id).first()
    if not db_agniveer:
         raise HTTPException(status_code=404, detail="Agniveer not found")
         
    # Cascade delete User account
    db_user = db.query(models.User).filter(models.User.agniveer_id == agniveer_id).first()
    if db_user:
        db.delete(db_user)
        
    db.delete(db_agniveer)
    db.commit()
    return {"message": "Agniveer and associated User account deleted successfully"}


# -----------------------------
# MAIL & BROADCASTING ROUTES
# -----------------------------
from .mail_service import MailService

@app.post("/api/mail/send", response_model=int)
async def send_email(email: schemas.EmailCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Rate Limiting: Agniveers can only send 10 messages per hour
    if current_user.role == models.UserRole.AGNIVEER:
        if not MailService.check_rate_limit(db, current_user.user_id, "send_mail", 10):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. You can only send 10 messages per hour.")
        
    # Now returns list of recipient IDs
    recipient_ids = MailService.send_email(db, email, current_user.user_id)
    
    # Send Real-Time Notifications
    for rid in recipient_ids:
        await ws_manager.notify_user(rid, {"type": "new_mail"})
    
    # Log this send action for rate limiting
    if current_user.role == models.UserRole.AGNIVEER:
        MailService.log_rate_limit(db, current_user.user_id, "send_mail")
        
    return len(recipient_ids)

@app.get("/api/mail/inbox", response_model=List[schemas.InboxItem])
def get_inbox(skip: int = 0, limit: int = 20, search: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return MailService.get_inbox(db, current_user.user_id, skip, limit, search)

@app.get("/api/mail/unread-count", response_model=int)
def get_unread_count(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return MailService.get_unread_count(db, current_user.user_id)

@app.get("/api/mail/stats")
def get_mailbox_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return MailService.get_mailbox_stats(db, current_user.user_id)

@app.get("/api/mail/sent", response_model=List[schemas.InboxItem])
def get_sent(skip: int = 0, limit: int = 20, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return MailService.get_sent(db, current_user.user_id, skip, limit)

@app.get("/api/mail/sent/{id}", response_model=schemas.EmailDetail)
def get_sent_message(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    email = MailService.get_sent_message(db, id, current_user.user_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email

@app.post("/api/mail/bulk-delete")
def bulk_delete_emails(payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # payload: { ids: [1,2,3], folder: 'inbox'|'trash' }
    ids = payload.get('ids', [])
    folder = payload.get('folder', 'inbox')
    MailService.bulk_delete_emails(db, ids, current_user.user_id, folder)
    return {"message": "Deleted"}

@app.get("/api/mail/trash", response_model=List[schemas.InboxItem])
def get_trash(skip: int = 0, limit: int = 20, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return MailService.get_trash(db, current_user.user_id, skip, limit)

@app.post("/api/mail/restore/{id}")
def restore_email(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    success = MailService.restore_email(db, id, current_user.user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"message": "Email restored to inbox"}

@app.delete("/api/mail/trash/{id}")
def permanent_delete_email(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Permanent delete from Trash"""
    success = MailService.permanent_delete_email(db, id, current_user.user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"message": "Email permanently deleted"}

# ======================
# PHASE 11: NEW ENDPOINTS (Must be before /mail/{id})
# ======================

@app.post("/api/mail/star/{id}")
def toggle_star(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Toggle star on a message"""
    result = MailService.toggle_star(db, id, current_user.user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"is_starred": result}

@app.get("/api/mail/drafts")
def get_drafts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get all drafts for current user"""
    drafts = MailService.get_drafts(db, current_user.user_id)
    return [
        {
            "id": d.id,
            "subject": d.subject,
            "body": d.body,
            "recipient_ids_json": d.recipient_ids_json,
            "target_type": d.target_type,
            "target_value": d.target_value,
            "updated_at": d.updated_at
        }
        for d in drafts
    ]

@app.post("/api/mail/drafts")
def save_draft(draft_data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Create or update a draft"""
    draft = MailService.save_draft(db, current_user.user_id, draft_data)
    return {"id": draft.id, "message": "Draft saved"}

@app.delete("/api/mail/drafts/{id}")
def delete_draft(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Delete a draft"""
    success = MailService.delete_draft(db, id, current_user.user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"message": "Draft deleted"}

@app.post("/api/mail/forward/{id}")
def forward_email(id: int, recipient_ids: List[int] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Forward an email to new recipients"""
    if not recipient_ids:
        raise HTTPException(status_code=400, detail="recipient_ids required")
    count = MailService.forward_email(db, id, current_user.user_id, recipient_ids)
    if count == 0:
        raise HTTPException(status_code=404, detail="Original email not found")
    return {"forwarded_to": count}

# Parameterized routes must come AFTER specific routes
@app.get("/api/mail/{id}", response_model=schemas.EmailDetail)
def get_email_detail(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    email = MailService.get_email_detail(db, id, current_user.user_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email

@app.delete("/api/mail/{id}")
def delete_email(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Soft delete: Moves to Trash"""
    success = MailService.soft_delete_email(db, id, current_user.user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Email not found or access denied")
    return {"message": "Email moved to trash"}


# ======================
# WEBSOCKET: REAL-TIME MAIL NOTIFICATIONS
# ======================

class ConnectionManager:
    """Manages WebSocket connections for real-time notifications"""
    def __init__(self):
        # user_id -> List[WebSocket] to support multiple tabs/components
        self.active_connections: dict[int, list[WebSocket]] = {} 
    
    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
    
    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            # Clean up empty lists
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    async def notify_user(self, user_id: int, message: dict):
        """Send notification to all active connections for a specific user"""
        if user_id in self.active_connections:
            # Iterate over a copy to allow safe removal during iteration if needed
            for connection in self.active_connections[user_id][:]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # If sending fails, assume stale connection and remove
                    self.disconnect(user_id, connection)

# Global connection manager instance
ws_manager = ConnectionManager()

@app.websocket("/ws/mail/{user_id}")
async def websocket_mail(websocket: WebSocket, user_id: int):
    """WebSocket endpoint for real-time mail notifications"""
    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection alive; client can send pings
            data = await websocket.receive_text()
            # Echo back for heartbeat
            await websocket.send_text(f"pong:{data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)

# ============================================================
# TRAINING OFFICER ENDPOINTS
# ============================================================

@app.post("/api/tests", response_model=schemas.ScheduledTestResponse)
def create_scheduled_test(
    test: schemas.ScheduledTestCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new scheduled test."""
    db_test = models.ScheduledTest(
        name=test.name,
        test_type=test.test_type,
        description=test.description,
        scheduled_date=test.scheduled_date,
        end_time=test.end_time,
        location=test.location,
        target_type=test.target_type,
        target_value=test.target_value,
        instructor=test.instructor,
        max_marks=test.max_marks,
        passing_marks=test.passing_marks,
        created_by=current_user.user_id
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    return db_test

@app.get("/api/tests/types")
def get_test_types(db: Session = Depends(get_db)):
    types = db.query(models.ScheduledTest.test_type).distinct().all()
    # Filter out None if any
    return sorted(list(set([t[0] for t in types if t[0]])))

@app.get("/api/tests", response_model=List[schemas.ScheduledTestResponse])
def get_scheduled_tests(
    target_type: Optional[str] = None,
    target_value: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get list of scheduled tests with optional filters."""
    query = db.query(models.ScheduledTest)
    
    if target_type:
        query = query.filter(models.ScheduledTest.target_type == target_type)
    if target_value:
        query = query.filter(models.ScheduledTest.target_value == target_value)
    if status:
        query = query.filter(models.ScheduledTest.status == status)
    
    tests = query.order_by(models.ScheduledTest.scheduled_date.desc()).all()
    
    # Add results count
    result = []
    for t in tests:
        test_dict = {
            "id": t.id,
            "name": t.name,
            "test_type": t.test_type,
            "description": t.description,
            "scheduled_date": t.scheduled_date,
            "end_time": t.end_time,
            "location": t.location,
            "target_type": t.target_type,
            "target_value": t.target_value,
            "instructor": t.instructor,
            "max_marks": t.max_marks,
            "passing_marks": t.passing_marks,
            "created_by": t.created_by,
            "created_at": t.created_at,
            "status": t.status,
            "results_count": len(t.results) if t.results else 0
        }
        result.append(test_dict)
    
    return result

@app.get("/api/tests/{test_id}")
def get_scheduled_test(test_id: int, db: Session = Depends(get_db)):
    """Get a single test with details."""
    test = db.query(models.ScheduledTest).filter(models.ScheduledTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return {
        "id": test.id,
        "name": test.name,
        "test_type": test.test_type,
        "description": test.description,
        "scheduled_date": test.scheduled_date,
        "end_time": test.end_time,
        "location": test.location,
        "target_type": test.target_type,
        "target_value": test.target_value,
        "instructor": test.instructor,
        "max_marks": test.max_marks,
        "passing_marks": test.passing_marks,
        "created_by": test.created_by,
        "created_at": test.created_at,
        "status": test.status,
        "results_count": len(test.results) if test.results else 0
    }

@app.put("/api/tests/{test_id}")
def update_scheduled_test(
    test_id: int, 
    test_update: schemas.ScheduledTestUpdate, 
    db: Session = Depends(get_db)
):
    """Update a scheduled test."""
    test = db.query(models.ScheduledTest).filter(models.ScheduledTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    update_data = test_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(test, key, value)
    
    db.commit()
    db.refresh(test)
    return {"status": "success", "message": "Test updated"}

@app.delete("/api/tests/{test_id}")
def delete_scheduled_test(test_id: int, db: Session = Depends(get_db)):
    """Delete/Cancel a scheduled test."""
    test = db.query(models.ScheduledTest).filter(models.ScheduledTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    db.delete(test)
    db.commit()
    return {"status": "success", "message": "Test deleted"}

# --- Test Results ---

@app.post("/api/tests/{test_id}/results", response_model=schemas.TestResultResponse)
def add_test_result(
    test_id: int,
    result: schemas.TestResultCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Add a single result for a test."""
    test = db.query(models.ScheduledTest).filter(models.ScheduledTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Check if result already exists for this agniveer
    existing = db.query(models.TestResult).filter(
        models.TestResult.test_id == test_id,
        models.TestResult.agniveer_id == result.agniveer_id
    ).first()
    
    if existing:
        # Update existing
        existing.score = result.score
        existing.remarks = result.remarks
        existing.is_absent = result.is_absent
        existing.recorded_by = current_user.user_id
        db.commit()
        db.refresh(existing)
        
        agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == existing.agniveer_id).first()
        return {
            "id": existing.id,
            "test_id": existing.test_id,
            "agniveer_id": existing.agniveer_id,
            "score": existing.score,
            "remarks": existing.remarks,
            "is_absent": existing.is_absent,
            "recorded_at": existing.recorded_at,
            "recorded_by": existing.recorded_by,
            "agniveer_name": agniveer.name if agniveer else None,
            "agniveer_service_id": agniveer.service_id if agniveer else None
        }
    
    # Create new result
    db_result = models.TestResult(
        test_id=test_id,
        agniveer_id=result.agniveer_id,
        score=result.score,
        remarks=result.remarks,
        is_absent=result.is_absent,
        recorded_by=current_user.user_id
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    
    agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == db_result.agniveer_id).first()
    return {
        "id": db_result.id,
        "test_id": db_result.test_id,
        "agniveer_id": db_result.agniveer_id,
        "score": db_result.score,
        "remarks": db_result.remarks,
        "is_absent": db_result.is_absent,
        "recorded_at": db_result.recorded_at,
        "recorded_by": db_result.recorded_by,
        "agniveer_name": agniveer.name if agniveer else None,
        "agniveer_service_id": agniveer.service_id if agniveer else None
    }

@app.get("/api/tests/{test_id}/results", response_model=List[schemas.TestResultResponse])
def get_test_results(test_id: int, db: Session = Depends(get_db)):
    """Get all results for a test."""
    test = db.query(models.ScheduledTest).filter(models.ScheduledTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    results = db.query(models.TestResult).filter(models.TestResult.test_id == test_id).all()
    
    response = []
    for r in results:
        agniveer = db.query(models.Agniveer).filter(models.Agniveer.id == r.agniveer_id).first()
        response.append({
            "id": r.id,
            "test_id": r.test_id,
            "agniveer_id": r.agniveer_id,
            "score": r.score,
            "remarks": r.remarks,
            "is_absent": r.is_absent,
            "recorded_at": r.recorded_at,
            "recorded_by": r.recorded_by,
            "agniveer_name": agniveer.name if agniveer else None,
            "agniveer_service_id": agniveer.service_id if agniveer else None
        })
    
    return response

@app.get("/api/tests/{test_id}/agniveers")
def get_test_agniveers(test_id: int, db: Session = Depends(get_db)):
    """Get list of Agniveers eligible for a test based on target_type."""
    test = db.query(models.ScheduledTest).filter(models.ScheduledTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    query = db.query(models.Agniveer)
    
    if test.target_type == "BATCH":
        query = query.filter(models.Agniveer.batch_no == test.target_value)
    elif test.target_type == "COMPANY":
        query = query.filter(models.Agniveer.company == test.target_value)
    # "ALL" - no filter needed
    
    agniveers = query.all()
    
    # Get existing results for this test
    existing_results = {r.agniveer_id: r for r in test.results}
    
    result = []
    for a in agniveers:
        existing = existing_results.get(a.id)
        result.append({
            "id": a.id,
            "service_id": a.service_id,
            "name": a.name,
            "batch_no": a.batch_no,
            "company": a.company,
            "score": existing.score if existing else None,
            "is_absent": existing.is_absent if existing else False,
            "has_result": existing is not None
        })
    
    return result

# ============================================================
# COUNSELLING MODULE ENDPOINTS
# ============================================================

@app.post("/api/counselling", response_model=List[schemas.CounsellingSessionResponse])
def schedule_counselling(
    data: schemas.CounsellingSessionCreate,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    """Schedule counselling session(s). If batch_name provided, creates individual sessions for all Agniveers in that batch."""
    # Get officer ID from token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(models.User).filter(models.User.username == username).first()
        officer_id = user.user_id if user else 1
    except:
        officer_id = 1
    
    sessions = []
    
    if data.batch_name:
        # Batch scheduling - create session for each Agniveer in batch
        agniveers = db.query(models.Agniveer).filter(models.Agniveer.batch_no == data.batch_name).all()
        for a in agniveers:
            session = models.CounsellingSession(
                agniveer_id=a.id,
                officer_id=officer_id,
                scheduled_date=data.scheduled_date,
                batch_group=data.batch_name,
                topic=data.topic,
                status=models.CounsellingStatus.SCHEDULED
            )
            db.add(session)
            sessions.append(session)
    elif data.agniveer_id:
        # Individual scheduling
        session = models.CounsellingSession(
            agniveer_id=data.agniveer_id,
            officer_id=officer_id,
            scheduled_date=data.scheduled_date,
            topic=data.topic,
            status=models.CounsellingStatus.SCHEDULED
        )
        db.add(session)
        sessions.append(session)
    else:
        raise HTTPException(status_code=400, detail="Must provide either agniveer_id or batch_name")
    
    db.commit()
    for s in sessions:
        db.refresh(s)
        s.agniveer_name = s.agniveer.name
        s.agniveer_service_id = s.agniveer.service_id
    
    return sessions

@app.get("/api/counselling/company/{company_name}", response_model=List[schemas.CounsellingSessionResponse])
def get_company_counselling_sessions(company_name: str, db: Session = Depends(get_db)):
    """Get all counselling sessions for Agniveers in a company."""
    sessions = db.query(models.CounsellingSession).join(models.Agniveer).filter(
        models.Agniveer.company == company_name
    ).order_by(models.CounsellingSession.scheduled_date.desc()).all()
    
    for s in sessions:
        s.agniveer_name = s.agniveer.name
        s.agniveer_service_id = s.agniveer.service_id
    
    return sessions

@app.get("/api/counselling/agniveer/{agniveer_id}/history", response_model=List[schemas.CounsellingSessionResponse])
def get_agniveer_counselling_history(agniveer_id: int, db: Session = Depends(get_db)):
    """Get counselling history for a specific Agniveer."""
    sessions = db.query(models.CounsellingSession).filter(
        models.CounsellingSession.agniveer_id == agniveer_id
    ).order_by(models.CounsellingSession.scheduled_date.desc()).all()
    
    for s in sessions:
        s.agniveer_name = s.agniveer.name
        s.agniveer_service_id = s.agniveer.service_id
    
    return sessions

@app.put("/api/counselling/{session_id}/complete", response_model=schemas.CounsellingSessionResponse)
def complete_counselling_session(
    session_id: int,
    data: schemas.CounsellingSessionUpdate,
    db: Session = Depends(get_db)
):
    """Complete a counselling session with notes and action items."""
    session = db.query(models.CounsellingSession).filter(models.CounsellingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if data.notes:
        session.notes = data.notes
    if data.action_items:
        session.action_items = data.action_items
    if data.status:
        session.status = data.status
        if data.status == models.CounsellingStatus.COMPLETED:
            session.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(session)
    session.agniveer_name = session.agniveer.name
    session.agniveer_service_id = session.agniveer.service_id
    
    return session

@app.get("/api/counselling/{session_id}/performance-sheet")
def get_counselling_performance_sheet(session_id: int, db: Session = Depends(get_db)):
    """Get detailed performance sheet for an Agniveer during counselling."""
    session = db.query(models.CounsellingSession).filter(models.CounsellingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    agniveer = session.agniveer
    
    # Get latest RRI
    rri = db.query(models.RetentionReadiness).filter(
        models.RetentionReadiness.agniveer_id == agniveer.id
    ).order_by(models.RetentionReadiness.calculation_date.desc()).first()
    
    # Get latest technical assessment
    tech = db.query(models.TechnicalAssessment).filter(
        models.TechnicalAssessment.agniveer_id == agniveer.id
    ).order_by(models.TechnicalAssessment.assessment_date.desc()).first()
    
    # Get behavioral assessments
    behavs = db.query(models.BehavioralAssessment).filter(
        models.BehavioralAssessment.agniveer_id == agniveer.id
    ).order_by(models.BehavioralAssessment.assessment_date.desc()).limit(4).all()
    
    # Get achievements
    achievements = db.query(models.Achievement).filter(
        models.Achievement.agniveer_id == agniveer.id
    ).order_by(models.Achievement.date_earned.desc()).all()
    
    # Get past counselling notes
    past_sessions = db.query(models.CounsellingSession).filter(
        models.CounsellingSession.agniveer_id == agniveer.id,
        models.CounsellingSession.status == models.CounsellingStatus.COMPLETED,
        models.CounsellingSession.id != session_id
    ).order_by(models.CounsellingSession.completed_at.desc()).limit(5).all()
    
    return {
        "agniveer": {
            "id": agniveer.id,
            "name": agniveer.name,
            "service_id": agniveer.service_id,
            "batch_no": agniveer.batch_no,
            "company": agniveer.company,
            "rank": agniveer.rank,
            "photo_url": agniveer.photo_url
        },
        "rri": {
            "score": rri.rri_score if rri else None,
            "band": rri.retention_band.value if rri else None,
            "technical_component": rri.technical_component if rri else None,
            "behavioral_component": rri.behavioral_component if rri else None,
            "achievement_component": rri.achievement_component if rri else None
        } if rri else None,
        "technical_assessment": {
            "firing": tech.firing_score if tech else None,
            "weapon_handling": tech.weapon_handling_score if tech else None,
            "tactical": tech.tactical_score if tech else None,
            "cognitive": tech.cognitive_score if tech else None,
            "date": tech.assessment_date.isoformat() if tech else None
        } if tech else None,
        "behavioral_assessments": [{
            "quarter": b.quarter,
            "initiative": b.initiative,
            "dedication": b.dedication,
            "team_spirit": b.team_spirit,
            "courage": b.courage,
            "motivation": b.motivation,
            "adaptability": b.adaptability,
            "date": b.assessment_date.isoformat()
        } for b in behavs],
        "achievements": [{
            "title": a.title,
            "type": a.type.value,
            "points": a.points,
            "date": a.date_earned.isoformat()
        } for a in achievements],
        "past_counselling": [{
            "date": s.completed_at.isoformat() if s.completed_at else s.scheduled_date.isoformat(),
            "topic": s.topic,
            "notes": s.notes,
            "action_items": s.action_items
        } for s in past_sessions]
    }
