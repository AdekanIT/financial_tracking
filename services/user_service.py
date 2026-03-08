from data.db import get_connection
from passlib.hash import bcrypt
from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"


# =========================
# USER LOGIN
# =========================

def login_user(username, password):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM staff
        WHERE staff_full_name = %s
    """, (username,))

    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if not user:
        return None

    if not user["is_active"]:
        return {"error": "User account inactive"}

    if not bcrypt.verify(password, user["password_hash"]):
        return None

    payload = {
        "staff_id": user["staff_id"],
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(hours=24)
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


# =========================
# CREATE USER
# =========================

def create_user(name, job_title, role, password, created_by):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    password_hash = bcrypt.hash(password)

    cursor.execute("""
        INSERT INTO staff
        (staff_full_name, job_title, role, password_hash, is_active)
        VALUES (%s,%s,%s,%s,TRUE)
    """, (name, job_title, role, password_hash))

    staff_id = cursor.lastrowid

    cursor.execute("""
        INSERT INTO user_logs
        (staff_id, action_type, changed_by, new_value)
        VALUES (%s,'user_created',%s,%s)
    """, (staff_id, created_by, role))

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "message": "User created",
        "staff_id": staff_id
    }


# =========================
# CHANGE PASSWORD
# =========================

def change_password(staff_id, new_password, changed_by):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    password_hash = bcrypt.hash(new_password)

    cursor.execute("""
        UPDATE staff
        SET password_hash=%s
        WHERE staff_id=%s
    """, (password_hash, staff_id))

    cursor.execute("""
        INSERT INTO user_logs
        (staff_id, action_type, changed_by)
        VALUES (%s,'password_changed',%s)
    """, (staff_id, changed_by))

    conn.commit()

    cursor.close()
    conn.close()

    return {"message": "Password updated"}


# =========================
# CHANGE ROLE
# =========================

def change_role(staff_id, new_role, changed_by):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT role FROM staff WHERE staff_id=%s
    """, (staff_id,))

    old_role = cursor.fetchone()["role"]

    cursor.execute("""
        UPDATE staff
        SET role=%s
        WHERE staff_id=%s
    """, (new_role, staff_id))

    cursor.execute("""
        INSERT INTO user_logs
        (staff_id, action_type, changed_by, old_value, new_value)
        VALUES (%s,'role_changed',%s,%s,%s)
    """, (staff_id, changed_by, old_role, new_role))

    conn.commit()

    cursor.close()
    conn.close()

    return {"message": "Role updated"}


# =========================
# CHANGE USER STATUS
# =========================

def change_user_status(staff_id, is_active, changed_by):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        UPDATE staff
        SET is_active=%s
        WHERE staff_id=%s
    """, (is_active, staff_id))

    cursor.execute("""
        INSERT INTO user_logs
        (staff_id, action_type, changed_by, new_value)
        VALUES (%s,'status_changed',%s,%s)
    """, (staff_id, changed_by, str(is_active)))

    conn.commit()

    cursor.close()
    conn.close()

    return {"message": "User status updated"}


# =========================
# LIST USERS
# =========================

def get_users():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
        staff_id,
        staff_full_name,
        job_title,
        role,
        is_active
        FROM staff
        ORDER BY staff_full_name
    """)

    users = cursor.fetchall()

    cursor.close()
    conn.close()

    return users


# =========================
# USER LOGS
# =========================

def get_user_logs():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
        ul.id,
        s.staff_full_name,
        ul.action_type,
        ul.old_value,
        ul.new_value,
        ul.created_at
        FROM user_logs ul
        JOIN staff s ON s.staff_id = ul.staff_id
        ORDER BY ul.created_at DESC
    """)

    logs = cursor.fetchall()

    cursor.close()
    conn.close()

    return logs