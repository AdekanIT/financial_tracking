from fastapi import APIRouter, Depends, HTTPException
from datetime import date
from fastapi.responses import StreamingResponse

from data.db import get_current_user, require_roles, FINANCE_ROLES, get_connection
from services.salary_service import generate_salary_for_period
from services.salary_export_service import generate_salary_excel

router = APIRouter(prefix="/salary", tags=["Salary"])


# =============================
# MY SALARY (ANY USER)
# =============================

@router.get("/my")
def my_salary(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM salary_records
        WHERE staff_id = %s
        AND is_active = TRUE
        ORDER BY period_start DESC
    """, (current_user["staff_id"],))

    salaries = cursor.fetchall()

    cursor.close()
    conn.close()

    return salaries


# =============================
# ALL SALARIES (FINANCE ROLES)
# =============================

@router.get("/all")
def all_salaries(current_user: dict = Depends(require_roles(FINANCE_ROLES))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT sr.*, s.staff_full_name, s.job_title
        FROM salary_records sr
        JOIN staff s ON s.staff_id = sr.staff_id
        WHERE sr.is_active = TRUE
        ORDER BY sr.period_start DESC
    """)

    salaries = cursor.fetchall()

    cursor.close()
    conn.close()

    return salaries


# =============================
# GENERATE SALARY (MANAGER ONLY)
# =============================

@router.post("/generate")
def generate_salary(
    staff_id: int,
    start_date: date,
    end_date: date,
    custom_bonus: float = 0.0,
    current_user: dict = Depends(require_roles(["manager"]))  # 🔥 только manager
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # защита от дубликатов
    cursor.execute("""
        SELECT id FROM salary_records
        WHERE staff_id = %s
        AND period_start = %s
        AND period_end = %s
        AND is_active = TRUE
    """, (staff_id, start_date, end_date))

    existing = cursor.fetchone()

    cursor.close()
    conn.close()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Salary already generated for this period"
        )

    return generate_salary_for_period(
        staff_id,
        start_date,
        end_date,
        custom_bonus
    )


# =============================
# EXPORT SALARY (FINANCE ROLES)
# =============================

@router.get("/export")
def export_salary(
    start_date: date,
    end_date: date,
    current_user: dict = Depends(require_roles(FINANCE_ROLES))
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            s.staff_full_name,
            s.job_title,
            sr.base_salary,
            sr.shipment_bonus,
            sr.custom_bonus,
            sr.total_salary
        FROM salary_records sr
        JOIN staff s ON s.staff_id = sr.staff_id
        WHERE sr.period_start >= %s
        AND sr.period_end <= %s
        AND sr.is_active = TRUE
        ORDER BY s.staff_full_name
    """, (start_date, end_date))

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    salary_data = [
        {
            "employee": row["staff_full_name"],
            "role": row["job_title"],
            "base_salary": row["base_salary"],
            "shipment_bonus": row["shipment_bonus"],
            "custom_bonus": row["custom_bonus"],
            "total_salary": row["total_salary"]
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