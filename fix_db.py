from backend.database import engine
from sqlalchemy import text

def reset_grievances():
    with engine.connect() as conn:
        print("Dropping 'grievances' table...")
        conn.execute(text("DROP TABLE IF EXISTS grievances CASCADE"))
        conn.commit()
        print("Done. The table will be recreated automatically by the backend on restart/reload.")

if __name__ == "__main__":
    reset_grievances()
