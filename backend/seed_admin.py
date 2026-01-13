from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine
from backend import models
from passlib.context import CryptContext

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_admin():
    db = SessionLocal()
    try:
        # Check if admin exists
        user = db.query(models.User).filter(models.User.username == "admin").first()
        if not user:
            print("Creating Admin User...")
            user = models.User(
                username="admin",
                password_hash=pwd_context.hash("admin"),
                role=models.UserRole.ADMIN
            )
            db.add(user)
            db.commit()
            print("Admin user created successfully.")
        else:
            print("Admin user already exists.")
            
    except Exception as e:
        print(f"Error seeding admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
