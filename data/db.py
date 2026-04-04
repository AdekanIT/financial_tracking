import mysql.connector
from mysql.connector import Error
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError


# ======================================================
# DATABASE CONFIG
# ======================================================
DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "root",
    "database": "financial_tracking_system"
}


# ======================================================
# JWT CONFIG
# ======================================================
SECRET_KEY = "SUPER_SECRET_KEY_CHANGE_ME"
ALGORITHM = "HS256"


# ======================================================
# MYSQL CONNECTION
# ======================================================
def get_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(e)}"
        )


# ======================================================
# SECURITY - TOKEN DECODING
# ======================================================
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
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
# ROLE CHECK
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