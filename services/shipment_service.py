from data.db import get_connection
from utils.calculations import calculate_profit_and_margin
from services.logging_service import log_shipment_change

def create_shipment(data, staff_id):
    conn = get_connection()
    cursor = conn.cursor()

    profit, margin = calculate_profit_and_margin(
        data["broker_price"],
        data["driver_pay"]
    )

    cursor.execute("""
        INSERT INTO shipments
        (company_id, reference_number, unit_number, assigned_staff_id,
         broker_price, driver_pay, profit, percentage_of_margin,
         shipment_status, payment_status, payment_option, comments)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        data["company_id"],
        data["reference_number"],
        data["unit_number"],
        staff_id,
        data["broker_price"],
        data["driver_pay"],
        profit,
        margin,
        "created",
        "unpaid",
        "standard",
        data.get("comments")
    ))

    conn.commit()
    cursor.close()
    conn.close()