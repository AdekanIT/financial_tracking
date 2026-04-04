from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from services.shipment_service import (
    create_shipment,
    get_my_shipments_service,
    get_all_shipments_service,
    get_shipment_by_id,
    update_shipment_service
)

from data.db import get_current_user, require_roles

router = APIRouter(prefix="/shipments", tags=["Shipments"])


# =======================================================
# REQUEST MODELS
# =======================================================
class ShipmentCreate(BaseModel):
    company_id: int
    assigned_staff_id: Optional[int] = None
    unit_number: Optional[str] = None
    driver_name: Optional[str] = None
    business_name: Optional[str] = None
    broker_name: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_state: Optional[str] = None
    pickup_datetime: Optional[datetime] = None
    delivery_city: Optional[str] = None
    delivery_state: Optional[str] = None
    delivery_datetime: Optional[datetime] = None
    miles: Optional[float] = 0
    broker_price: float
    driver_pay: float
    loads_per_day: Optional[int] = 0
    dispatcher_commission_percent: Optional[float] = 0
    shipment_status: Optional[str] = "created"
    payment_status: Optional[str] = "unpaid"
    payment_option: Optional[str] = None
    comments: Optional[str] = None


class ShipmentUpdate(BaseModel):
    company_id: Optional[int] = None
    assigned_staff_id: Optional[int] = None
    unit_number: Optional[str] = None
    driver_name: Optional[str] = None
    business_name: Optional[str] = None
    broker_name: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_state: Optional[str] = None
    pickup_datetime: Optional[datetime] = None
    delivery_city: Optional[str] = None
    delivery_state: Optional[str] = None
    delivery_datetime: Optional[datetime] = None
    miles: Optional[float] = None
    broker_price: Optional[float] = None
    driver_pay: Optional[float] = None
    loads_per_day: Optional[int] = None
    dispatcher_commission_percent: Optional[float] = None
    shipment_status: Optional[str] = None
    payment_status: Optional[str] = None
    payment_option: Optional[str] = None
    comments: Optional[str] = None


# =======================================================
# CREATE SHIPMENT
# =======================================================
@router.post("/create")
def create_new_shipment(
    data: ShipmentCreate,
    current_user: dict = Depends(require_roles(["admin", "manager", "supervisor", "accounting", "dispatcher"]))
):
    return create_shipment(data.model_dump(), current_user["staff_id"])


# =======================================================
# GET MY SHIPMENTS
# =======================================================
@router.get("/my")
def get_my_shipments(
    current_user: dict = Depends(get_current_user)
):
    return get_my_shipments_service(current_user)


# =======================================================
# GET ALL SHIPMENTS
# =======================================================
@router.get("/all")
def get_all_shipments(
    current_user: dict = Depends(require_roles(["admin", "manager", "supervisor", "accounting"]))
):
    return get_all_shipments_service(current_user)


# =======================================================
# GET SHIPMENT BY ID
# =======================================================
@router.get("/{shipment_id}")
def get_one_shipment(
    shipment_id: int,
    current_user: dict = Depends(get_current_user)
):
    return get_shipment_by_id(shipment_id)


# =======================================================
# UPDATE SHIPMENT
# =======================================================
@router.put("/{shipment_id}")
def update_shipment(
    shipment_id: int,
    data: ShipmentUpdate,
    current_user: dict = Depends(require_roles(["admin", "manager", "supervisor", "accounting", "dispatcher"]))
):
    return update_shipment_service(
        shipment_id=shipment_id,
        data=data.model_dump(exclude_unset=True),
        current_user=current_user
    )