import bcrypt
import jwt
from datetime import datetime, timedelta
from data.db import SECRET_KEY, ALGORITHM, get_connection

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

    if jt == "manager":
        return "manager"
    if jt == "accounting":
        return "accounting"
    if jt == "supervisor":
        return "supervisor"
    if jt == "dispatcher":
        return "dispatcher"
    if jt == "tracking":
        return "tracking"
    if jt == "hr":
        return "hr"

    return "user"

# -------------------------------------------------------
# Создание нового пользователя
# -------------------------------------------------------
def create_user(staff_username, staff_full_name, job_title, password, created_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        job_title_clean = format_job_title(job_title)
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

        return {"message": "User created", "staff_id": staff_id}

    except Exception as e:
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()

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

    if not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
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
# Получение всех пользователей
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
# Изменение статуса пользователя
# -------------------------------------------------------
def change_user_status(staff_id, is_active, changed_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        UPDATE staff
        SET is_active=%s
        WHERE staff_id=%s
    """, (is_active, staff_id))

    action = "activated" if is_active else "deactivated"

    cursor.execute("""
        INSERT INTO user_logs (staff_id, action_type, changed_by)
        VALUES (%s, %s, %s)
    """, (staff_id, action, changed_by))

    conn.commit()
    cursor.close()
    conn.close()

    return {"message": f"User {action}"}

# -------------------------------------------------------
# Логи пользователей
# -------------------------------------------------------
def get_user_logs():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT * FROM user_logs ORDER BY created_at DESC
    """)

    logs = cursor.fetchall()
    cursor.close()
    conn.close()
    return logs