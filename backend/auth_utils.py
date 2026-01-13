import os
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Auth Config - Read from environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "kaushal-setu-fallback-key-CHANGE-IN-PROD")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Warn if using default key
if SECRET_KEY == "kaushal-setu-fallback-key-CHANGE-IN-PROD":
    import warnings
    warnings.warn("⚠️ Using default SECRET_KEY. Set SECRET_KEY environment variable in production!")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Creates a JWT access token.
    payload: data dict + 'exp' (expiration time)
    algorithm: HS256 (HMAC with SHA-256) using SECRET_KEY
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default expiration if not specified
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 'exp' claim is standard for JWT expiration validation
    to_encode.update({"exp": expire})
    
    # Sign the token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
