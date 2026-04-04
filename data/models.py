from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

# ======================================================
# STAFF SCHEMAS
# ======================================================
class StaffBase(BaseModel):
    staff_username: str = Field(..., max_length=50)
    staff_full_name: str = Field(..., max_length=100)
    job_title: str = Field(..., max_length=50)
    is_active: bool = True
    base_salary: Decimal = Decimal("0.00")


class StaffCreate(StaffBase):
    password: str = Field(..., min_length=1)


class StaffUpdate(BaseModel):
    staff_username: Optional[str] = Field(None, max_length=50)
    staff_full_name: Optional[str] = Field(None, max_length=100)
    job_title: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    base_salary: Optional[Decimal] = None
    password: Optional[str] = None


class StaffResponse(StaffBase):
    staff_id: int
    created_at: datetime


class StaffLogin(BaseModel):
    staff_username: str
    password: str


# ======================================================
# COMPANY SCHEMAS
# ======================================================
class CompanyBase(BaseModel):
    company_name: str = Field(..., max_length=150)
    company_code: str = Field(..., max_length=20)


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = Field(None, max_length=150)
    company_code: Optional[str] = Field(None, max_length=20)


class CompanyResponse(CompanyBase):
    company_id: int
    created_at: datetime


# ======================================================
# SHIPMENT SCHEMAS
# ======================================================
class ShipmentBase(BaseModel):
    company_id: int
    unit_number: Optional[str] = Field(None, max_length=50)
    assigned_staff_id: int
    driver_name: Optional[str] = Field(None, max_length=100)
    business_name: Optional[str] = Field(None, max_length=150)
    broker_name: Optional[str] = Field(None, max_length=150)
    pickup_city: Optional[str] = Field(None, max_length=100)
    pickup_state: Optional[str] = Field(None, max_length=50)
    pickup_datetime: Optional[datetime] = None
    delivery_city: Optional[str] = Field(None, max_length=100)
    delivery_state: Optional[str] = Field(None, max_length=50)
    delivery_datetime: Optional[datetime] = None
    miles: Decimal = Decimal("0.00")
    broker_price: Decimal = Decimal("0.00")
    driver_pay: Decimal = Decimal("0.00")
    profit: Decimal = Decimal("0.00")
    percentage_of_margin: Decimal = Decimal("0.00")
    loads_per_day: int = 0
    dispatcher_commission_percent: Decimal = Decimal("0.00")
    shipment_status: str = Field(default="created", max_length=50)
    payment_status: str = Field(default="unpaid", max_length=50)
    payment_option: Optional[str] = Field(None, max_length=50)
    comments: Optional[str] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[int] = None


class ShipmentCreate(ShipmentBase):
    pass


class ShipmentUpdate(BaseModel):
    company_id: Optional[int] = None
    unit_number: Optional[str] = Field(None, max_length=50)
    assigned_staff_id: Optional[int] = None
    driver_name: Optional[str] = Field(None, max_length=100)
    business_name: Optional[str] = Field(None, max_length=150)
    broker_name: Optional[str] = Field(None, max_length=150)
    pickup_city: Optional[str] = Field(None, max_length=100)
    pickup_state: Optional[str] = Field(None, max_length=50)
    pickup_datetime: Optional[datetime] = None
    delivery_city: Optional[str] = Field(None, max_length=100)
    delivery_state: Optional[str] = Field(None, max_length=50)
    delivery_datetime: Optional[datetime] = None
    miles: Optional[Decimal] = None
    broker_price: Optional[Decimal] = None
    driver_pay: Optional[Decimal] = None
    profit: Optional[Decimal] = None
    percentage_of_margin: Optional[Decimal] = None
    loads_per_day: Optional[int] = None
    dispatcher_commission_percent: Optional[Decimal] = None
    shipment_status: Optional[str] = Field(None, max_length=50)
    payment_status: Optional[str] = Field(None, max_length=50)
    payment_option: Optional[str] = Field(None, max_length=50)
    comments: Optional[str] = None
    is_deleted: Optional[bool] = None
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[int] = None


class ShipmentResponse(ShipmentBase):
    shipment_id: int
    reference_number: str
    shipment_created_date: datetime
    created_at: datetime


# ======================================================
# SHIPMENT LOG SCHEMAS
# ======================================================
class ShipmentLogBase(BaseModel):
    shipment_id: int
    staff_id: int
    field_name: Optional[str] = Field(None, max_length=100)
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    note: Optional[str] = None


class ShipmentLogCreate(ShipmentLogBase):
    pass


class ShipmentLogResponse(ShipmentLogBase):
    shipment_log_id: int
    updated_at: datetime


# ======================================================
# USER LOG SCHEMAS
# ======================================================
class UserLogBase(BaseModel):
    staff_id: int
    action_type: str = Field(..., max_length=100)
    changed_by: Optional[int] = None


class UserLogCreate(UserLogBase):
    pass


class UserLogResponse(UserLogBase):
    log_id: int
    created_at: datetime


# ======================================================
# SALARY RECORD SCHEMAS
# ======================================================
class SalaryRecordBase(BaseModel):
    staff_id: int
    period_start: date
    period_end: date
    base_salary: Decimal = Decimal("0.00")
    shipment_bonus: Decimal = Decimal("0.00")
    bonus: Decimal = Decimal("0.00")
    tax_percent: Decimal = Decimal("0.00")
    total_salary: Decimal = Decimal("0.00")


class SalaryRecordCreate(SalaryRecordBase):
    pass


class SalaryRecordUpdate(BaseModel):
    staff_id: Optional[int] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    base_salary: Optional[Decimal] = None
    shipment_bonus: Optional[Decimal] = None
    bonus: Optional[Decimal] = None
    tax_percent: Optional[Decimal] = None
    total_salary: Optional[Decimal] = None


class SalaryRecordResponse(SalaryRecordBase):
    salary_id: int
    created_at: datetime


# ======================================================
# TOKEN / AUTH SCHEMAS
# ======================================================
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    staff_id: int
    role: str