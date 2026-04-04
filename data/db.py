import os
import mysql.connector
from mysql.connector import Error
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

# ======================================================
# DATABASE CONFIG
# ======================================================
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "root"),
    "database": os.getenv("DB_NAME", "financial_tracking_system"),
}

# ======================================================
# JWT CONFIG
# ======================================================
SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "9f8c1a5d7e2f4b6c8d9e0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d"
)
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# ======================================================
# ROLE GROUPS
# ======================================================
ADMIN_ROLES = ["admin", "manager"]
FINANCE_ROLES = ["admin", "manager", "accounting"]
SUPERVISOR_ROLES = ["admin", "manager", "supervisor"]
STAFF_CREATOR_ROLES = ["admin", "manager", "supervisor", "hr"]
ALL_AUTHORIZED = ["admin", "manager", "accounting", "supervisor", "hr", "dispatcher", "tracking"]

# ======================================================
# SECURITY
# ======================================================
security = HTTPBearer()


# ======================================================
# MYSQL CONNECTION
# ======================================================
def get_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection failed: {str(e)}"
        )


# ======================================================
# CURRENT USER FROM JWT
# ======================================================
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        staff_id = payload.get("staff_id")
        role = payload.get("role")

        if not staff_id or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        return {
            "staff_id": staff_id,
            "role": role
        }

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


# ======================================================
# ROLE CHECKERS
# ======================================================
def require_roles(allowed_roles: list):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        return current_user

    return role_checker


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_finance(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in FINANCE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Finance access required"
        )
    return current_user


def require_supervisor(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in SUPERVISOR_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Supervisor access required"
        )
    return current_user


def require_staff_creator(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in STAFF_CREATOR_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff creation access required"
        )
    return current_user


def require_authorized(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ALL_AUTHORIZED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authorized user access required"
        )
    return current_user