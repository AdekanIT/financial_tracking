import bcrypt
from jose import jwt
from datetime import datetime, timedelta
from data.db import get_connection, SECRET_KEY, ALGORITHM


# =======================================================
# ALLOWED JOB TITLES
# =======================================================
ALLOWED_JOB_TITLES = [
    "manager",
    "accounting",
    "supervisor",
    "dispatcher",
    "tracking",
    "hr"
]


# =======================================================
# NORMALIZE JOB TITLE
# =======================================================
def normalize_job_title(job_title: str) -> str:
    return (job_title or "").strip().lower()


# =======================================================
# HASH PASSWORD
# =======================================================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# =======================================================
# VERIFY PASSWORD
# =======================================================
def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


# =======================================================
# CREATE ACCESS TOKEN
# =======================================================
def create_access_token(data: dict, expires_hours: int = 24) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=expires_hours)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# =======================================================
# LOGIN USER
# =======================================================
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
            LIMIT 1
        """, (username.strip(),))

        user = cursor.fetchone()

        if not user:
            return None

        if not user["is_active"]:
            return {"error": "User inactive"}

        if not verify_password(password, user["password_hash"]):
            return None

        job_title = normalize_job_title(user["job_title"])

        if job_title not in ALLOWED_JOB_TITLES:
            return {"error": "Invalid job title"}

        token = create_access_token({
            "staff_id": user["staff_id"],
            "job_title": job_title
        })

        return {
            "access_token": token,
            "token_type": "bearer",
            "staff_id": user["staff_id"],
            "staff_username": user["staff_username"],
            "staff_full_name": user["staff_full_name"],
            "job_title": job_title
        }

    finally:
        cursor.close()
        conn.close()


# =======================================================
# REGISTER STAFF
# =======================================================
def register_staff(username: str, password: str, full_name: str, job_title: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        username_clean = username.strip()
        full_name_clean = full_name.strip()
        job_title_clean = normalize_job_title(job_title)

        if not username_clean:
            return {"error": "Username is required"}

        if not full_name_clean:
            return {"error": "Full name is required"}

        if not password:
            return {"error": "Password is required"}

        if job_title_clean not in ALLOWED_JOB_TITLES:
            return {
                "error": f"Invalid job_title. Allowed values: {', '.join(ALLOWED_JOB_TITLES)}"
            }

        cursor.execute("""
            SELECT staff_id
            FROM staff
            WHERE staff_username = %s
            LIMIT 1
        """, (username_clean,))

        existing = cursor.fetchone()

        if existing:
            return {"error": "User already exists"}

        password_hash = hash_password(password)

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
            username_clean,
            password_hash,
            full_name_clean,
            job_title_clean
        ))

        conn.commit()

        return {
            "message": "Staff created successfully"
        }

    finally:
        cursor.close()
        conn.close()