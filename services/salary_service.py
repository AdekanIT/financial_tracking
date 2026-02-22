from data.db import get_connection
from datetime import date


def get_base_salary(staff_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT base_salary 
        FROM staff 
        WHERE staff_id = %s
    """, (staff_id,))

    result = cursor.fetchone()
    cursor.close()
    conn.close()

    if not result or result["base_salary"] is None:
        return 0.0

    return float(result["base_salary"])



def calculate_shipment_bonus(staff_id: int, start_date, end_date):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # берём базовый процент сотрудника (безопасно)
    cursor.execute("""
        SELECT shipment_percentage 
        FROM staff 
        WHERE staff_id = %s
    """, (staff_id,))

    staff = cursor.fetchone()

    if not staff or staff["shipment_percentage"] is None:
        default_percent = 0
    else:
        default_percent = float(staff["shipment_percentage"])

    # теперь берём shipments
    cursor.execute("""
        SELECT profit, commission_percentage
        FROM shipments
        WHERE assigned_staff_id = %s
        AND DATE(created_at) BETWEEN %s AND %s
        AND shipment_status = 'delivered'
    """, (staff_id, start_date, end_date))

    shipments = cursor.fetchall()

    total_bonus = 0.0

    for shipment in shipments:
        profit = float(shipment["profit"] or 0)
        percent = float(shipment["commission_percentage"] or default_percent)
        total_bonus += profit * percent / 100

    cursor.close()
    conn.close()

    return round(total_bonus, 2)


def generate_salary_for_period(
    staff_id: int,
    start_date: date,
    end_date: date,
    custom_bonus: float = 0.0
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    base_salary = get_base_salary(staff_id)
    shipment_bonus = calculate_shipment_bonus(staff_id, start_date, end_date)

    total_salary = base_salary + shipment_bonus + custom_bonus

    cursor.execute("""
        INSERT INTO salary_records (
            staff_id,
            period_start,
            period_end,
            base_salary,
            shipment_bonus,
            custom_bonus,
            total_salary
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s)
    """, (
        staff_id,
        start_date,
        end_date,
        base_salary,
        shipment_bonus,
        custom_bonus,
        total_salary
    ))

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "base_salary": base_salary,
        "shipment_bonus": shipment_bonus,
        "custom_bonus": custom_bonus,
        "total_salary": total_salary
    }