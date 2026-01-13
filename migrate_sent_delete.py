
from backend.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE internal_emails ADD COLUMN is_deleted_by_sender BOOLEAN DEFAULT 0"))
            print("Migration successful: Added is_deleted_by_sender to internal_emails")
        except Exception as e:
            print(f"Migration failed (maybe column exists?): {e}")

if __name__ == "__main__":
    migrate()
