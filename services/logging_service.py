from data.db import get_connection

def log_shipment_change(shipment_id, staff_id, field, old, new):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO shipment_logs
        (shipment_id, changed_by_staff_id, field_name, old_value, new_value)
        VALUES (%s, %s, %s, %s, %s)
    """, (shipment_id, staff_id, field, old, new))

    conn.commit()
    cursor.close()
    conn.close()