import bcrypt
from data.db import get_connection


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
# VALIDATE JOB TITLE
# =======================================================
def validate_job_title(job_title: str):
    job_title_clean = normalize_job_title(job_title)

    if job_title_clean not in ALLOWED_JOB_TITLES:
        return None

    return job_title_clean


# =======================================================
# HASH PASSWORD
# =======================================================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


# =======================================================
# CREATE NEW USER
# =======================================================
def create_user(staff_username, staff_full_name, job_title, password, created_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        staff_username_clean = staff_username.strip()
        staff_full_name_clean = staff_full_name.strip()
        job_title_clean = validate_job_title(job_title)

        if not staff_username_clean:
            return {"error": "staff_username is required"}

        if not staff_full_name_clean:
            return {"error": "staff_full_name is required"}

        if not password:
            return {"error": "password is required"}

        if not job_title_clean:
            return {
                "error": f"Invalid job_title. Allowed values: {', '.join(ALLOWED_JOB_TITLES)}"
            }

        cursor.execute("""
            SELECT staff_id
            FROM staff
            WHERE staff_username = %s
            LIMIT 1
        """, (staff_username_clean,))
        existing = cursor.fetchone()

        if existing:
            return {"error": "Username already exists"}

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
            staff_username_clean,
            password_hash,
            staff_full_name_clean,
            job_title_clean
        ))

        new_staff_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO user_logs (
                staff_id,
                action_type,
                changed_by
            )
            VALUES (%s, %s, %s)
        """, (
            new_staff_id,
            "user_created",
            created_by
        ))

        conn.commit()

        return {
            "message": "User created successfully",
            "staff_id": new_staff_id,
            "staff_username": staff_username_clean,
            "staff_full_name": staff_full_name_clean,
            "job_title": job_title_clean
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()


# =======================================================
# CHANGE PASSWORD
# =======================================================
def change_password(staff_id, new_password, changed_by):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if not new_password:
            return {"error": "new_password is required"}

        new_hash = hash_password(new_password)

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


# =======================================================
# CHANGE USER STATUS
# =======================================================
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


# =======================================================
# GET ALL USERS
# =======================================================
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
                created_at
            FROM staff
            ORDER BY created_at DESC
        """)
        users = cursor.fetchall()

        return users

    finally:
        cursor.close()
        conn.close()


# =======================================================
# UPDATE USER BASIC INFO
# =======================================================
def update_user_info(staff_id, staff_full_name=None, job_title=None, changed_by=None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                staff_id,
                staff_full_name,
                job_title
            FROM staff
            WHERE staff_id = %s
            LIMIT 1
        """, (staff_id,))
        existing = cursor.fetchone()

        if not existing:
            return {"error": "User not found"}

        new_full_name = (
            staff_full_name.strip()
            if staff_full_name is not None and staff_full_name.strip()
            else existing["staff_full_name"]
        )

        if job_title is not None:
            new_job_title = validate_job_title(job_title)
            if not new_job_title:
                return {
                    "error": f"Invalid job_title. Allowed values: {', '.join(ALLOWED_JOB_TITLES)}"
                }
        else:
            new_job_title = normalize_job_title(existing["job_title"])

        cursor.execute("""
            UPDATE staff
            SET
                staff_full_name = %s,
                job_title = %s
            WHERE staff_id = %s
        """, (
            new_full_name,
            new_job_title,
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
                "user_updated",
                changed_by
            ))

        conn.commit()

        return {
            "message": "User updated successfully",
            "staff_id": staff_id,
            "staff_full_name": new_full_name,
            "job_title": new_job_title
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()


# =======================================================
# UPDATE BASE SALARY ONLY
# =======================================================
def update_user_compensation(staff_id, base_salary=None, shipment_percentage=None, changed_by=None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                staff_id,
                base_salary
            FROM staff
            WHERE staff_id = %s
            LIMIT 1
        """, (staff_id,))
        existing = cursor.fetchone()

        if not existing:
            return {"error": "User not found"}

        new_base_salary = base_salary if base_salary is not None else existing["base_salary"]

        cursor.execute("""
            UPDATE staff
            SET base_salary = %s
            WHERE staff_id = %s
        """, (
            new_base_salary,
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

        return {
            "message": "Compensation updated successfully",
            "staff_id": staff_id,
            "base_salary": new_base_salary
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET USER LOGS
# =======================================================
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