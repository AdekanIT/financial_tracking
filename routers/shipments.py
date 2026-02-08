from fastapi import APIRouter
from services.shipment_service import create_shipment

router = APIRouter()

@router.post("/shipments")
def add_shipment(payload: dict):
    create_shipment(payload, payload["staff_id"])
    return {"status": "shipment created"}