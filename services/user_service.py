import bcrypt
import jwt
from datetime import datetime, timedelta
from config import SECRET_KEY, ALGORITHM
from database import get_connection

# -------------------------------------------------------
# Нормализация job_title
# -------------------------------------------------------
def format_job_title(job_title: str):
    job_title = job_title.strip()
    job_title_lower = job_title.lower()

    mapping = {
        "manager": "Manager",
        "accounting": "Accounting",
        "hr": "HR",
        "driver": "Driver",
        "dispatcher": "Dispatcher"
    }

    return mapping.get(job_title_lower, job_title.capitalize())

# -------------------------------------------------------
# Определение роли по job_title
# -------------------------------------------------------
def get_role_from_job(job_title: str):
    jt = job_title.lower()

    if jt == "manager":
        return "manager"
    if jt == "accounting":
        return "accounting"
    if jt == "hr":
        return "hr"
    if jt == "dispatcher":
        return "dispatcher"
    if jt == "driver":
        return "driver"

    return "user"

# -------------------------------------------------------
# Создание нового пользователя
# -------------------------------------------------------
def create_user(staff_username, staff_full_name, job_title, password, created_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    job_title_clean = format_job_title(job_title)

    # bcrypt — основной рабочий хэш
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    cursor.execute("""
        INSERT INTO staff
        (staff_username, staff_full_name, job_title, password, password_hash, is_active)
        VALUES (%s, %s, %s, %s, %s, TRUE)
    """, (
        staff_username.strip(),
        staff_full_name.strip(),
        job_title_clean,
        password,
        password_hash
    ))

    staff_id = cursor.lastrowid

    cursor.execute("""
        INSERT INTO user_logs
        (staff_id, action_type, changed_by)
        VALUES (%s, 'user_created', %s)
    """, (staff_id, created_by))

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "message": "User created",
        "staff_id": staff_id
    }

# -------------------------------------------------------
# Авторизация пользователя
# -------------------------------------------------------
def login_user(username, password):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
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

    # Основная проверка пароля по bcrypt
    if not bcrypt.verify(password, user["password_hash"]):
        return None

    role = get_role_from_job(user["job_title"])

    payload = {
        "staff_id": user["staff_id"],
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "staff_id": user["staff_id"],
        "full_name": user["staff_full_name"]
    }

# -------------------------------------------------------
# Получение списка всех пользователей
# -------------------------------------------------------
def get_all_users():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT staff_id, staff_username, staff_full_name, job_title, is_active
        FROM staff
    """)

    users = cursor.fetchall()

    cursor.close()
    conn.close()
    return users

# -------------------------------------------------------
# Обновление job_title
# -------------------------------------------------------
def update_job_title(staff_id, new_job_title, changed_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    new_job_title_clean = format_job_title(new_job_title)

    cursor.execute("""
        UPDATE staff
        SET job_title=%s
        WHERE staff_id=%s
    """, (new_job_title_clean, staff_id))

    cursor.execute("""
        INSERT INTO user_logs
        (staff_id, action_type, changed_by)
        VALUES (%s,'title_changed',%s)
    """, (staff_id, changed_by))

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "Job title updated"}

# -------------------------------------------------------
# Смена пароля
# -------------------------------------------------------
def change_password(staff_id, new_password, changed_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()

    cursor.execute("""
        UPDATE staff
        SET password=%s, password_hash=%s
        WHERE staff_id=%s
    """, (new_password, new_hash, staff_id))

    cursor.execute("""
        INSERT INTO user_logs
        (staff_id, action_type, changed_by)
        VALUES (%s,'password_changed',%s)
    """, (staff_id, changed_by))

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "Password updated"}

# -------------------------------------------------------
# Деактивация аккаунта
# -------------------------------------------------------
def deactivate_user(staff_id, changed_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        UPDATE staff
        SET is_active=FALSE
        WHERE staff_id=%s
    """, (staff_id,))

    cursor.execute("""
        INSERT INTO user_logs
        (staff_id, action_type, changed_by)
        VALUES (%s,'deactivated',%s)
    """, (staff_id, changed_by))

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "User deactivated"}

# -------------------------------------------------------
# Активация пользователя
# -------------------------------------------------------
def activate_user(staff_id, changed_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        UPDATE staff
        SET is_active=TRUE
        WHERE staff_id=%s
    """, (staff_id,))

    cursor.execute("""
        INSERT INTO user_logs
        (staff_id, action_type, changed_by)
        VALUES (%s,'activated',%s)
    """, (staff_id, changed_by))

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": "User activated"}