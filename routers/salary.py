from fastapi import APIRouter, Depends, HTTPException
from datetime import date
from data.db import get_current_user, require_roles, FINANCE_ROLES, get_connection
from services.salary_service import generate_salary_for_period

router = APIRouter(prefix="/salary", tags=["Salary"])


#  (anyone)
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


#  (manager + accounting)
@router.get("/all")
def all_salaries(current_user: dict = Depends(require_roles(FINANCE_ROLES))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT sr.*, s.staff_full_name, s.job_title
        FROM salary_records sr
        JOIN staff s ON s.staff_id = sr.staff_id
        WHERE sr.is_active = TRUE
        ORDER BY period_start DESC
    """)

    salaries = cursor.fetchall()

    cursor.close()
    conn.close()

    return salaries


@router.post("/generate")
def generate_salary(
    staff_id: int,
    start_date: date,
    end_date: date,
    custom_bonus: float = 0.0,
    current_user: dict = Depends(require_roles(FINANCE_ROLES))
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # защита от повторной генерации
    cursor.execute("""
        SELECT id FROM salary_records
        WHERE staff_id = %s
        AND period_start = %s
        AND period_end = %s
    """, (staff_id, start_date, end_date))

    existing = cursor.fetchone()
    cursor.close()
    conn.close()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Salary already generated for this period"
        )

    result = generate_salary_for_period(
        staff_id,
        start_date,
        end_date,
        custom_bonus
    )

    return result