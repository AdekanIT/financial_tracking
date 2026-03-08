from fastapi import APIRouter, Depends
from data.db import require_roles, get_current_user
from services.user_service import (
    create_user,
    change_password,
    change_role,
    change_user_status,
    get_users,
    get_user_logs
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/create")
def create_user_endpoint(
    name: str,
    job_title: str,
    role: str,
    password: str,
    current_user: dict = Depends(require_roles(["Manager"]))
):
    return create_user(
        name,
        job_title,
        role,
        password,
        current_user["staff_id"]
    )


@router.post("/change-password")
def change_password_endpoint(
    staff_id: int,
    new_password: str,
    current_user: dict = Depends(require_roles(["Manager", "HR"]))
):
    return change_password(
        staff_id,
        new_password,
        current_user["staff_id"]
    )


@router.post("/change-role")
def change_role_endpoint(
    staff_id: int,
    new_role: str,
    current_user: dict = Depends(require_roles(["Manager"]))
):
    return change_role(
        staff_id,
        new_role,
        current_user["staff_id"]
    )


@router.post("/change-status")
def change_status_endpoint(
    staff_id: int,
    is_active: bool,
    current_user: dict = Depends(require_roles(["Manager"]))
):
    return change_user_status(
        staff_id,
        is_active,
        current_user["staff_id"]
    )


@router.get("/")
def list_users(
    current_user: dict = Depends(require_roles(["Manager", "Accounting"]))
):
    return get_users()


@router.get("/logs")
def list_user_logs(
    current_user: dict = Depends(require_roles(["Manager"]))
):
    return get_user_logs()