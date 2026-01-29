from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend import models

def debug_db():
    db = SessionLocal()
    try:
        agniveers = db.query(models.Agniveer).all()
        print(f"Total Agniveers: {len(agniveers)}")
        companies = set([a.company for a in agniveers])
        print(f"Agniveer Companies: {companies}")
        
        users = db.query(models.User).filter(models.User.role == models.UserRole.COY_CDR).all()
        print(f"Total Commanders: {len(users)}")
        for u in users:
            print(f"Commander: {u.username}, Assigned Company: {u.assigned_company}")
        
        # Simulate Dashboard Query for Alpha
        alpha_agniveers = db.query(models.Agniveer).filter(models.Agniveer.company == "Alpha").all()
        print(f"Agniveers in Alpha: {len(alpha_agniveers)}")
        if len(alpha_agniveers) > 0:
            print(f"Sample: {alpha_agniveers[0].name}, {alpha_agniveers[0].service_id}")


    finally:
        db.close()

if __name__ == "__main__":
    debug_db()
