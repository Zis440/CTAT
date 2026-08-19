"""
JWT utilities and password hashing for Psyichub auth system.
"""
import os
import warnings
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = os.getenv("CT_SECRET_KEY", "psyichub-dev-secret-change-in-production-32chars!")
ALGORITHM = os.getenv("CT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("CT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

_KNOWN_PLACEHOLDERS = {
    "psyichub-dev-secret-change-in-production-32chars!",
    "generate_a_random_secret_here",
    "",
}
if SECRET_KEY in _KNOWN_PLACEHOLDERS:
    warnings.warn(
        "\n⚠️  CT_SECRET_KEY is set to a placeholder value!\n"
        "   All JWTs are signed with a guessable key.\n"
        "   Generate a real secret:  python -c \"import secrets; print(secrets.token_hex(32))\"\n"
        "   Then set CT_SECRET_KEY in your .env file.\n",
        stacklevel=2,
    )

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises JWTError on failure."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
