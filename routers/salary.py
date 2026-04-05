from fastapi import APIRouter, Depends, HTTPException
from datetime import date
from fastapi.responses import StreamingResponse

from data.db import get_current_user, require_roles, FINANCE_JOB_TITLES, get_connection
from services.salary_service import generate_salary_for_period
from services.salary_export_service import generate_salary_excel

router = APIRouter(prefix="/salary", tags=["Salary"])


# =============================
# MY SALARY (ANY AUTHORIZED USER)
# =============================
@router.get("/my")
def my_salary(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM salary_records
            WHERE staff_id = %s
            ORDER BY period_start DESC
        """, (current_user["staff_id"],))

        salaries = cursor.fetchall()
        return salaries

    finally:
        cursor.close()
        conn.close()


# =============================
# ALL SALARIES (FINANCE JOB TITLES)
# =============================
@router.get("/all")
def all_salaries(current_user: dict = Depends(require_roles(FINANCE_JOB_TITLES))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                sr.*,
                s.staff_full_name,
                s.job_title
            FROM salary_records sr
            JOIN staff s ON s.staff_id = sr.staff_id
            ORDER BY sr.period_start DESC
        """)

        salaries = cursor.fetchall()
        return salaries

    finally:
        cursor.close()
        conn.close()


# =============================
# GENERATE SALARY (MANAGER ONLY)
# =============================
@router.post("/generate")
def generate_salary(
    staff_id: int,
    start_date: date,
    end_date: date,
    custom_bonus: float = 0.0,
    current_user: dict = Depends(require_roles(["manager"]))
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT id
            FROM salary_records
            WHERE staff_id = %s
              AND period_start = %s
              AND period_end = %s
        """, (staff_id, start_date, end_date))

        existing = cursor.fetchone()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Salary already generated for this period"
            )

    finally:
        cursor.close()
        conn.close()

    return generate_salary_for_period(
        staff_id=staff_id,
        start_date=start_date,
        end_date=end_date,
        bonus=custom_bonus
    )


# =============================
# EXPORT SALARY (FINANCE JOB TITLES)
# =============================
@router.get("/export")
def export_salary(
    start_date: date,
    end_date: date,
    current_user: dict = Depends(require_roles(FINANCE_JOB_TITLES))
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                s.staff_full_name,
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
            ORDER BY s.staff_full_name
        """, (start_date, end_date))

        rows = cursor.fetchall()

    finally:
        cursor.close()
        conn.close()

    salary_data = [
        {
            "staff_full_name": row["staff_full_name"],
            "job_title": row["job_title"],
            "period_start": row["period_start"],
            "period_end": row["period_end"],
            "base_salary": row["base_salary"],
            "shipment_bonus": row["shipment_bonus"],
            "bonus": row["bonus"],
            "tax_percent": row["tax_percent"],
            "total_salary": row["total_salary"],
            "created_at": row["created_at"]
        }
        for row in rows
    ]

    excel_file = generate_salary_excel(salary_data)
    filename = f"salary_report_{start_date}_{end_date}.xlsx"

    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )