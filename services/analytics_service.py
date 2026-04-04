from data.db import get_connection


# =============================
# DISPATCHER DASHBOARD
# =============================
def dispatcher_dashboard(staff_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                DATE_FORMAT(delivery_datetime, '%Y-%m') AS month,
                SUM(profit) AS profit
            FROM shipments
            WHERE assigned_staff_id = %s
              AND shipment_status = 'delivered'
              AND is_deleted = FALSE
              AND delivery_datetime IS NOT NULL
            GROUP BY DATE_FORMAT(delivery_datetime, '%Y-%m')
            ORDER BY month
        """, (staff_id,))

        monthly_profit = cursor.fetchall()

        return {
            "type": "dispatcher_dashboard",
            "monthly_profit": monthly_profit
        }

    finally:
        cursor.close()
        conn.close()


# =============================
# COMPANY DASHBOARD
# =============================
def company_dashboard():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                DATE_FORMAT(delivery_datetime, '%Y-%m') AS month,
                SUM(profit) AS profit
            FROM shipments
            WHERE shipment_status = 'delivered'
              AND is_deleted = FALSE
              AND delivery_datetime IS NOT NULL
            GROUP BY DATE_FORMAT(delivery_datetime, '%Y-%m')
            ORDER BY month
        """)
        company_profit = cursor.fetchall()

        cursor.execute("""
            SELECT
                s.staff_full_name,
                COUNT(sh.shipment_id) AS shipments,
                SUM(sh.profit) AS profit
            FROM shipments sh
            JOIN staff s ON s.staff_id = sh.assigned_staff_id
            WHERE sh.shipment_status = 'delivered'
              AND sh.is_deleted = FALSE
            GROUP BY s.staff_id, s.staff_full_name
            ORDER BY profit DESC
        """)
        dispatcher_profit = cursor.fetchall()

        return {
            "type": "company_dashboard",
            "company_profit_trend": company_profit,
            "dispatcher_profit": dispatcher_profit
        }

    finally:
        cursor.close()
        conn.close()


# =============================
# SUPERVISOR DASHBOARD
# =============================
def supervisor_dashboard():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                s.staff_full_name,
                COUNT(sh.shipment_id) AS shipments,
                SUM(sh.profit) AS profit
            FROM shipments sh
            JOIN staff s ON s.staff_id = sh.assigned_staff_id
            WHERE sh.shipment_status = 'delivered'
              AND sh.is_deleted = FALSE
            GROUP BY s.staff_id, s.staff_full_name
            ORDER BY profit DESC
        """)

        performance = cursor.fetchall()

        return {
            "type": "supervisor_dashboard",
            "dispatcher_performance": performance
        }

    finally:
        cursor.close()
        conn.close()


# =============================
# TOP 5 DISPATCHERS
# =============================
def top_dispatchers():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                s.staff_full_name,
                COUNT(sh.shipment_id) AS shipments,
                SUM(sh.profit) AS profit
            FROM shipments sh
            JOIN staff s ON s.staff_id = sh.assigned_staff_id
            WHERE sh.shipment_status = 'delivered'
              AND sh.is_deleted = FALSE
            GROUP BY s.staff_id, s.staff_full_name
            ORDER BY profit DESC
            LIMIT 5
        """)

        data = cursor.fetchall()

        return {
            "top_dispatchers": data
        }

    finally:
        cursor.close()
        conn.close()


# =============================
# COMPANY NET PROFIT
# =============================
def company_net_profit():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT COALESCE(SUM(profit), 0) AS total_profit
            FROM shipments
            WHERE shipment_status = 'delivered'
              AND is_deleted = FALSE
        """)
        shipment_profit = cursor.fetchone()["total_profit"] or 0

        cursor.execute("""
            SELECT COALESCE(SUM(total_salary), 0) AS payroll
            FROM salary_records
        """)
        payroll = cursor.fetchone()["payroll"] or 0

        net_profit = shipment_profit - payroll

        return {
            "shipment_profit": shipment_profit,
            "payroll": payroll,
            "net_profit": net_profit
        }

    finally:
        cursor.close()
        conn.close()


# =============================
# PAYROLL VS PROFIT CHART
# =============================
def payroll_vs_profit():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                DATE_FORMAT(delivery_datetime, '%Y-%m') AS month,
                SUM(profit) AS profit
            FROM shipments
            WHERE shipment_status = 'delivered'
              AND is_deleted = FALSE
              AND delivery_datetime IS NOT NULL
            GROUP BY DATE_FORMAT(delivery_datetime, '%Y-%m')
            ORDER BY month
        """)
        profit_data = cursor.fetchall()

        cursor.execute("""
            SELECT
                DATE_FORMAT(created_at, '%Y-%m') AS month,
                SUM(total_salary) AS payroll
            FROM salary_records
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month
        """)
        payroll_data = cursor.fetchall()

        return {
            "profit": profit_data,
            "payroll": payroll_data
        }

    finally:
        cursor.close()
        conn.close()


# =============================
# PROFIT GROWTH INDICATOR
# =============================
def profit_growth_indicator():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                DATE_FORMAT(delivery_datetime, '%Y-%m') AS month,
                SUM(profit) AS profit
            FROM shipments
            WHERE shipment_status = 'delivered'
              AND is_deleted = FALSE
              AND delivery_datetime IS NOT NULL
            GROUP BY DATE_FORMAT(delivery_datetime, '%Y-%m')
            ORDER BY month DESC
            LIMIT 2
        """)

        rows = cursor.fetchall()

        if len(rows) < 2:
            return {"message": "Not enough data"}

        current_month = rows[0]["profit"] or 0
        last_month = rows[1]["profit"] or 0

        change = current_month - last_month

        percent = 0
        if last_month != 0:
            percent = (change / last_month) * 100

        return {
            "current_month_profit": current_month,
            "last_month_profit": last_month,
            "growth_percent": round(percent, 2),
            "trend": "up" if change > 0 else "down" if change < 0 else "flat"
        }

    finally:
        cursor.close()
        conn.close()


# =============================
# TOP EMPLOYEES LEADERBOARD
# =============================
def top_employees_leaderboard():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                s.staff_full_name,
                SUM(sh.profit) AS profit
            FROM shipments sh
            JOIN staff s ON s.staff_id = sh.assigned_staff_id
            WHERE sh.shipment_status = 'delivered'
              AND sh.is_deleted = FALSE
            GROUP BY s.staff_id, s.staff_full_name
            ORDER BY profit DESC
            LIMIT 5
        """)

        employees = cursor.fetchall()

        leaderboard = []
        rank = 1

        for emp in employees:
            leaderboard.append({
                "rank": rank,
                "name": emp["staff_full_name"],
                "profit": emp["profit"] or 0
            })
            rank += 1

        return {"leaderboard": leaderboard}

    finally:
        cursor.close()
        conn.close()


# =============================
# COMPANY KPI DASHBOARD
# =============================
def company_kpi_dashboard():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT COUNT(*) AS shipments
            FROM shipments
            WHERE shipment_status = 'delivered'
              AND is_deleted = FALSE
        """)
        shipments = cursor.fetchone()["shipments"]

        cursor.execute("""
            SELECT COALESCE(SUM(profit), 0) AS profit
            FROM shipments
            WHERE shipment_status = 'delivered'
              AND is_deleted = FALSE
        """)
        profit = cursor.fetchone()["profit"] or 0

        cursor.execute("""
            SELECT COALESCE(SUM(total_salary), 0) AS payroll
            FROM salary_records
        """)
        payroll = cursor.fetchone()["payroll"] or 0

        net_profit = profit - payroll

        return {
            "total_shipments": shipments,
            "total_profit": profit,
            "total_payroll": payroll,
            "net_profit": net_profit
        }

    finally:
        cursor.close()
        conn.close()


# =============================
# ROLE BASED DASHBOARD
# =============================
def build_dashboard(user):
    role = user["role"]

    if role == "dispatcher":
        return dispatcher_dashboard(user["staff_id"])

    if role in ["manager", "accounting"]:
        return company_dashboard()

    if role == "supervisor":
        return supervisor_dashboard()

    return {"message": "No analytics available"}