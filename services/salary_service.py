from datetime import date
from data.db import get_connection


# =======================================================
# GET BASE SALARY
# =======================================================
def get_base_salary(staff_id: int) -> float:
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT base_salary
            FROM staff
            WHERE staff_id = %s
        """, (staff_id,))

        result = cursor.fetchone()

        if not result or result["base_salary"] is None:
            return 0.0

        return float(result["base_salary"])

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET SHIPMENT PERCENTAGE
# =======================================================
def get_shipment_percentage(staff_id: int) -> float:
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT shipment_percentage
            FROM staff
            WHERE staff_id = %s
        """, (staff_id,))

        result = cursor.fetchone()

        if not result or result["shipment_percentage"] is None:
            return 0.0

        return float(result["shipment_percentage"])

    finally:
        cursor.close()
        conn.close()


# =======================================================
# CALCULATE SHIPMENT BONUS
# =======================================================
def calculate_shipment_bonus(staff_id: int, start_date, end_date) -> float:
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        default_percent = get_shipment_percentage(staff_id)

        cursor.execute("""
            SELECT
                COALESCE(profit, 0) AS profit,
                dispatcher_commission_percent
            FROM shipments
            WHERE assigned_staff_id = %s
              AND DATE(delivery_datetime) BETWEEN %s AND %s
              AND shipment_status = 'delivered'
              AND is_deleted = 0
        """, (staff_id, start_date, end_date))

        shipments = cursor.fetchall()

        total_bonus = 0.0

        for shipment in shipments:
            profit = float(shipment["profit"] or 0)
            percent = shipment["dispatcher_commission_percent"]

            if percent is None:
                percent = default_percent
            else:
                percent = float(percent)

            total_bonus += profit * percent / 100

        return round(total_bonus, 2)

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GENERATE SALARY FOR PERIOD
# =======================================================
def generate_salary_for_period(
    staff_id: int,
    start_date: date,
    end_date: date,
    bonus: float = 0.0,
    tax_percent: float = 0.0
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        base_salary = get_base_salary(staff_id)
        shipment_bonus = calculate_shipment_bonus(staff_id, start_date, end_date)

        bonus = float(bonus or 0)
        tax_percent = float(tax_percent or 0)

        gross_salary = base_salary + shipment_bonus + bonus
        tax_amount = gross_salary * tax_percent / 100
        total_salary = gross_salary - tax_amount

        cursor.execute("""
            INSERT INTO salary_records (
                staff_id,
                period_start,
                period_end,
                base_salary,
                shipment_bonus,
                bonus,
                tax_percent,
                total_salary
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            staff_id,
            start_date,
            end_date,
            base_salary,
            shipment_bonus,
            bonus,
            tax_percent,
            round(total_salary, 2)
        ))

        conn.commit()

        return {
            "message": "Salary record created successfully",
            "staff_id": staff_id,
            "period_start": start_date,
            "period_end": end_date,
            "base_salary": round(base_salary, 2),
            "shipment_bonus": round(shipment_bonus, 2),
            "bonus": round(bonus, 2),
            "tax_percent": round(tax_percent, 2),
            "gross_salary": round(gross_salary, 2),
            "tax_amount": round(tax_amount, 2),
            "total_salary": round(total_salary, 2)
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET ALL SALARY RECORDS
# =======================================================
def get_all_salary_records():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                sr.salary_id,
                sr.staff_id,
                s.staff_full_name,
                s.job_title,
                sr.created_at,
                sr.period_start,
                sr.period_end,
                sr.base_salary,
                sr.shipment_bonus,
                sr.bonus,
                sr.tax_percent,
                sr.total_salary
            FROM salary_records sr
            JOIN staff s ON s.staff_id = sr.staff_id
            ORDER BY sr.created_at DESC, sr.salary_id DESC
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET SALARY RECORDS FOR ONE STAFF
# =======================================================
def get_salary_records_by_staff(staff_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                sr.salary_id,
                sr.staff_id,
                sr.created_at,
                sr.period_start,
                sr.period_end,
                sr.base_salary,
                sr.shipment_bonus,
                sr.bonus,
                sr.tax_percent,
                sr.total_salary
            FROM salary_records sr
            WHERE sr.staff_id = %s
            ORDER BY sr.created_at DESC, sr.salary_id DESC
        """, (staff_id,))

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET ONE SALARY RECORD
# =======================================================
def get_salary_record_by_id(salary_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                sr.salary_id,
                sr.staff_id,
                s.staff_full_name,
                s.job_title,
                sr.created_at,
                sr.period_start,
                sr.period_end,
                sr.base_salary,
                sr.shipment_bonus,
                sr.bonus,
                sr.tax_percent,
                sr.total_salary
            FROM salary_records sr
            JOIN staff s ON s.staff_id = sr.staff_id
            WHERE sr.salary_id = %s
        """, (salary_id,))

        record = cursor.fetchone()

        if not record:
            return {"error": "Salary record not found"}

        gross_salary = (
            float(record["base_salary"] or 0)
            + float(record["shipment_bonus"] or 0)
            + float(record["bonus"] or 0)
        )
        tax_amount = gross_salary * float(record["tax_percent"] or 0) / 100

        record["gross_salary"] = round(gross_salary, 2)
        record["tax_amount"] = round(tax_amount, 2)

        return record

    finally:
        cursor.close()
        conn.close()


# =======================================================
# DELETE SALARY RECORD
# =======================================================
def delete_salary_record(salary_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            DELETE FROM salary_records
            WHERE salary_id = %s
        """, (salary_id,))

        if cursor.rowcount == 0:
            return {"error": "Salary record not found"}

        conn.commit()
        return {"message": "Salary record deleted successfully"}

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()