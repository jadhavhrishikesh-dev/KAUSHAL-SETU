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

# Create Database Tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="KAUSHAL-SETU API", version="1.0.0")

# HTTPS Enforcement (enable in production via FORCE_HTTPS=true)
if os.getenv("FORCE_HTTPS", "false").lower() == "true":
    app.add_middleware(HTTPSRedirectMiddleware)

# CORS Setup - Read from environment or use defaults
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
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

from . import models, schemas, database, rri_engine, analytics, ai_service, admin_service
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
    return {"access_token": access_token, "token_type": "bearer"}

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

# --- Message Endpoints ---

@app.post("/api/messages", response_model=schemas.MessageResponse)
def send_message(message: schemas.MessageCreate, db: Session = Depends(get_db)):
    db_msg = models.Message(**message.dict())
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

@app.get("/api/messages/{agniveer_id}", response_model=List[schemas.MessageResponse])
def get_agniveer_messages(agniveer_id: int, db: Session = Depends(get_db)):
    return db.query(models.Message).filter(models.Message.agniveer_id == agniveer_id).order_by(models.Message.timestamp.asc()).all()

@app.get("/api/messages/role/{role}", response_model=List[schemas.MessageResponse])
def get_role_messages(role: str, db: Session = Depends(get_db)):
    # Returns messages where this role is sender OR recipient
    return db.query(models.Message).filter(
        (models.Message.recipient_role == role) | (models.Message.sender_role == role)
    ).order_by(models.Message.timestamp.desc()).all()

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
