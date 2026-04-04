import bcrypt
import jwt
from datetime import datetime, timedelta
from data.db import get_connection, SECRET_KEY, ALGORITHM


# -------------------------------------------------------
# NORMALIZE JOB TITLE
# -------------------------------------------------------
def format_job_title(job_title: str) -> str:
    job_title = job_title.strip().lower()

    mapping = {
        "manager": "Manager",
        "accounting": "Accounting",
        "supervisor": "Supervisor",
        "dispatcher": "Dispatcher",
        "tracking": "Tracking",
        "hr": "HR"
    }

    return mapping.get(job_title, job_title.capitalize())


# -------------------------------------------------------
# MAP ROLE FROM JOB TITLE
# -------------------------------------------------------
def get_role_from_job(job_title: str) -> str:
    jt = (job_title or "").strip().lower()

    roles = ["manager", "accounting", "supervisor", "dispatcher", "tracking", "hr"]
    return jt if jt in roles else "user"


# -------------------------------------------------------
# HASH PASSWORD
# -------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# -------------------------------------------------------
# VERIFY PASSWORD
# -------------------------------------------------------
def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# -------------------------------------------------------
# CREATE ACCESS TOKEN
# -------------------------------------------------------
def create_access_token(data: dict, expires_hours: int = 24) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=expires_hours)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# -------------------------------------------------------
# LOGIN USER
# -------------------------------------------------------
def login_user(username: str, password: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                staff_id,
                staff_username,
                staff_full_name,
                job_title,
                password_hash,
                is_active
            FROM staff
            WHERE staff_username = %s
        """, (username.strip(),))

        user = cursor.fetchone()

        if not user:
            return None

        if not user["is_active"]:
            return {"error": "User inactive"}

        if not verify_password(password, user["password_hash"]):
            return None

        role = get_role_from_job(user["job_title"])

        token = create_access_token({
            "staff_id": user["staff_id"],
            "role": role
        })

        return {
            "access_token": token,
            "token_type": "bearer",
            "staff_id": user["staff_id"],
            "staff_username": user["staff_username"],
            "staff_full_name": user["staff_full_name"],
            "role": role
        }

    finally:
        cursor.close()
        conn.close()


# -------------------------------------------------------
# REGISTER NEW STAFF
# -------------------------------------------------------
def register_staff(username: str, password: str, full_name: str, role: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT staff_id
            FROM staff
            WHERE staff_username = %s
        """, (username.strip(),))

        existing = cursor.fetchone()

        if existing:
            return {"error": "User already exists"}

        password_hash = hash_password(password)
        job_title_clean = format_job_title(role)

        cursor.execute("""
            INSERT INTO staff (
                staff_username,
                password_hash,
                staff_full_name,
                job_title,
                is_active
            )
            VALUES (%s, %s, %s, %s, TRUE)
        """, (
            username.strip(),
            password_hash,
            full_name.strip(),
            job_title_clean
        ))

        conn.commit()

        return {"message": "Staff created successfully"}

    finally:
        cursor.close()
        conn.close()