from data.db import get_connection


def safe_float(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def safe_int(value):
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


# =============================
# PERIOD HELPERS
# =============================
def build_periods(cursor, period: str, limit: int):
    period = (period or "month").lower()

    if period == "day":
        cursor.execute(f"""
            SELECT *
            FROM (
                SELECT
                    MIN(DATE(shipment_created_date)) AS sort_date,
                    DATE_FORMAT(MIN(DATE(shipment_created_date)), '%Y-%m-%d') AS period_key,
                    DATE_FORMAT(MIN(DATE(shipment_created_date)), '%Y-%m-%d') AS period_label
                FROM shipments
                WHERE is_deleted = 0
                  AND shipment_created_date IS NOT NULL
                GROUP BY DATE(shipment_created_date)
                ORDER BY sort_date DESC
                LIMIT {limit}
            ) x
            ORDER BY sort_date ASC
        """)
        return cursor.fetchall()

    if period == "week":
        cursor.execute(f"""
            SELECT *
            FROM (
                SELECT
                    MIN(DATE_SUB(DATE(shipment_created_date), INTERVAL WEEKDAY(shipment_created_date) DAY)) AS sort_date,
                    CONCAT(
                        YEAR(MIN(DATE_SUB(DATE(shipment_created_date), INTERVAL WEEKDAY(shipment_created_date) DAY))),
                        '-W',
                        LPAD(WEEK(MIN(DATE_SUB(DATE(shipment_created_date), INTERVAL WEEKDAY(shipment_created_date) DAY)), 1), 2, '0')
                    ) AS period_key,
                    CONCAT(
                        DATE_FORMAT(MIN(DATE_SUB(DATE(shipment_created_date), INTERVAL WEEKDAY(shipment_created_date) DAY)), '%Y-%m-%d'),
                        ' to ',
                        DATE_FORMAT(
                            DATE_ADD(
                                MIN(DATE_SUB(DATE(shipment_created_date), INTERVAL WEEKDAY(shipment_created_date) DAY)),
                                INTERVAL 6 DAY
                            ),
                            '%Y-%m-%d'
                        )
                    ) AS period_label
                FROM shipments
                WHERE is_deleted = 0
                  AND shipment_created_date IS NOT NULL
                GROUP BY YEARWEEK(shipment_created_date, 1)
                ORDER BY sort_date DESC
                LIMIT {limit}
            ) x
            ORDER BY sort_date ASC
        """)
        return cursor.fetchall()

    cursor.execute(f"""
        SELECT *
        FROM (
            SELECT
                STR_TO_DATE(DATE_FORMAT(MIN(shipment_created_date), '%Y-%m-01'), '%Y-%m-%d') AS sort_date,
                DATE_FORMAT(MIN(shipment_created_date), '%Y-%m') AS period_key,
                DATE_FORMAT(MIN(shipment_created_date), '%Y-%m') AS period_label
            FROM shipments
            WHERE is_deleted = 0
              AND shipment_created_date IS NOT NULL
            GROUP BY YEAR(shipment_created_date), MONTH(shipment_created_date)
            ORDER BY sort_date DESC
            LIMIT {limit}
        ) x
        ORDER BY sort_date ASC
    """)
    return cursor.fetchall()


def get_period_filter(period: str, field_name: str):
    period = (period or "month").lower()

    if period == "day":
        return f"DATE({field_name}) = %s"

    if period == "week":
        return f"YEARWEEK({field_name}, 1) = YEARWEEK(%s, 1)"

    return f"YEAR({field_name}) = YEAR(%s) AND MONTH({field_name}) = MONTH(%s)"


def get_period_params(period: str, base_date: str):
    if (period or "month").lower() == "month":
        return [base_date, base_date]
    return [base_date]


# =============================
# TOTALS
# =============================
def get_period_totals(cursor, period: str, base_date: str, staff_id=None):
    where_filter = get_period_filter(period, "shipment_created_date")
    params = get_period_params(period, base_date)

    staff_sql = ""
    if staff_id is not None:
        staff_sql = "AND assigned_staff_id = %s"
        params.append(staff_id)

    cursor.execute(f"""
        SELECT
            COUNT(*) AS shipments,
            COALESCE(SUM(profit), 0) AS profit,
            COALESCE(SUM(broker_price), 0) AS gross
        FROM shipments
        WHERE is_deleted = 0
          AND shipment_created_date IS NOT NULL
          AND {where_filter}
          {staff_sql}
    """, tuple(params))

    row = cursor.fetchone() or {}

    return {
        "shipments": safe_int(row.get("shipments")),
        "profit": safe_float(row.get("profit")),
        "gross": safe_float(row.get("gross"))
    }


# =============================
# PERSONAL / DISPATCHER BREAKDOWN
# =============================
def get_personal_breakdown_query(period: str):
    period = (period or "month").lower()

    if period == "day":
        return """
            SELECT
                DATE_FORMAT(shipment_created_date, '%H:00') AS label,
                COUNT(*) AS shipments,
                COALESCE(SUM(profit), 0) AS profit,
                COALESCE(SUM(broker_price), 0) AS gross
            FROM shipments
            WHERE is_deleted = 0
              AND shipment_created_date IS NOT NULL
              AND DATE(shipment_created_date) = %s
              AND assigned_staff_id = %s
            GROUP BY DATE_FORMAT(shipment_created_date, '%H:00')
            ORDER BY DATE_FORMAT(shipment_created_date, '%H:00')
        """

    if period == "week":
        return """
            SELECT
                DATE_FORMAT(shipment_created_date, '%Y-%m-%d') AS label,
                COUNT(*) AS shipments,
                COALESCE(SUM(profit), 0) AS profit,
                COALESCE(SUM(broker_price), 0) AS gross
            FROM shipments
            WHERE is_deleted = 0
              AND shipment_created_date IS NOT NULL
              AND YEARWEEK(shipment_created_date, 1) = YEARWEEK(%s, 1)
              AND assigned_staff_id = %s
            GROUP BY DATE_FORMAT(shipment_created_date, '%Y-%m-%d')
            ORDER BY DATE_FORMAT(shipment_created_date, '%Y-%m-%d')
        """

    return """
        SELECT
            DATE_FORMAT(shipment_created_date, '%Y-%m-%d') AS label,
            COUNT(*) AS shipments,
            COALESCE(SUM(profit), 0) AS profit,
            COALESCE(SUM(broker_price), 0) AS gross
        FROM shipments
        WHERE is_deleted = 0
          AND shipment_created_date IS NOT NULL
          AND YEAR(shipment_created_date) = YEAR(%s)
          AND MONTH(shipment_created_date) = MONTH(%s)
          AND assigned_staff_id = %s
        GROUP BY DATE_FORMAT(shipment_created_date, '%Y-%m-%d')
        ORDER BY DATE_FORMAT(shipment_created_date, '%Y-%m-%d')
    """


def get_personal_breakdown(cursor, period: str, base_date: str, staff_id: int):
    query = get_personal_breakdown_query(period)

    if (period or "month").lower() == "month":
        cursor.execute(query, (base_date, base_date, staff_id))
    else:
        cursor.execute(query, (base_date, staff_id))

    rows = cursor.fetchall() or []
    total_profit = sum(safe_float(row.get("profit")) for row in rows)

    items = []
    for row in rows:
        profit = safe_float(row.get("profit"))
        share_percent = (profit / total_profit * 100) if total_profit > 0 else 0

        items.append({
            "label": row.get("label") or "-",
            "shipments": safe_int(row.get("shipments")),
            "profit": profit,
            "gross": safe_float(row.get("gross")),
            "share_percent": round(share_percent, 2)
        })

    return items


# =============================
# COMPANY / STAFF BREAKDOWN
# =============================
def get_company_contribution_breakdown(cursor, period: str, base_date: str):
    period_filter = get_period_filter(period, "s.shipment_created_date")
    params = get_period_params(period, base_date)

    cursor.execute(f"""
        SELECT
            s.assigned_staff_id AS staff_id,
            COALESCE(NULLIF(TRIM(MAX(s.staff_full_name)), ''), CONCAT('Staff #', s.assigned_staff_id)) AS label,
            COUNT(*) AS shipments,
            COALESCE(SUM(s.profit), 0) AS profit,
            COALESCE(SUM(s.broker_price), 0) AS gross
        FROM shipments s
        WHERE s.is_deleted = 0
          AND s.shipment_created_date IS NOT NULL
          AND {period_filter}
        GROUP BY s.assigned_staff_id
        ORDER BY profit DESC, label ASC
    """, tuple(params))

    rows = cursor.fetchall() or []
    total_profit = sum(safe_float(row.get("profit")) for row in rows)

    items = []
    for row in rows:
        profit = safe_float(row.get("profit"))
        share_percent = (profit / total_profit * 100) if total_profit > 0 else 0

        items.append({
            "staff_id": safe_int(row.get("staff_id")),
            "label": row.get("label") or f"Staff #{row.get('staff_id')}",
            "shipments": safe_int(row.get("shipments")),
            "profit": profit,
            "gross": safe_float(row.get("gross")),
            "share_percent": round(share_percent, 2)
        })

    return items


# =============================
# HISTORY BUILDERS
# =============================
def build_company_history(cursor, period: str, limit: int):
    periods = build_periods(cursor, period, limit)
    history = []

    for item in periods:
        base_date = str(item["sort_date"])
        totals = get_period_totals(cursor, period, base_date)
        contribution_breakdown = get_company_contribution_breakdown(cursor, period, base_date)

        history.append({
            "period_key": item["period_key"],
            "period_label": item["period_label"],
            "shipments": totals["shipments"],
            "profit": totals["profit"],
            "gross": totals["gross"],
            "contribution_breakdown": contribution_breakdown
        })

    return history


def build_personal_history(cursor, period: str, limit: int, staff_id: int):
    periods = build_periods(cursor, period, limit)
    history = []

    for item in periods:
        base_date = str(item["sort_date"])
        totals = get_period_totals(cursor, period, base_date, staff_id=staff_id)
        breakdown = get_personal_breakdown(cursor, period, base_date, staff_id)

        history.append({
            "period_key": item["period_key"],
            "period_label": item["period_label"],
            "shipments": totals["shipments"],
            "profit": totals["profit"],
            "gross": totals["gross"],
            "breakdown": breakdown
        })

    return history


def build_company_profit_history(cursor, period: str, limit: int):
    periods = build_periods(cursor, period, limit)
    history = []

    for item in periods:
        base_date = str(item["sort_date"])
        totals = get_period_totals(cursor, period, base_date)

        history.append({
            "period_key": item["period_key"],
            "period_label": item["period_label"],
            "shipments": totals["shipments"],
            "profit": totals["profit"],
            "gross": totals["gross"]
        })

    return history


# =============================
# DASHBOARDS
# =============================
def personal_dashboard(staff_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        return {
            "type": "personal_dashboard",
            "days": build_personal_history(cursor, "day", 12, staff_id),
            "weeks": build_personal_history(cursor, "week", 12, staff_id),
            "months": build_personal_history(cursor, "month", 12, staff_id)
        }
    finally:
        cursor.close()
        conn.close()


def company_dashboard():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        return {
            "type": "company_dashboard",
            "days": build_company_history(cursor, "day", 12),
            "weeks": build_company_history(cursor, "week", 12),
            "months": build_company_history(cursor, "month", 12)
        }
    finally:
        cursor.close()
        conn.close()


def company_profit():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        return {
            "type": "company_profit",
            "days": build_company_profit_history(cursor, "day", 12),
            "weeks": build_company_profit_history(cursor, "week", 12),
            "months": build_company_profit_history(cursor, "month", 12)
        }
    finally:
        cursor.close()
        conn.close()


# =============================
# ROLE-BASED DASHBOARD
# =============================
def build_dashboard(user: dict):
    job_title = str(user.get("job_title", "")).lower()

    if job_title in ["dispatcher", "hr"]:
        return personal_dashboard(user["staff_id"])

    if job_title in ["manager", "accounting", "supervisor"]:
        return company_dashboard()

    return {
        "type": "personal_dashboard",
        "days": [],
        "weeks": [],
        "months": []
    }