from fastapi import APIRouter, Depends
from data.db import get_current_user, require_roles, FINANCE_JOB_TITLES, SUPERVISOR_JOB_TITLES

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# =============================
# PERSONAL DASHBOARD
# =============================
@router.get("/my")
def my_dashboard(current_user: dict = Depends(get_current_user)):
    return {
        "message": "Personal dashboard",
        "staff": current_user
    }


# =============================
# COMPANY DASHBOARD
# manager + accounting + supervisor
# =============================
@router.get("/company")
def company_dashboard(
    current_user: dict = Depends(
        require_roles(FINANCE_JOB_TITLES + ["supervisor"])
    )
):
    return {
        "message": "Company dashboard",
        "staff": current_user
    }