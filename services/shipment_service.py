from data.db import get_connection
from utils.calculations import calculate_profit_and_margin
from services.logging_service import log_shipment_change
from datetime import datetime


# ========= GENERATE SHIPMENT CODE =========
def generate_shipment_code(company_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) FROM shipments
        WHERE company_id = %s
    """, (company_id,))

    count = cursor.fetchone()[0] + 1

    sequence = str(count).zfill(4)
    month_year = datetime.now().strftime("%m%y")

    shipment_code = f"{company_id}{sequence}-{month_year}"

    cursor.close()
    conn.close()

    return shipment_code


# ========= CREATE =========
def create_shipment(data, staff_id):
    conn = get_connection()
    cursor = conn.cursor()

    profit, margin = calculate_profit_and_margin(
        data["broker_price"],
        data["driver_pay"]
    )

    shipment_code = generate_shipment_code(data["company_id"])

    cursor.execute("""
        INSERT INTO shipments
        (shipment_code, company_id, reference_number, unit_number, assigned_staff_id,
         broker_price, driver_pay, profit, percentage_of_margin,
         shipment_status, payment_status, payment_option, comments)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        shipment_code,
        data["company_id"],
        data["reference_number"],
        data["unit_number"],
        staff_id,
        data["broker_price"],
        data["driver_pay"],
        profit,
        data["percentage_of_margin"],
        "created",
        "unpaid",
        "standard",
        data.get("comments")
    ))

    shipment_id = cursor.lastrowid
    conn.commit()

    log_shipment_change(
        shipment_id,
        staff_id,
        "shipment_created",
        None,
        f"Shipment created. Code: {shipment_code}, Profit: {profit}"
    )

    cursor.close()
    conn.close()

    return {
        "message": "Shipment created successfully",
        "shipment_id": shipment_id,
        "shipment_code": shipment_code,
        "profit": profit
    }


# ========= GET MY SHIPMENTS =========
def get_my_shipments_service(current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    role = current_user["role"]
    staff_id = current_user["staff_id"]

    if role == "dispatcher":
        cursor.execute("""
            SELECT * FROM shipments
            WHERE assigned_staff_id = %s AND is_deleted = FALSE
        """, (staff_id,))
    else:
        cursor.execute("""
            SELECT * FROM shipments
            WHERE is_deleted = FALSE
        """)

    shipments = cursor.fetchall()

    if role == "updater":
        for s in shipments:
            s.pop("broker_price", None)
            s.pop("driver_pay", None)
            s.pop("profit", None)

    cursor.close()
    conn.close()

    return shipments


# ========= GET ALL SHIPMENTS =========
def get_all_shipments_service(current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    role = current_user["role"]

    cursor.execute("""
        SELECT * FROM shipments
        WHERE is_deleted = FALSE
    """)

    shipments = cursor.fetchall()

    if role == "updater":
        for s in shipments:
            s.pop("broker_price", None)
            s.pop("driver_pay", None)
            s.pop("profit", None)

    cursor.close()
    conn.close()

    return shipments


# ========= DELETE (SOFT DELETE) =========
def delete_shipment_service(shipment_id, current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT shipment_id FROM shipments
        WHERE shipment_id = %s AND is_deleted = FALSE
    """, (shipment_id,))

    shipment = cursor.fetchone()

    if not shipment:
        cursor.close()
        conn.close()
        raise Exception("Shipment not found or already deleted")

    cursor.execute("""
        UPDATE shipments
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            deleted_by = %s
        WHERE shipment_id = %s
    """, (current_user["staff_id"], shipment_id))

    conn.commit()

    log_shipment_change(
        shipment_id,
        current_user["staff_id"],
        "shipment_deleted",
        None,
        "Shipment soft deleted"
    )

    cursor.close()
    conn.close()

    return {
        "message": "Shipment deleted successfully (soft delete)"
    }