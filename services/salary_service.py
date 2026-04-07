from datetime import date
from data.db import get_connection


# =======================================================
# GET STAFF BASIC INFO
# =======================================================
def get_staff_basic_info(staff_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                staff_id,
                staff_full_name,
                staff_username,
                job_title,
                is_active
            FROM staff
            WHERE staff_id = %s
            LIMIT 1
        """, (staff_id,))

        return cursor.fetchone()

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET ALL STAFF
# =======================================================
def get_all_staff():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                staff_id,
                staff_full_name,
                staff_username,
                job_title,
                is_active
            FROM staff
            ORDER BY staff_full_name ASC
        """)
        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET COMMISSION SUMMARY FOR PERIOD
# Pure preview calculation from shipments
# Uses:
# - assigned_staff_id
# - shipment_created_date
# - profit
# - dispatcher_commission_percent
# - is_deleted = 0
# =======================================================
def get_commission_summary_for_period(staff_id: int, start_date: date, end_date: date):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                shipment_id,
                assigned_staff_id,
                shipment_created_date,
                broker_price,
                driver_pay,
                profit,
                dispatcher_commission_percent,
                is_deleted
            FROM shipments
            WHERE assigned_staff_id = %s
              AND DATE(shipment_created_date) BETWEEN %s AND %s
              AND is_deleted = 0
            ORDER BY shipment_created_date ASC, shipment_id ASC
        """, (staff_id, start_date, end_date))

        rows = cursor.fetchall()

        total_shipments = 0
        total_profit = 0.0
        estimated_salary = 0.0

        for row in rows:
            broker_price = float(row.get("broker_price") or 0)
            driver_pay = float(row.get("driver_pay") or 0)

            if row.get("profit") is None:
                profit = broker_price - driver_pay
            else:
                profit = float(row.get("profit") or 0)

            percent = row.get("dispatcher_commission_percent")
            if percent is None:
                percent = 0.0
            else:
                percent = float(percent)

            commission_amount = profit * percent / 100

            total_shipments += 1
            total_profit += profit
            estimated_salary += commission_amount

        return {
            "total_shipments": total_shipments,
            "total_profit": round(total_profit, 2),
            "estimated_salary": round(estimated_salary, 2)
        }

    finally:
        cursor.close()
        conn.close()


# =======================================================
# MY SALARY PREVIEW
# Pure calculation only
# No insert into salary_records
# =======================================================
def calculate_my_salary_preview(staff_id: int, start_date: date, end_date: date):
    try:
        if start_date > end_date:
            return {"error": "start_date cannot be later than end_date"}

        staff = get_staff_basic_info(staff_id)
        if not staff:
            return {"error": "User not found"}

        summary = get_commission_summary_for_period(
            staff_id=staff_id,
            start_date=start_date,
            end_date=end_date
        )

        return {
            "staff_id": staff["staff_id"],
            "staff_full_name": staff["staff_full_name"],
            "staff_username": staff["staff_username"],
            "job_title": staff["job_title"],
            "period_start": start_date,
            "period_end": end_date,
            "total_shipments": summary["total_shipments"],
            "total_profit": summary["total_profit"],
            "estimated_salary": summary["estimated_salary"]
        }

    except Exception as e:
        return {"error": str(e)}


# =======================================================
# ALL SALARY PREVIEW
# Pure calculation for all staff
# No insert into salary_records
# =======================================================
def calculate_all_salary_preview(start_date: date, end_date: date):
    if start_date > end_date:
        return [{"error": "start_date cannot be later than end_date"}]

    staff_list = get_all_staff()
    result = []

    for staff in staff_list:
        summary = get_commission_summary_for_period(
            staff_id=staff["staff_id"],
            start_date=start_date,
            end_date=end_date
        )

        result.append({
            "staff_id": staff["staff_id"],
            "staff_full_name": staff["staff_full_name"],
            "staff_username": staff["staff_username"],
            "job_title": staff["job_title"],
            "period_start": start_date,
            "period_end": end_date,
            "total_shipments": summary["total_shipments"],
            "total_profit": summary["total_profit"],
            "estimated_salary": summary["estimated_salary"]
        })

    return result


# =======================================================
# GET SAVED SALARY RECORD FOR EXACT PERIOD
# =======================================================
def get_saved_salary_for_period(staff_id: int, start_date: date, end_date: date):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                sr.salary_id,
                sr.staff_id,
                s.staff_full_name,
                s.staff_username,
                s.job_title,
                sr.period_start,
                sr.period_end,
                sr.base_salary,
                sr.shipment_bonus,
                sr.bonus,
                sr.tax_percent,
                sr.total_salary,
                sr.created_at
            FROM salary_records sr
            JOIN staff s ON s.staff_id = sr.staff_id
            WHERE sr.staff_id = %s
              AND sr.period_start = %s
              AND sr.period_end = %s
            LIMIT 1
        """, (staff_id, start_date, end_date))

        record = cursor.fetchone()

        if not record:
            return {"error": "Salary for this period has not been generated yet"}

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
# GET ALL SAVED SALARY RECORDS FOR PERIOD
# Official records only
# =======================================================
def get_all_saved_salary_records_for_period(start_date: date, end_date: date):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                sr.salary_id,
                sr.staff_id,
                s.staff_full_name,
                s.staff_username,
                s.job_title,
                sr.period_start,
                sr.period_end,
                sr.base_salary,
                sr.shipment_bonus,
                sr.bonus,
                sr.tax_percent,
                sr.total_salary,
                sr.created_at
            FROM salary_records sr
            JOIN staff s ON s.staff_id = sr.staff_id
            WHERE sr.period_start >= %s
              AND sr.period_end <= %s
            ORDER BY s.staff_full_name ASC, sr.period_start DESC, sr.salary_id DESC
        """, (start_date, end_date))

        rows = cursor.fetchall()

        for row in rows:
            gross_salary = (
                float(row["base_salary"] or 0)
                + float(row["shipment_bonus"] or 0)
                + float(row["bonus"] or 0)
            )
            tax_amount = gross_salary * float(row["tax_percent"] or 0) / 100

            row["gross_salary"] = round(gross_salary, 2)
            row["tax_amount"] = round(tax_amount, 2)

        return rows

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GENERATE OFFICIAL SALARY RECORD
# Manager enters base_salary manually
# Commission part is calculated automatically from shipments
# =======================================================
def generate_salary_for_period(
    staff_id: int,
    start_date: date,
    end_date: date,
    base_salary: float = 0.0,
    bonus: float = 0.0,
    tax_percent: float = 0.0
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if start_date > end_date:
            return {"error": "start_date cannot be later than end_date"}

        staff = get_staff_basic_info(staff_id)
        if not staff:
            return {"error": "User not found"}

        cursor.execute("""
            SELECT salary_id
            FROM salary_records
            WHERE staff_id = %s
              AND period_start = %s
              AND period_end = %s
            LIMIT 1
        """, (staff_id, start_date, end_date))

        existing = cursor.fetchone()
        if existing:
            return {"error": "Salary already generated for this period"}

        summary = get_commission_summary_for_period(
            staff_id=staff_id,
            start_date=start_date,
            end_date=end_date
        )

        shipment_bonus = float(summary["estimated_salary"] or 0)
        base_salary = float(base_salary or 0)
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
            round(base_salary, 2),
            round(shipment_bonus, 2),
            round(bonus, 2),
            round(tax_percent, 2),
            round(total_salary, 2)
        ))

        conn.commit()

        return {
            "message": "Salary record created successfully",
            "staff_id": staff["staff_id"],
            "staff_full_name": staff["staff_full_name"],
            "staff_username": staff["staff_username"],
            "job_title": staff["job_title"],
            "period_start": start_date,
            "period_end": end_date,
            "base_salary": round(base_salary, 2),
            "total_shipments": summary["total_shipments"],
            "total_profit": summary["total_profit"],
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
                s.staff_username,
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

        rows = cursor.fetchall()

        for row in rows:
            gross_salary = (
                float(row["base_salary"] or 0)
                + float(row["shipment_bonus"] or 0)
                + float(row["bonus"] or 0)
            )
            tax_amount = gross_salary * float(row["tax_percent"] or 0) / 100

            row["gross_salary"] = round(gross_salary, 2)
            row["tax_amount"] = round(tax_amount, 2)

        return rows

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET SALARY RECORDS BY STAFF
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

        rows = cursor.fetchall()

        for row in rows:
            gross_salary = (
                float(row["base_salary"] or 0)
                + float(row["shipment_bonus"] or 0)
                + float(row["bonus"] or 0)
            )
            tax_amount = gross_salary * float(row["tax_percent"] or 0) / 100

            row["gross_salary"] = round(gross_salary, 2)
            row["tax_amount"] = round(tax_amount, 2)

        return rows

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
                s.staff_username,
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
            LIMIT 1
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