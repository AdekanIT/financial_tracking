from datetime import datetime
from fastapi import HTTPException

from data.db import get_connection
from utils.calculations import calculate_profit_and_margin
from services.logging_service import log_shipment_change


FULL_FINANCIAL_ROLES = {"manager", "supervisor", "accounting"}
LIMITED_FINANCIAL_OWN_ONLY_ROLES = {"dispatcher"}
NO_FINANCIAL_ROLES = {"hr", "tracking"}

SENSITIVE_FIELDS = [
    "broker_price",
    "driver_pay",
    "profit",
    "percentage_of_margin",
    "dispatcher_commission_percent",
]


def validate_company(company_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM companies WHERE company_id = %s", (company_id,))
        company = cursor.fetchone()

        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        return company

    finally:
        cursor.close()
        conn.close()


def validate_staff(staff_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM staff WHERE staff_id = %s", (staff_id,))
        staff = cursor.fetchone()

        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")

        if int(staff["is_active"]) != 1:
            raise HTTPException(status_code=400, detail="Staff inactive")

        return staff

    finally:
        cursor.close()
        conn.close()


def generate_company_reference(company_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        company = validate_company(company_id)
        code = company["company_code"].upper()

        now = datetime.now()
        prefix = f"{code}{now.strftime('%m')}{now.strftime('%Y')}"

        cursor.execute("""
            SELECT company_reference
            FROM shipments
            WHERE company_reference LIKE %s
            ORDER BY company_reference DESC
            LIMIT 1
        """, (f"{prefix}%",))

        row = cursor.fetchone()

        if row:
            counter = int(row["company_reference"][-4:]) + 1
        else:
            counter = 1

        return f"{prefix}{str(counter).zfill(4)}"

    finally:
        cursor.close()
        conn.close()


def check_reference_uniqueness(cursor, shipment_id: int, field_name: str, value: str):
    if value is None:
        return

    cursor.execute(f"""
        SELECT shipment_id
        FROM shipments
        WHERE {field_name} = %s
          AND shipment_id <> %s
        LIMIT 1
    """, (value, shipment_id))
    existing = cursor.fetchone()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} already exists for another shipment"
        )


def normalize_job_title(job_title: str) -> str:
    return (job_title or "").strip().lower()


def should_hide_financials_for_shipment(current_user: dict, shipment: dict) -> bool:
    job_title = normalize_job_title(current_user.get("job_title"))
    current_staff_id = current_user.get("staff_id")
    assigned_staff_id = shipment.get("assigned_staff_id")

    if job_title in FULL_FINANCIAL_ROLES:
        return False

    if job_title in LIMITED_FINANCIAL_OWN_ONLY_ROLES:
        return assigned_staff_id != current_staff_id

    if job_title in NO_FINANCIAL_ROLES:
        return True

    return True


def mask_sensitive_fields(shipment: dict) -> dict:
    masked = dict(shipment)

    for field in SENSITIVE_FIELDS:
        if field in masked:
            masked[field] = None

    return masked


def apply_shipment_visibility_rules(shipment: dict, current_user: dict) -> dict:
    if shipment is None:
        return None

    if should_hide_financials_for_shipment(current_user, shipment):
        return mask_sensitive_fields(shipment)

    return shipment


def apply_visibility_to_shipments(shipments: list[dict], current_user: dict) -> list[dict]:
    return [apply_shipment_visibility_rules(shipment, current_user) for shipment in shipments]


def fetch_all_non_deleted_shipments(cursor):
    cursor.execute("""
        SELECT *
        FROM shipments
        WHERE is_deleted = 0
        ORDER BY shipment_created_date DESC, shipment_id DESC
    """)
    return cursor.fetchall()


def create_shipment(data, staff_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        company_id = data["company_id"]
        validate_company(company_id)

        assigned_staff_id = data.get("assigned_staff_id", staff_id)
        if assigned_staff_id is None:
            assigned_staff_id = staff_id

        staff = validate_staff(assigned_staff_id)
        staff_full_name = staff["staff_full_name"]

        broker_price = float(data.get("broker_price", 0))
        driver_pay = float(data.get("driver_pay", 0))

        profit, margin = calculate_profit_and_margin(broker_price, driver_pay)
        company_reference = generate_company_reference(company_id)

        shipment_created_date = data.get("shipment_created_date") or datetime.now()

        cursor.execute("""
            INSERT INTO shipments (
                company_id,
                company_reference,
                external_reference,
                unit_number,
                assigned_staff_id,
                staff_full_name,
                shipment_created_date,
                driver_name,
                business_name,
                broker_name,
                pickup_city,
                pickup_state,
                pickup_datetime,
                delivery_city,
                delivery_state,
                delivery_datetime,
                miles,
                broker_price,
                driver_pay,
                profit,
                percentage_of_margin,
                loads_per_day,
                dispatcher_commission_percent,
                shipment_status,
                payment_status,
                payment_option,
                comments
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,
                    %s,%s,%s,
                    %s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,
                    %s,%s,%s,%s)
        """, (
            company_id,
            company_reference,
            data.get("external_reference"),
            data.get("unit_number"),
            assigned_staff_id,
            staff_full_name,
            shipment_created_date,
            data.get("driver_name"),
            data.get("business_name"),
            data.get("broker_name"),
            data.get("pickup_city"),
            data.get("pickup_state"),
            data.get("pickup_datetime"),
            data.get("delivery_city"),
            data.get("delivery_state"),
            data.get("delivery_datetime"),
            data.get("miles"),
            broker_price,
            driver_pay,
            profit,
            margin,
            data.get("loads_per_day"),
            data.get("dispatcher_commission_percent"),
            data.get("shipment_status"),
            data.get("payment_status"),
            data.get("payment_option"),
            data.get("comments")
        ))

        conn.commit()
        shipment_id = cursor.lastrowid

        log_shipment_change(
            shipment_id=shipment_id,
            staff_id=staff_id,
            note="Shipment created"
        )

        return {
            "message": "Created",
            "company_reference": company_reference,
            "shipment_id": shipment_id
        }

    finally:
        cursor.close()
        conn.close()


def get_visible_shipments_service(current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        shipments = fetch_all_non_deleted_shipments(cursor)
        return apply_visibility_to_shipments(shipments, current_user)

    finally:
        cursor.close()
        conn.close()


def get_my_shipments_service(current_user):
    return get_visible_shipments_service(current_user)


def get_all_shipments_service(current_user):
    return get_visible_shipments_service(current_user)


def get_shipment_by_id(shipment_id, current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM shipments
            WHERE shipment_id = %s
              AND is_deleted = 0
        """, (shipment_id,))
        shipment = cursor.fetchone()

        if not shipment:
            raise HTTPException(status_code=404, detail="Shipment not found")

        return apply_shipment_visibility_rules(shipment, current_user)

    finally:
        cursor.close()
        conn.close()


def get_shipment_logs_service(shipment_id: int, current_user: dict):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT shipment_id, assigned_staff_id, is_deleted
            FROM shipments
            WHERE shipment_id = %s
            LIMIT 1
        """, (shipment_id,))
        shipment = cursor.fetchone()

        if not shipment or int(shipment.get("is_deleted", 0)) == 1:
            raise HTTPException(status_code=404, detail="Shipment not found")

        if normalize_job_title(current_user.get("job_title")) == "dispatcher":
            if shipment["assigned_staff_id"] != current_user["staff_id"]:
                raise HTTPException(status_code=403, detail="Access denied")

        cursor.execute("""
            SELECT
                sl.shipment_log_id,
                sl.shipment_id,
                sl.staff_id,
                sl.field_name,
                sl.old_value,
                sl.new_value,
                sl.note,
                sl.updated_at,
                s.staff_full_name AS changed_by_name
            FROM shipment_logs sl
            LEFT JOIN staff s
                ON sl.staff_id = s.staff_id
            WHERE sl.shipment_id = %s
            ORDER BY sl.updated_at DESC, sl.shipment_log_id DESC
        """, (shipment_id,))

        logs = cursor.fetchall()

        normalized_logs = []
        for log in logs:
            normalized_logs.append({
                "log_id": log.get("shipment_log_id"),
                "shipment_id": log.get("shipment_id"),
                "staff_id": log.get("staff_id"),
                "changed_by_name": log.get("changed_by_name"),
                "field_name": log.get("field_name") or log.get("note") or "Change",
                "old_value": log.get("old_value"),
                "new_value": log.get("new_value"),
                "note": log.get("note"),
                "created_at": log.get("updated_at")
            })

        return normalized_logs

    finally:
        cursor.close()
        conn.close()


def update_shipment_service(shipment_id, data, current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM shipments
            WHERE shipment_id = %s
              AND is_deleted = 0
        """, (shipment_id,))
        shipment = cursor.fetchone()

        if not shipment:
            raise HTTPException(status_code=404, detail="Shipment not found")

        if normalize_job_title(current_user["job_title"]) == "dispatcher":
            if shipment["assigned_staff_id"] != current_user["staff_id"]:
                raise HTTPException(status_code=403, detail="Access denied")

        if not data:
            raise HTTPException(status_code=400, detail="No fields provided")

        if "company_id" in data and data["company_id"] is not None:
            validate_company(data["company_id"])

        if "assigned_staff_id" in data and data["assigned_staff_id"] is not None:
            staff = validate_staff(data["assigned_staff_id"])
            data["staff_full_name"] = staff["staff_full_name"]

        if "company_reference" in data and data["company_reference"]:
            check_reference_uniqueness(
                cursor=cursor,
                shipment_id=shipment_id,
                field_name="company_reference",
                value=data["company_reference"]
            )

        if "external_reference" in data and data["external_reference"]:
            check_reference_uniqueness(
                cursor=cursor,
                shipment_id=shipment_id,
                field_name="external_reference",
                value=data["external_reference"]
            )

        if "broker_price" in data or "driver_pay" in data:
            broker_price = data.get("broker_price", shipment["broker_price"])
            driver_pay = data.get("driver_pay", shipment["driver_pay"])

            broker_price = float(broker_price)
            driver_pay = float(driver_pay)

            profit, margin = calculate_profit_and_margin(broker_price, driver_pay)
            data["profit"] = profit
            data["percentage_of_margin"] = margin

        fields = []
        values = []

        for key, value in data.items():
            fields.append(f"{key} = %s")
            values.append(value)

        values.append(shipment_id)

        query = f"""
            UPDATE shipments
            SET {', '.join(fields)}
            WHERE shipment_id = %s
        """

        cursor.execute(query, tuple(values))
        conn.commit()

        for field, new_value in data.items():
            old_value = shipment.get(field)

            old_str = "" if old_value is None else str(old_value)
            new_str = "" if new_value is None else str(new_value)

            if old_str != new_str:
                log_shipment_change(
                    shipment_id=shipment_id,
                    staff_id=current_user["staff_id"],
                    field_name=field,
                    old_value=old_value,
                    new_value=new_value
                )

        cursor.execute("""
            SELECT *
            FROM shipments
            WHERE shipment_id = %s
        """, (shipment_id,))
        updated_shipment = cursor.fetchone()

        return {
            "message": "Shipment updated successfully",
            "shipment": apply_shipment_visibility_rules(updated_shipment, current_user)
        }

    finally:
        cursor.close()
        conn.close()


def delete_shipment_service(shipment_id, current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM shipments
            WHERE shipment_id = %s
              AND is_deleted = 0
        """, (shipment_id,))
        shipment = cursor.fetchone()

        if not shipment:
            raise HTTPException(status_code=404, detail="Shipment not found")

        cursor.execute("""
            UPDATE shipments
            SET is_deleted = 1,
                deleted_at = NOW(),
                deleted_by = %s
            WHERE shipment_id = %s
        """, (current_user["staff_id"], shipment_id))

        conn.commit()

        log_shipment_change(
            shipment_id=shipment_id,
            staff_id=current_user["staff_id"],
            note="Shipment soft deleted"
        )

        return {"message": "Deleted"}

    finally:
        cursor.close()
        conn.close()