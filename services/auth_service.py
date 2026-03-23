import bcrypt
import jwt
from datetime import datetime, timedelta
from data.db import get_connection, SECRET_KEY, ALGORITHM

# -------------------------------------------------------
# Нормализация job_title
# -------------------------------------------------------
def format_job_title(job_title: str):
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
# Определение роли по job_title
# -------------------------------------------------------
def get_role_from_job(job_title: str):
    jt = job_title.lower()
    roles = ["manager", "accounting", "supervisor", "dispatcher", "tracking", "hr"]
    return jt if jt in roles else "user"

# -------------------------------------------------------
# Хэширование пароля
# -------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

# -------------------------------------------------------
# Проверка пароля
# -------------------------------------------------------
def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())

# -------------------------------------------------------
# Создание токена
# -------------------------------------------------------
def create_access_token(data: dict, expires_hours: int = 24):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=expires_hours)
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

# -------------------------------------------------------
# Логин пользователя
# -------------------------------------------------------
def login_user(username: str, password: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT staff_id, staff_username, staff_full_name, job_title, password_hash, is_active
        FROM staff
        WHERE staff_username = %s
    """, (username,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

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
        "staff_id": user["staff_id"],
        "staff_username": user["staff_username"],
        "staff_full_name": user["staff_full_name"],
        "role": role
    }

# -------------------------------------------------------
# Регистрация нового пользователя
# -------------------------------------------------------
def register_staff(username: str, password: str, full_name: str, role: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Проверка существующего пользователя
    cursor.execute("SELECT staff_id FROM staff WHERE staff_username = %s", (username,))
    existing = cursor.fetchone()
    if existing:
        cursor.close()
        conn.close()
        return {"error": "User already exists"}

    password_hash = hash_password(password)
    job_title_clean = format_job_title(role)

    cursor.execute("""
        INSERT INTO staff (staff_username, staff_full_name, job_title, password_hash, is_active)
        VALUES (%s, %s, %s, %s, TRUE)
    """, (username, full_name, job_title_clean, password_hash))

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "Staff created successfully"}