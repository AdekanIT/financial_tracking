from datetime import datetime
from fastapi import HTTPException

from data.db import get_connection
from utils.calculations import calculate_profit_and_margin
from services.logging_service import log_shipment_change


# =======================================================
# HELPERS
# =======================================================
def validate_company(company_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM companies WHERE company_id = %s", (company_id,))
        company = cursor.fetchone()

        if not company:
            raise HTTPException(404, "Company not found")

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
            raise HTTPException(404, "Staff not found")

        if int(staff["is_active"]) != 1:
            raise HTTPException(400, "Staff inactive")

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


def check_reference_uniqueness(
    cursor,
    shipment_id: int,
    field_name: str,
    value: str
):
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


# =======================================================
# CREATE
# =======================================================
def create_shipment(data, staff_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        company_id = data["company_id"]
        validate_company(company_id)

        assigned_staff_id = data.get("assigned_staff_id", staff_id)
        staff = validate_staff(assigned_staff_id)
        staff_full_name = staff["staff_full_name"]

        broker_price = float(data.get("broker_price", 0))
        driver_pay = float(data.get("driver_pay", 0))

        profit, margin = calculate_profit_and_margin(broker_price, driver_pay)
        company_reference = generate_company_reference(company_id)

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
            VALUES (%s,%s,%s,%s,%s,%s,NOW(),
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


# =======================================================
# GET MY
# =======================================================
def get_my_shipments_service(current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if current_user["job_title"] == "dispatcher":
            cursor.execute("""
                SELECT * FROM shipments
                WHERE assigned_staff_id = %s AND is_deleted = 0
            """, (current_user["staff_id"],))
        else:
            cursor.execute("""
                SELECT * FROM shipments
                WHERE is_deleted = 0
            """)

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET ALL
# =======================================================
def get_all_shipments_service(current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT * FROM shipments
            WHERE is_deleted = 0
        """)
        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET ONE
# =======================================================
def get_shipment_by_id(shipment_id, current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT * FROM shipments
            WHERE shipment_id = %s
              AND is_deleted = 0
        """, (shipment_id,))
        shipment = cursor.fetchone()

        if not shipment:
            raise HTTPException(404, "Shipment not found")

        if current_user["job_title"] == "dispatcher" and shipment["assigned_staff_id"] != current_user["staff_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        return shipment

    finally:
        cursor.close()
        conn.close()


# =======================================================
# UPDATE
# =======================================================
def update_shipment_service(shipment_id, data, current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT * FROM shipments
            WHERE shipment_id = %s
              AND is_deleted = 0
        """, (shipment_id,))
        shipment = cursor.fetchone()

        if not shipment:
            raise HTTPException(404, "Shipment not found")

        if current_user["job_title"] == "dispatcher" and shipment["assigned_staff_id"] != current_user["staff_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        if not data:
            raise HTTPException(400, "No fields provided")

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
            SELECT * FROM shipments
            WHERE shipment_id = %s
        """, (shipment_id,))
        updated_shipment = cursor.fetchone()

        return {
            "message": "Shipment updated successfully",
            "shipment": updated_shipment
        }

    finally:
        cursor.close()
        conn.close()


# =======================================================
# DELETE (SOFT)
# =======================================================
def delete_shipment_service(shipment_id, current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT * FROM shipments
            WHERE shipment_id = %s
              AND is_deleted = 0
        """, (shipment_id,))
        shipment = cursor.fetchone()

        if not shipment:
            raise HTTPException(404, "Shipment not found")

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