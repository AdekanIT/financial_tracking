from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services.shipment_service import create_shipment
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
    current_user: dict = Depends(require_roles(["manager","supervisor","accounting"]))
):
    return create_shipment(data.dict(), current_user["staff_id"])


# ========= GET MY SHIPMENTS =========
@router.get("/my")
def get_my_shipments(current_user: dict = Depends(get_current_user)):
    return {
        "message": "Here will be shipments assigned to this user",
        "staff": current_user
    }


# ========= GET ALL SHIPMENTS =========
@router.get("/all")
def get_all_shipments(
    current_user: dict = Depends(require_roles(["manager","supervisor","accounting"]))
):
    return {
        "message": "Here will be all company shipments",
        "staff": current_user
    }