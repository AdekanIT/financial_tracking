import bcrypt
import jwt
from datetime import datetime, timedelta
from data.db import SECRET_KEY, ALGORITHM, get_connection


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
# GET ROLE FROM JOB TITLE
# -------------------------------------------------------
def get_role_from_job(job_title: str) -> str:
    jt = (job_title or "").strip().lower()

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
# CREATE NEW USER
# -------------------------------------------------------
def create_user(staff_username, staff_full_name, job_title, password, created_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # check if username already exists
        cursor.execute("""
            SELECT staff_id
            FROM staff
            WHERE staff_username = %s
        """, (staff_username.strip(),))
        existing = cursor.fetchone()

        if existing:
            return {"error": "Username already exists"}

        job_title_clean = format_job_title(job_title)
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

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
            staff_username.strip(),
            password_hash,
            staff_full_name.strip(),
            job_title_clean
        ))

        staff_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO user_logs (
                staff_id,
                action_type,
                changed_by
            )
            VALUES (%s, %s, %s)
        """, (
            staff_id,
            "user_created",
            created_by
        ))

        conn.commit()

        return {
            "message": "User created successfully",
            "staff_id": staff_id
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()


# -------------------------------------------------------
# LOGIN USER
# -------------------------------------------------------
def login_user(username, password):
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

        if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
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

    finally:
        cursor.close()
        conn.close()


# -------------------------------------------------------
# GET ALL USERS
# -------------------------------------------------------
def get_all_users():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                staff_id,
                staff_username,
                staff_full_name,
                job_title,
                is_active,
                base_salary,
                shipment_percentage,
                created_at
            FROM staff
            ORDER BY created_at DESC
        """)
        users = cursor.fetchall()
        return users

    finally:
        cursor.close()
        conn.close()


# -------------------------------------------------------
# CHANGE PASSWORD
# -------------------------------------------------------
def change_password(staff_id, new_password, changed_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        new_hash = bcrypt.hashpw(
            new_password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        cursor.execute("""
            UPDATE staff
            SET password_hash = %s
            WHERE staff_id = %s
        """, (new_hash, staff_id))

        if cursor.rowcount == 0:
            return {"error": "User not found"}

        cursor.execute("""
            INSERT INTO user_logs (
                staff_id,
                action_type,
                changed_by
            )
            VALUES (%s, %s, %s)
        """, (
            staff_id,
            "password_changed",
            changed_by
        ))

        conn.commit()
        return {"message": "Password updated successfully"}

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()


# -------------------------------------------------------
# CHANGE USER STATUS
# -------------------------------------------------------
def change_user_status(staff_id, is_active, changed_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            UPDATE staff
            SET is_active = %s
            WHERE staff_id = %s
        """, (is_active, staff_id))

        if cursor.rowcount == 0:
            return {"error": "User not found"}

        action = "activated" if is_active else "deactivated"

        cursor.execute("""
            INSERT INTO user_logs (
                staff_id,
                action_type,
                changed_by
            )
            VALUES (%s, %s, %s)
        """, (
            staff_id,
            action,
            changed_by
        ))

        conn.commit()

        return {"message": f"User {action} successfully"}

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()


# -------------------------------------------------------
# UPDATE USER BASIC INFO
# -------------------------------------------------------
def update_user_info(staff_id, staff_full_name=None, job_title=None, changed_by=None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT staff_id, staff_full_name, job_title
            FROM staff
            WHERE staff_id = %s
        """, (staff_id,))
        existing = cursor.fetchone()

        if not existing:
            return {"error": "User not found"}

        new_full_name = staff_full_name.strip() if staff_full_name else existing["staff_full_name"]
        new_job_title = format_job_title(job_title) if job_title else existing["job_title"]

        cursor.execute("""
            UPDATE staff
            SET staff_full_name = %s,
                job_title = %s
            WHERE staff_id = %s
        """, (new_full_name, new_job_title, staff_id))

        if changed_by is not None:
            cursor.execute("""
                INSERT INTO user_logs (
                    staff_id,
                    action_type,
                    changed_by
                )
                VALUES (%s, %s, %s)
            """, (
                staff_id,
                "user_updated",
                changed_by
            ))

        conn.commit()

        return {"message": "User updated successfully"}

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()


# -------------------------------------------------------
# UPDATE COMPENSATION SETTINGS
# -------------------------------------------------------
def update_user_compensation(staff_id, base_salary=None, shipment_percentage=None, changed_by=None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT staff_id, base_salary, shipment_percentage
            FROM staff
            WHERE staff_id = %s
        """, (staff_id,))
        existing = cursor.fetchone()

        if not existing:
            return {"error": "User not found"}

        new_base_salary = base_salary if base_salary is not None else existing["base_salary"]
        new_shipment_percentage = shipment_percentage if shipment_percentage is not None else existing["shipment_percentage"]

        cursor.execute("""
            UPDATE staff
            SET base_salary = %s,
                shipment_percentage = %s
            WHERE staff_id = %s
        """, (
            new_base_salary,
            new_shipment_percentage,
            staff_id
        ))

        if changed_by is not None:
            cursor.execute("""
                INSERT INTO user_logs (
                    staff_id,
                    action_type,
                    changed_by
                )
                VALUES (%s, %s, %s)
            """, (
                staff_id,
                "compensation_updated",
                changed_by
            ))

        conn.commit()

        return {"message": "Compensation updated successfully"}

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()


# -------------------------------------------------------
# GET USER LOGS
# -------------------------------------------------------
def get_user_logs():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                ul.log_id,
                ul.staff_id,
                s1.staff_full_name AS affected_user_name,
                s1.staff_username AS affected_username,
                ul.action_type,
                ul.changed_by,
                s2.staff_full_name AS changed_by_name,
                ul.created_at
            FROM user_logs ul
            JOIN staff s1 ON s1.staff_id = ul.staff_id
            LEFT JOIN staff s2 ON s2.staff_id = ul.changed_by
            ORDER BY ul.created_at DESC
        """)
        logs = cursor.fetchall()
        return logs

    finally:
        cursor.close()
        conn.close()