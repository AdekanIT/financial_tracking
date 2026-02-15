from data.db import get_connection, verify_password, create_access_token
from data.db import hash_password


def login_user(username: str, password: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT staff_id, staff_username, password_hash, job_title
            FROM staff
            WHERE staff_username = %s
        """, (username,))

        staff = cursor.fetchone()

        cursor.close()
        conn.close()

        if not staff:
            return None

        staff_id, staff_username, password_hash, job_title = staff

        # проверяем пароль
        if not verify_password(password, password_hash):
            return None

        token = create_access_token({
            "staff_id": staff_id,
            "role": job_title
        })

        return {
            "access_token": token,
            "staff": {
                "id": staff_id,
                "username": staff_username,
                "role": job_title
            }
        }

    except Exception as e:
        print("LOGIN ERROR:", e)
        raise


def register_staff(username: str, password: str, full_name: str, role: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # проверяем существует ли пользователь
        cursor.execute("""
            SELECT staff_id FROM staff WHERE staff_username = %s
        """, (username,))
        existing = cursor.fetchone()

        if existing:
            cursor.close()
            conn.close()
            return {"error": "User already exists"}

        # хэшируем пароль
        hashed_password = hash_password(password)

        # создаём сотрудника
        cursor.execute("""
            INSERT INTO staff (staff_username, password_hash, staff_full_name, job_title)
            VALUES (%s, %s, %s, %s)
        """, (username, hashed_password, full_name, role))

        conn.commit()

        cursor.close()
        conn.close()

        return {"message": "Staff created successfully"}

    except Exception as e:
        print("REGISTER ERROR:", e)
        raise