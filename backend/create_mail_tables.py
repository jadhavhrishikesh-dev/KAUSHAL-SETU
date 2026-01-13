
from backend.database import engine, Base
from backend.models import InternalEmail, EmailRecipient

def create_tables():
    print("Creating mail tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    create_tables()
