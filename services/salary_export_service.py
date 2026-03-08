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
        "Base Salary",
        "Shipment Bonus",
        "Custom Bonus",
        "Total Salary",
        "Tax",
        "Net Salary"
    ]

    ws.append(headers)

    total_gross = 0
    total_tax = 0
    total_net = 0

    top_employee = None
    top_salary = 0

    for row in salary_data:

        gross_salary = row["total_salary"]
        tax = gross_salary * 0.12
        net_salary = gross_salary - tax

        ws.append([
            row["employee"],
            row["role"],
            row["base_salary"],
            row["shipment_bonus"],
            row["custom_bonus"],
            gross_salary,
            round(tax, 2),
            round(net_salary, 2)
        ])

        total_gross += gross_salary
        total_tax += tax
        total_net += net_salary

        if gross_salary > top_salary:
            top_salary = gross_salary
            top_employee = row["employee"]

    # итоговая строка
    ws.append([])
    ws.append([
        "TOTAL",
        "",
        "",
        "",
        "",
        total_gross,
        round(total_tax, 2),
        round(total_net, 2)
    ])

    # =============================
    # SHEET 2 — COMPANY SUMMARY
    # =============================

    ws2 = wb.create_sheet(title="Company Summary")

    ws2.append(["Metric", "Value"])

    ws2.append(["Total Payroll", total_gross])
    ws2.append(["Total Tax", round(total_tax, 2)])
    ws2.append(["Total Net Salaries", round(total_net, 2)])
    ws2.append(["Top Employee", top_employee])
    ws2.append(["Top Employee Salary", top_salary])

    # =============================
    # SAVE FILE
    # =============================

    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)

    return stream