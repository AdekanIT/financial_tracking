from fastapi import APIRouter, Depends, HTTPException
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
# manager + hr
# =====================================================
@router.post("/create")
def create_user_endpoint(
    staff_username: str,
    full_name: str,
    job_title: str,
    password: str,
    current_user: dict = Depends(require_roles(["manager", "hr"]))
):
    result = create_user(
        staff_username=staff_username,
        staff_full_name=full_name,
        job_title=job_title,
        password=password,
        created_by=current_user["staff_id"]
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


# =====================================================
# CHANGE PASSWORD
# manager + hr
# =====================================================
@router.post("/change-password")
def change_password_endpoint(
    staff_id: int,
    new_password: str,
    current_user: dict = Depends(require_roles(["manager", "hr"]))
):
    result = change_password(
        staff_id=staff_id,
        new_password=new_password,
        changed_by=current_user["staff_id"]
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


# =====================================================
# CHANGE STATUS
# manager only
# =====================================================
@router.post("/change-status")
def change_status_endpoint(
    staff_id: int,
    is_active: bool,
    current_user: dict = Depends(require_roles(["manager"]))
):
    result = change_user_status(
        staff_id=staff_id,
        is_active=is_active,
        changed_by=current_user["staff_id"]
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


# =====================================================
# GET ALL USERS
# manager + supervisor + hr
# =====================================================
@router.get("/all")
def get_all_users_endpoint(
    current_user: dict = Depends(require_roles(["manager", "supervisor", "hr"]))
):
    result = get_all_users()

    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


# =====================================================
# GET USER LOGS
# manager + supervisor + hr
# =====================================================
@router.get("/logs")
def get_user_logs_endpoint(
    current_user: dict = Depends(require_roles(["manager", "supervisor", "hr"]))
):
    result = get_user_logs()

    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result