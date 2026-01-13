from sqlalchemy.orm import Session
from . import models, schemas, database
from .auth_utils import get_password_hash
import csv
import io
from datetime import datetime
import shutil
import os

UPLOAD_DIR = "uploads/policies"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def create_audit_log(db: Session, user_id: int, action: str, details: str = None, ip: str = None):
    log = models.AuditLog(
        user_id=user_id,
        action=action,
        details=details,
        ip_address=ip,
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()

def process_bulk_upload_agniveers(db: Session, file_contents: str, admin_id: int) -> schemas.BulkUploadResult:
    """
    Parses CSV and creates Agniveer + User records.
    CSV Columns expected: 
    CSV Columns expected: 
    Batch No, Service No, Name, Photo URL, Reporting Date, DoB, NOK Name, NOK Phone, 
    Address, Bank Name, Bank Branch, Bank Account, PAN, Adhaar, Qualification, Coy
    """
    stream = io.StringIO(file_contents)
    csv_reader = csv.reader(stream)
    
    # Skip header if present (Assuming first row is header based on user description not explicitly saying no header, but let's try to detect or assume standard)
    # User listed 1.1, 1.2 etc. Let's assume the CSV *has* headers matching those or just ordered values.
    # We will assume ORDER based on the list provided in the prompt.
    # 0: Batch, 1: ServiceNo, 2: Name, 3: Photo, 4: Date, 5: NOK Name, 6: NOK Phone, 7: Address, 
    # 8: Bank Name, 9: Bank Branch, 10: Bank Acc, 11: PAN, 12: Adhaar, 13: Qual, 14: Coy
    
    success_count = 0
    failure_count = 0
    errors = []
    
    rows = list(csv_reader)
    if not rows:
        return schemas.BulkUploadResult(total_processed=0, successful=0, failed=0, errors=["Empty File"])

    # Basic heuristic to skip header if first col is "Batch No" or similar
    start_index = 0
    if "batch" in rows[0][0].lower():
        start_index = 1
        
    for i in range(start_index, len(rows)):
        row = rows[i]
        try:
            # Flexible length check
            if len(row) < 3: 
                continue # Skip empty lines
                
            # Extract basic mandatory fields
            batch_no = row[0].strip()
            service_id = row[1].strip()
            name = row[2].strip()
            
            # Check for existing
            if db.query(models.Agniveer).filter(models.Agniveer.service_id == service_id).first():
                errors.append(f"Row {i+1}: Duplicate Service ID {service_id}")
                failure_count += 1
                continue
            
            # Check if User exists
            existing_user = db.query(models.User).filter(models.User.username == service_id).first()
            if existing_user:
                 # Check if this user is orphaned (no agniveer profile) or if we should overwrite
                 if existing_user.agniveer_id is None:
                      # Orphaned user from bad delete - clean it up
                      db.delete(existing_user)
                      db.flush()
                 else:
                      errors.append(f"Row {i+1}: User {service_id} already exists")
                      failure_count += 1
                      continue

            # Create User Account (Service ID / Service ID pattern)
            hashed_pw = get_password_hash(service_id)
            new_user = models.User(
                username=service_id,
                password_hash=hashed_pw,
                role=models.UserRole.AGNIVEER
            )
            db.add(new_user)
            db.flush() # Get ID
            
            # Parse Date (Try standard formats)
            r_date = None
            date_str = row[4].strip()
            if date_str:
                for fmt in ('%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y'):
                    try:
                        r_date = datetime.strptime(date_str, fmt)
                        break
                    except:
                        pass
            
            # Create Agniveer Profile
            new_agniveer = models.Agniveer(
                service_id=service_id,
                name=name,
                batch_no=batch_no,
                photo_url=row[3].strip() if len(row) > 3 else None,
                reporting_date=r_date,
                dob=datetime.strptime(row[5].strip(), '%d-%m-%Y') if len(row) > 5 and row[5].strip() else None, # Attempt fixed format for now or reuse date logic
                nok_name=row[6].strip() if len(row) > 6 else None,
                nok_phone=row[7].strip() if len(row) > 7 else None,
                hometown_address=row[8].strip() if len(row) > 8 else None,
                bank_name=row[9].strip() if len(row) > 9 else None,
                bank_branch=row[10].strip() if len(row) > 10 else None,
                bank_account=row[11].strip() if len(row) > 11 else None,
                pan_card=row[12].strip() if len(row) > 12 else None,
                adhaar_card=row[13].strip() if len(row) > 13 else None,
                higher_qualification=row[14].strip() if len(row) > 14 else None,
                company=row[15].strip() if len(row) > 15 else None,
                joining_date=datetime.utcnow() # System timestamp for record creation
            )
            
            # Link User
            new_agniveer.user_account = new_user # This might work if relationship is set, or manually link
            # User has agniveer_id, Agniveer has user_account... relationship 'back_populates' handles it 
            # BUT we need to commit Agniveer first to get ID for User.agniveer_id OR let SQLAlchemy handle it.
            # Safe way:
            db.add(new_agniveer)
            db.flush()
            new_user.agniveer_id = new_agniveer.id
            
            db.commit()
            success_count += 1
            
        except Exception as e:
            db.rollback()
            failure_count += 1
            errors.append(f"Row {i+1}: {str(e)}")
            
    create_audit_log(db, admin_id, "BULK_UPLOAD", f"Processed {len(rows)-start_index} rows. Success: {success_count}")
    
    return schemas.BulkUploadResult(
        total_processed=len(rows)-start_index,
        successful=success_count,
        failed=failure_count,
        errors=errors
    )
