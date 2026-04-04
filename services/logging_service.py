from data.db import get_connection


# -------------------------------------------------------
# LOG SHIPMENT CHANGE
# -------------------------------------------------------
def log_shipment_change(
    shipment_id,
    staff_id,
    field_name=None,
    old_value=None,
    new_value=None,
    note=None
):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO shipment_logs (
                shipment_id,
                staff_id,
                field_name,
                old_value,
                new_value,
                note
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            shipment_id,
            staff_id,
            field_name,
            str(old_value) if old_value is not None else None,
            str(new_value) if new_value is not None else None,
            note
        ))

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        cursor.close()
        conn.close()


# -------------------------------------------------------
# GET LOGS FOR ONE SHIPMENT
# -------------------------------------------------------
def get_shipment_logs(shipment_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                sl.shipment_log_id,
                sl.shipment_id,
                sl.staff_id,
                s.staff_full_name,
                s.staff_username,
                sl.field_name,
                sl.old_value,
                sl.new_value,
                sl.note,
                sl.updated_at
            FROM shipment_logs sl
            JOIN staff s ON s.staff_id = sl.staff_id
            WHERE sl.shipment_id = %s
            ORDER BY sl.updated_at DESC, sl.shipment_log_id DESC
        """, (shipment_id,))

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# -------------------------------------------------------
# GET ALL SHIPMENT LOGS
# -------------------------------------------------------
def get_all_shipment_logs():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                sl.shipment_log_id,
                sl.shipment_id,
                sl.staff_id,
                s.staff_full_name,
                s.staff_username,
                sl.field_name,
                sl.old_value,
                sl.new_value,
                sl.note,
                sl.updated_at
            FROM shipment_logs sl
            JOIN staff s ON s.staff_id = sl.staff_id
            ORDER BY sl.updated_at DESC, sl.shipment_log_id DESC
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()