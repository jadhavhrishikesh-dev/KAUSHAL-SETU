import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get encryption key from environment variable or file (fallback for dev)
ENCRYPTION_KEY_FILE = "encryption.key"

def get_encryption_key():
    """Get encryption key from environment variable, or fallback to file for development"""
    # Priority 1: Environment variable (recommended for production)
    env_key = os.getenv("MAIL_ENCRYPTION_KEY")
    if env_key and len(env_key) > 0:
        return env_key.encode()
    
    # Priority 2: Key file (for development/backward compatibility)
    if os.path.exists(ENCRYPTION_KEY_FILE):
        with open(ENCRYPTION_KEY_FILE, "rb") as f:
            return f.read()
    
    # Priority 3: Generate new key and save to file (first run in dev)
    import warnings
    warnings.warn("⚠️ No MAIL_ENCRYPTION_KEY set. Generating and storing in file. Set env var in production!")
    key = Fernet.generate_key()
    with open(ENCRYPTION_KEY_FILE, "wb") as f:
        f.write(key)
    return key

# Initialize cipher
_key = get_encryption_key()
_cipher = Fernet(_key)

def encrypt_message(plaintext: str) -> str:
    """Encrypt a message and return base64-encoded ciphertext"""
    if not plaintext:
        return plaintext
    return _cipher.encrypt(plaintext.encode()).decode()

def decrypt_message(ciphertext: str) -> str:
    """Decrypt a base64-encoded ciphertext and return plaintext"""
    if not ciphertext:
        return ciphertext
    try:
        return _cipher.decrypt(ciphertext.encode()).decode()
    except Exception:
        # If decryption fails (e.g., legacy unencrypted message), return as-is
        return ciphertext
