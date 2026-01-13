import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Load env vars to get DATABASE_URL if set
load_dotenv()

# Default to SQLite if not specified
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kaushal_setu.db")

# SQLite requires "check_same_thread": False. PostgreSQL does not.
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL / others
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
