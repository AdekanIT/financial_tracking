from fastapi import APIRouter, Depends
from data.db import require_roles
from services.user_service import (
    create_user,
    change_password,
    change_user_status,
    get_all_users,
    get_user_logs
)

router = APIRouter(prefix="/users", tags=["Users"])

# =====================================================
# CREATE USER
# =====================================================
@router.post("/create")
def create_user_endpoint(
    staff_username: str,
    full_name: str,
    job_title: str,
    password: str,
    current_user: dict = Depends(require_roles(["manager", "hr"]))
):
    return create_user(
        staff_username=staff_username,
        staff_full_name=full_name,
        job_title=job_title,
        password=password,
        created_by=current_user["staff_id"]
    )

# =====================================================
# CHANGE PASSWORD
# =====================================================
@router.post("/change-password")
def change_password_endpoint(
    staff_id: int,
    new_password: str,
    current_user: dict = Depends(require_roles(["manager", "hr"]))
):
    return change_password(
        staff_id=staff_id,
        new_password=new_password,
        changed_by=current_user["staff_id"]
    )

# =====================================================
# CHANGE STATUS
# =====================================================
@router.post("/change-status")
def change_status_endpoint(
    staff_id: int,
    is_active: bool,
    current_user: dict = Depends(require_roles(["manager"]))
):
    return change_user_status(
        staff_id=staff_id,
        is_active=is_active,
        changed_by=current_user["staff_id"]
    )

# =====================================================
# GET ALL USERS
# =====================================================
@router.get("/")
def list_users(
    current_user: dict = Depends(require_roles(["manager", "accounting"]))
):
    return get_all_users()

# =====================================================
# USER LOGS
# =====================================================
@router.get("/logs")
def list_user_logs(
    current_user: dict = Depends(require_roles(["manager"]))
):
    return get_user_logs()