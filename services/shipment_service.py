from datetime import datetime
from fastapi import HTTPException, status

from data.db import get_connection
from utils.calculations import calculate_profit_and_margin
from services.logging_service import log_shipment_change


# =======================================================
# VALIDATION HELPERS
# =======================================================
def validate_company(company_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT company_id, company_name, company_code
            FROM companies
            WHERE company_id = %s
        """, (company_id,))
        company = cursor.fetchone()

        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        return company

    finally:
        cursor.close()
        conn.close()


def validate_staff(staff_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT staff_id, staff_full_name, job_title, is_active
            FROM staff
            WHERE staff_id = %s
        """, (staff_id,))
        staff = cursor.fetchone()

        if not staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned staff not found"
            )

        if int(staff["is_active"]) != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned staff is inactive"
            )

        return staff

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GENERATE REFERENCE NUMBER
# FORMAT:
# [COMPANY_CODE][MM][YYYY][COUNTER]
# Example: EML0420260001
# =======================================================
def generate_reference_number(company_id: int) -> str:
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        company = validate_company(company_id)
        company_code = company["company_code"].strip().upper()

        now = datetime.now()
        month_str = now.strftime("%m")
        year_str = now.strftime("%Y")
        prefix = f"{company_code}{month_str}{year_str}"

        cursor.execute("""
            SELECT reference_number
            FROM shipments
            WHERE company_id = %s
              AND reference_number LIKE %s
            ORDER BY reference_number DESC
            LIMIT 1
        """, (company_id, f"{prefix}%"))

        last_row = cursor.fetchone()

        if last_row and last_row["reference_number"]:
            last_ref = last_row["reference_number"]
            last_counter = int(last_ref[-4:])
            new_counter = last_counter + 1
        else:
            new_counter = 1

        return f"{prefix}{str(new_counter).zfill(4)}"

    finally:
        cursor.close()
        conn.close()


# =======================================================
# CREATE SHIPMENT
# =======================================================
def create_shipment(data, staff_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        company_id = data.get("company_id")
        if not company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="company_id is required"
            )

        validate_company(company_id)

        assigned_staff_id = data.get("assigned_staff_id", staff_id)
        validate_staff(assigned_staff_id)

        broker_price = float(data.get("broker_price", 0) or 0)
        driver_pay = float(data.get("driver_pay", 0) or 0)
        miles = float(data.get("miles", 0) or 0)
        loads_per_day = int(data.get("loads_per_day", 0) or 0)
        dispatcher_commission_percent = float(
            data.get("dispatcher_commission_percent", 0) or 0
        )

        profit, margin = calculate_profit_and_margin(broker_price, driver_pay)
        reference_number = generate_reference_number(company_id)

        cursor.execute("""
            INSERT INTO shipments (
                company_id,
                reference_number,
                unit_number,
                assigned_staff_id,
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
            VALUES (
                %s, %s, %s, %s, NOW(),
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s
            )
        """, (
            company_id,
            reference_number,
            data.get("unit_number"),
            assigned_staff_id,
            data.get("driver_name"),
            data.get("business_name"),
            data.get("broker_name"),
            data.get("pickup_city"),
            data.get("pickup_state"),
            data.get("pickup_datetime"),
            data.get("delivery_city"),
            data.get("delivery_state"),
            data.get("delivery_datetime"),
            miles,
            broker_price,
            driver_pay,
            profit,
            margin,
            loads_per_day,
            dispatcher_commission_percent,
            data.get("shipment_status", "created"),
            data.get("payment_status", "unpaid"),
            data.get("payment_option"),
            data.get("comments")
        ))

        shipment_id = cursor.lastrowid
        conn.commit()

        log_shipment_change(
            shipment_id=shipment_id,
            staff_id=staff_id,
            field_name="shipment_created",
            old_value=None,
            new_value=reference_number,
            note=f"Shipment created with reference number {reference_number}"
        )

        return {
            "message": "Shipment created successfully",
            "shipment_id": shipment_id,
            "reference_number": reference_number,
            "profit": profit,
            "percentage_of_margin": margin
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create shipment: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET MY SHIPMENTS
# =======================================================
def get_my_shipments_service(current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        role = current_user["role"]
        staff_id = current_user["staff_id"]

        if role == "dispatcher":
            cursor.execute("""
                SELECT *
                FROM shipments
                WHERE assigned_staff_id = %s
                ORDER BY shipment_created_date DESC, shipment_id DESC
            """, (staff_id,))
        else:
            cursor.execute("""
                SELECT *
                FROM shipments
                ORDER BY shipment_created_date DESC, shipment_id DESC
            """)

        shipments = cursor.fetchall()

        return shipments

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET ALL SHIPMENTS
# =======================================================
def get_all_shipments_service(current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM shipments
            ORDER BY shipment_created_date DESC, shipment_id DESC
        """)

        shipments = cursor.fetchall()
        return shipments

    finally:
        cursor.close()
        conn.close()


# =======================================================
# GET ONE SHIPMENT
# =======================================================
def get_shipment_by_id(shipment_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM shipments
            WHERE shipment_id = %s
        """, (shipment_id,))

        shipment = cursor.fetchone()

        if not shipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shipment not found"
            )

        return shipment

    finally:
        cursor.close()
        conn.close()


# =======================================================
# UPDATE SHIPMENT
# =======================================================
def update_shipment_service(shipment_id, data, current_user):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT *
            FROM shipments
            WHERE shipment_id = %s
        """, (shipment_id,))
        existing = cursor.fetchone()

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shipment not found"
            )

        company_id = data.get("company_id", existing["company_id"])
        assigned_staff_id = data.get("assigned_staff_id", existing["assigned_staff_id"])

        validate_company(company_id)
        validate_staff(assigned_staff_id)

        updated_values = {
            "company_id": company_id,
            "unit_number": data.get("unit_number", existing["unit_number"]),
            "assigned_staff_id": assigned_staff_id,
            "driver_name": data.get("driver_name", existing["driver_name"]),
            "business_name": data.get("business_name", existing["business_name"]),
            "broker_name": data.get("broker_name", existing["broker_name"]),
            "pickup_city": data.get("pickup_city", existing["pickup_city"]),
            "pickup_state": data.get("pickup_state", existing["pickup_state"]),
            "pickup_datetime": data.get("pickup_datetime", existing["pickup_datetime"]),
            "delivery_city": data.get("delivery_city", existing["delivery_city"]),
            "delivery_state": data.get("delivery_state", existing["delivery_state"]),
            "delivery_datetime": data.get("delivery_datetime", existing["delivery_datetime"]),
            "miles": float(data.get("miles", existing["miles"]) or 0),
            "broker_price": float(data.get("broker_price", existing["broker_price"]) or 0),
            "driver_pay": float(data.get("driver_pay", existing["driver_pay"]) or 0),
            "loads_per_day": int(data.get("loads_per_day", existing["loads_per_day"]) or 0),
            "dispatcher_commission_percent": float(
                data.get(
                    "dispatcher_commission_percent",
                    existing["dispatcher_commission_percent"]
                ) or 0
            ),
            "shipment_status": data.get("shipment_status", existing["shipment_status"]),
            "payment_status": data.get("payment_status", existing["payment_status"]),
            "payment_option": data.get("payment_option", existing["payment_option"]),
            "comments": data.get("comments", existing["comments"]),
        }

        profit, margin = calculate_profit_and_margin(
            updated_values["broker_price"],
            updated_values["driver_pay"]
        )
        updated_values["profit"] = profit
        updated_values["percentage_of_margin"] = margin

        cursor.execute("""
            UPDATE shipments
            SET company_id = %s,
                unit_number = %s,
                assigned_staff_id = %s,
                driver_name = %s,
                business_name = %s,
                broker_name = %s,
                pickup_city = %s,
                pickup_state = %s,
                pickup_datetime = %s,
                delivery_city = %s,
                delivery_state = %s,
                delivery_datetime = %s,
                miles = %s,
                broker_price = %s,
                driver_pay = %s,
                profit = %s,
                percentage_of_margin = %s,
                loads_per_day = %s,
                dispatcher_commission_percent = %s,
                shipment_status = %s,
                payment_status = %s,
                payment_option = %s,
                comments = %s
            WHERE shipment_id = %s
        """, (
            updated_values["company_id"],
            updated_values["unit_number"],
            updated_values["assigned_staff_id"],
            updated_values["driver_name"],
            updated_values["business_name"],
            updated_values["broker_name"],
            updated_values["pickup_city"],
            updated_values["pickup_state"],
            updated_values["pickup_datetime"],
            updated_values["delivery_city"],
            updated_values["delivery_state"],
            updated_values["delivery_datetime"],
            updated_values["miles"],
            updated_values["broker_price"],
            updated_values["driver_pay"],
            updated_values["profit"],
            updated_values["percentage_of_margin"],
            updated_values["loads_per_day"],
            updated_values["dispatcher_commission_percent"],
            updated_values["shipment_status"],
            updated_values["payment_status"],
            updated_values["payment_option"],
            updated_values["comments"],
            shipment_id
        ))

        conn.commit()

        tracked_fields = [
            "company_id",
            "unit_number",
            "assigned_staff_id",
            "driver_name",
            "business_name",
            "broker_name",
            "pickup_city",
            "pickup_state",
            "pickup_datetime",
            "delivery_city",
            "delivery_state",
            "delivery_datetime",
            "miles",
            "broker_price",
            "driver_pay",
            "profit",
            "percentage_of_margin",
            "loads_per_day",
            "dispatcher_commission_percent",
            "shipment_status",
            "payment_status",
            "payment_option",
            "comments",
        ]

        for field in tracked_fields:
            old_value = existing.get(field)
            new_value = updated_values.get(field)

            if str(old_value) != str(new_value):
                log_shipment_change(
                    shipment_id=shipment_id,
                    staff_id=current_user["staff_id"],
                    field_name=field,
                    old_value=old_value,
                    new_value=new_value,
                    note=f"{field} updated"
                )

        return {
            "message": "Shipment updated successfully",
            "shipment_id": shipment_id,
            "reference_number": existing["reference_number"],
            "profit": updated_values["profit"],
            "percentage_of_margin": updated_values["percentage_of_margin"]
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update shipment: {str(e)}"
        )

    finally:
        cursor.close()
        conn.close()