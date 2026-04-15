from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from services.shipment_service import (
    create_shipment,
    get_visible_shipments_service,
    get_my_shipments_service,
    get_all_shipments_service,
    get_shipment_by_id,
    get_shipment_logs_service,
    update_shipment_service,
    delete_shipment_service
)

from data.db import get_current_user, require_roles

router = APIRouter(prefix="/shipments", tags=["Shipments"])


class ShipmentCreate(BaseModel):
    company_id: int
    assigned_staff_id: Optional[int] = None
    shipment_created_date: Optional[datetime] = None

    unit_number: Optional[str] = None
    external_reference: Optional[str] = None
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
    shipment_id: int
    company_id: Optional[int] = None
    company_reference: Optional[str] = None
    assigned_staff_id: Optional[int] = None
    shipment_created_date: Optional[datetime] = None

    unit_number: Optional[str] = None
    external_reference: Optional[str] = None
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


class ShipmentDelete(BaseModel):
    shipment_id: int


@router.post("/create")
def create_new_shipment(
    data: ShipmentCreate,
    current_user: dict = Depends(require_roles(["manager", "supervisor", "accounting", "dispatcher"]))
):
    return create_shipment(data.model_dump(), current_user["staff_id"], current_user)


@router.get("/visible")
def get_visible_shipments(
    current_user: dict = Depends(get_current_user)
):
    return get_visible_shipments_service(current_user)


@router.get("/my")
def get_my_shipments(
    current_user: dict = Depends(get_current_user)
):
    return get_my_shipments_service(current_user)


# archive usage
@router.get("/all")
def get_all_shipments(
    current_user: dict = Depends(require_roles(["manager", "supervisor", "hr", "accounting"]))
):
    return get_all_shipments_service(current_user)


@router.get("/logs/{shipment_id}")
def get_shipment_logs(
    shipment_id: int,
    current_user: dict = Depends(get_current_user)
):
    return get_shipment_logs_service(shipment_id, current_user)


@router.get("/{shipment_id}")
def get_one_shipment(
    shipment_id: int,
    current_user: dict = Depends(get_current_user)
):
    return get_shipment_by_id(shipment_id, current_user)


@router.put("/update")
def update_shipment(
    data: ShipmentUpdate,
    current_user: dict = Depends(require_roles(["manager", "supervisor", "accounting", "dispatcher"]))
):
    payload = data.model_dump(exclude_unset=True)
    shipment_id = payload.pop("shipment_id")

    return update_shipment_service(
        shipment_id=shipment_id,
        data=payload,
        current_user=current_user
    )


@router.delete("/delete/{shipment_id}")
def delete_shipment_by_path(
    shipment_id: int,
    current_user: dict = Depends(require_roles(["manager", "supervisor"]))
):
    return delete_shipment_service(
        shipment_id=shipment_id,
        current_user=current_user
    )


@router.delete("/delete")
def delete_shipment_by_body(
    data: ShipmentDelete,
    current_user: dict = Depends(require_roles(["manager", "supervisor"]))
):
    return delete_shipment_service(
        shipment_id=data.shipment_id,
        current_user=current_user
    )


@router.put("/delete")
def delete_shipment_legacy(
    data: ShipmentDelete,
    current_user: dict = Depends(require_roles(["manager", "supervisor"]))
):
    return delete_shipment_service(
        shipment_id=data.shipment_id,
        current_user=current_user
    )