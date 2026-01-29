import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend import models
from passlib.context import CryptContext

models.Base.metadata.create_all(bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_agniveers():
    db = SessionLocal()
    try:
        if db.query(models.Agniveer).count() > 0:
            print("Agniveers already exist. Skipping creation.")
            return

        print("Seeding initial Agniveers...")
        companies = ["Alpha", "Bravo", "Charlie", "Delta"]
        batches = ["Batch-2024-A", "Batch-2024-B"]
        
        for i in range(1, 51): # 50 Agniveers
            company = random.choice(companies)
            service_id = f"AG-{2024000 + i}"
            username = service_id
            
            # Create User Account
            user = models.User(
                username=username,
                password_hash=pwd_context.hash("password"),
                role=models.UserRole.AGNIVEER,
                full_name=f"Agniveer {i}",
                assigned_company=company
            )
            db.add(user)
            db.commit() # Get user ID
            
            # Create Agniveer Profile
            agniveer = models.Agniveer(
                user_id=user.id,
                service_id=service_id,
                name=f"Agniveer Name {i}",
                company=company,
                batch_no=random.choice(batches),
                rank="Sepoy",
                unit="123 Infantry Bn",
                dob=datetime(2003, 1, 1) + timedelta(days=random.randint(0, 365*2)),
                enrollment_date=datetime(2024, 1, 1),
                phone=f"98765432{i:02d}",
                email=f"agniveer{i}@army.mil"
            )
            db.add(agniveer)
        
        db.commit()
        print("✅ Created 50 Agniveers.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_agniveers()
