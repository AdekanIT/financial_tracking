from datetime import date
from html import escape
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, StreamingResponse

from data.db import get_current_user, require_roles, FINANCE_JOB_TITLES
from services.salary_service import (
    calculate_my_salary_preview,
    calculate_all_salary_preview,
    get_saved_salary_for_period,
    get_all_saved_salary_records_for_period,
    generate_salary_for_period,
    get_salary_export_preview_data,
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
# =============================
@router.get("/my")
def my_salary(
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    current_user: dict = Depends(get_current_user)
):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be later than end_date")

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
# =============================
@router.get("/my-record")
def my_salary_record(
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    current_user: dict = Depends(get_current_user)
):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be later than end_date")

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
# =============================
@router.get("/all")
def all_salary_preview(
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    current_user: dict = Depends(require_roles(FINANCE_JOB_TITLES))
):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be later than end_date")

    return calculate_all_salary_preview(
        start_date=start_date,
        end_date=end_date
    )


# =============================
# ALL SAVED SALARY RECORDS
# =============================
@router.get("/all-records")
def all_salary_records(
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    current_user: dict = Depends(require_roles(FINANCE_JOB_TITLES))
):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be later than end_date")

    return get_all_saved_salary_records_for_period(
        start_date=start_date,
        end_date=end_date
    )


# =============================
# GENERATE OFFICIAL SALARY RECORD
# staff_full_name required
# staff_id optional
# =============================
@router.post("/generate")
def generate_salary(
    staff_full_name: str,
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    staff_id: int | None = None,
    base_salary: float = 0.0,
    custom_bonus: float = 0.0,
    tax_percent: float = 0.0,
    current_user: dict = Depends(require_roles(["manager"]))
):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be later than end_date")

    result = generate_salary_for_period(
        staff_full_name=staff_full_name,
        start_date=start_date,
        end_date=end_date,
        staff_id=staff_id,
        base_salary=base_salary,
        bonus=custom_bonus,
        tax_percent=tax_percent
    )

    if "error" in result:
        error_message = result["error"]

        if error_message == "Staff member not found":
            raise HTTPException(status_code=404, detail=error_message)

        if error_message == "Multiple staff members found with this full name. Please provide staff_id.":
            raise HTTPException(status_code=400, detail=error_message)

        if error_message == "Provided staff_id does not match the given staff_full_name":
            raise HTTPException(status_code=400, detail=error_message)

        if error_message == "Salary already generated for this period":
            raise HTTPException(status_code=400, detail=error_message)

        raise HTTPException(status_code=400, detail=error_message)

    return result


# =============================
# EXPORT PREVIEW IN BROWSER
# Opens salary export as HTML table
# =============================
@router.get("/export-preview", response_class=HTMLResponse)
def export_salary_preview(
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    current_user: dict = Depends(require_roles(FINANCE_JOB_TITLES))
):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be later than end_date")

    preview_data = get_salary_export_preview_data(
        start_date=start_date,
        end_date=end_date
    )

    rows = preview_data["rows"]
    summary = preview_data["summary"]

    table_rows_html = ""

    if rows:
        for row in rows:
            table_rows_html += f"""
                <tr>
                    <td>{escape(str(row.get("staff_full_name", "")))}</td>
                    <td>{escape(str(row.get("staff_username", "")))}</td>
                    <td>{escape(str(row.get("job_title", "")))}</td>
                    <td>{escape(str(row.get("staff_id", "")))}</td>
                    <td>{escape(str(row.get("period_start", "")))}</td>
                    <td>{escape(str(row.get("period_end", "")))}</td>
                    <td>{escape(str(row.get("base_salary", "")))}</td>
                    <td>{escape(str(row.get("shipment_bonus", "")))}</td>
                    <td>{escape(str(row.get("bonus", "")))}</td>
                    <td>{escape(str(row.get("gross_salary", "")))}</td>
                    <td>{escape(str(row.get("tax_percent", "")))}</td>
                    <td>{escape(str(row.get("tax_amount", "")))}</td>
                    <td>{escape(str(row.get("total_salary", "")))}</td>
                    <td>{escape(str(row.get("created_at", "")))}</td>
                </tr>
            """
    else:
        table_rows_html = """
            <tr>
                <td colspan="14" style="text-align:center; padding: 24px;">
                    No salary records found for the selected period.
                </td>
            </tr>
        """

    download_url = f"/salary/export?start_date={start_date}&end_date={end_date}"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Salary Export Preview</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background: #f4f7fb;
                margin: 0;
                padding: 24px;
                color: #1f2937;
            }}

            .container {{
                max-width: 1600px;
                margin: 0 auto;
            }}

            .header {{
                background: white;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }}

            .title {{
                margin: 0 0 8px 0;
                font-size: 28px;
            }}

            .subtitle {{
                margin: 0;
                color: #6b7280;
            }}

            .summary-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }}

            .summary-card {{
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }}

            .summary-card h3 {{
                margin: 0 0 8px 0;
                font-size: 14px;
                color: #6b7280;
                font-weight: 600;
            }}

            .summary-card p {{
                margin: 0;
                font-size: 22px;
                font-weight: bold;
            }}

            .table-wrapper {{
                background: white;
                border-radius: 12px;
                overflow: auto;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }}

            table {{
                width: 100%;
                border-collapse: collapse;
                min-width: 1500px;
            }}

            th, td {{
                padding: 12px 14px;
                border-bottom: 1px solid #e5e7eb;
                text-align: left;
                white-space: nowrap;
                font-size: 14px;
            }}

            th {{
                background: #111827;
                color: white;
                position: sticky;
                top: 0;
            }}

            tr:hover {{
                background: #f9fafb;
            }}

            .actions {{
                margin-top: 20px;
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }}

            .btn {{
                display: inline-block;
                padding: 12px 18px;
                border-radius: 10px;
                text-decoration: none;
                font-weight: bold;
                transition: 0.2s ease;
            }}

            .btn-primary {{
                background: #2563eb;
                color: white;
            }}

            .btn-primary:hover {{
                background: #1d4ed8;
            }}

            .btn-secondary {{
                background: #e5e7eb;
                color: #111827;
            }}

            .btn-secondary:hover {{
                background: #d1d5db;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="title">Salary Export Preview</h1>
                <p class="subtitle">Period: {escape(str(start_date))} to {escape(str(end_date))}</p>
            </div>

            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Total Records</h3>
                    <p>{escape(str(summary["total_records"]))}</p>
                </div>
                <div class="summary-card">
                    <h3>Total Gross Payroll</h3>
                    <p>{escape(str(summary["total_gross"]))}</p>
                </div>
                <div class="summary-card">
                    <h3>Total Tax</h3>
                    <p>{escape(str(summary["total_tax"]))}</p>
                </div>
                <div class="summary-card">
                    <h3>Total Net Salaries</h3>
                    <p>{escape(str(summary["total_net"]))}</p>
                </div>
                <div class="summary-card">
                    <h3>Top Employee</h3>
                    <p>{escape(str(summary["top_employee"]))}</p>
                </div>
                <div class="summary-card">
                    <h3>Top Net Salary</h3>
                    <p>{escape(str(summary["top_salary"]))}</p>
                </div>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Staff ID</th>
                            <th>Period Start</th>
                            <th>Period End</th>
                            <th>Base Salary</th>
                            <th>Shipment Bonus</th>
                            <th>Bonus</th>
                            <th>Gross Salary</th>
                            <th>Tax %</th>
                            <th>Tax Amount</th>
                            <th>Net Salary</th>
                            <th>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {table_rows_html}
                    </tbody>
                </table>
            </div>

            <div class="actions">
                <a class="btn btn-primary" href="{download_url}">Download Excel</a>
                <a class="btn btn-secondary" href="javascript:window.close();">Close</a>
            </div>
        </div>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)


# =============================
# EXPORT SAVED SALARY RECORDS
# =============================
@router.get("/export")
def export_salary(
    start_date: StartDateQuery,
    end_date: EndDateQuery,
    current_user: dict = Depends(require_roles(FINANCE_JOB_TITLES))
):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be later than end_date")

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