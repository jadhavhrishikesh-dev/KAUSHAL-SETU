from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend import models
from passlib.context import CryptContext

# Ensure tables exist (idempotent)
models.Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_commanders():
    db = SessionLocal()
    try:
        # Get all distinct companies from Agniveers
        # We filter out None values
        companies = db.query(models.Agniveer.company).distinct().filter(models.Agniveer.company != None).all()
        company_names = [c[0] for c in companies]
        
        print(f"Found {len(company_names)} active companies: {company_names}")

        for company in company_names:
            # User request: login id = company_name, password = company_name
            username = company
            password = company 
            
            # Check if user exists
            existing_user = db.query(models.User).filter(models.User.username == username).first()
            if not existing_user:
                print(f"Creating Commander account for company: {company}...")
                user = models.User(
                    username=username,
                    password_hash=pwd_context.hash(password),
                    role=models.UserRole.COY_CDR,
                    full_name=f"Commander {company}", # Default display name
                    assigned_company=company
                )
                db.add(user)
                try:
                    db.commit()
                    print(f"✅ Created user: {username}")
                except Exception as db_err:
                    db.rollback()
                    print(f"❌ Failed to create {username}: {db_err}")
            else:
                print(f"ℹ️  User {username} already exists. Skipping.")
                
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_commanders()
