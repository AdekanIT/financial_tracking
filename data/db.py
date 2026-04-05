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
# JOB TITLE GROUPS
# ======================================================
ADMIN_JOB_TITLES = ["manager"]
FINANCE_JOB_TITLES = ["manager", "accounting"]
SUPERVISOR_JOB_TITLES = ["manager", "supervisor"]
STAFF_CREATOR_JOB_TITLES = ["manager", "supervisor", "hr"]
ALL_AUTHORIZED_JOB_TITLES = [
    "manager",
    "accounting",
    "supervisor",
    "hr",
    "dispatcher",
    "tracking"
]

# ======================================================
# SECURITY
# ======================================================
security = HTTPBearer()


# ======================================================
# MYSQL CONNECTION
# ======================================================
def get_connection():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Error as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection failed: {str(e)}"
        )


# ======================================================
# NORMALIZE JOB TITLE
# ======================================================
def normalize_job_title(job_title: str) -> str:
    return (job_title or "").strip().lower()


# ======================================================
# CURRENT USER FROM JWT
# ======================================================
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        staff_id = payload.get("staff_id")
        job_title = payload.get("job_title")

        if staff_id is None or job_title is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        return {
            "staff_id": staff_id,
            "job_title": normalize_job_title(job_title)
        }

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


# ======================================================
# GENERIC RBAC CHECKER
# ======================================================
def require_roles(allowed_job_titles: list):
    allowed_normalized = [normalize_job_title(title) for title in allowed_job_titles]

    def role_checker(current_user: dict = Depends(get_current_user)):
        current_job_title = normalize_job_title(current_user.get("job_title"))

        if current_job_title not in allowed_normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        return current_user

    return role_checker


# ======================================================
# PRESET ACCESS HELPERS
# ======================================================
def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["job_title"] not in ADMIN_JOB_TITLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_finance(current_user: dict = Depends(get_current_user)):
    if current_user["job_title"] not in FINANCE_JOB_TITLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Finance access required"
        )
    return current_user


def require_supervisor(current_user: dict = Depends(get_current_user)):
    if current_user["job_title"] not in SUPERVISOR_JOB_TITLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Supervisor access required"
        )
    return current_user


def require_staff_creator(current_user: dict = Depends(get_current_user)):
    if current_user["job_title"] not in STAFF_CREATOR_JOB_TITLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff creation access required"
        )
    return current_user


def require_authorized(current_user: dict = Depends(get_current_user)):
    if current_user["job_title"] not in ALL_AUTHORIZED_JOB_TITLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authorized user access required"
        )
    return current_user