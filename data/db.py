import mysql.connector
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone


# ======================================================
# JWT CONFIG
# ======================================================
SECRET_KEY = "SUPER_SECRET_KEY_CHANGE_ME"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


# ======================================================
# MYSQL CONNECTION
# ======================================================
def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="financial_tracking"
    )


# ======================================================
# PASSWORD HASHING
# ======================================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    password = password[:72]  # bcrypt limitation
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str):
    password = password[:72]
    return pwd_context.verify(password, hashed)


# ======================================================
# JWT TOKEN CREATION
# ======================================================
def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ======================================================
# SECURITY - TOKEN DECODING
# ======================================================
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        staff_id = payload.get("staff_id")
        role = payload.get("role")

        if staff_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return {
            "staff_id": staff_id,
            "role": role
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


# ======================================================
# ROLE GROUPS
# ======================================================
ADMIN_ROLES = ["manager"]
FINANCE_ROLES = ["manager", "accounting"]
SUPERVISOR_ROLES = ["manager", "supervisor"]
STAFF_CREATOR_ROLES = ["manager", "supervisor", "hr"]
ALL_AUTHORIZED = ["manager", "accounting", "supervisor", "hr", "dispatcher", "tracking"]


# ======================================================
# ROLE CHECK MIDDLEWARE
# ======================================================
def require_roles(allowed_roles: list):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this resource"
            )
        return current_user
    return role_checker