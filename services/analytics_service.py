from data.db import get_connection


# =============================
# HELPERS
# =============================
def build_periods(cursor, period: str, limit: int):
    period = (period or "month").lower()

    if period == "day":
        cursor.execute(f"""
            SELECT *
            FROM (
                SELECT
                    MIN(DATE(delivery_datetime)) AS sort_date,
                    DATE_FORMAT(MIN(DATE(delivery_datetime)), '%Y-%m-%d') AS period_key,
                    DATE_FORMAT(MIN(DATE(delivery_datetime)), '%Y-%m-%d') AS period_label
                FROM shipments
                WHERE shipment_status = 'delivered'
                  AND is_deleted = 0
                  AND delivery_datetime IS NOT NULL
                GROUP BY DATE(delivery_datetime)
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
                    MIN(DATE_SUB(DATE(delivery_datetime), INTERVAL WEEKDAY(delivery_datetime) DAY)) AS sort_date,
                    CONCAT(
                        YEAR(MIN(DATE_SUB(DATE(delivery_datetime), INTERVAL WEEKDAY(delivery_datetime) DAY))),
                        '-W',
                        LPAD(WEEK(MIN(DATE_SUB(DATE(delivery_datetime), INTERVAL WEEKDAY(delivery_datetime) DAY)), 1), 2, '0')
                    ) AS period_key,
                    CONCAT(
                        DATE_FORMAT(MIN(DATE_SUB(DATE(delivery_datetime), INTERVAL WEEKDAY(delivery_datetime) DAY)), '%Y-%m-%d'),
                        ' to ',
                        DATE_FORMAT(
                            DATE_ADD(
                                MIN(DATE_SUB(DATE(delivery_datetime), INTERVAL WEEKDAY(delivery_datetime) DAY)),
                                INTERVAL 6 DAY
                            ),
                            '%Y-%m-%d'
                        )
                    ) AS period_label
                FROM shipments
                WHERE shipment_status = 'delivered'
                  AND is_deleted = 0
                  AND delivery_datetime IS NOT NULL
                GROUP BY YEARWEEK(delivery_datetime, 1)
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
                STR_TO_DATE(DATE_FORMAT(MIN(delivery_datetime), '%Y-%m-01'), '%Y-%m-%d') AS sort_date,
                DATE_FORMAT(MIN(delivery_datetime), '%Y-%m') AS period_key,
                DATE_FORMAT(MIN(delivery_datetime), '%Y-%m') AS period_label
            FROM shipments
            WHERE shipment_status = 'delivered'
              AND is_deleted = 0
              AND delivery_datetime IS NOT NULL
            GROUP BY YEAR(delivery_datetime), MONTH(delivery_datetime)
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


def get_breakdown_query(period: str):
    period = (period or "month").lower()

    if period == "day":
        return """
            SELECT
                DATE_FORMAT(delivery_datetime, '%H:00') AS label,
                COUNT(*) AS shipments,
                COALESCE(SUM(profit), 0) AS profit,
                COALESCE(SUM(broker_price), 0) AS gross
            FROM shipments
            WHERE shipment_status = 'delivered'
              AND is_deleted = 0
              AND delivery_datetime IS NOT NULL
              AND DATE(delivery_datetime) = %s
            GROUP BY DATE_FORMAT(delivery_datetime, '%H:00')
            ORDER BY label
        """

    if period == "week":
        return """
            SELECT
                DATE_FORMAT(MIN(DATE(delivery_datetime)), '%Y-%m-%d') AS label,
                COUNT(*) AS shipments,
                COALESCE(SUM(profit), 0) AS profit,
                COALESCE(SUM(broker_price), 0) AS gross
            FROM shipments
            WHERE shipment_status = 'delivered'
              AND is_deleted = 0
              AND delivery_datetime IS NOT NULL
              AND YEARWEEK(delivery_datetime, 1) = YEARWEEK(%s, 1)
            GROUP BY DATE(delivery_datetime)
            ORDER BY MIN(DATE(delivery_datetime))
        """

    return """
        SELECT
            DATE_FORMAT(MIN(DATE(delivery_datetime)), '%Y-%m-%d') AS label,
            COUNT(*) AS shipments,
            COALESCE(SUM(profit), 0) AS profit,
            COALESCE(SUM(broker_price), 0) AS gross
        FROM shipments
        WHERE shipment_status = 'delivered'
          AND is_deleted = 0
          AND delivery_datetime IS NOT NULL
          AND YEAR(delivery_datetime) = YEAR(%s)
          AND MONTH(delivery_datetime) = MONTH(%s)
        GROUP BY DATE(delivery_datetime)
        ORDER BY MIN(DATE(delivery_datetime))
    """


def get_period_totals(cursor, period: str, base_date: str, staff_id=None):
    where_filter = get_period_filter(period, "delivery_datetime")

    if staff_id is not None:
        staff_sql = "AND assigned_staff_id = %s"
        if period == "month":
            params = [base_date, base_date, staff_id]
        else:
            params = [base_date, staff_id]
    else:
        staff_sql = ""
        if period == "month":
            params = [base_date, base_date]
        else:
            params = [base_date]

    cursor.execute(f"""
        SELECT
            COUNT(*) AS shipments,
            COALESCE(SUM(profit), 0) AS profit,
            COALESCE(SUM(broker_price), 0) AS gross
        FROM shipments
        WHERE shipment_status = 'delivered'
          AND is_deleted = 0
          AND delivery_datetime IS NOT NULL
          AND {where_filter}
          {staff_sql}
    """, tuple(params))

    row = cursor.fetchone()

    return {
        "shipments": int(row["shipments"] or 0),
        "profit": float(row["profit"] or 0),
        "gross": float(row["gross"] or 0)
    }


def get_period_breakdown(cursor, period: str, base_date: str, staff_id=None):
    if staff_id is None:
        query = get_breakdown_query(period)

        if period == "month":
            cursor.execute(query, (base_date, base_date))
        else:
            cursor.execute(query, (base_date,))
    else:
        if period == "day":
            query = """
                SELECT
                    DATE_FORMAT(delivery_datetime, '%H:00') AS label,
                    COUNT(*) AS shipments,
                    COALESCE(SUM(profit), 0) AS profit,
                    COALESCE(SUM(broker_price), 0) AS gross
                FROM shipments
                WHERE shipment_status = 'delivered'
                  AND is_deleted = 0
                  AND delivery_datetime IS NOT NULL
                  AND DATE(delivery_datetime) = %s
                  AND assigned_staff_id = %s
                GROUP BY DATE_FORMAT(delivery_datetime, '%H:00')
                ORDER BY label
            """
            cursor.execute(query, (base_date, staff_id))

        elif period == "week":
            query = """
                SELECT
                    DATE_FORMAT(MIN(DATE(delivery_datetime)), '%Y-%m-%d') AS label,
                    COUNT(*) AS shipments,
                    COALESCE(SUM(profit), 0) AS profit,
                    COALESCE(SUM(broker_price), 0) AS gross
                FROM shipments
                WHERE shipment_status = 'delivered'
                  AND is_deleted = 0
                  AND delivery_datetime IS NOT NULL
                  AND YEARWEEK(delivery_datetime, 1) = YEARWEEK(%s, 1)
                  AND assigned_staff_id = %s
                GROUP BY DATE(delivery_datetime)
                ORDER BY MIN(DATE(delivery_datetime))
            """
            cursor.execute(query, (base_date, staff_id))

        else:
            query = """
                SELECT
                    DATE_FORMAT(MIN(DATE(delivery_datetime)), '%Y-%m-%d') AS label,
                    COUNT(*) AS shipments,
                    COALESCE(SUM(profit), 0) AS profit,
                    COALESCE(SUM(broker_price), 0) AS gross
                FROM shipments
                WHERE shipment_status = 'delivered'
                  AND is_deleted = 0
                  AND delivery_datetime IS NOT NULL
                  AND YEAR(delivery_datetime) = YEAR(%s)
                  AND MONTH(delivery_datetime) = MONTH(%s)
                  AND assigned_staff_id = %s
                GROUP BY DATE(delivery_datetime)
                ORDER BY MIN(DATE(delivery_datetime))
            """
            cursor.execute(query, (base_date, base_date, staff_id))

    rows = cursor.fetchall()

    return [
        {
            "label": row["label"],
            "shipments": int(row["shipments"] or 0),
            "profit": float(row["profit"] or 0),
            "gross": float(row["gross"] or 0)
        }
        for row in rows
    ]


def build_period_history(cursor, period: str, limit: int, staff_id=None):
    periods = build_periods(cursor, period, limit)
    result = []

    for item in periods:
        base_date = str(item["sort_date"])

        entry = {
            "period_key": item["period_key"],
            "period_label": item["period_label"]
        }

        entry.update(get_period_totals(cursor, period, base_date, staff_id=staff_id))
        entry["breakdown"] = get_period_breakdown(cursor, period, base_date, staff_id=staff_id)

        result.append(entry)

    return result


# =============================
# DISPATCHER DASHBOARD
# =============================
def dispatcher_dashboard(staff_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        return {
            "type": "dispatcher_dashboard",
            "days": build_period_history(cursor, "day", 12, staff_id=staff_id),
            "weeks": build_period_history(cursor, "week", 12, staff_id=staff_id),
            "months": build_period_history(cursor, "month", 12, staff_id=staff_id)
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
        return {
            "type": "company_dashboard",
            "days": build_period_history(cursor, "day", 12),
            "weeks": build_period_history(cursor, "week", 12),
            "months": build_period_history(cursor, "month", 12)
        }

    finally:
        cursor.close()
        conn.close()


# =============================
# COMPANY PROFIT
# =============================
def company_profit():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        return {
            "type": "company_profit",
            "days": build_period_history(cursor, "day", 12),
            "weeks": build_period_history(cursor, "week", 12),
            "months": build_period_history(cursor, "month", 12)
        }

    finally:
        cursor.close()
        conn.close()


# =============================
# ROLE-BASED DASHBOARD
# =============================
def build_dashboard(user):
    job_title = user["job_title"]

    if job_title == "dispatcher":
        return dispatcher_dashboard(user["staff_id"])

    if job_title in ["manager", "accounting", "supervisor"]:
        return company_dashboard()

    return {"message": "No analytics available"}