
from backend.database import SessionLocal, engine
from backend.models import User, UserRole, Base
from backend.auth_utils import get_password_hash
import sys

def seed_admin():
    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == "admin").first():
            print("Admin user already exists.")
            return

        print("Creating admin user...")
        admin = User(
            username="admin",
            password_hash=get_password_hash("admin"),
            role=UserRole.ADMIN,
            full_name="System Administrator"
        )
        db.add(admin)
        db.commit()
        print("Admin user created successfully.")
    except Exception as e:
        print(f"Error seeding admin: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
