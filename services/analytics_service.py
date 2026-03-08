from data.db import get_connection


# =============================
# DISPATCHER DASHBOARD
# =============================

def dispatcher_dashboard(staff_id):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
        DATE_FORMAT(delivery_date,'%Y-%m') as month,
        SUM(profit) as profit
        FROM shipments
        WHERE dispatcher_id = %s
        AND shipment_status = 'delivered'
        GROUP BY month
        ORDER BY month
    """, (staff_id,))

    monthly_profit = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "type": "dispatcher_dashboard",
        "monthly_profit": monthly_profit
    }


# =============================
# COMPANY DASHBOARD
# =============================

def company_dashboard():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # company profit by month
    cursor.execute("""
        SELECT 
        DATE_FORMAT(delivery_date,'%Y-%m') as month,
        SUM(profit) as profit
        FROM shipments
        WHERE shipment_status='delivered'
        GROUP BY month
        ORDER BY month
    """)

    company_profit = cursor.fetchall()

    # dispatcher profit
    cursor.execute("""
        SELECT 
        s.staff_full_name,
        SUM(sh.profit) as profit
        FROM shipments sh
        JOIN staff s ON s.staff_id = sh.dispatcher_id
        WHERE sh.shipment_status='delivered'
        GROUP BY s.staff_full_name
        ORDER BY profit DESC
    """)

    dispatcher_profit = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "type": "company_dashboard",
        "company_profit_trend": company_profit,
        "dispatcher_profit": dispatcher_profit
    }


# =============================
# SUPERVISOR DASHBOARD
# =============================

def supervisor_dashboard():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
        s.staff_full_name,
        COUNT(sh.id) as shipments,
        SUM(sh.profit) as profit
        FROM shipments sh
        JOIN staff s ON s.staff_id = sh.dispatcher_id
        WHERE sh.shipment_status='delivered'
        GROUP BY s.staff_full_name
        ORDER BY profit DESC
    """)

    performance = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "type": "supervisor_dashboard",
        "dispatcher_performance": performance
    }


# =============================
# TOP 5 DISPATCHERS
# =============================

def top_dispatchers():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
        s.staff_full_name,
        SUM(sh.profit) as profit
        FROM shipments sh
        JOIN staff s ON s.staff_id = sh.dispatcher_id
        WHERE sh.shipment_status='delivered'
        GROUP BY s.staff_full_name
        ORDER BY profit DESC
        LIMIT 5
    """)

    data = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "top_dispatchers": data
    }


# =============================
# COMPANY NET PROFIT
# =============================

def company_net_profit():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # shipment profit
    cursor.execute("""
        SELECT SUM(profit) as total_profit
        FROM shipments
        WHERE shipment_status='delivered'
    """)

    shipment_profit = cursor.fetchone()["total_profit"] or 0

    # payroll
    cursor.execute("""
        SELECT SUM(total_salary) as payroll
        FROM salary_records
        WHERE is_active = TRUE
    """)

    payroll = cursor.fetchone()["payroll"] or 0

    cursor.close()
    conn.close()

    net_profit = shipment_profit - payroll

    return {
        "shipment_profit": shipment_profit,
        "payroll": payroll,
        "net_profit": net_profit
    }


# =============================
# PAYROLL VS PROFIT CHART
# =============================

def payroll_vs_profit():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
        DATE_FORMAT(delivery_date,'%Y-%m') as month,
        SUM(profit) as profit
        FROM shipments
        WHERE shipment_status='delivered'
        GROUP BY month
        ORDER BY month
    """)

    profit_data = cursor.fetchall()

    cursor.execute("""
        SELECT 
        DATE_FORMAT(period_start,'%Y-%m') as month,
        SUM(total_salary) as payroll
        FROM salary_records
        WHERE is_active = TRUE
        GROUP BY month
        ORDER BY month
    """)

    payroll_data = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "profit": profit_data,
        "payroll": payroll_data
    }


# =============================
# PROFIT GROWTH INDICATOR
# =============================

def profit_growth_indicator():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
        DATE_FORMAT(delivery_date,'%Y-%m') as month,
        SUM(profit) as profit
        FROM shipments
        WHERE shipment_status='delivered'
        GROUP BY month
        ORDER BY month DESC
        LIMIT 2
    """)

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    if len(rows) < 2:
        return {"message": "Not enough data"}

    current_month = rows[0]["profit"]
    last_month = rows[1]["profit"]

    change = current_month - last_month

    percent = 0
    if last_month != 0:
        percent = (change / last_month) * 100

    return {
        "current_month_profit": current_month,
        "last_month_profit": last_month,
        "growth_percent": round(percent, 2),
        "trend": "up" if change > 0 else "down"
    }


# =============================
# TOP EMPLOYEES LEADERBOARD
# =============================

def top_employees_leaderboard():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
        s.staff_full_name,
        SUM(sh.profit) as profit
        FROM shipments sh
        JOIN staff s ON s.staff_id = sh.dispatcher_id
        WHERE sh.shipment_status='delivered'
        GROUP BY s.staff_full_name
        ORDER BY profit DESC
        LIMIT 5
    """)

    employees = cursor.fetchall()

    cursor.close()
    conn.close()

    leaderboard = []

    rank = 1

    for emp in employees:
        leaderboard.append({
            "rank": rank,
            "name": emp["staff_full_name"],
            "profit": emp["profit"]
        })
        rank += 1

    return {"leaderboard": leaderboard}


# =============================
# COMPANY KPI DASHBOARD
# =============================

def company_kpi_dashboard():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT COUNT(*) as shipments
        FROM shipments
        WHERE shipment_status='delivered'
    """)

    shipments = cursor.fetchone()["shipments"]

    cursor.execute("""
        SELECT SUM(profit) as profit
        FROM shipments
        WHERE shipment_status='delivered'
    """)

    profit = cursor.fetchone()["profit"] or 0

    cursor.execute("""
        SELECT SUM(total_salary) as payroll
        FROM salary_records
        WHERE is_active = TRUE
    """)

    payroll = cursor.fetchone()["payroll"] or 0

    cursor.close()
    conn.close()

    net_profit = profit - payroll

    return {
        "total_shipments": shipments,
        "total_profit": profit,
        "total_payroll": payroll,
        "net_profit": net_profit
    }


# =============================
# ROLE BASED DASHBOARD
# =============================

def build_dashboard(user):

    role = user["role"]

    if role == "Dispatcher":
        return dispatcher_dashboard(user["staff_id"])

    if role in ["Manager", "Accounting"]:
        return company_dashboard()

    if role == "Supervisor":
        return supervisor_dashboard()

    return {"message": "No analytics available"}