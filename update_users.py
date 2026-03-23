import bcrypt
import mysql.connector

# -------------------------------
# Настройки базы данных
# -------------------------------
DB_HOST = "localhost"
DB_USER = "root"
DB_PASS = "root"
DB_NAME = "financial_tracking"

# -------------------------------
# Новые пользователи
# -------------------------------
users = [
    {"username": "manager1", "full_name": "Manager One", "job_title": "Manager", "password": "Manager123!"},
    {"username": "accounting1", "full_name": "Accounting One", "job_title": "Accounting", "password": "Accounting123!"},
    {"username": "supervisor1", "full_name": "Supervisor One", "job_title": "Supervisor", "password": "Supervisor123!"},
    {"username": "dispatcher1", "full_name": "Dispatcher One", "job_title": "Dispatcher", "password": "Dispatcher123!"},
    {"username": "tracking1", "full_name": "Tracking One", "job_title": "Tracking", "password": "Tracking123!"},
    {"username": "hr1", "full_name": "HR One", "job_title": "HR", "password": "HR123!"}
]

# -------------------------------
# Подключение к базе
# -------------------------------
conn = mysql.connector.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASS,
    database=DB_NAME
)
cursor = conn.cursor()

# -------------------------------
# Чистим таблицы
# -------------------------------
print("Deleting all users and logs...")
cursor.execute("DELETE FROM user_logs")
cursor.execute("DELETE FROM staff")
conn.commit()

# -------------------------------
# Создание новых пользователей с bcrypt
# -------------------------------
print("Creating new users...")
for u in users:
    hashed = bcrypt.hashpw(u["password"].encode(), bcrypt.gensalt()).decode()
    cursor.execute("""
        INSERT INTO staff (staff_username, staff_full_name, job_title, password, password_hash, is_active)
        VALUES (%s, %s, %s, %s, %s, TRUE)
    """, (u["username"], u["full_name"], u["job_title"], u["password"], hashed))
    staff_id = cursor.lastrowid
    cursor.execute("""
        INSERT INTO user_logs (staff_id, action_type, changed_by)
        VALUES (%s, 'user_created', %s)
    """, (staff_id, staff_id))  # сам себя создал
    conn.commit()

cursor.close()
conn.close()

print("All users created and password_hash updated successfully.")