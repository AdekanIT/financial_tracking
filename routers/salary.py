from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from data.db import get_current_user, require_roles, FINANCE_JOB_TITLES
from services.salary_service import (
    calculate_my_salary_preview,
    calculate_all_salary_preview,
    get_saved_salary_for_period,
    get_all_saved_salary_records_for_period,
    generate_salary_for_period,
)
from services.salary_export_service import generate_salary_excel

router = APIRouter(prefix="/salary", tags=["Salary"])


StartDateQuery = Annotated[
    date,
    Query(description="Start date in YYYY-MM-DD format. Example: 2026-04-03")
]

EndDateQuery = Annotated[
    date,
    Query(description="End date in YYYY-MM-DD format. Example: 2026-04-06")
]


# =============================
# MY SALARY PREVIEW
# Pure calculation for current user
# No DB record creation
# =============================
@router.get("/my")
def my_salary(
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    current_user: dict = Depends(get_current_user)
):
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be later than end_date"
        )

    result = calculate_my_salary_preview(
        staff_id=current_user["staff_id"],
        start_date=start_date,
        end_date=end_date
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


# =============================
# MY SAVED SALARY RECORD
# Official generated record for current user
# =============================
@router.get("/my-record")
def my_salary_record(
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    current_user: dict = Depends(get_current_user)
):
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be later than end_date"
        )

    result = get_saved_salary_for_period(
        staff_id=current_user["staff_id"],
        start_date=start_date,
        end_date=end_date
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


# =============================
# ALL SALARY PREVIEW
# Pure calculation for all staff
# No DB record creation
# Finance roles only
# =============================
@router.get("/all")
def all_salary_preview(
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    current_user: dict = Depends(require_roles(FINANCE_JOB_TITLES))
):
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be later than end_date"
        )

    result = calculate_all_salary_preview(
        start_date=start_date,
        end_date=end_date
    )

    return result


# =============================
# ALL SAVED SALARY RECORDS
# Official generated records for all staff
# Finance roles only
# =============================
@router.get("/all-records")
def all_salary_records(
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    current_user: dict = Depends(require_roles(FINANCE_JOB_TITLES))
):
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be later than end_date"
        )

    result = get_all_saved_salary_records_for_period(
        start_date=start_date,
        end_date=end_date
    )

    return result


# =============================
# GENERATE OFFICIAL SALARY RECORD
# Manager manually sets base_salary / bonus / tax
# Shipment commission part is calculated automatically
# =============================
@router.post("/generate")
def generate_salary(
    staff_id: int,
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    base_salary: float = 0.0,
    custom_bonus: float = 0.0,
    tax_percent: float = 0.0,
    current_user: dict = Depends(require_roles(["manager"]))
):
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be later than end_date"
        )

    result = generate_salary_for_period(
        staff_id=staff_id,
        start_date=start_date,
        end_date=end_date,
        base_salary=base_salary,
        bonus=custom_bonus,
        tax_percent=tax_percent
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


# =============================
# EXPORT SAVED SALARY RECORDS
# Finance roles only
# =============================
@router.get("/export")
def export_salary(
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    current_user: dict = Depends(require_roles(FINANCE_JOB_TITLES))
):
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be later than end_date"
        )

    rows = get_all_saved_salary_records_for_period(
        start_date=start_date,
        end_date=end_date
    )

    salary_data = [
        {
            "staff_full_name": row["staff_full_name"],
            "staff_username": row["staff_username"],
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
    filename = f"salary_records_{start_date}_{end_date}.xlsx"

    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )