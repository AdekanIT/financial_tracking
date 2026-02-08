import mysql.connector

# Подключение к базе
conn = mysql.connector.connect(
    host="localhost",       # если MySQL локально
    user="root",            # твой пользователь MySQL
    password="ТВОЙ_ПАРОЛЬ_ЗДЕСЬ",
    database="financial_tracking"
)

cursor = conn.cursor()

# Пример запроса
cursor.execute("SHOW TABLES")
for table in cursor.fetchall():
    print(table)

conn.close()