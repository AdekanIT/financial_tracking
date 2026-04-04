from openpyxl import Workbook
from io import BytesIO


def generate_salary_excel(salary_data):
    wb = Workbook()

    # =============================
    # SHEET 1 — EMPLOYEE SALARIES
    # =============================
    ws = wb.active
    ws.title = "Employee Salaries"

    headers = [
        "Employee",
        "Role",
        "Period Start",
        "Period End",
        "Base Salary",
        "Shipment Bonus",
        "Bonus",
        "Gross Salary",
        "Tax Percent",
        "Tax Amount",
        "Net Salary",
        "Created At"
    ]

    ws.append(headers)

    total_gross = 0.0
    total_tax = 0.0
    total_net = 0.0

    top_employee = None
    top_salary = 0.0

    for row in salary_data:
        base_salary = float(row.get("base_salary", 0) or 0)
        shipment_bonus = float(row.get("shipment_bonus", 0) or 0)
        bonus = float(row.get("bonus", 0) or 0)
        tax_percent = float(row.get("tax_percent", 0) or 0)
        net_salary = float(row.get("total_salary", 0) or 0)

        gross_salary = base_salary + shipment_bonus + bonus
        tax_amount = gross_salary * tax_percent / 100

        ws.append([
            row.get("staff_full_name") or row.get("employee"),
            row.get("job_title") or row.get("role"),
            str(row.get("period_start", "")),
            str(row.get("period_end", "")),
            round(base_salary, 2),
            round(shipment_bonus, 2),
            round(bonus, 2),
            round(gross_salary, 2),
            round(tax_percent, 2),
            round(tax_amount, 2),
            round(net_salary, 2),
            str(row.get("created_at", ""))
        ])

        total_gross += gross_salary
        total_tax += tax_amount
        total_net += net_salary

        if net_salary > top_salary:
            top_salary = net_salary
            top_employee = row.get("staff_full_name") or row.get("employee")

    # итоговая строка
    ws.append([])
    ws.append([
        "TOTAL",
        "",
        "",
        "",
        "",
        "",
        "",
        round(total_gross, 2),
        "",
        round(total_tax, 2),
        round(total_net, 2),
        ""
    ])

    # =============================
    # SHEET 2 — COMPANY SUMMARY
    # =============================
    ws2 = wb.create_sheet(title="Company Summary")

    ws2.append(["Metric", "Value"])
    ws2.append(["Total Gross Payroll", round(total_gross, 2)])
    ws2.append(["Total Tax", round(total_tax, 2)])
    ws2.append(["Total Net Salaries", round(total_net, 2)])
    ws2.append(["Top Employee", top_employee])
    ws2.append(["Top Net Salary", round(top_salary, 2)])

    # =============================
    # SAVE FILE
    # =============================
    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)

    return stream