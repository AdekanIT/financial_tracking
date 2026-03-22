from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services.shipment_service import (
    create_shipment,
    get_my_shipments_service,
    get_all_shipments_service,
    delete_shipment_service
)

from data.db import get_current_user, require_roles

router = APIRouter(prefix="/shipments", tags=["Shipments"])


# ========= REQUEST MODEL =========
class ShipmentCreate(BaseModel):
    company_id: int
    reference_number: str
    unit_number: str | None = None
    broker_price: float
    driver_pay: float
    percentage_of_margin: float
    comments: str | None = None


# ========= CREATE SHIPMENT =========
@router.post("/create")
def create_new_shipment(
    data: ShipmentCreate,
    current_user: dict = Depends(require_roles(["manager", "supervisor", "accounting"]))
):
    return create_shipment(data.dict(), current_user["staff_id"])


# ========= GET MY SHIPMENTS =========
@router.get("/my")
def get_my_shipments(current_user: dict = Depends(get_current_user)):
    return get_my_shipments_service(current_user)


# ========= GET ALL SHIPMENTS =========
@router.get("/all")
def get_all_shipments(
    current_user: dict = Depends(require_roles(["manager", "supervisor", "accounting"]))
):
    return get_all_shipments_service(current_user)


# ========= DELETE SHIPMENT (SOFT DELETE) =========
@router.delete("/{shipment_id}")
def delete_shipment(
    shipment_id: int,
    current_user: dict = Depends(require_roles(["manager", "supervisor"]))
):
    return delete_shipment_service(shipment_id, current_user)